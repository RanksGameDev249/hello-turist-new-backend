CREATE TABLE "admin_user_permissions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "permission" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_user_permissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "admin_user_permissions_user_id_permission_key"
  ON "admin_user_permissions"("user_id", "permission");
CREATE INDEX "admin_user_permissions_user_id_idx"
  ON "admin_user_permissions"("user_id");
CREATE INDEX "admin_user_permissions_permission_idx"
  ON "admin_user_permissions"("permission");

INSERT INTO "admin_user_permissions" ("id", "user_id", "permission", "updated_at")
SELECT gen_random_uuid(), ur."user_id", p.permission, CURRENT_TIMESTAMP
FROM "user_roles" ur
CROSS JOIN (
  VALUES
    ('users.read'), ('users.manage'),
    ('drivers.verify'), ('guides.verify'),
    ('rides.read'), ('rides.manage'),
    ('payments.read'), ('payments.refund'),
    ('emergency.read'), ('emergency.manage'),
    ('notifications.read'), ('notifications.manage'),
    ('promotions.read'), ('promotions.manage'),
    ('support.read'), ('support.manage'),
    ('pricing.read'), ('pricing.manage'),
    ('branding.read'), ('branding.manage'),
    ('remote_ui.read'), ('remote_ui.manage'),
    ('analytics.read'),
    ('audit.read'),
    ('admin.permissions.read'), ('admin.permissions.manage')
) AS p(permission)
WHERE ur."role" = 'ADMIN'
ON CONFLICT ("user_id", "permission") DO NOTHING;
