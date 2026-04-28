import { supabase } from "@/integrations/supabase/client";

export type SmsDefaultChannel = "email" | "sms" | "both";

export interface SmsConfig {
  workspaceId: string;
  accountSid: string | null;
  apiKeySid: string | null;
  apiKeySecretLast4: string | null;
  fromNumber: string | null;
  fromNumberFriendly: string | null;
  defaultChannel: SmsDefaultChannel;
  enabled: boolean;
  verifiedAt: string | null;
  lastError: string | null;
}

export interface TwilioNumber {
  phoneNumber: string;
  friendlyName: string;
}

export const smsConfigService = {
  async get(workspaceId: string): Promise<SmsConfig | null> {
    const { data, error } = await supabase
      .from("workspace_sms_config")
      .select(
        "workspace_id, account_sid, api_key_sid, api_key_secret_last4, from_number, from_number_friendly, default_channel, enabled, verified_at, last_error",
      )
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      workspaceId: data.workspace_id,
      accountSid: data.account_sid,
      apiKeySid: data.api_key_sid,
      apiKeySecretLast4: data.api_key_secret_last4,
      fromNumber: data.from_number,
      fromNumberFriendly: data.from_number_friendly,
      defaultChannel: data.default_channel as SmsDefaultChannel,
      enabled: data.enabled,
      verifiedAt: data.verified_at,
      lastError: data.last_error,
    };
  },

  /** Create or replace the credentials for a workspace. */
  async saveCredentials(input: {
    workspaceId: string;
    accountSid: string;
    apiKeySid: string;
    apiKeySecret: string;
  }) {
    const last4 = input.apiKeySecret.slice(-4);
    const { error } = await supabase
      .from("workspace_sms_config")
      .upsert(
        {
          workspace_id: input.workspaceId,
          account_sid: input.accountSid.trim(),
          api_key_sid: input.apiKeySid.trim(),
          api_key_secret: input.apiKeySecret,
          api_key_secret_last4: last4,
          enabled: false,
          verified_at: null,
          last_error: null,
        },
        { onConflict: "workspace_id" },
      );
    if (error) throw error;
  },

  async updateSettings(input: {
    workspaceId: string;
    fromNumber?: string;
    fromNumberFriendly?: string | null;
    defaultChannel?: SmsDefaultChannel;
    enabled?: boolean;
  }) {
    const patch: {
      from_number?: string;
      from_number_friendly?: string | null;
      default_channel?: SmsDefaultChannel;
      enabled?: boolean;
    } = {};
    if (input.fromNumber !== undefined) patch.from_number = input.fromNumber;
    if (input.fromNumberFriendly !== undefined)
      patch.from_number_friendly = input.fromNumberFriendly;
    if (input.defaultChannel !== undefined)
      patch.default_channel = input.defaultChannel;
    if (input.enabled !== undefined) patch.enabled = input.enabled;
    const { error } = await supabase
      .from("workspace_sms_config")
      .update(patch)
      .eq("workspace_id", input.workspaceId);
    if (error) throw error;
  },

  async disconnect(workspaceId: string) {
    const { error } = await supabase
      .from("workspace_sms_config")
      .delete()
      .eq("workspace_id", workspaceId);
    if (error) throw error;
  },

  /** Calls the verify edge function. Returns SMS-capable phone numbers. */
  async verify(input: {
    workspaceId: string;
    accountSid?: string;
    apiKeySid?: string;
    apiKeySecret?: string;
  }): Promise<{ ok: boolean; numbers: TwilioNumber[]; error?: string }> {
    const { data, error } = await supabase.functions.invoke(
      "twilio-verify-credentials",
      { body: input },
    );
    if (error) {
      const ctx = (error as { context?: { error?: string } }).context;
      return { ok: false, numbers: [], error: ctx?.error ?? error.message };
    }
    return data as { ok: boolean; numbers: TwilioNumber[]; error?: string };
  },
};
