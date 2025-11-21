import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationService } from "@/services/applicationService";
import type { Application, CreateApplicationRequest } from "@/types";

/**
 * Hook to fetch and manage a single application
 */
export function useApplication(appId: string) {
  const queryClient = useQueryClient();

  const {
    data: application,
    isLoading,
    error,
  } = useQuery<Application>({
    queryKey: ["application", appId],
    queryFn: () => applicationService.getApplication(appId),
    enabled: !!appId,
  });

  const updateMutation = useMutation({
    mutationFn: (
      data: Partial<CreateApplicationRequest> & { userId: string }
    ) => applicationService.updateApplication(appId, data),
    onSuccess: (updatedApp) => {
      // Update the single application cache
      queryClient.setQueryData(["application", appId], updatedApp);
      // Invalidate all application lists
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) =>
      applicationService.deleteApplication(appId, userId),
    onSuccess: () => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ["application", appId] });
      // Invalidate all application lists
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  return {
    application,
    isLoading,
    error,
    updateApplication: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteApplication: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
