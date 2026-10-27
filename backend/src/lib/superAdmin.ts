import { dbStore, Role, UserRecord } from "./db";
import { env } from "../config/env";

/**
 * Keep super-admin identity tied to the account ID recorded by the 2FA policy,
 * so changing that account's email does not remove its organization privileges.
 */
export function getDesignatedSuperAdmin(): UserRecord | undefined {
  const setting = dbStore.securitySettings.find((record) => record.id === "global");
  const designated = setting?.updatedBy ? dbStore.findUserById(setting.updatedBy) : undefined;
  if (designated?.role === "ADMINISTRATOR") return designated;

  const configured = dbStore.findUserByEmail(env.SUPER_ADMIN_EMAIL);
  return configured?.role === "ADMINISTRATOR" ? configured : undefined;
}

export function isDesignatedSuperAdmin(userId: string, role: Role): boolean {
  return role === "ADMINISTRATOR" && getDesignatedSuperAdmin()?.id === userId;
}
