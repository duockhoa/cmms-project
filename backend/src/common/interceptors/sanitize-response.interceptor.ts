import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Danh sách các trường hệ thống / nội bộ tuyệt đối không xuất ra client
const FORBIDDEN_FIELDS = new Set([
  'password',
  'passwordHash',
  'tempPassword',
  'generationKey',
  'version',
  'classificationReporterId',
  'hashedRefreshToken',
  'refreshToken',
  'salt',
  'secret',
  'clientSecret',
]);

/**
 * Làm sạch đệ quy đối tượng trước khi chuyển thành JSON trả về cho Client
 */
export function sanitizeData(data: any): any {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const clean: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (FORBIDDEN_FIELDS.has(key)) {
        continue; // Bỏ qua không đưa vào kết quả trả về
      }
      clean[key] = sanitizeData(value);
    }
    return clean;
  }

  return data;
}

@Injectable()
export class SanitizeResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        return sanitizeData(data);
      })
    );
  }
}
