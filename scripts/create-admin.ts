import "dotenv/config";

import bcrypt from "bcrypt";
import { prisma } from "../src/core/prisma";
import { ADMIN_PERMISSIONS } from "../src/middleware/rbac";

async function main() {
  const username = "admin";
  const email = "admin@hello-kurukshetra.com";
  const password = "Admin@123456";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      status: "ACTIVE",
      deletedAt: null,
    },
    create: {
      name: "System Admin",
      username,
      email,
      passwordHash,
      status: "ACTIVE",
    },
  });

  await prisma.userRoleAssignment.upsert({
    where: {
      userId_role: {
        userId: user.id,
        role: "ADMIN",
      },
    },
    update: {},
    create: {
      userId: user.id,
      role: "ADMIN",
      verificationStatus: "APPROVED",
    },
  });

  // Provision the default full admin permission set. Existing grants are preserved.
  for (const permission of ADMIN_PERMISSIONS) {
    await prisma.$executeRaw`
      INSERT INTO "admin_user_permissions" ("id", "user_id", "permission", "updated_at")
      VALUES (gen_random_uuid(), ${user.id}::uuid, ${permission}, CURRENT_TIMESTAMP)
      ON CONFLICT ("user_id", "permission") DO NOTHING
    `;
  }

  console.log("Admin user created successfully");
  console.log("Username:", username);
  console.log("User ID:", user.id);
}

main()
  .catch((error) => {
    console.error("CREATE_ADMIN_ERROR:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
