import { apiClient } from "../lib/apiClient";
import { Quiz, QuizAttempt } from "../types";

export type QuizWithQuestions = Quiz & {
  questions: {
    id: string;
    quiz_id: string;
    question_text: string;
    options: string[];
    correct_option_index: number;
    reasoning: string;
  }[];
  status: "active" | "completed";
};

export async function generateQuiz(
  boardId: string,
  maxQuestions: number
): Promise<QuizWithQuestions> {
  const response = await apiClient.post<QuizWithQuestions>(
    `/boards/${boardId}/quizzes/generate`,
    { max_questions: maxQuestions }
  );
  return response.data;
}

export async function getActiveQuiz(boardId: string): Promise<QuizWithQuestions | null> {
  const response = await apiClient.get<QuizWithQuestions | null>(`/boards/${boardId}/quizzes/active`);
  return response.data;
}

export async function getQuiz(quizId: string): Promise<QuizWithQuestions> {
  const response = await apiClient.get<QuizWithQuestions>(`/quizzes/${quizId}`);
  return response.data;
}

export async function submitAttempt(
  quizId: string,
  userAnswers: Record<string, number>
): Promise<QuizAttempt> {
  const response = await apiClient.post<QuizAttempt>(
    `/quizzes/${quizId}/attempts`,
    { user_answers: userAnswers }
  );
  return response.data;
}
