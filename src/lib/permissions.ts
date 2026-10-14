import type { AccessScope, DB, PermissionKey, Profile } from "./types";

const WRITE_SUFFIXES = [
  "create",
  "update",
  "delete",
  "transfer_owner",
  "convert",
  "close",
  "activate",
  "manage",
];

export function roleOf(db: DB, user: Profile) {
  return db.roles.find((role) => role.id === user.roleId) ?? null;
}

export function permissionKeys(db: DB, user: Profile): Set<PermissionKey> {
  const ids = new Set(
    db.rolePermissions.filter((item) => item.roleId === user.roleId).map((item) => item.permissionId),
  );
  return new Set(
    db.permissions.filter((permission) => ids.has(permission.id)).map((permission) => permission.key),
  );
}

export function hasPermission(db: DB, user: Profile, key: PermissionKey): boolean {
  if (!user.isActive) return false;
  return permissionKeys(db, user).has(key);
}

export function teamOwnerIds(db: DB, user: Profile): Set<string> {
  const ids = new Set<string>([user.id]);
  for (const profile of db.profiles) {
    if (profile.managerId === user.id && profile.organizationId === user.organizationId) {
      ids.add(profile.id);
    }
  }
  return ids;
}

function scopeAllows(db: DB, user: Profile, ownerId: string, scope: AccessScope): boolean {
  if (scope === "all") return true;
  if (scope === "own") return ownerId === user.id;
  return teamOwnerIds(db, user).has(ownerId);
}

export function can(db: DB, user: Profile, key: PermissionKey, ownerId?: string | null): boolean {
  if (!hasPermission(db, user, key)) return false;
  if (ownerId == null) return true;
  const role = roleOf(db, user);
  if (!role) return false;
  const suffix = key.split(".").at(-1) ?? "";
  const scope = WRITE_SUFFIXES.includes(suffix) ? role.writeScope : role.readScope;
  return scopeAllows(db, user, ownerId, scope);
}

export function canReadRecord(
  db: DB,
  user: Profile,
  object: "lead" | "account" | "contact" | "opportunity" | "contract",
  ownerId: string,
  organizationId: string,
): boolean {
  if (organizationId !== user.organizationId) return false;
  return can(db, user, `${object}.read`, ownerId);
}
