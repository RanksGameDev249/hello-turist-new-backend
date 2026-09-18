# Realtime and Event Architecture

## Channels
- `user:{userId}`
- `ride:{rideId}`
- `provider:{providerId}`
- `emergency:{incidentId}`
- `admin:operations`

Authorization is required before subscription.

## Core events
- `ride.searching`
- `ride.assignment.offered`
- `ride.assignment.accepted`
- `ride.assignment.rejected`
- `ride.driver_arriving`
- `ride.driver_arrived`
- `ride.started`
- `ride.location.updated`
- `ride.nearing_destination`
- `ride.completed`
- `ride.cancelled`
- `ride.interrupted`
- `guide.available`
- `payment.updated`
- `notification.created`
- `emergency.triggered`
- `emergency.acknowledged`
- `emergency.responder_assigned`
- `emergency.responder_arrived`
- `emergency.resolved`

## Event envelope
```json
{
  "eventId": "uuid",
  "type": "ride.started",
  "aggregateId": "ride-uuid",
  "version": 12,
  "occurredAt": "ISO-8601",
  "data": {}
}
```

## Reconnect protocol
1. Authenticate socket.
2. Fetch current aggregate state via REST.
3. Provide last processed event ID/version.
4. Replay authorized missed events if retained.
5. Resume live subscription.

## Location update strategy
Use adaptive frequency:
- faster while navigating/active trip,
- lower frequency when stationary,
- emergency mode may increase frequency subject to permission, battery and legal constraints.

Do not promise delivery of location when the device is powered off or force-stopped.
