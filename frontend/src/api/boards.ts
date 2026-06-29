import { apiClient } from "../lib/apiClient";

export interface Board {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardStats {
  active_boards: number;
  sources_indexed: number;
  cards_reviewed: number;
}

export async function listBoards(): Promise<Board[]> {
  const response = await apiClient.get<Board[]>("/boards");
  return response.data;
}

export async function createBoard(payload: { name: string; description?: string }): Promise<Board> {
  const response = await apiClient.post<Board>("/boards", payload);
  return response.data;
}

export async function getBoardStats(): Promise<BoardStats> {
  const response = await apiClient.get<BoardStats>("/boards/stats");
  return response.data;
}

export async function getBoard(boardId: string): Promise<Board> {
  const response = await apiClient.get<Board>(`/boards/${boardId}`);
  return response.data;
}
