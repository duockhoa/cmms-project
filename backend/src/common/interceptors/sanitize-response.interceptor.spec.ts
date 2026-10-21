import { sanitizeData } from './sanitize-response.interceptor';

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
});
