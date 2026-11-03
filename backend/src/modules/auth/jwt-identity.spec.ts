import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as passport from 'passport';
import { JwtStrategy } from './jwt.strategy';

describe('passport JWT identity boundary', () => {
  const secret = 'identity-tests-only-not-a-production-secret';
  const jwt = new JwtService({ secret });
  let identities: any;
  const account = { id: 'local-b', hrmId: '1120', email: 'b@example.test', name: 'Outdated Name', role: 'USER', isActive: true };
  const verify = (headers: any, url = '/api/v1/auth/me') => new Promise<any>((resolve, reject) => {
    passport.authenticate('jwt', { session: false }, (error: any, user: any) => error ? reject(error) : resolve(user))(
      { headers, originalUrl: url } as any, {} as any, reject,
    );
  });
  beforeEach(() => {
    identities = {
      getProfile: jest.fn().mockResolvedValue({ id: '1120', name: 'Verified Employee B' }),
      resolve: jest.fn().mockResolvedValue(account),
    };
    new JwtStrategy({ get: (key: string) => key === 'HRM_JWT_SECRET' ? secret : undefined } as ConfigService, {} as any, identities);
  });
  it('uses verified HRM identity and name rather than token employee code/name', async () => {
    const token = jwt.sign({ sub: 'unrelated-employee-code', name: 'Wrong Employee A' });
    const user = await verify({ authorization: `Bearer ${token}` });
    expect(user.id).toBe('local-b');
    expect(user.name).toBe('Verified Employee B');
    expect(user.identity).toEqual({ provider: 'hrm', subject: '1120' });
    expect(identities.getProfile).toHaveBeenCalledWith(token, true);
  });
  it('regression: employee code 1120 must resolve to verified HRM id 1125, not the account with id 1120', async () => {
    identities.getProfile.mockResolvedValue({ id: '1125', name: 'Employee B' });
    identities.resolve.mockResolvedValue({ ...account, id: '1125', hrmId: '1125' });
    const token = jwt.sign({ sub: '1120', username: '1120' });
    const user = await verify({ authorization: `Bearer ${token}` });
    expect(user.id).toBe('1125');
    expect(identities.resolve).toHaveBeenCalledWith({ id: '1125', name: 'Employee B' });
  });
  it('rejects expired tokens before consulting HRM or local users', async () => {
    const token = jwt.sign({ sub: 'b', exp: 1 });
    expect(await verify({ authorization: `Bearer ${token}` })).toBe(false);
    expect(identities.getProfile).not.toHaveBeenCalled();
  });
  it('rejects cookie-only requests with multiple sessions', async () => {
    const a = jwt.sign({ sub: 'a' }), b = jwt.sign({ sub: 'b' });
    expect(await verify({ cookie: `accessToken=${a}; access_token=${b}` })).toBe(false);
    expect(identities.getProfile).not.toHaveBeenCalled();
  });
  it('accepts a consistent cookie pair and rechecks local inactivity', async () => {
    const token = jwt.sign({ sub: 'b' });
    expect((await verify({ cookie: `accessToken=${token}; access_token=${token}` })).id).toBe('local-b');
    identities.resolve.mockResolvedValue({ ...account, isActive: false });
    await expect(verify({ authorization: `Bearer ${token}` })).rejects.toThrow();
  });
});
