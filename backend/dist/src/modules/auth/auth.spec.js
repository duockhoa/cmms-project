"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
process.env.DATABASE_URL = `file:./test-auth.db`;
const core_1 = require("@nestjs/core");
const app_module_1 = require("../../app.module");
const prisma_service_1 = require("../../prisma/prisma.service");
const child_process_1 = require("child_process");
const fs = require("fs");
const path = require("path");
const request = require("supertest");
jest.setTimeout(30000);
describe('Authentication & Authorization Flow', () => {
    let app;
    let prisma;
    const testDbPath = path.join(__dirname, '..', '..', '..', 'prisma', 'test-auth.db');
    beforeAll(async () => {
        if (fs.existsSync(testDbPath)) {
            try {
                fs.unlinkSync(testDbPath);
            }
            catch (e) { }
        }
        (0, child_process_1.execSync)('npx prisma db push --accept-data-loss', {
            env: { ...process.env, DATABASE_URL: `file:./test-auth.db` },
            stdio: 'inherit',
        });
        const nestApp = await core_1.NestFactory.create(app_module_1.AppModule);
        app = nestApp;
        await app.init();
        prisma = app.get(prisma_service_1.PrismaService);
        await prisma.user.create({
            data: {
                id: 'user-admin-id',
                name: 'Admin User',
                email: 'admin@company.com',
                role: 'ADMIN',
                isActive: true,
            },
        });
        await prisma.user.create({
            data: {
                id: 'user-tech-id',
                name: 'Tech User',
                email: 'tech@company.com',
                role: 'TECHNICIAN',
                isActive: true,
            },
        });
    });
    afterAll(async () => {
        if (app) {
            await app.close();
        }
        if (fs.existsSync(testDbPath)) {
            try {
                fs.unlinkSync(testDbPath);
            }
            catch (e) { }
        }
    });
    it('should return 401 Unauthorized when requesting /auth/me without token', async () => {
        const res = await request(app.getHttpServer())
            .get('/auth/me')
            .expect(401);
        expect(res.body.message).toBe('Authentication token is missing, expired, or invalid.');
    });
    it('should return user info when authenticated via mock headers (ADMIN)', async () => {
        const res = await request(app.getHttpServer())
            .get('/auth/me')
            .set('x-test-user-id', 'user-admin-id')
            .set('x-test-roles', 'ADMIN')
            .expect(200);
        expect(res.body.authenticated).toBe(true);
        expect(res.body.user.role).toBe('ADMIN');
        expect(res.body.permissions).toContain('ALL');
    });
    it('should return user info when authenticated via mock headers (TECHNICIAN)', async () => {
        const res = await request(app.getHttpServer())
            .get('/auth/me')
            .set('x-test-user-id', 'user-tech-id')
            .set('x-test-roles', 'TECHNICIAN')
            .expect(200);
        expect(res.body.authenticated).toBe(true);
        expect(res.body.user.role).toBe('TECHNICIAN');
        expect(res.body.permissions).toContain('WORK_ORDER_EXECUTE');
        expect(res.body.permissions).not.toContain('ALL');
    });
});
//# sourceMappingURL=auth.spec.js.map