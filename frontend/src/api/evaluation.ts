import { apiClient } from "../lib/apiClient";
import type { EvaluationRun } from "../types";


export async function listEvaluationRuns(): Promise<EvaluationRun[]> {
  const response = await apiClient.get<EvaluationRun[]>("/evaluation/runs");
  return response.data;
}

export async function triggerEvaluationRun(numQuestions: number = 10): Promise<EvaluationRun> {
  const response = await apiClient.post<EvaluationRun>("/evaluation/runs", { num_questions: numQuestions });
  return response.data;
}
