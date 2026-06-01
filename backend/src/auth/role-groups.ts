import { UserRole } from '../users/users.entity';

export const OWNER_ROLES: readonly UserRole[] = [UserRole.OWNER];

export const OWNER_ADMIN_ROLES: readonly UserRole[] = [UserRole.OWNER, UserRole.ADMIN];

export const STAFF_ROLES: readonly UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MODERATOR,
];

export const ADMIN_PANEL_ROLES: readonly UserRole[] = STAFF_ROLES;

export const DASHBOARD_ACCESS_ROLES: readonly UserRole[] = OWNER_ADMIN_ROLES;

export const ADMINISTRATORS_ACCESS_ROLES: readonly UserRole[] = OWNER_ROLES;

export const MODERATORS_ACCESS_ROLES: readonly UserRole[] = OWNER_ADMIN_ROLES;

export const USERS_ACCESS_ROLES: readonly UserRole[] = OWNER_ADMIN_ROLES;

export const PRODUCTS_ACCESS_ROLES: readonly UserRole[] = STAFF_ROLES;

export const ORDERS_ACCESS_ROLES: readonly UserRole[] = STAFF_ROLES;

export const CATALOGS_ACCESS_ROLES: readonly UserRole[] = STAFF_ROLES;

export const CATEGORIES_ACCESS_ROLES: readonly UserRole[] = STAFF_ROLES;

export const REVIEWS_MANAGE_ROLES: readonly UserRole[] = STAFF_ROLES;

export const FULL_ACCESS_ROLES: readonly UserRole[] = OWNER_ROLES;

export const OWNER_MANAGEABLE_ROLES: readonly UserRole[] = [
  UserRole.ADMIN,
  UserRole.MODERATOR,
  UserRole.USER,
];

export const ADMIN_MANAGEABLE_ROLES: readonly UserRole[] = [UserRole.MODERATOR, UserRole.USER];

export const MODERATOR_MANAGEABLE_ROLES: readonly UserRole[] = [];

export const PRIVILEGED_ROLES: readonly UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MODERATOR,
];

export const ROLE_PRIORITY: Record<UserRole, number> = {
  [UserRole.USER]: 0,
  [UserRole.MODERATOR]: 1,
  [UserRole.ADMIN]: 2,
  [UserRole.OWNER]: 3,
};

export const isUserRole = (role: unknown): role is UserRole => {
  if (typeof role !== 'string') return false;

  return (Object.values(UserRole) as string[]).includes(role);
};

export const hasRoleAccess = (role: unknown, allowedRoles: readonly UserRole[]): boolean => {
  if (!isUserRole(role)) return false;

  return allowedRoles.includes(role);
};

export const isPrivilegedRole = (role: unknown): role is UserRole => {
  if (!isUserRole(role)) return false;

  return PRIVILEGED_ROLES.includes(role);
};

export const canManageRole = (actorRole: UserRole, targetRole: UserRole): boolean => {
  return ROLE_PRIORITY[actorRole] > ROLE_PRIORITY[targetRole];
};

export const canAssignRole = (actorRole: UserRole, targetRole: UserRole): boolean => {
  return ROLE_PRIORITY[actorRole] > ROLE_PRIORITY[targetRole];
};

export const canManageUserRole = (actorRole: unknown, targetRole: unknown): boolean => {
  if (!isUserRole(actorRole) || !isUserRole(targetRole)) {
    return false;
  }

  return canManageRole(actorRole, targetRole);
};

export const canAssignUserRole = (actorRole: unknown, targetRole: unknown): boolean => {
  if (!isUserRole(actorRole) || !isUserRole(targetRole)) {
    return false;
  }

  return canAssignRole(actorRole, targetRole);
};

export const getManageableRoles = (actorRole: unknown): readonly UserRole[] => {
  if (!isUserRole(actorRole)) return [];

  if (actorRole === UserRole.OWNER) return OWNER_MANAGEABLE_ROLES;
  if (actorRole === UserRole.ADMIN) return ADMIN_MANAGEABLE_ROLES;

  return MODERATOR_MANAGEABLE_ROLES;
};
