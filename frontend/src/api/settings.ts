import { apiClient } from "../lib/apiClient";
import type { User } from "../types";

export interface IntegrationsStatus {
  piston: "Healthy" | "Unreachable";
  langsmith: "Connected" | "Not configured";
  anki: "Available" | "Not configured";
}

export async function getIntegrationsStatus(): Promise<IntegrationsStatus> {
  const { data } = await apiClient.get<IntegrationsStatus>("/settings/integrations");
  return data;
}

export async function updateProfile(payload: { full_name: string; email: string }): Promise<User> {
  const { data } = await apiClient.put<User>("/auth/profile", payload);
  return data;
}

export async function deleteAccount(): Promise<void> {
  await apiClient.delete("/auth/account");
}
