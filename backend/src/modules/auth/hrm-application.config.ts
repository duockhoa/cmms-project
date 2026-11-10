import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';

export function hrmApplicationConfig(config: ConfigService) {
  const id = String(config.get<string>('HRM_APPLICATION_ID') || '').trim();
  const key = String(config.get<string>('HRM_APPLICATION_KEY') || '').trim();
  if (!id || !key) {
    return null;
  }
  return { id, key };
}
