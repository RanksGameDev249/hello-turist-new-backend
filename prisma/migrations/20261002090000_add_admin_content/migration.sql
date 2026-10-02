CREATE TABLE "homestays" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "address" TEXT NOT NULL,
  "city" TEXT,
  "latitude" DECIMAL(10,7) NOT NULL,
  "longitude" DECIMAL(10,7) NOT NULL,
  "place_id" TEXT,
  "image_url" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "website" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "homestays_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "homestays_city_is_active_idx" ON "homestays"("city","is_active");

CREATE TABLE "sponsors" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "address" TEXT,
  "city" TEXT,
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "place_id" TEXT,
  "image_url" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "website" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sponsors_city_is_active_idx" ON "sponsors"("city","is_active");

CREATE TABLE "business_partners" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "address" TEXT,
  "city" TEXT,
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "place_id" TEXT,
  "image_url" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "website" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_partners_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "business_partners_city_is_active_idx" ON "business_partners"("city","is_active");

INSERT INTO "admin_user_permissions" ("id","user_id","permission","updated_at")
SELECT gen_random_uuid(), ur."user_id", p.permission, CURRENT_TIMESTAMP
FROM "user_roles" ur
CROSS JOIN (VALUES ('content.read'),('content.manage')) AS p(permission)
WHERE ur."role"='ADMIN'
ON CONFLICT ("user_id","permission") DO NOTHING;
