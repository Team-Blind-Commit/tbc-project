export interface SpeechSession {
  id: string;
  user_id: string;
  topic: string;
  duration_seconds: number;
  transcript: string;
  counter_feedback: string;
  grammarian_feedback: string;
  evaluator_feedback: string;
  created_at: string;
}
