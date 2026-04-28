import { supabase } from "@/integrations/supabase/client";

export const pdfService = {
  async exportSubmission(submissionId: string) {
    const { data, error } = await supabase.functions.invoke("export-submission-pdf", {
      body: { submissionId },
    });
    if (error) {
      const ctx = (error as { context?: { error?: string; requiredPlan?: string } }).context;
      const err = new Error(ctx?.error ?? error.message);
      (err as Error & { requiredPlan?: string }).requiredPlan = ctx?.requiredPlan;
      throw err;
    }
    return data as { ok: true; url: string; path: string; branded: boolean; whiteLabel: boolean };
  },
};
