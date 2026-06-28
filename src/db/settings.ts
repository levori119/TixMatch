import { eq } from "drizzle-orm";
import { db } from "./index";
import { platformSettings, auditLog } from "./schema";

const SETTINGS_ID = 1;

export type PlatformSettings = typeof platformSettings.$inferSelect;

/** Read the single settings row, creating it with defaults if missing. */
export async function getSettings(): Promise<PlatformSettings> {
  const rows = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.id, SETTINGS_ID));
  if (rows[0]) return rows[0];

  const [created] = await db
    .insert(platformSettings)
    .values({ id: SETTINGS_ID })
    .returning();
  return created;
}

export type CommissionUpdate = {
  commissionBps: number;
  commissionFixedAgorot: number;
  updatedBy?: number | null;
};

/** Update commission settings and write an audit-log entry. */
export async function updateCommission(input: CommissionUpdate): Promise<PlatformSettings> {
  await getSettings(); // ensure the row exists

  const before = await getSettings();

  const [updated] = await db
    .update(platformSettings)
    .set({
      commissionBps: input.commissionBps,
      commissionFixedAgorot: input.commissionFixedAgorot,
      updatedAt: new Date(),
      updatedBy: input.updatedBy ?? null,
    })
    .where(eq(platformSettings.id, SETTINGS_ID))
    .returning();

  await db.insert(auditLog).values({
    actorId: input.updatedBy ?? null,
    action: "update_commission",
    entity: "platform_settings",
    entityId: String(SETTINGS_ID),
    payload: {
      before: {
        commissionBps: before.commissionBps,
        commissionFixedAgorot: before.commissionFixedAgorot,
      },
      after: {
        commissionBps: updated.commissionBps,
        commissionFixedAgorot: updated.commissionFixedAgorot,
      },
    },
  });

  return updated;
}
