-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'SUV', 'SEDAN', 'HATCHBACK', 'VAN', 'BUS', 'OTHER');

-- CreateTable
CREATE TABLE "driver_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "bio" TEXT,
    "experience_years" INTEGER,
    "service_city" TEXT,
    "service_area" TEXT,
    "profile_image_key" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guide_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "bio" TEXT,
    "experience_years" INTEGER,
    "service_city" TEXT,
    "profile_image_key" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_available" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "guide_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "driver_profile_id" UUID NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "registration_number" TEXT NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL DEFAULT 'CAR',
    "seat_count" INTEGER NOT NULL,
    "color" TEXT,
    "image_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "driver_profiles_user_id_key" ON "driver_profiles"("user_id");
CREATE INDEX "driver_profiles_service_city_idx" ON "driver_profiles"("service_city");
CREATE INDEX "driver_profiles_is_available_idx" ON "driver_profiles"("is_available");
CREATE UNIQUE INDEX "guide_profiles_user_id_key" ON "guide_profiles"("user_id");
CREATE INDEX "guide_profiles_service_city_idx" ON "guide_profiles"("service_city");
CREATE INDEX "guide_profiles_is_available_idx" ON "guide_profiles"("is_available");
CREATE UNIQUE INDEX "vehicles_registration_number_key" ON "vehicles"("registration_number");
CREATE INDEX "vehicles_driver_profile_id_idx" ON "vehicles"("driver_profile_id");
CREATE INDEX "vehicles_is_active_idx" ON "vehicles"("is_active");

ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guide_profiles" ADD CONSTRAINT "guide_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
