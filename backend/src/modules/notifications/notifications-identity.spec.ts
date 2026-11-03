import { NotificationsGateway } from './notifications.gateway';
import { authenticate } from 'passport';

jest.mock('passport', () => ({ authenticate: jest.fn() }));
describe('notification identity', () => {
  let gateway: NotificationsGateway;
  let client: any;
  beforeEach(() => {
    jest.useFakeTimers();
    gateway = new NotificationsGateway();
    client = { id: 'socket', connected: true, handshake: { auth: { token: 'verified-token' }, query: { userId: 'forged-a', role: 'ADMIN', department: 'Other' } },
      join: jest.fn(), disconnect: jest.fn(() => gateway.handleDisconnect(client)) };
    (authenticate as jest.Mock).mockImplementation((_strategy, _options, callback) => (_request: any) => callback(null, {
      id: 'verified-b', role: 'USER', department: 'QA',
    }));
  });
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); jest.clearAllMocks(); });
  it('joins only rooms derived from the authenticated account, ignoring forged query fields', async () => {
    await gateway.handleConnection(client);
    expect(client.join.mock.calls.map(([room]: any) => room)).toEqual(['user:verified-b', 'role:USER', 'dept:QA', 'global']);
  });
  it('disconnects unauthenticated clients before joining any room', async () => {
    delete client.handshake.auth.token;
    await gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });
  it('disconnects when the session is revoked after connection', async () => {
    await gateway.handleConnection(client);
    (authenticate as jest.Mock).mockImplementation((_strategy, _options, callback) => () => callback(new Error('revoked')));
    await jest.advanceTimersByTimeAsync(30000);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });
});
