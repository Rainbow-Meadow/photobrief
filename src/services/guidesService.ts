// Guides service — reads workspace guides from Cloud and merges in the
// curated launch templates (config/guideTemplates.ts) as global templates.
//
// Workspace guides are stored in `photo_guides` + `guide_steps` +
// `context_questions`. Until DB-seeded global templates land in a future
// migration, the launch-ready guides ship from the local config so the
// product is usable from day one.

import { supabase } from "@/integrations/supabase/client";
import { getTokenClient } from "@/integrations/supabase/tokenClient";
import { guideTemplates } from "@/config/guideTemplates";
import type { CuratedCategory, PhotoGuide } from "@/types/photobrief";
import type { RequestDraft } from "@/types/requestDraft";

function rowToGuide(g: any, steps: any[], questions: any[]): PhotoGuide {
  return {
    id: g.id,
    workspaceId: g.workspace_id ?? undefined,
    name: g.name,
    category: g.category ?? "Custom",
    description: g.description ?? "",
    isTemplate: g.is_global_template === true,
    steps: (steps ?? [])
      .filter((s) => s.guide_id === g.id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((s) => ({
        id: s.id,
        orderIndex: s.order_index,
        title: s.title,
        instructions: s.instruction ?? "",
        shotType: s.capture_type ?? "wide",
        overlayType: s.overlay_type ?? "full_area",
        aiChecks: s.ai_checks ?? [],
        required: !!s.required,
      })),
    questions: (questions ?? [])
      .filter((q) => q.guide_id === g.id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((q) => ({
        id: q.id,
        orderIndex: q.order_index,
        prompt: q.label,
        inputType: q.input_type ?? "short_text",
        options: q.options ?? undefined,
        required: !!q.required,
      })),
  };
}

async function fetchWorkspaceGuides(workspaceId: string): Promise<PhotoGuide[]> {
  const { data: guides, error } = await supabase
    .from("photo_guides")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true);
  if (error) throw error;
  if (!guides || guides.length === 0) return [];
  const ids = guides.map((g) => g.id);
  const [{ data: steps }, { data: questions }] = await Promise.all([
    supabase.from("guide_steps").select("*").in("guide_id", ids),
    supabase.from("context_questions").select("*").in("guide_id", ids),
  ]);
  return guides.map((g) => rowToGuide(g, steps ?? [], questions ?? []));
}

export const guidesService = {
  // Local launch-ready templates exposed everywhere (no auth required).
  list(): PhotoGuide[] {
    return guideTemplates;
  },
  getById(id: string): PhotoGuide | undefined {
    return guideTemplates.find((g) => g.id === id);
  },
  listLaunchReady(): PhotoGuide[] {
    return guideTemplates.filter((g) => g.launchReady === true && g.curatedCategory);
  },
  listInternalTemplates(): PhotoGuide[] {
    return guideTemplates.filter((g) => !g.launchReady);
  },
  listByCuratedCategory(category: CuratedCategory): PhotoGuide[] {
    return guideTemplates.filter(
      (g) => g.launchReady === true && g.curatedCategory === category,
    );
  },
  listByIndustry(starterIds: string[]): PhotoGuide[] {
    return guideTemplates.filter((g) => starterIds.includes(g.id));
  },

  // Live workspace guides (custom guides created in the builder).
  async listForWorkspace(workspaceId: string): Promise<PhotoGuide[]> {
    const custom = await fetchWorkspaceGuides(workspaceId);
    // Custom guides first, then launch templates.
    return [...custom, ...guideTemplates];
  },

  async getByIdAsync(id: string): Promise<PhotoGuide | null> {
    const local = guideTemplates.find((g) => g.id === id);
    if (local) return local;
    const { data: g } = await supabase
      .from("photo_guides")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!g) return null;
    const [{ data: steps }, { data: questions }] = await Promise.all([
      supabase.from("guide_steps").select("*").eq("guide_id", id),
      supabase.from("context_questions").select("*").eq("guide_id", id),
    ]);
    return rowToGuide(g, steps ?? [], questions ?? []);
  },

  /** Token-scoped guide read for the public recipient page. */
  async getByIdViaToken(token: string, id: string): Promise<PhotoGuide | null> {
    const local = guideTemplates.find((g) => g.id === id);
    if (local) return local;
    const client = getTokenClient(token);
    const { data: g } = await client
      .from("photo_guides")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!g) return null;
    const [{ data: steps }, { data: questions }] = await Promise.all([
      client.from("guide_steps").select("*").eq("guide_id", id),
      client.from("context_questions").select("*").eq("guide_id", id),
    ]);
    return rowToGuide(g, steps ?? [], questions ?? []);
  },

  /**
   * Persist a draft (template-based or AI-generated) as a workspace guide.
   * Creates rows in photo_guides + guide_steps + context_questions.
   * RLS + plan-gating triggers (`enforce_custom_guides_plan`) handle
   * authorization and plan limits.
   */
  async saveDraftAsGuide(args: {
    workspaceId: string;
    draft: RequestDraft;
  }): Promise<PhotoGuide> {
    const { workspaceId, draft } = args;
    const { data: user } = await supabase.auth.getUser();
    const { data: guide, error: guideErr } = await supabase
      .from("photo_guides")
      .insert({
        workspace_id: workspaceId,
        name: draft.title,
        description: draft.source === "ai" ? draft.prompt ?? null : null,
        is_global_template: false,
        is_active: true,
        created_by: user.user?.id ?? null,
      })
      .select()
      .single();
    if (guideErr) throw guideErr;

    if (draft.steps.length > 0) {
      const stepRows = draft.steps.map((s, idx) => ({
        guide_id: guide.id,
        order_index: idx,
        title: s.title,
        instruction: s.instructions ?? null,
        capture_type: (s.shotType ?? "photo") as any,
        overlay_type: (s.overlayType ?? null) as any,
        ai_checks: (s.aiChecks ?? []) as any,
        required: s.required ?? true,
      }));
      const { error: stepsErr } = await supabase.from("guide_steps").insert(stepRows);
      if (stepsErr) throw stepsErr;
    }

    if (draft.questions.length > 0) {
      const qRows = draft.questions.map((q, idx) => ({
        guide_id: guide.id,
        order_index: idx,
        label: q.prompt,
        input_type: q.inputType ?? "short_text",
        options: (q.options ?? null) as any,
        required: q.required ?? false,
      }));
      const { error: qErr } = await supabase.from("context_questions").insert(qRows);
      if (qErr) throw qErr;
    }

    const [{ data: steps }, { data: questions }] = await Promise.all([
      supabase.from("guide_steps").select("*").eq("guide_id", guide.id),
      supabase.from("context_questions").select("*").eq("guide_id", guide.id),
    ]);
    return rowToGuide(guide, steps ?? [], questions ?? []);
  },

  /**
   * Update an existing workspace guide. Replaces all steps + questions
   * (we don't track per-row diffs in the editor).
   */
  async updateGuide(args: {
    guideId: string;
    name: string;
    description?: string | null;
    steps: RequestDraft["steps"];
    questions: RequestDraft["questions"];
  }): Promise<PhotoGuide> {
    const { guideId, name, description, steps, questions } = args;

    const { data: guide, error: guideErr } = await supabase
      .from("photo_guides")
      .update({ name, description: description ?? null })
      .eq("id", guideId)
      .select()
      .single();
    if (guideErr) throw guideErr;

    // Replace steps + questions wholesale.
    await supabase.from("guide_steps").delete().eq("guide_id", guideId);
    await supabase.from("context_questions").delete().eq("guide_id", guideId);

    if (steps.length > 0) {
      const stepRows = steps.map((s, idx) => ({
        guide_id: guideId,
        order_index: idx,
        title: s.title,
        instruction: s.instructions ?? null,
        capture_type: (s.shotType ?? "photo") as any,
        overlay_type: (s.overlayType ?? null) as any,
        ai_checks: (s.aiChecks ?? []) as any,
        required: s.required ?? true,
      }));
      const { error: stepsErr } = await supabase.from("guide_steps").insert(stepRows);
      if (stepsErr) throw stepsErr;
    }

    if (questions.length > 0) {
      const qRows = questions.map((q, idx) => ({
        guide_id: guideId,
        order_index: idx,
        label: q.prompt,
        input_type: q.inputType ?? "short_text",
        options: (q.options ?? null) as any,
        required: q.required ?? false,
      }));
      const { error: qErr } = await supabase.from("context_questions").insert(qRows);
      if (qErr) throw qErr;
    }

    const [{ data: stepsRows }, { data: qRows }] = await Promise.all([
      supabase.from("guide_steps").select("*").eq("guide_id", guideId),
      supabase.from("context_questions").select("*").eq("guide_id", guideId),
    ]);
    return rowToGuide(guide, stepsRows ?? [], qRows ?? []);
  },

  /** Soft-delete: marks the guide inactive so it disappears from listings. */
  async deleteGuide(guideId: string): Promise<void> {
    const { error } = await supabase
      .from("photo_guides")
      .update({ is_active: false })
      .eq("id", guideId);
    if (error) throw error;
  },
};

