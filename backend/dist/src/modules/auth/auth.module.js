"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const jwt_strategy_1 = require("./jwt.strategy");
const config_1 = require("@nestjs/config");
const auth_controller_1 = require("./auth.controller");
const prisma_module_1 = require("../../prisma/prisma.module");
let AuthModule = class AuthModule {
    constructor(configService) {
        this.configService = configService;
        if (process.env.NODE_ENV !== 'test') {
            const jwksUri = this.configService.get('KEYCLOAK_JWKS_URI');
            const issuer = this.configService.get('KEYCLOAK_ISSUER');
            const audience = this.configService.get('KEYCLOAK_AUDIENCE');
            if (!jwksUri || !issuer || !audience) {
                throw new Error('CRITICAL CONFIGURATION ERROR: Keycloak environment variables (KEYCLOAK_JWKS_URI, KEYCLOAK_ISSUER, KEYCLOAK_AUDIENCE) must be defined.');
            }
        }
    }
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            config_1.ConfigModule,
            prisma_module_1.PrismaModule,
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [jwt_strategy_1.JwtStrategy],
        exports: [passport_1.PassportModule],
    }),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AuthModule);
//# sourceMappingURL=auth.module.js.map