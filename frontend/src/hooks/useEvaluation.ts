import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listEvaluationRuns, triggerEvaluationRun } from "../api/evaluation";
import { SOURCE_POLL_MS } from "../lib/constants";

export function useEvaluationRuns() {
  return useQuery({
    queryKey: ["evaluation", "runs"],
    queryFn: listEvaluationRuns,
    refetchInterval: (query) =>
      query.state.data?.some((run) => run.status === "pending" || run.status === "running")
        ? SOURCE_POLL_MS
        : false,
  });
}

export function useTriggerEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: triggerEvaluationRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation", "runs"] });
    },
  });
}
