import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [JwtStrategy],
  exports: [PassportModule],
})
export class AuthModule {
  constructor(private configService: ConfigService) {
    // Không kiểm tra biến môi trường khi chạy Jest
    if (process.env.NODE_ENV !== 'test') {
      const hrmJwtSecret =
        this.configService.get<string>('HRM_JWT_SECRET');

      const jwksUri =
        this.configService.get<string>('KEYCLOAK_JWKS_URI');
      const issuer =
        this.configService.get<string>('KEYCLOAK_ISSUER');
      const audience =
        this.configService.get<string>('KEYCLOAK_AUDIENCE');

      const hasHrmJwt = Boolean(hrmJwtSecret);
      const hasKeycloak = Boolean(jwksUri && issuer && audience);

      // Backend chỉ dừng nếu cả HRM JWT và Keycloak đều chưa được cấu hình
      if (!hasHrmJwt && !hasKeycloak) {
        throw new Error(
          'CRITICAL CONFIGURATION ERROR: Define HRM_JWT_SECRET or complete Keycloak configuration.',
        );
      }
    }
  }
}
