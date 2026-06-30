import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadPdf, triggerScraping, listSources, getSourceStatus, deleteSource, Source } from "../api/sources";
import { SOURCE_POLL_MS } from "../lib/constants";

export function useSources(boardId: string | undefined) {
  return useQuery<Source[]>({
    queryKey: ["sources", boardId],
    queryFn: () => listSources(boardId!),
    enabled: !!boardId,
    refetchInterval: (query) => {
      const sources = query.state.data;
      const hasPendingOrProcessing = sources?.some(
        (s) => s.status === "pending" || s.status === "processing"
      );
      return hasPendingOrProcessing ? SOURCE_POLL_MS : false;
    },
  });
}

export function useSourceStatus(sourceId: string | undefined) {
  return useQuery({
    queryKey: ["source-status", sourceId],
    queryFn: () => getSourceStatus(sourceId!),
    enabled: !!sourceId,
    refetchInterval: (query) => {
      // Poll while status is pending or processing
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? SOURCE_POLL_MS : false;
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

export function useDeleteSource(boardId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sourceId: string) => deleteSource(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", boardId] });
      queryClient.invalidateQueries({ queryKey: ["boards", "stats"] });
    },
  });
}
