import { useQuery } from "@tanstack/react-query";
import { teamService } from "@/services/teamService";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import type { TeamMember } from "@/types/photobrief";

function initialsOf(name?: string | null, email?: string | null) {
  const src = (name?.trim() || email?.split("@")[0] || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

/**
 * Live workspace team members shaped for assignee pickers/filters.
 * Returns [] while loading or when the workspace is missing.
 */
export function useTeamMembers(): TeamMember[] {
  const { workspace } = useCurrentWorkspace();
  const wsId = workspace?.id;
  const { data } = useQuery({
    queryKey: ["team-members", wsId],
    queryFn: () => teamService.listMembers(wsId!),
    enabled: !!wsId,
  });
  return (data ?? [])
    .filter((m) => m.status === "active")
    .map<TeamMember>((m) => ({
      id: m.userId,
      name: m.name?.trim() || m.email || "Teammate",
      initials: initialsOf(m.name, m.email),
    }));
}
