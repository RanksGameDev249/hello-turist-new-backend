# Ride recording retention maintenance

Run `npm run maintenance:expire-ride-recordings` from a trusted backend maintenance environment.

The job deletes expired private R2 objects first, then marks their database rows `EXPIRED`. It processes at most 100 rows per batch and exits non-zero if any object deletion fails, so failed rows remain retryable.

Recommended deployment: invoke this command from the platform's scheduler at least daily. Do not expose it as an HTTP endpoint.
