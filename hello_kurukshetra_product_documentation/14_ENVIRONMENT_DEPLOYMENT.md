# Environment and Deployment Specification

## Environments
### Development
Local services or managed dev resources. Synthetic data only.

### Staging
Production-like topology, sandbox payment credentials and test maps/project.

### Production
Isolated credentials, private networking, managed secrets, backups, monitoring and incident response.

## Required configuration
- Database URL
- Redis URL
- JWT signing/verification configuration
- Google Maps credentials/config
- Firebase/FCM configuration
- Razorpay keys and webhook secret
- Object storage bucket/credentials
- Email/SMS provider
- Observability endpoints
- Feature flags

Never commit secrets.

## CI/CD
- Lint
- Unit tests
- Integration tests
- Build Android artifacts
- Build Admin
- Build backend
- Database migration validation
- Security/dependency scanning
- Deploy staging
- Run smoke tests
- Manual production approval
- Progressive rollout

## Backups
Automated encrypted database backups, point-in-time recovery where supported, tested restore procedures and documented retention.

## Monitoring
API latency/error rate, queue depth, WebSocket connections, database health, payment webhook failures, emergency processing latency, notification delivery and mobile crash rate.
