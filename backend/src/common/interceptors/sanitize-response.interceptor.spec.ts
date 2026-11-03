import 'reflect-metadata';
import { of, lastValueFrom } from 'rxjs';
import { sanitizeData, SanitizeResponseInterceptor } from './sanitize-response.interceptor';

describe('sanitizeData', () => {
  it('preserves optimistic-lock versions while removing secrets', () => {
    expect(sanitizeData({
      id: 'work-order-id',
      version: 3,
      passwordHash: 'secret',
      equipment: { id: 'equipment-id', version: 7, clientSecret: 'secret' },
    })).toEqual({
      id: 'work-order-id',
      version: 3,
      equipment: { id: 'equipment-id', version: 7 },
    });
  });
  it('returns a rotated refresh pair only from the explicit auth response', async () => {
    const handler = () => {};
    Reflect.defineMetadata('auth:session-token-response', true, handler);
    const interceptor = new SanitizeResponseInterceptor();
    const data = { accessToken: 'access', refreshToken: 'rotated-refresh', password: 'must-never-leak' };
    const result = await lastValueFrom(interceptor.intercept({ getHandler: () => handler } as any, { handle: () => of(data) }));
    expect(result).toEqual({ accessToken: 'access', refreshToken: 'rotated-refresh' });
    const ordinary = await lastValueFrom(interceptor.intercept({ getHandler: () => () => {} } as any, { handle: () => of(data) }));
    expect(ordinary).toEqual({ accessToken: 'access' });
  });
});
