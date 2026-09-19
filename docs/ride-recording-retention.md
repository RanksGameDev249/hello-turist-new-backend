# Ride recording retention

The ride recording lifecycle stores only private R2 object references in PostgreSQL. Expired records are removed by `npm run maintenance:expire-ride-recordings`.

The maintenance job is intentionally not exposed through HTTP. Configure a daily scheduler in the deployment environment to invoke it with the same environment variables used by the API.
