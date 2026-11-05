import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { getRoutePolicy } from '../src/common/auth/route-policy';

const root = path.resolve(__dirname, '../src');
const walk = (directory: string): string[] => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const rows: string[][] = [];
const literals = (expression?: ts.Expression): string[] => {
  if (!expression) return [''];
  if (ts.isStringLiteral(expression)) return [expression.text];
  if (ts.isArrayLiteralExpression(expression)) return expression.elements.flatMap(element => literals(element as ts.Expression));
  throw new Error(`Unsupported route expression: ${expression.getText()}`);
};
for (const file of walk(root).filter(file => file.endsWith('.controller.ts')).sort()) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  source.forEachChild(node => {
    if (!ts.isClassDeclaration(node) || !node.name) return;
    const controller = node.name.text;
    const decorator = (ts.getDecorators(node) || []).find(item => ts.isCallExpression(item.expression) && item.expression.expression.getText(source) === 'Controller');
    const prefixes = decorator && ts.isCallExpression(decorator.expression) ? literals(decorator.expression.arguments[0]) : [''];
    for (const member of node.members) {
      if (!ts.isMethodDeclaration(member)) continue;
      const handler = member.name.getText(source);
      for (const item of ts.getDecorators(member) || []) {
        if (!ts.isCallExpression(item.expression)) continue;
        const method = item.expression.expression.getText(source);
        if (!/^(Get|Post|Put|Patch|Delete|All|Options|Head)$/.test(method)) continue;
        const policy = getRoutePolicy(controller, handler);
        if (!policy) throw new Error(`Missing route policy: ${controller}.${handler}`);
        const browserAuth: Record<string, string> = {
          login: 'Mật khẩu HRM + Origin', getSession: 'Cookie HttpOnly',
          refresh: 'Cookie HttpOnly + CSRF + Origin', logout: 'Cookie HttpOnly + CSRF + Origin',
          adoptSession: 'Bearer SSO + refresh cùng chủ thể + Origin',
        };
        const authentication = controller === 'AuthController' && browserAuth[handler]
          ? browserAuth[handler] : policy.public ? 'Public' : policy.machine ? 'JWT hoặc EVN key (POST)' : 'JWT';
        const grants = policy.any?.join(' hoặc ') || (policy.public ? '—' : 'Phiên hợp lệ');
        const scope = controller === 'AuthController' && browserAuth[handler]
          ? `${controller}.${handler}; BrowserSessionService` : policy.public ? '—' : `${controller}.${handler}; ResourceAccessService và service nghiệp vụ`;
        for (const prefix of prefixes) {
          for (const suffix of literals(item.expression.arguments[0])) {
            const route = (prefix === '.well-known' ? '/' : '/api/v1/') + [prefix, suffix].filter(Boolean).join('/');
            rows.push([method.toUpperCase(), route, authentication, grants, scope]);
          }
        }
      }
    }
  });
}
const escapeCell = (value: string) => value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
console.log('# Ma trận route xác thực và quyền QLTB\n');
console.log('Sinh từ controller và route-policy.ts bằng `node -r ts-node/register scripts/export-auth-route-matrix.ts`. Phạm vi chi tiết cần đối chiếu service và nghiệm thu theo vai trò.\n');
console.log('Vai trò được phép: ADMIN/SUPER_ADMIN có hiệu lực hoặc tài khoản có ít nhất một quyền trong cột Quyền. Nhóm vô hiệu hóa không cấp quyền; tài khoản khóa bị từ chối. Route Public là ngoại lệ được khai báo rõ.\n');
console.log(`Tổng số route HTTP: ${rows.length}.\n`);
console.log('| Phương thức | Đường dẫn | Xác thực | Quyền | Nơi kiểm tra phạm vi |');
console.log('| --- | --- | --- | --- | --- |');
for (const row of rows) console.log('| ' + row.map(escapeCell).join(' | ') + ' |');
