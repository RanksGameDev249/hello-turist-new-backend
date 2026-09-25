# Prisma production migrations

The backend uses Prisma 7 with the PostgreSQL adapter. Production database changes must be applied with Prisma's migration workflow; do not use `prisma db push` against Cloud SQL.

## First migration baseline

This repository currently has no committed `prisma/migrations` history. Before the first production deployment, create a baseline migration from the exact schema intended for Cloud SQL.

From a clean checkout with the target `DATABASE_URL`:

```bash
npx prisma migrate dev --name init
```

Review the generated SQL before committing it. The baseline migration becomes the source of truth for future deployments.

If the Cloud SQL database already contains tables created outside Prisma, do **not** run `migrate dev` against it blindly. Introspect and reconcile the existing database first, then mark the reviewed baseline as applied with Prisma's migration tooling.

## CI/deployment rule

Once `prisma/migrations` exists, production deployment should run:

```bash
npx prisma migrate deploy
```

Run it against the production `DATABASE_URL` before starting the new application revision. Keep migrations backward-compatible where possible so an old and new revision can overlap during Cloud Run rollout.

## Safety rules

- Never commit `DATABASE_URL`, passwords, service-account keys, or other production secrets.
- Never use `prisma db push` for production.
- Review destructive migration SQL before deployment.
- Take a Cloud SQL backup before the first production migration and before high-risk schema changes.
- Preserve the existing Firebase Phone Authentication / backend Firebase ID-token verification flow; database migration must not alter auth behavior.

## Cloud Run ordering

Recommended release order:

1. Build and push the immutable image tagged with the Git commit SHA.
2. Run `npx prisma migrate deploy` against Cloud SQL.
3. Deploy that same image to Cloud Run.
4. Verify `/health` and `/ready`.
5. Run critical auth, verification, ride, payment, notification and realtime smoke checks.

The deployment workflow currently builds and deploys the image. The migration step should be enabled only after the Cloud SQL connection and baseline migration have been validated.
