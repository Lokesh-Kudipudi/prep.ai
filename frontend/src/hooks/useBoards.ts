import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listBoards, createBoard, getBoardStats, getBoard, Board } from "../api/boards";

export function useBoards() {
  return useQuery<Board[]>({
    queryKey: ["boards"],
    queryFn: listBoards,
  });
}

export function useBoardDetails(boardId: string | undefined) {
  return useQuery<Board>({
    queryKey: ["board", boardId],
    queryFn: () => getBoard(boardId!),
    enabled: !!boardId,
  });
}

export function useBoardStats() {
  return useQuery({
    queryKey: ["boards", "stats"],
    queryFn: getBoardStats,
  });
}

export function useCreateBoard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["boards", "stats"] });
    },
  });
}
