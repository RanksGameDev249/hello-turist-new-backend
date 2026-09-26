-- audit_logs was already created by 20260914200000_add_audit_logs.
-- This migration only adds the indexes introduced later, preserving existing data
-- and the existing entity_type/entity_id index.
CREATE INDEX IF NOT EXISTS "audit_logs_actor_user_id_created_at_idx"
  ON "audit_logs"("actor_user_id", "created_at");

CREATE INDEX IF NOT EXISTS "audit_logs_action_created_at_idx"
  ON "audit_logs"("action", "created_at");

CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_created_at_idx"
  ON "audit_logs"("entity_type", "created_at");

CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx"
  ON "audit_logs"("created_at");
