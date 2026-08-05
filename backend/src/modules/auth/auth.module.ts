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
    // Fail-closed enforcement: crash application on start if Keycloak config is missing
    // Skip verification if running in test environment to avoid crashing Jest
    if (process.env.NODE_ENV !== 'test') {
      const jwksUri = this.configService.get<string>('KEYCLOAK_JWKS_URI');
      const issuer = this.configService.get<string>('KEYCLOAK_ISSUER');
      const audience = this.configService.get<string>('KEYCLOAK_AUDIENCE');

      if (!jwksUri || !issuer || !audience) {
        throw new Error(
          'CRITICAL CONFIGURATION ERROR: Keycloak environment variables (KEYCLOAK_JWKS_URI, KEYCLOAK_ISSUER, KEYCLOAK_AUDIENCE) must be defined.',
        );
      }
    }
  }
}
