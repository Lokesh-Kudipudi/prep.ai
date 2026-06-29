import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { generateQuiz, getActiveQuiz, getQuiz, submitAttempt } from "../api/quiz";

export function useQuiz(quizId: string | undefined) {
  return useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => getQuiz(quizId!),
    enabled: !!quizId,
  });
}

export function useActiveQuiz(boardId: string | undefined) {
  return useQuery({
    queryKey: ["boards", boardId, "quizzes", "active"],
    queryFn: () => getActiveQuiz(boardId!),
    enabled: !!boardId,
  });
}

export function useGenerateQuiz(boardId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ maxQuestions }: { maxQuestions: number }) =>
      generateQuiz(boardId!, maxQuestions),
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["quiz", data.id] });
      queryClient.invalidateQueries({ queryKey: ["boards", boardId, "quizzes"] });
    },
  });
}

export function useSubmitAttempt(boardId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quizId, userAnswers }: { quizId: string; userAnswers: Record<string, number> }) =>
      submitAttempt(quizId, userAnswers),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quiz", data.quiz_id] });
      queryClient.invalidateQueries({ queryKey: ["boards", boardId, "quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["boards", "stats"] });
    },
  });
}
