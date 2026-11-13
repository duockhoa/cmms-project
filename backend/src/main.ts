import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomLogger } from './common/logger/custom.logger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import { json, urlencoded } from 'express';
import { SanitizeResponseInterceptor } from './common/interceptors/sanitize-response.interceptor';
import { browserOrigin, allowedBrowserOrigins } from './common/auth/browser-origin';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new CustomLogger(),
  });
  const configService = app.get(ConfigService);
  const trustedProxy = configService.get<string>('TRUST_PROXY');
  if (trustedProxy) app.getHttpAdapter().getInstance().set('trust proxy', trustedProxy.split(',').map(value => value.trim()));

  // Enable HTTP response compression (Gzip/Deflate) to minimize payload transfer size
  app.use(compression());
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));

  app.enableCors({
    origin: browserOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  // CORS controls response visibility; also reject browser writes from other origins.
  app.use((req: any, res: any, next: any) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && !allowedBrowserOrigins().has(req.headers.origin)) {
      return res.status(403).json({ message: 'Browser origin is not allowed.' });
    }
    next();
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global data sanitization interceptor to prevent internal/sensitive field leakage
  app.useGlobalInterceptors(new SanitizeResponseInterceptor());

  // API versioning - all routes prefixed with /api/v1, except OAuth auto-discovery
  app.setGlobalPrefix('api/v1', {
    exclude: [
      '/.well-known/oauth-authorization-server',
      '/.well-known/openid-configuration',
      '/.well-known/oauth-protected-resource',
    ],
  });

  // Swagger Configuration (Public API Docs - no login required)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('DK Pharma CMMS - API Documentation')
    .setDescription('Tài liệu API đầy đủ của hệ thống Quản lý Thiết bị & Bảo trì (CMMS). Hỗ trợ tích hợp cho ứng dụng di động, giao diện web, hệ thống MES, SCADA, IoT và các dịch vụ nội bộ.')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      description: 'Nhập access token nhận được từ API /api/v1/auth/login theo định dạng: Bearer <token>',
      in: 'header',
    })
    .addTag('Auth (Xác thực & Phiên làm việc)', 'Các API đăng nhập, lấy thông tin cá nhân và quản lý phiên người dùng')
    .addTag('Equipment', 'Quản lý thông tin thiết bị, tra cứu, import Excel và tạo mới')
    .addTag('Cụm chức năng thiết bị', 'Cụm cơ cấu con của thiết bị, import hàng loạt từ Excel và liên kết thư viện')
    .addTag('Thư viện cụm chức năng', 'Danh mục chuẩn hóa cụm chức năng dùng chung toàn nhà máy')
    .addTag('Thông số giám sát thiết bị', 'Thông số vận hành, đo đạc hàng ngày và gán từ danh mục chuẩn')
    .addTag('Thông số kỹ thuật thiết bị', 'Thông số kỹ thuật, catalogue và đặc tính thiết kế của máy')
    .addTag('Nhật ký vận hành thiết bị', 'Ghi chép và hủy ca ghi nhận nhật ký vận hành')
    .addTag('OEE Records (Hiệu suất thiết bị)', 'Thu thập và tính toán A x P x Q, tích hợp máy đo và phần mềm MES/SCADA bên ngoài')
    .addTag('Requests (Yêu cầu sự cố / Bảo trì)', 'Gửi báo cáo sự cố, duyệt, từ chối, trả lại và chuyển đổi thành Work Order')
    .addTag('Work Orders', 'Quản lý phiếu giao việc, quét QR, tiến độ sửa chữa, biên bản bàn giao và nghiệm thu QA')
    .addTag('Schedules (Kế hoạch bảo trì)', 'Lập lịch định kỳ, kích hoạt, tạm dừng và tự động sinh phiếu bảo trì đến hạn')
    .addTag('Inventory (Kho vật tư & Phụ tùng)', 'Kho phụ tùng thay thế, phiếu xuất kho trực tiếp, nhập kho và báo cáo tồn kho')
    .addTag('Checklists (Thực thi Checklist)', 'Thực hiện kiểm tra định kỳ, bảo trì phòng ngừa theo từng đầu việc')
    .addTag('Checklist Templates (Biểu mẫu Checklist)', 'Cấu hình mẫu kiểm tra theo loại máy hoặc quy trình')
    .addTag('Checklist Library', 'Thư viện câu hỏi và đầu mục kiểm tra chuẩn')
    .addTag('Utilities (Hệ thống phụ trợ / Năng lượng)', 'Theo dõi chỉ số điện, nước, khí nén, hơi và các điểm đo tiện ích')
    .addTag('Fabrication (Chế tạo & Cải tiến)', 'Theo dõi tiến độ đề xuất gia công, cải tiến máy móc và hỗ trợ kỹ thuật')
    .addTag('Analytics (Báo cáo & KPI)', 'Dashboard tổng quan, KPI phản hồi sự cố 4h, báo cáo thời gian chạy máy')
    .addTag('Feedbacks (Ý kiến phản hồi)', 'Tiếp nhận và xử lý phản ánh chất lượng vận hành từ các xưởng')
    .addTag('Notifications (Thông báo)', 'Danh sách thông báo nội bộ và đánh dấu đã đọc')
    .addTag('Attachments (Tệp đính kèm)', 'Tải lên và tải xuống hình ảnh hiện trường, tài liệu PDF, biên bản')
    .addTag('Users', 'Quản lý tài khoản, gán bộ phận và phân quyền nhân sự')
    .addTag('Settings (Cài đặt danh mục)', 'Quản lý loại thiết bị, vị trí nhà xưởng, dây chuyền sản xuất')
    .addTag('Roles', 'Quản lý nhóm quyền và ma trận phân quyền RBAC')
    .addTag('Health', 'Kiểm tra trạng thái hoạt động của máy chủ và kết nối Cơ sở dữ liệu')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const swaggerOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'DK Pharma CMMS - API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  };
  // Mount under /api/v1/docs so production Nginx /api/ proxy serves it directly without login
  SwaggerModule.setup('docs', app, document, {
    ...swaggerOptions,
    useGlobalPrefix: true,
  });
  // Keep /docs for local development convenience
  SwaggerModule.setup('docs', app, document, swaggerOptions);

  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  console.log(`🚀 NestJS Backend server listening on http://localhost:${port}`);
  console.log(`📄 Swagger docs available at http://localhost:${port}/api/v1/docs (and /docs)`);
}
bootstrap();
