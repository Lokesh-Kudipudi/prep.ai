import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getIntegrationsStatus, updateProfile, deleteAccount } from "../api/settings";
import { useAuth } from "../auth/AuthContext";

export function useIntegrationsStatus() {
  return useQuery({
    queryKey: ["settings", "integrations"],
    queryFn: getIntegrationsStatus,
    staleTime: 10000, // cache for 10 seconds
  });
}

export function useUpdateProfile() {
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["settings", "integrations"] });
    },
  });
}

export function useDeleteAccount() {
  const { logout } = useAuth();
  
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      logout();
    },
  });
}
