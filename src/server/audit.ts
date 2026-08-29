import { db } from "./db";

export type AuditActorType = "SELLER" | "SUPERADMIN" | "SYSTEM";

export async function recordAudit(
  actorType: AuditActorType,
  actorId: number | null,
  actionCode: string,
  targetType: string | null = null,
  targetId: number | null = null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await db.execute(
    "INSERT INTO audit_logs (actor_type, actor_id, action_code, target_type, target_id, metadata_json) VALUES (?, ?, ?, ?, ?, ?)",
    [actorType, actorId, actionCode, targetType, targetId, JSON.stringify(metadata)],
  );
}

export function recordAuditSafely(
  actorType: AuditActorType,
  actorId: number | null,
  actionCode: string,
  targetType: string | null = null,
  targetId: number | null = null,
  metadata: Record<string, unknown> = {},
): void {
  void recordAudit(actorType, actorId, actionCode, targetType, targetId, metadata).catch((error: unknown) => {
    console.error("Pencatatan aktivitas gagal.", error);
  });
}
