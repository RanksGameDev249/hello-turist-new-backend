import { z } from "zod";

export const rideRecordingConsentSchema = z.object({
  rideId: z.string().uuid(),
  consent: z.literal(true),
  media: z.array(z.enum(["VIDEO", "AUDIO"])).min(1).max(2),
});

export type RideRecordingConsentInput = z.infer<typeof rideRecordingConsentSchema>;
