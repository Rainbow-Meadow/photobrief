import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { teamService } from "@/services/teamService";

export default function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate(`/auth?next=/invite/${token}`, { replace: true });
    }
  }, [user, loading, token, navigate]);

  async function handleAccept() {
    if (!token) return;
    setBusy(true);
    try {
      await teamService.accept(token);
      toast.success("Welcome to the team!");
      navigate("/dashboard", { replace: true });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading invite…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MailCheck className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">You've been invited</h1>
        <p className="text-sm text-muted-foreground">
          Tap accept to join the workspace as <span className="font-medium">{user.email}</span>.
        </p>
      </div>
      <div className="flex justify-center gap-3">
        <Button variant="ghost" onClick={() => navigate("/dashboard")}>
          Not now
        </Button>
        <Button onClick={handleAccept} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept invite"}
        </Button>
      </div>
    </div>
  );
}
