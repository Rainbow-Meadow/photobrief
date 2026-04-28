import { useQuery } from "@tanstack/react-query";
import { submissionsService } from "@/services/submissionsService";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";

export function useSubmissions() {
  const { workspace } = useCurrentWorkspace();
  const wsId = workspace?.id;
  const query = useQuery({
    queryKey: ["submissions", wsId],
    queryFn: () => submissionsService.list(wsId!),
    enabled: !!wsId,
  });
  return query.data ?? [];
}

export function useSubmission(id: string | undefined) {
  const query = useQuery({
    queryKey: ["submission", id],
    queryFn: () => submissionsService.getById(id!),
    enabled: !!id,
  });
  return query.data ?? undefined;
}
