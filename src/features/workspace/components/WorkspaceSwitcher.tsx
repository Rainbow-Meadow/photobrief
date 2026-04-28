// Workspace switcher dropdown shown in the sidebar header.
// - Lists every workspace the user is a member of
// - Switches by updating profiles.default_workspace_id
// - "Create workspace" is gated by the `multi_workspace` capability
import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { usePlan } from "@/hooks/usePlan";
import { getPlanLimit, minPlanFor } from "@/config/planLimits";

interface WorkspaceRow {
  id: string;
  name: string;
}

interface Props {
  collapsed?: boolean;
}

export function WorkspaceSwitcher({ collapsed }: Props) {
  const { user } = useAuth();
  const { workspace, refetch } = useCurrentWorkspace();
  const { can } = usePlan();
  const canMulti = can("multi_workspace");
  const queryClient = useQueryClient();

  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadWorkspaces = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("workspace_members")
      .select("workspace_id, business_workspaces(id, name)")
      .eq("user_id", user.id)
      .eq("status", "active");
    if (!error && data) {
      const rows: WorkspaceRow[] = data
        .map((d: any) => d.business_workspaces)
        .filter(Boolean)
        .map((w: any) => ({ id: w.id, name: w.name }));
      setWorkspaces(rows);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user?.id) loadWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const switchTo = async (id: string) => {
    if (!user?.id || id === workspace?.id) return;
    const { error } = await supabase
      .from("profiles")
      .update({ default_workspace_id: id })
      .eq("id", user.id);
    if (error) {
      toast.error("Could not switch workspace");
      return;
    }
    await refetch();
    queryClient.invalidateQueries();
    toast.success("Workspace switched");
  };

  const openCreate = () => {
    if (!canMulti) {
      const plan = minPlanFor("multi_workspace");
      toast.error(
        `Multiple workspaces are on ${plan ? getPlanLimit(plan).name : "a higher plan"}`,
      );
      return;
    }
    setNewName("");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!user?.id || !newName.trim()) return;
    setCreating(true);
    try {
      const { data: ws, error } = await supabase
        .from("business_workspaces")
        .insert({ name: newName.trim(), owner_id: user.id })
        .select("id, name")
        .single();
      if (error || !ws) throw error ?? new Error("Could not create workspace");

      // Add the creator as an active owner member (RLS-aware).
      await supabase.from("workspace_members").insert({
        workspace_id: ws.id,
        user_id: user.id,
        role: "owner",
        status: "active",
      });

      // Switch immediately.
      await supabase
        .from("profiles")
        .update({ default_workspace_id: ws.id })
        .eq("id", user.id);

      setCreateOpen(false);
      await loadWorkspaces();
      await refetch();
      queryClient.invalidateQueries();
      toast.success(`Created workspace "${ws.name}"`);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not create workspace");
    } finally {
      setCreating(false);
    }
  };

  if (collapsed) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-between gap-1.5 px-2 text-xs font-medium"
          >
            <span className="truncate">
              {workspace?.name ?? (loading ? "Loading…" : "Workspace")}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
          {workspaces.length === 0 ? (
            <DropdownMenuItem disabled>
              {loading ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : null}
              No workspaces
            </DropdownMenuItem>
          ) : (
            workspaces.map((w) => (
              <DropdownMenuItem
                key={w.id}
                onClick={() => switchTo(w.id)}
                className="flex items-center justify-between"
              >
                <span className="truncate">{w.name}</span>
                {w.id === workspace?.id ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : null}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openCreate}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Create workspace
            {!canMulti ? (
              <span className="ml-auto text-[10px] uppercase tracking-wide text-primary">
                Pro
              </span>
            ) : null}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new workspace</DialogTitle>
            <DialogDescription>
              Each workspace has its own brand, requests, and team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input
              id="ws-name"
              autoFocus
              placeholder="Bright Spark Plumbing"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) handleCreate();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
              {creating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
