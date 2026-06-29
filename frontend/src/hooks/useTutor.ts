import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createTutorSession,
  listTutorSessions,
  getTutorSession,
  sendTutorMessage,
  runCode,
  submitCode,
  stopTutorSession
} from "../api/tutor";

export function useTutorSessions(boardId: string | undefined) {
  return useQuery({
    queryKey: ["tutor-sessions", boardId],
    queryFn: () => listTutorSessions(boardId!),
    enabled: !!boardId,
  });
}

export function useTutorSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["tutor-session", sessionId],
    queryFn: () => getTutorSession(sessionId!),
    enabled: !!sessionId,
  });
}

export function useCreateTutorSession(boardId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topic }: { topic: string }) => createTutorSession(boardId!, topic),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tutor-sessions", boardId] });
      queryClient.invalidateQueries({ queryKey: ["tutor-session", data.id] });
    },
  });
}

export function useSendTutorMessage(sessionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content }: { content: string }) => sendTutorMessage(sessionId!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutor-session", sessionId] });
    },
  });
}

export function useRunCode(sessionId: string | undefined) {
  return useMutation({
    mutationFn: ({ code, language }: { code: string; language: string }) =>
      runCode(sessionId!, code, language),
  });
}

export function useSubmitCode(sessionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, language }: { code: string; language: string }) =>
      submitCode(sessionId!, code, language),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutor-session", sessionId] });
    },
  });
}

export function useStopTutorSession(sessionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => stopTutorSession(sessionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutor-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
    },
  });
}
