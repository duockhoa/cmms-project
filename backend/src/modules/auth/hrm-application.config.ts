import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';

export function hrmApplicationConfig(config: ConfigService) {
  const id = String(config.get<string>('HRM_APPLICATION_ID') || '').trim();
  const key = String(config.get<string>('HRM_APPLICATION_KEY') || '').trim();
  if (!id || !key) {
    throw new ServiceUnavailableException('Thiếu cấu hình HRM_APPLICATION_ID hoặc HRM_APPLICATION_KEY.');
  }
  return { id, key };
}
