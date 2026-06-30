import { apiClient } from "../lib/apiClient";
import { TutorSession, TutorMessage, CodingSubmission } from "../types";

export type TutorSessionDetail = TutorSession & {
  messages: TutorMessage[];
};

export async function createTutorSession(
  boardId: string,
  topic: string
): Promise<TutorSession> {
  const response = await apiClient.post<TutorSession>(
    `/boards/${boardId}/tutor/sessions`,
    { topic }
  );
  return response.data;
}

export async function listTutorSessions(boardId: string): Promise<TutorSession[]> {
  const response = await apiClient.get<TutorSession[]>(`/boards/${boardId}/tutor/sessions`);
  return response.data;
}

export async function getTutorSession(sessionId: string): Promise<TutorSessionDetail> {
  const response = await apiClient.get<TutorSessionDetail>(`/tutor/sessions/${sessionId}`);
  return response.data;
}

export async function sendTutorMessage(
  sessionId: string,
  content: string
): Promise<TutorMessage> {
  const response = await apiClient.post<TutorMessage>(
    `/tutor/sessions/${sessionId}/message`,
    { content }
  );
  return response.data;
}

export async function runCode(
  sessionId: string,
  code: string,
  language: string
): Promise<{ stdout: string; stderr: string; code: number; output: string }> {
  const response = await apiClient.post<{ stdout: string; stderr: string; code: number; output: string }>(
    `/tutor/sessions/${sessionId}/run-code`,
    { code, language }
  );
  return response.data;
}

export async function submitCode(
  sessionId: string,
  code: string,
  language: string
): Promise<CodingSubmission> {
  const response = await apiClient.post<CodingSubmission>(
    `/tutor/sessions/${sessionId}/submit-code`,
    { code, language }
  );
  return response.data;
}

export async function stopTutorSession(sessionId: string): Promise<TutorSession> {
  const response = await apiClient.post<TutorSession>(`/tutor/sessions/${sessionId}/stop`);
  return response.data;
}

export async function deleteTutorSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/tutor/sessions/${sessionId}`);
}
