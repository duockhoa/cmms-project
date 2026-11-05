import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { UserMergeModal } from '../src/components/settings/UserMergeModal';
import * as auth from '../src/utils/authStorage';

const users = [
  { id: 'source', name: 'Nhân sự cũ', email: 'old@example.test', role: 'USER', isActive: false },
  { id: 'target', name: 'Nhân sự HRM', email: 'new@example.test', role: 'USER', hrmId: 'hrm', isActive: true },
];
let previews = 0;
let confirmations = 0;
let lastConfirmation: any;
window.fetch = async (input, options) => {
  const url = String(input);
  const body = JSON.parse(String(options?.body || '{}'));
  if (url.endsWith('/users/merge-preview')) {
    previews++;
    return Response.json({
      previewId: `preview-${previews}`, expiresAt: new Date(Date.now() + 600000).toISOString(),
      source: users[0], target: users[1], blockers: [], archivedEmail: 'merged@users.invalid',
      totalRecords: 3, totalReferences: 4,
      impact: [{ model: 'WorkOrder', field: 'assignedTechnicianId', count: 4, sampleIds: ['wo-test'] }],
      policy: 'Giữ quyền đích',
    });
  }
  if (url.endsWith('/users/merge-confirm')) {
    confirmations++;
    lastConfirmation = body;
    if (confirmations === 1) return Response.json({ message: 'Dữ liệu đã thay đổi; hãy xem trước lại.' }, { status: 409 });
    return Response.json({ auditId: 'audit-test', totalRecords: 3 });
  }
  throw new Error(`Unexpected request: ${url}`);
};
auth.clearAuthTokens();
const token = `e30.${btoa(JSON.stringify({ sub: 'actor', exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`;
auth.saveAuthTokens(token);
auth.markSessionVerified(token, 'actor');
function Fixture() {
  const [result, setResult] = useState<any>(null);
  return result ? <div id="merge-result">{result.auditId}</div> : <UserMergeModal users={users} initialSourceId="source" onClose={() => {}} onMerged={setResult} />;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
const tick = () => new Promise(resolve => setTimeout(resolve, 40));
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const waitFor = async (condition: () => boolean) => {
  for (let attempt = 0; attempt < 100; attempt++) { if (condition()) return; await tick(); }
  throw new Error('Timed out waiting for merge UI');
};
const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent?.includes(label))!;
const selectTarget = async (value: string) => {
  const target = document.querySelectorAll<HTMLSelectElement>('select')[1];
  target.value = value;
  target.dispatchEvent(new Event('change', { bubbles: true }));
  await tick();
};
const write = (element: HTMLTextAreaElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
};
async function run() {
  await waitFor(() => Boolean(button('Xem trước tác động')));
  assert(button('Xác nhận gộp').disabled, 'Confirmation enabled without preview');
  await selectTarget('target');
  button('Xem trước tác động').click();
  await waitFor(() => document.body.textContent!.includes('3 bản ghi / 4 liên kết'));
  assert(button('Xác nhận gộp').disabled, 'Confirmation enabled without proof');
  await selectTarget('');
  assert(!document.body.textContent!.includes('3 bản ghi / 4 liên kết'), 'Selection change retained old preview');
  await selectTarget('target');
  button('Xem trước tác động').click();
  await waitFor(() => document.querySelectorAll('textarea').length === 2);
  const fields = document.querySelectorAll<HTMLTextAreaElement>('textarea');
  write(fields[0], 'Đối soát tài khoản trùng từ hệ thống cũ');
  write(fields[1], 'Đã xác minh cùng mã nhân viên và hồ sơ HRM');
  await tick();
  assert(button('Xác nhận gộp').disabled, 'Confirmation enabled without identity checkbox');
  document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
  await tick();
  assert(!button('Xác nhận gộp').disabled, 'Valid merge is blocked');
  button('Xác nhận gộp').click();
  await waitFor(() => document.body.textContent!.includes('Dữ liệu đã thay đổi; hãy xem trước lại.'));
  assert(button('Xác nhận gộp').disabled, 'Stale preview remained usable');
  button('Xem trước tác động').click();
  await waitFor(() => document.querySelectorAll('textarea').length === 2);
  document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
  await tick();
  button('Xác nhận gộp').click();
  await waitFor(() => Boolean(document.querySelector('#merge-result')));
  assert(lastConfirmation.previewId === 'preview-3' && lastConfirmation.confirmed === true, 'Incorrect preview submitted');
  assert(!('sourceUserId' in lastConfirmation) && !('targetUserId' in lastConfirmation), 'Client bypassed server-bound identities');
  return { passed: true, checks: ['preview required', 'impact shown', 'selection invalidates preview', 'proof required', 'identity checkbox required', 'stale preview rejected', 'confirmed merge returns audit ID'] };
}
(window as any).userMergeBrowserResult = run().catch(error => ({ passed: false, error: error.stack || error.message }));
