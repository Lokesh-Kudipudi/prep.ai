import { apiClient } from "../lib/apiClient";

export interface Source {
  id: string;
  board_id: string;
  title: string;
  type: string;
  path: string | null;
  status: "pending" | "processing" | "indexed" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceStatus {
  id: string;
  status: "pending" | "processing" | "indexed" | "failed";
  error_message: string | null;
}

export async function uploadPdf(boardId: string, file: File): Promise<Source> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post<Source>(`/boards/${boardId}/sources/pdf`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function triggerScraping(boardId: string, query: string): Promise<Source> {
  const response = await apiClient.post<Source>(`/boards/${boardId}/sources/fetch`, { query });
  return response.data;
}

export async function listSources(boardId: string): Promise<Source[]> {
  const response = await apiClient.get<Source[]>(`/boards/${boardId}/sources`);
  return response.data;
}

export async function getSourceStatus(sourceId: string): Promise<SourceStatus> {
  const response = await apiClient.get<SourceStatus>(`/sources/${sourceId}`);
  return response.data;
}
