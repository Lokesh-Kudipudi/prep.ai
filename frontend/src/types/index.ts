export type User = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

export type Board = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type SourceStatus = "pending" | "processing" | "indexed" | "failed";
export type SourceType = "PDF" | "WEB";

export type Source = {
  id: string;
  board_id: string;
  title: string;
  type: SourceType;
  path: string | null;
  status: SourceStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type Chunk = {
  id: string;
  source_id: string;
  board_id: string;
  content: string;
  page_number: number | null;
  created_at: string;
};

export type Quiz = {
  id: string;
  board_id: string;
  max_questions: number;
  created_at: string;
};

export type QuizQuestion = {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[]; // JSON array of options
  correct_option_index: number;
  reasoning: string;
};

export type QuizAttempt = {
  id: string;
  quiz_id: string;
  user_answers: Record<string, number>; // question_id -> chosen index
  score: number;
  completed_at: string;
};

export type FlashcardRating = "again" | "hard" | "good" | "easy";

export type Flashcard = {
  id: string;
  board_id: string;
  front: string;
  back: string;
  srs_interval: number; // in days
  srs_ease_factor: number;
  srs_repetitions: number;
  next_review_due: string;
  created_at: string;
};

export type TutorSessionStatus = "active" | "stopped";

export type TutorSession = {
  id: string;
  board_id: string;
  topic: string;
  status: TutorSessionStatus;
  created_at: string;
};

export type TutorMessageRole = "system" | "user" | "reviewer";

export type TutorMessage = {
  id: string;
  session_id: string;
  role: TutorMessageRole;
  content: string;
  code_assignment: string | null; // Optional JSON or description
  code_submission: string | null;
  code_language: string | null;
  created_at: string;
};

export type CodingSubmission = {
  id: string;
  session_id: string;
  code: string;
  language: string;
  stdout: string | null;
  stderr: string | null;
  passed: boolean;
  score: number;
  review_feedback: string;
  created_at: string;
};

export type EvaluationRun = {
  id: string;
  user_id: string;
  status: "pending" | "running" | "completed" | "failed";
  num_questions: number;
  faithfulness_baseline: number | null;
  faithfulness_improved: number | null;
  answer_relevance_baseline: number | null;
  answer_relevance_improved: number | null;
  context_recall_baseline: number | null;
  context_recall_improved: number | null;
  token_cost_baseline: number | null;
  token_cost_improved: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

