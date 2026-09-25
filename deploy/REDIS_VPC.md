# Memorystore Redis + Cloud Run connectivity

The backend requires Redis in production. `src/core/redis.ts` intentionally refuses a missing `REDIS_URL` in production, and `/ready` verifies both PostgreSQL and Redis before reporting readiness.

## Recommended topology

```
Cloud Run
   |
   | Direct VPC egress
   v
VPC network/subnet
   |
   +--> Memorystore for Redis (private IP :6379)
   |
   +--> Cloud SQL PostgreSQL
```

Keep Redis private. Do not expose Memorystore to the public internet.

## Cloud Run settings

Configure the service with Direct VPC egress to the same VPC/subnet as Memorystore and use private-ranges-only egress when the service only needs VPC resources privately.

The checked-in `deploy/cloud-run.yaml` intentionally uses placeholders:
- `VPC_NETWORK`
- `VPC_SUBNET`
- `REDIS_URL`

Replace those values in the deployment configuration for the real GCP environment. Do not commit private production addresses or credentials unless they are deliberately non-secret infrastructure metadata.

## Redis URL

Set the production secret `hello-turist-redis-url` to:

```text
redis://MEMORYSTORE_PRIVATE_IP:6379
```

If TLS/authentication is enabled for the selected Redis deployment, use the connection format required by that deployment and store any credential in Secret Manager.

## Verification

After deployment:

1. `GET /health` should return HTTP 200.
2. `GET /ready` should return HTTP 200 with `database: "ok"` and `redis: "ok"`.
3. If Redis is unreachable, `/ready` must return HTTP 503 rather than marking the revision ready.
4. Exercise realtime/presence flows because those use Redis locks, presence TTLs and event streams.
5. Check Cloud Run logs for `REDIS_ERROR` and connection failures.

## Safety

Do not fall back to localhost Redis in production. Localhost is only the development default. Keep Firebase Phone Authentication and existing auth/token verification unchanged.
