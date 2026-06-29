import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadPdf, triggerScraping, listSources, getSourceStatus, Source } from "../api/sources";

export function useSources(boardId: string | undefined) {
  return useQuery<Source[]>({
    queryKey: ["sources", boardId],
    queryFn: () => listSources(boardId!),
    enabled: !!boardId,
  });
}

export function useSourceStatus(sourceId: string | undefined) {
  return useQuery({
    queryKey: ["source-status", sourceId],
    queryFn: () => getSourceStatus(sourceId!),
    enabled: !!sourceId,
    refetchInterval: (query) => {
      // Poll every 1 second while status is pending or processing
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 1000 : false;
    },
  });
}

export function useUploadPdf(boardId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file }: { file: File }) => uploadPdf(boardId!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", boardId] });
      queryClient.invalidateQueries({ queryKey: ["boards", "stats"] });
    },
  });
}

export function useTriggerScraping(boardId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ query }: { query: string }) => triggerScraping(boardId!, query),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", boardId] });
      queryClient.invalidateQueries({ queryKey: ["boards", "stats"] });
    },
  });
}
