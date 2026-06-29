import { apiClient } from "../lib/apiClient";
import { Flashcard, FlashcardRating } from "../types";

export async function generateFlashcards(boardId: string): Promise<Flashcard[]> {
  const response = await apiClient.post<Flashcard[]>(`/boards/${boardId}/flashcards/generate`);
  return response.data;
}

export async function listFlashcards(boardId: string): Promise<Flashcard[]> {
  const response = await apiClient.get<Flashcard[]>(`/boards/${boardId}/flashcards`);
  return response.data;
}

export async function reviewFlashcard(
  cardId: string,
  rating: FlashcardRating
): Promise<Flashcard> {
  const response = await apiClient.post<Flashcard>(`/flashcards/${cardId}/review`, { rating });
  return response.data;
}
