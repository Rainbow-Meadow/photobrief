import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassPanel } from "@/components/ui/glass-panel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

interface WaitlistEntry {
  id: string;
  name: string;
  business_name: string | null;
  email: string;
  business_type: string | null;
  website: string | null;
  use_case: string | null;
  estimated_monthly_requests: string | null;
  notes: string | null;
  status: string;
  source: string;
  created_at: string;
}

interface BetaInvite {
  id: string;
  email: string;
  business_name: string | null;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  token_prefix: string;
  created_at: string;
}

const WAITLIST_STATUSES = ["new", "reviewed", "invited", "rejected", "contacted"];

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "accepted" || status === "invited") return "default";
  if (status === "revoked" || status === "rejected") return "destructive";
  if (status === "expired") return "outline";
  return "secondary";
}

function effectiveStatus(inv: BetaInvite): string {
  if (inv.status === "invited" && new Date(inv.expires_at).getTime() < Date.now()) {
    return "expired";
  }
  return inv.status;
}

function relativeExpiry(expiresAt: string): { label: string; tone: "muted" | "warning" | "danger" } {
  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = Math.round(ms / 86_400_000);
  if (ms <= 0) return { label: "Expired", tone: "danger" };
  if (days <= 2) return { label: `${days}d left`, tone: "warning" };
  if (days <= 7) return { label: `${days}d left`, tone: "muted" };
  return { label: new Date(expiresAt).toLocaleDateString(), tone: "muted" };
}

export default function AdminInvitesPage() {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [invites, setInvites] = useState<BetaInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", business_name: "", notes: "", waitlist_id: "" });
  const [tokenModal, setTokenModal] = useState<{ email: string; link: string } | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const [{ data: w }, { data: i }] = await Promise.all([
        supabase
          .from("waitlist_entries")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("beta_invites").select("*").order("created_at", { ascending: false }),
      ]);
      setWaitlist((w as WaitlistEntry[]) ?? []);
      setInvites((i as BetaInvite[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const businessTypes = useMemo(() => {
    const set = new Set<string>();
    waitlist.forEach((w) => w.business_type && set.add(w.business_type));
    return Array.from(set).sort();
  }, [waitlist]);

  const filteredWaitlist = waitlist.filter((w) => {
    if (filter !== "all" && w.status !== filter) return false;
    if (typeFilter !== "all" && w.business_type !== typeFilter) return false;
    return true;
  });

  async function call(action: string, body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke("admin-invites", {
      body: { action, ...body },
    });
    if (error) throw error;
    const payload = data as { error?: string };
    if (payload?.error) throw new Error(payload.error);
    return data as { ok?: boolean; raw_token?: string; invite?: BetaInvite };
  }

  async function createInvite(payload: { email: string; business_name?: string; notes?: string; waitlist_id?: string }) {
    setBusy("create");
    try {
      const result = await call("create_invite", payload);
      trackEvent("invite_created");
      if (result?.raw_token) {
        const link = `${window.location.origin}/signup?invite=${result.raw_token}`;
        await navigator.clipboard.writeText(link).catch(() => {});
        setTokenModal({ email: payload.email, link });
      }
      await reload();
      setCreateOpen(false);
      setCreateForm({ email: "", business_name: "", notes: "", waitlist_id: "" });
    } catch (e) {
      toast({ title: "Couldn't create invite", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function revoke(invite_id: string) {
    setBusy(invite_id);
    try {
      await call("revoke_invite", { invite_id });
      await reload();
    } catch (e) {
      toast({ title: "Revoke failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function resend(invite_id: string, email: string) {
    setBusy(invite_id);
    try {
      const result = await call("resend_invite", { invite_id });
      if (result?.raw_token) {
        const link = `${window.location.origin}/signup?invite=${result.raw_token}`;
        await navigator.clipboard.writeText(link).catch(() => {});
        setTokenModal({ email, link });
      }
      await reload();
    } catch (e) {
      toast({ title: "Resend failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function setWaitlistStatus(waitlist_id: string, status: string) {
    setBusy(waitlist_id);
    try {
      await call("set_waitlist_status", { waitlist_id, status });
      await reload();
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  function inviteFromWaitlist(w: WaitlistEntry) {
    setCreateForm({
      email: w.email,
      business_name: w.business_name ?? "",
      notes: w.use_case ?? "",
      waitlist_id: w.id,
    });
    setCreateOpen(true);
  }

  return (
    <div className="container max-w-6xl py-8">
      <PageHeader
        eyebrow="Platform admin"
        title="Beta invites & waitlist"
        description="Review beta requests, send invites, and manage active invite links."
        actions={
          <Button onClick={() => { setCreateForm({ email: "", business_name: "", notes: "", waitlist_id: "" }); setCreateOpen(true); }}>
            New invite
          </Button>
        }
      />

      <Tabs defaultValue="waitlist" className="mt-8">
        <TabsList>
          <TabsTrigger value="waitlist">Waitlist ({waitlist.length})</TabsTrigger>
          <TabsTrigger value="invites">Invites ({invites.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="waitlist" className="mt-6">
          <GlassPanel variant="card" className="p-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="all">All</option>
                {WAITLIST_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <Label className="text-xs text-muted-foreground">Business type</Label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="all">All</option>
                {businessTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joined</TableHead>
                    <TableHead>Name / Business</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWaitlist.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                        No waitlist entries match.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredWaitlist.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(w.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{w.name}</div>
                        <div className="text-xs text-muted-foreground">{w.business_name}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{w.email}</TableCell>
                      <TableCell className="text-sm">{w.business_type ?? "—"}</TableCell>
                      <TableCell className="text-sm">{w.estimated_monthly_requests ?? "—"}</TableCell>
                      <TableCell>
                        <select
                          value={w.status}
                          disabled={busy === w.id}
                          onChange={(e) => setWaitlistStatus(w.id, e.target.value)}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          {WAITLIST_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => inviteFromWaitlist(w)}>
                          Invite
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </GlassPanel>
        </TabsContent>

        <TabsContent value="invites" className="mt-6">
          <GlassPanel variant="card" className="p-4">
            {loading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                        No invites yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {invites.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{inv.email}</TableCell>
                      <TableCell className="text-sm">{inv.business_name ?? "—"}</TableCell>
                      <TableCell>
                        {(() => {
                          const eff = effectiveStatus(inv);
                          return (
                            <Badge variant={statusVariant(eff)}>
                              {eff}
                              {eff === "accepted" ? " · locked" : ""}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {(() => {
                          const r = relativeExpiry(inv.expires_at);
                          const cls =
                            r.tone === "danger"
                              ? "text-destructive"
                              : r.tone === "warning"
                                ? "text-warning"
                                : "text-muted-foreground";
                          return <span className={cls}>{r.label}</span>;
                        })()}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {inv.token_prefix}…
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === inv.id || inv.status === "accepted"}
                            onClick={() => resend(inv.id, inv.email)}
                          >
                            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Resend
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy === inv.id || inv.status === "revoked" || inv.status === "accepted"}
                            onClick={() => revoke(inv.id)}
                          >
                            <X className="mr-1 h-3.5 w-3.5" /> Revoke
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </GlassPanel>
        </TabsContent>
      </Tabs>

      {/* Create invite dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create beta invite</DialogTitle>
            <DialogDescription>
              The link is shown once — copy it before closing.
            </DialogDescription>
          </DialogHeader>
          <form
            id="create-invite-form"
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!createForm.email) return;
              createInvite({
                email: createForm.email.trim().toLowerCase(),
                business_name: createForm.business_name || undefined,
                notes: createForm.notes || undefined,
                waitlist_id: createForm.waitlist_id || undefined,
              });
            }}
          >
            <div>
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="invite-business">Business name (optional)</Label>
              <Input
                id="invite-business"
                value={createForm.business_name}
                onChange={(e) => setCreateForm({ ...createForm, business_name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="invite-notes">Notes (optional)</Label>
              <Textarea
                id="invite-notes"
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                rows={3}
                className="mt-1.5"
              />
            </div>
          </form>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-invite-form" disabled={busy === "create"}>
              {busy === "create" ? "Creating…" : "Create & copy link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token-shown-once dialog */}
      <Dialog open={!!tokenModal} onOpenChange={(o) => !o && setTokenModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Invite link copied
            </DialogTitle>
            <DialogDescription>
              We've copied the link for <span className="font-medium">{tokenModal?.email}</span>. Save it now —
              we won't show this token again.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/40 p-3 font-mono text-xs break-all">
            {tokenModal?.link}
          </div>
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
            <p className="font-semibold">Single-use link</p>
            <p className="mt-1 text-muted-foreground">
              The first signup with this link claims it. After that the token is locked and cannot be reused —
              if the recipient needs another, use <span className="font-medium">Resend</span> to issue a fresh one.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (tokenModal?.link) {
                  navigator.clipboard.writeText(tokenModal.link).catch(() => {});
                  toast({ title: "Copied" });
                }
              }}
            >
              <Copy className="mr-1 h-4 w-4" /> Copy again
            </Button>
            <Button onClick={() => setTokenModal(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
