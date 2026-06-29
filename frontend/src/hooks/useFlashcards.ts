import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { generateFlashcards, listFlashcards, reviewFlashcard } from "../api/flashcards";
import { FlashcardRating } from "../types";

export function useFlashcards(boardId: string | undefined) {
  return useQuery({
    queryKey: ["flashcards", boardId],
    queryFn: () => listFlashcards(boardId!),
    enabled: !!boardId,
  });
}

export function useGenerateFlashcards(boardId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateFlashcards(boardId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards", boardId] });
      queryClient.invalidateQueries({ queryKey: ["boards", "stats"] });
    },
  });
}

export function useReviewFlashcard(boardId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, rating }: { cardId: string; rating: FlashcardRating }) =>
      reviewFlashcard(cardId, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards", boardId] });
      queryClient.invalidateQueries({ queryKey: ["boards", "stats"] });
    },
  });
}
