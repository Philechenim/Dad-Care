// App-level types mirroring supabase/migrations. Replace with generated types (`npm run db:types`)
// once the Supabase project is linked; keep these names for the UI layer.

export type PersonRole = "care_receiver" | "caregiver" | "responder" | "viewer";
export type ResponderRole = "first_responder" | "backup" | "driver";
export type DeviceType = "phone" | "watch" | "room_sensor" | "simulator";
export type EventType = "presence" | "checkin" | "dose" | "help" | "fall" | "bp" | "voice_note" | "device" | "system";
export type Activity = "in_chair" | "napping" | "asleep" | "moving" | "bathroom" | "in_room" | "out" | "unsure";
export type Mood = "good" | "so_so" | "not_good";
export type AlertLevel = "urgent" | "attention" | "info";
export type LadderStatus = "waiting" | "calling" | "no_answer" | "accepted" | "skipped";

export interface DadCareEvent {
  id: number;
  household_id: string;
  device_id: string | null;
  person_id: string | null;
  type: EventType;
  value: Record<string, unknown>;
  occurred_at: string;
  received_at: string;
}

export interface DadState {
  household_id: string;
  room: string | null;
  spot: string | null;
  activity: Activity;
  mood: Mood | null;
  confidence: number;
  since: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  household_id: string;
  level: AlertLevel;
  trigger: string;
  title: string;
  detail: string | null;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  outcome: string | null;
}
