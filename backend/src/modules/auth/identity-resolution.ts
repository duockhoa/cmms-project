/** HRM identity is an exact external key. Names and employee codes are not keys. */
export function selectHrmIdentity(users: any[], profile: { id: string | number; email?: string; username?: string }) {
  users = users.filter(user => !user.mergedIntoId);
  const hrmId = String(profile.id);
  const email = profile.email?.trim().toLowerCase();
  const legacyEmails = new Set([
    email,
    `${hrmId}@local.hrm`,
    ...(profile.username ? [`${profile.username}@local.hrm`] : []),
  ].filter(Boolean));
  const linked = users.filter(user => user.hrmId === hrmId);
  const candidates = users.filter(user =>
    user.hrmId === hrmId || user.id === hrmId || legacyEmails.has(user.email?.toLowerCase()),
  );
  // A verified external link has priority over legacy local ids and dummy employee-code
  // emails. Those belong to different namespaces and cannot override an established link.
  const emailConflict = linked.length === 1 && email && users.some(user =>
    user.id !== linked[0].id && user.email?.trim().toLowerCase() === email,
  );
  if (linked.length === 1 && !emailConflict) {
    return { user: linked[0], reason: null, candidates: [linked[0]] };
  }
  return {
    user: null,
    reason: candidates.length ? 'IDENTITY_RECONCILIATION_REQUIRED' : null,
    candidates,
  };
}

export function isHrmProfileActive(profile: any): boolean {
  const inactive = (process.env.HRM_INACTIVE_STATUSES || 'INACTIVE,BANNED,DISABLED,TERMINATED,0')
    .split(',').map(value => value.trim().toUpperCase());
  const status = String(profile.status ?? '').trim().toUpperCase();
  const active = (process.env.HRM_ACTIVE_STATUSES || 'ACTIVE,1').split(',').map(value => value.trim().toUpperCase());
  return profile.isActive !== false && profile.is_active !== false && profile.is_active !== 0 && !profile.deleted_at &&
    !inactive.includes(status) && (status ? active.includes(status) : profile.isActive === true || profile.is_active === true || profile.is_active === 1);
}

export function buildIdentityAudit(users: any[]) {
  users = users.filter(user => !user.mergedIntoId);
  const issues: { code: string; userIds: string[] }[] = [];
  const names = new Map<string, string[]>();
  const ids = new Map(users.map(user => [user.id, user]));
  for (const user of users) {
    if (!user.hrmId && (user.dataSource === 'HRM' || user.email.endsWith('@local.hrm'))) {
      issues.push({ code: 'MISSING_HRM_LINK', userIds: [user.id] });
    }
    if (user.hrmId && user.hrmId !== user.id && ids.has(user.hrmId)) {
      issues.push({ code: 'LEGACY_ID_COLLISION', userIds: [user.id, user.hrmId] });
    }
    const key = user.name.trim().toLowerCase();
    names.set(key, [...(names.get(key) || []), user.id]);
  }
  for (const userIds of names.values()) {
    if (userIds.length > 1) issues.push({ code: 'SAME_NAME_REVIEW_ONLY', userIds });
  }
  return { readOnly: true, totalUsers: users.length, issues };
}
