import { useEffect, useState } from "react";
import { Mail, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { UpgradePromptCard } from "@/components/shared/UpgradePromptCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { usePlan } from "@/hooks/usePlan";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { ApiKeysSection } from "@/features/workspace/components/ApiKeysSection";
import { WebhookSubscriptionsSection } from "@/features/workspace/components/WebhookSubscriptionsSection";
import { CustomDomainSection } from "@/features/workspace/components/CustomDomainSection";
import {
  teamService,
  type WorkspaceInvite,
  type WorkspaceMemberRow,
} from "@/services/teamService";

export default function TeamSettingsPage() {
  const { can, plan } = usePlan();
  const canTeam = can("team_members");
  const canApi = can("api_webhooks");
  const canDomain = can("custom_domain");
  const { workspace } = useCurrentWorkspace();
  const wsId = workspace?.id;

  const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!wsId) return;
    try {
      const [m, i] = await Promise.all([
        teamService.listMembers(wsId),
        teamService.listInvites(wsId),
      ]);
      setMembers(m);
      setInvites(i.filter((x) => x.status === "pending"));
    } catch (e) {
      // silently degrade
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsId]);

  async function handleInvite() {
    if (!wsId || !email.trim()) return;
    setBusy(true);
    try {
      const result = await teamService.invite(wsId, email.trim(), role);
      toast.success(
        result.delivery === "sent"
          ? `Invite sent to ${email}`
          : `Invite created. Share link: ${result.acceptUrl}`,
      );
      setEmail("");
      await refresh();
    } catch (e) {
      const err = e as Error & { requiredPlan?: string };
      toast.error(
        err.requiredPlan
          ? `Inviting more teammates requires the ${err.requiredPlan} plan`
          : err.message ?? "Invite failed",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      await teamService.revoke(id);
      toast.success("Invite revoked");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description={`Invite teammates, assign work, and manage roles. Current plan: ${plan}.`}
        bordered={false}
      />

      {!canTeam ? (
        <UpgradePromptCard feature="team_members" />
      ) : (
        <>
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Invite a teammate</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              They'll get an email link to join this workspace.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "admin" | "member")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleInvite} disabled={busy || !email.trim()} className="gap-1.5">
                  <UserPlus className="h-4 w-4" /> Send invite
                </Button>
              </div>
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Members ({members.length})</h2>
            <div className="mt-4 space-y-2">
              {members.length === 0 ? (
                <EmptyState icon={Users} title="No members yet" description="Invite someone to get started." compact />
              ) : (
                members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-md border bg-card px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">{m.name ?? m.email ?? m.userId.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{m.email ?? "—"}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {m.role}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </section>

          {invites.length > 0 && (
            <section className="surface-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Pending invites</h2>
              <div className="mt-4 space-y-2">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-md border bg-card px-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {inv.role} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(inv.id)}
                      className="gap-1.5"
                    >
                      <Trash2 className="h-4 w-4" /> Revoke
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
          {wsId && canDomain ? (
            <CustomDomainSection workspaceId={wsId} />
          ) : (
            <UpgradePromptCard feature="custom_domain" />
          )}
          {wsId && canApi ? (
            <>
              <ApiKeysSection workspaceId={wsId} canManage={true} />
              <WebhookSubscriptionsSection workspaceId={wsId} />
            </>
          ) : (
            <UpgradePromptCard feature="api_webhooks" />
          )}
        </>
      )}
    </div>
  );
}
