import { apiClient } from "../lib/apiClient";
import type { User } from "../types";

export type AuthResponse = {
  access_token: string;
  token_type: string;
};

export async function registerUser(payload: any): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", payload);
  return data;
}

export async function loginUser(payload: any): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", payload);
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}
