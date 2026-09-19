import { prisma } from "../src/core/prisma";
import { deletePrivateObject } from "../src/core/r2-delete";

const batchSize = 100;

async function main() {
  let processed = 0;
  let deleted = 0;
  let failed = 0;

  while (true) {
    const rows = await prisma.$queryRaw<Array<{ id: string; object_key: string }>>`
      SELECT id, object_key
      FROM ride_recordings
      WHERE retention_expires_at <= NOW()
        AND status IN ('UPLOADING', 'READY', 'FAILED')
      ORDER BY retention_expires_at ASC
      LIMIT ${batchSize}
    `;

    if (rows.length === 0) break;

    for (const row of rows) {
      processed++;
      try {
        await deletePrivateObject(row.object_key);
        await prisma.$executeRaw`
          UPDATE ride_recordings
          SET status = 'EXPIRED'
          WHERE id = ${row.id}::uuid
            AND retention_expires_at <= NOW()
            AND status IN ('UPLOADING', 'READY', 'FAILED')
        `;
        deleted++;
      } catch (error) {
        failed++;
        console.error(`Failed to expire recording ${row.id}:`, error);
      }
    }

    if (rows.length < batchSize) break;
  }

  console.log(JSON.stringify({ processed, deleted, failed }));
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
