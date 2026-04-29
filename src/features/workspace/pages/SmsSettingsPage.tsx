import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, AlertCircle, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import {
  smsConfigService,
  type SmsConfig,
  type SmsDefaultChannel,
  type TwilioNumber,
} from "@/services/smsConfigService";

export default function SmsSettingsPage() {
  const { workspace } = useCurrentWorkspace();
  const wsId = workspace?.id;

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SmsConfig | null>(null);

  // Connect form
  const [accountSid, setAccountSid] = useState("");
  const [apiKeySid, setApiKeySid] = useState("");
  const [apiKeySecret, setApiKeySecret] = useState("");
  const [saving, setSaving] = useState(false);

  // Verify / numbers
  const [verifying, setVerifying] = useState(false);
  const [numbers, setNumbers] = useState<TwilioNumber[]>([]);

  // Settings
  const [savingSettings, setSavingSettings] = useState(false);

  async function refresh() {
    if (!wsId) return;
    setLoading(true);
    try {
      const cfg = await smsConfigService.get(wsId);
      setConfig(cfg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load SMS config");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsId]);

  async function handleSaveCredentials() {
    if (!wsId) return;
    if (!/^AC[0-9a-f]{32}$/i.test(accountSid.trim())) {
      toast.error("Account SID should look like AC followed by 32 hex chars");
      return;
    }
    if (!/^SK[0-9a-f]{32}$/i.test(apiKeySid.trim())) {
      toast.error("API Key SID should look like SK followed by 32 hex chars");
      return;
    }
    if (apiKeySecret.trim().length < 16) {
      toast.error("API Key Secret looks too short");
      return;
    }
    setSaving(true);
    try {
      await smsConfigService.saveCredentials({
        workspaceId: wsId,
        accountSid: accountSid.trim(),
        apiKeySid: apiKeySid.trim(),
        apiKeySecret: apiKeySecret.trim(),
      });
      // Immediately verify
      const result = await smsConfigService.verify({ workspaceId: wsId });
      if (!result.ok) {
        toast.error(result.error ?? "Verification failed");
      } else {
        setNumbers(result.numbers);
        toast.success("Twilio connected and verified");
        setAccountSid("");
        setApiKeySid("");
        setApiKeySecret("");
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleReverify() {
    if (!wsId) return;
    setVerifying(true);
    try {
      const result = await smsConfigService.verify({ workspaceId: wsId });
      if (!result.ok) {
        toast.error(result.error ?? "Verification failed");
      } else {
        setNumbers(result.numbers);
        toast.success("Verified");
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verify failed");
    } finally {
      setVerifying(false);
    }
  }

  async function handleSelectNumber(phoneNumber: string) {
    if (!wsId) return;
    setSavingSettings(true);
    try {
      const friendly =
        numbers.find((n) => n.phoneNumber === phoneNumber)?.friendlyName ??
        null;
      await smsConfigService.updateSettings({
        workspaceId: wsId,
        fromNumber: phoneNumber,
        fromNumberFriendly: friendly,
      });
      await refresh();
      toast.success("From-number updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to set number");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleEnabledChange(enabled: boolean) {
    if (!wsId || !config) return;
    if (enabled && !config.fromNumber) {
      toast.error("Select a from-number before enabling SMS");
      return;
    }
    if (enabled && !config.verifiedAt) {
      toast.error("Verify your Twilio credentials before enabling SMS");
      return;
    }
    setSavingSettings(true);
    try {
      await smsConfigService.updateSettings({ workspaceId: wsId, enabled });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleDefaultChannel(channel: SmsDefaultChannel) {
    if (!wsId) return;
    setSavingSettings(true);
    try {
      await smsConfigService.updateSettings({
        workspaceId: wsId,
        defaultChannel: channel,
      });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleDisconnect() {
    if (!wsId) return;
    if (
      !confirm(
        "Disconnect Twilio? Your credentials will be removed from PhotoBrief and SMS will stop working immediately. Your Twilio account is unaffected.",
      )
    )
      return;
    setSavingSettings(true);
    try {
      await smsConfigService.disconnect(wsId);
      setConfig(null);
      setNumbers([]);
      toast.success("Twilio disconnected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setSavingSettings(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConnected = !!config;
  const isVerified = !!config?.verifiedAt;

  return (
    <div className="space-y-6">
      <PageHeader
        title="SMS"
        description="Connect your own Twilio account to send SMS reminders to recipients. PhotoBrief never charges for SMS — Twilio bills you directly."
        bordered={false}
      />

      {!isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect your Twilio account</CardTitle>
            <CardDescription>
              SMS is opt-in per workspace. You bring your own Twilio account so
              messages come from your number and are billed to you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>What you'll need</AlertTitle>
              <AlertDescription>
                <ol className="ml-4 mt-2 list-decimal space-y-1 text-sm">
                  <li>
                    A Twilio account with at least one SMS-capable phone number.
                  </li>
                  <li>
                    An <strong>API Key</strong> created in Twilio Console →
                    Account → API keys & tokens. Use a Standard key (not your
                    main Auth Token) so you can revoke it any time.
                  </li>
                  <li>
                    For US/Canada SMS, you must complete A2P 10DLC registration
                    in Twilio. PhotoBrief doesn't manage this for you.
                  </li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="account-sid">Account SID</Label>
                <Input
                  id="account-sid"
                  placeholder="AC…"
                  value={accountSid}
                  onChange={(e) => setAccountSid(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="api-key-sid">API Key SID</Label>
                <Input
                  id="api-key-sid"
                  placeholder="SK…"
                  value={apiKeySid}
                  onChange={(e) => setApiKeySid(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="api-key-secret">API Key Secret</Label>
                <Input
                  id="api-key-secret"
                  type="password"
                  placeholder="Shown once when you created the key"
                  value={apiKeySecret}
                  onChange={(e) => setApiKeySecret(e.target.value)}
                  autoComplete="new-password"
                  spellCheck={false}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Stored encrypted. PhotoBrief uses it server-side only — it's
                  never returned to your browser after saving.
                </p>
              </div>
            </div>

            <Button
              onClick={handleSaveCredentials}
              disabled={saving || !accountSid || !apiKeySid || !apiKeySecret}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying with Twilio…
                </>
              ) : (
                "Connect & verify"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Connection status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    Twilio account
                    {isVerified ? (
                      <Badge variant="default" className="gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Unverified
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">
                    {config.accountSid} · key {config.apiKeySid} · secret
                    ••••{config.apiKeySecretLast4}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReverify}
                    disabled={verifying}
                  >
                    {verifying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Re-verify"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={savingSettings}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              </div>
            </CardHeader>
            {config.lastError && (
              <CardContent>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Last error</AlertTitle>
                  <AlertDescription>{config.lastError}</AlertDescription>
                </Alert>
              </CardContent>
            )}
          </Card>

          {/* From number */}
          <Card>
            <CardHeader>
              <CardTitle>Sending number</CardTitle>
              <CardDescription>
                Pick which of your Twilio numbers PhotoBrief sends from.
                {numbers.length === 0 &&
                  " Click Re-verify above to refresh the list."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {numbers.length > 0 ? (
                <div className="space-y-2">
                  <Label>Available SMS-capable numbers</Label>
                  <Select
                    value={config.fromNumber ?? ""}
                    onValueChange={handleSelectNumber}
                    disabled={savingSettings}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a number" />
                    </SelectTrigger>
                    <SelectContent>
                      {numbers.map((n) => (
                        <SelectItem key={n.phoneNumber} value={n.phoneNumber}>
                          <span className="font-mono">{n.phoneNumber}</span>
                          {n.friendlyName &&
                            n.friendlyName !== n.phoneNumber && (
                              <span className="ml-2 text-muted-foreground">
                                — {n.friendlyName}
                              </span>
                            )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : config.fromNumber ? (
                <p className="text-sm">
                  Currently sending from{" "}
                  <span className="font-mono">{config.fromNumber}</span>
                  {config.fromNumberFriendly &&
                    config.fromNumberFriendly !== config.fromNumber && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({config.fromNumberFriendly})
                      </span>
                    )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No number selected yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Behavior */}
          <Card>
            <CardHeader>
              <CardTitle>Sending behavior</CardTitle>
              <CardDescription>
                How PhotoBrief uses SMS when you send a request or reminder.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-enabled" className="text-base">
                    SMS enabled
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When off, the SMS option is hidden everywhere in the app.
                  </p>
                </div>
                <Switch
                  id="sms-enabled"
                  checked={config.enabled}
                  onCheckedChange={handleEnabledChange}
                  disabled={savingSettings}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Default channel for new requests</Label>
                <Select
                  value={config.defaultChannel}
                  onValueChange={(v) =>
                    handleDefaultChannel(v as SmsDefaultChannel)
                  }
                  disabled={savingSettings || !config.enabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      Email only (default)
                    </SelectItem>
                    <SelectItem value="sms">SMS only</SelectItem>
                    <SelectItem value="both">Both email and SMS</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  You can override this per-send in the Send Request modal.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Inbound webhook */}
          <Card>
            <CardHeader>
              <CardTitle>Inbound replies & STOP handling</CardTitle>
              <CardDescription>
                Paste this URL into your Twilio number's "A MESSAGE COMES IN"
                webhook so STOP/HELP and recipient replies flow into PhotoBrief.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                const webhookUrl = `https://${projectId}.functions.supabase.co/twilio-inbound`;
                return (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={webhookUrl}
                        className="font-mono text-xs"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard.writeText(webhookUrl);
                          toast.success("Webhook URL copied");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
                      <li>
                        In Twilio Console, open <strong>Phone Numbers → Manage → Active numbers</strong>
                        {" "}and click your sending number.
                      </li>
                      <li>
                        Under <strong>Messaging Configuration</strong>, set
                        {" "}<strong>A MESSAGE COMES IN</strong> → <em>Webhook</em>,
                        method <em>HTTP POST</em>, and paste the URL above.
                      </li>
                      <li>Save. Replies and STOP/HELP keywords will now appear in request timelines and the bell icon.</li>
                    </ol>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance reminders</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>
                  • US/Canada: complete{" "}
                  <a
                    href="https://www.twilio.com/docs/messaging/compliance/a2p-10dlc"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    A2P 10DLC registration
                  </a>{" "}
                  in Twilio before sending production traffic.
                </li>
                <li>
                  • Capture explicit consent before texting a recipient.
                  PhotoBrief automatically appends "Reply STOP to opt out." on
                  the first SMS to each new number.
                </li>
                <li>
                  • Keep messages transactional. Marketing-style SMS may require
                  additional carrier approvals.
                </li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
