export const RIDE_RECORDING_POLICY = {
  purpose: "Safety evidence during an active ride",
  mandatoryRoles: ["DRIVER", "GUIDE"],
  riderConsentRequired: true,
  supportedMedia: ["VIDEO", "AUDIO"],
  recordingOnlyWhileRideActive: true,
  noSilentRecording: true,
  stopWhenRideEnds: true,
  access: "restricted to authorized safety/support workflows",
  retention: "bounded by configured safety-retention policy; never indefinite by default",
  encryption: "private object storage with encryption at rest and TLS in transit",
} as const;
