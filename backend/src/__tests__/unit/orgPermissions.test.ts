import {
  getOrgAccess,
  ORG_PERMISSIONS,
  roleHasPermission,
} from '../../permissions/orgPermissions';

describe('orgPermissions', () => {
  it('grants admins full member management permissions', () => {
    expect(roleHasPermission('admin', ORG_PERMISSIONS.MEMBERS_READ)).toBe(true);
    expect(roleHasPermission('admin', ORG_PERMISSIONS.MEMBERS_INVITE)).toBe(true);
    expect(roleHasPermission('admin', ORG_PERMISSIONS.MEMBERS_REMOVE)).toBe(true);
  });

  it('grants members read-only team visibility', () => {
    expect(roleHasPermission('user', ORG_PERMISSIONS.MEMBERS_READ)).toBe(true);
    expect(roleHasPermission('user', ORG_PERMISSIONS.MEMBERS_INVITE)).toBe(false);
    expect(roleHasPermission('user', ORG_PERMISSIONS.MEMBERS_REMOVE)).toBe(false);
  });

  it('treats member as user for backward compatibility', () => {
    expect(getOrgAccess('member')).toEqual(getOrgAccess('user'));
  });
});
