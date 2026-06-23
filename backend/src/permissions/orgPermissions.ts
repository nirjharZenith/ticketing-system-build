export const ORG_PERMISSIONS = {
  MEMBERS_READ: 'members:read',
  MEMBERS_INVITE: 'members:invite',
  MEMBERS_REMOVE: 'members:remove',
} as const;

export type OrgPermission = (typeof ORG_PERMISSIONS)[keyof typeof ORG_PERMISSIONS];
export type OrgRole = 'admin' | 'user';

const ROLE_PERMISSIONS: Record<OrgRole, OrgPermission[]> = {
  admin: [
    ORG_PERMISSIONS.MEMBERS_READ,
    ORG_PERMISSIONS.MEMBERS_INVITE,
    ORG_PERMISSIONS.MEMBERS_REMOVE,
  ],
  user: [ORG_PERMISSIONS.MEMBERS_READ],
};

export const normalizeOrgRole = (role: string): OrgRole | null => {
  if (role === 'admin') return 'admin';
  if (role === 'user' || role === 'member') return 'user';
  return null;
};

export const roleHasPermission = (role: string, permission: OrgPermission): boolean => {
  const normalizedRole = normalizeOrgRole(role);
  if (!normalizedRole) return false;
  return ROLE_PERMISSIONS[normalizedRole].includes(permission);
};

export const getOrgAccess = (role: string) => {
  const normalizedRole = normalizeOrgRole(role) ?? 'user';

  return {
    role: normalizedRole,
    canReadMembers: roleHasPermission(normalizedRole, ORG_PERMISSIONS.MEMBERS_READ),
    canInviteMembers: roleHasPermission(normalizedRole, ORG_PERMISSIONS.MEMBERS_INVITE),
    canRemoveMembers: roleHasPermission(normalizedRole, ORG_PERMISSIONS.MEMBERS_REMOVE),
  };
};
