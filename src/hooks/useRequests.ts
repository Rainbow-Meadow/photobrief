import { useQuery } from "@tanstack/react-query";
import { requestsService } from "@/services/requestsService";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";

export function useRequests() {
  const { workspace } = useCurrentWorkspace();
  const wsId = workspace?.id;
  const query = useQuery({
    queryKey: ["requests", wsId],
    queryFn: () => requestsService.list(wsId!),
    enabled: !!wsId,
  });
  return query.data ?? [];
}

export function useRequestsQuery() {
  const { workspace } = useCurrentWorkspace();
  const wsId = workspace?.id;
  return useQuery({
    queryKey: ["requests", wsId],
    queryFn: () => requestsService.list(wsId!),
    enabled: !!wsId,
  });
}

export function useRequest(id: string | undefined) {
  const query = useQuery({
    queryKey: ["request", id],
    queryFn: () => requestsService.getById(id!),
    enabled: !!id,
  });
  return query.data ?? undefined;
}

export function useRequestByToken(token: string | undefined) {
  const query = useQuery({
    queryKey: ["request-by-token", token],
    queryFn: () => requestsService.getByToken(token!),
    enabled: !!token,
  });
  return query.data ?? undefined;
}
