# Hello Turist — Google Cloud deployment

Target architecture:
- Cloud Run: Node/Express backend container
- Cloud SQL for PostgreSQL: primary application database
- Memorystore for Redis: realtime/presence/cache layer
- Firebase Authentication: phone OTP on the client; backend verifies Firebase ID tokens
- Firebase Cloud Messaging: push notifications
- Secret Manager: production secrets
- Artifact Registry: backend container images

Cloud Run should be connected to the Cloud SQL instance with the Cloud SQL connection and to the VPC containing Memorystore. Google currently recommends Direct VPC egress for Cloud Run -> Memorystore connectivity.

## Before deploy

1. Create a Cloud SQL PostgreSQL instance and database.
2. Create a Memorystore Redis instance in the VPC.
3. Create Artifact Registry repository `hello-turist`.
4. Create a dedicated Cloud Run service account and grant it Cloud SQL Client plus required Secret Manager access.
5. Store the values listed in `cloud-run.env.example` in Secret Manager.
6. Replace placeholders in `cloud-run.yaml` with the real project, region, instance and service-account values.
7. Configure the GitHub Actions deployment variables/secrets below.
8. Run the guarded **Deploy Backend to Cloud Run** workflow manually once the Google Cloud resources are ready.

## GitHub Actions deployment

Workflow: `.github/workflows/deploy-cloud-run.yml`

Required repository **Variables**:
- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GAR_REPOSITORY`
- `CLOUD_RUN_SERVICE`

Required repository **Secrets**:
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`

Optional repository **Variable**:
- `GCP_DEPLOY_ENABLED=true` — enables automatic deployment on pushes to `main`. It is intentionally disabled unless this variable is explicitly set.

The workflow uses GitHub OIDC / Workload Identity Federation, builds the Docker image, pushes it to Artifact Registry, and deploys the image to Cloud Run. No Google Cloud private keys are stored in the repository.

## Database URL

The existing `DATABASE_URL` contract is preserved. For Cloud SQL Unix sockets use `postgresql://USER:PASSWORD@/DB_NAME?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME`. Do not commit the real password.

## Redis

Set `REDIS_URL` to the private Memorystore address, e.g. `redis://10.x.x.x:6379`. Cloud Run needs VPC egress to reach this private IP.

## OTP/auth preservation

Do not replace the existing Firebase Phone Authentication flow. Production configuration expects Firebase ID-token verification on the backend; OTP delivery remains on the client through Firebase Phone Authentication.
