import { selectHrmIdentity, isHrmProfileActive } from './identity-resolution';

describe('exact HRM identity resolution', () => {
  const alice = { id: 'local-a', hrmId: '0012', name: 'Shared Name', email: 'a@example.test' };
  const bob = { id: 'local-b', hrmId: '12', name: 'Shared Name', email: 'b@example.test' };
  it('keeps same-name employees and leading-zero ids distinct', () => {
    expect(selectHrmIdentity([alice, bob], { id: '12', email: bob.email }).user).toBe(bob);
    expect(selectHrmIdentity([alice, bob], { id: '0012', email: alice.email }).user).toBe(alice);
  });
  it('requires review when email points at a different external identity', () => {
    const result = selectHrmIdentity([alice, bob], { id: '12', email: alice.email });
    expect(result.user).toBeNull();
    expect(result.reason).toBe('IDENTITY_RECONCILIATION_REQUIRED');
  });
  it('does not silently attach legacy users through local id or email', () => {
    expect(selectHrmIdentity([{ ...alice, hrmId: null }], { id: 'local-a' }).reason).toBeTruthy();
    expect(selectHrmIdentity([{ ...alice, hrmId: null }], { id: 'new', email: alice.email }).reason).toBeTruthy();
  });
  it('does not use names or shortened employee codes to select an account', () => {
    expect(selectHrmIdentity([alice, bob], { id: 'new', username: 'Shared Name' }).candidates).toEqual([]);
    expect(selectHrmIdentity([bob], { id: '0012' }).user).toBeNull();
  });
  it('does not let an employee-code alias override a verified external link', () => {
    const wrongLegacy = { id: '1120', hrmId: '1120', email: '1120@local.hrm', name: 'Employee A' };
    const verified = { id: '1125', hrmId: '1125', email: 'b@example.test', name: 'Employee B' };
    expect(selectHrmIdentity([wrongLegacy, verified], { id: '1125', username: '1120', email: verified.email }).user).toBe(verified);
  });
  it.each([{ isActive: false }, { is_active: false }, { status: 'inactive' }, { status: 0 }, { deleted_at: '2026-01-01' }])(
    'rejects inactive HRM profiles %o', profile => expect(isHrmProfileActive(profile)).toBe(false),
  );
});
