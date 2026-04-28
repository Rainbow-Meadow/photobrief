// Generates a branded PDF for a submission and returns a signed URL.
// Body: { submissionId }
// Pro+ unlocks branded; Free/Starter get a "Made with PhotoBrief" footer.
// Uses pdf-lib (pure-JS) to assemble the document.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function hexToRgb(hex?: string | null): [number, number, number] {
  if (!hex) return [10 / 255, 107 / 255, 255 / 255];
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return [10 / 255, 107 / 255, 255 / 255];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { submissionId } = (await req.json()) as { submissionId: string };
    if (!submissionId) {
      return new Response(JSON.stringify({ error: "submissionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load submission + media via user RLS
    const { data: submission, error: subErr } = await userClient
      .from("submissions")
      .select(
        "id, workspace_id, request_id, submitter_name, submitter_contact, ai_summary, next_action, readiness_score, submitted_at",
      )
      .eq("id", submissionId)
      .maybeSingle();
    if (subErr || !submission) {
      return new Response(JSON.stringify({ error: "Submission not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: ws }, { data: brand }, { data: media }, { data: details }] = await Promise.all([
      admin.from("business_workspaces").select("plan_tier, name").eq("id", submission.workspace_id).maybeSingle(),
      admin.from("brand_profiles").select("logo_url, primary_color").eq("workspace_id", submission.workspace_id).maybeSingle(),
      userClient.from("captured_media").select("file_url, note, status, step_id").eq("submission_id", submissionId).order("created_at"),
      userClient.from("extracted_details").select("label, value, type").eq("submission_id", submissionId),
    ]);

    const plan = ws?.plan_tier ?? "free";
    if (plan === "free") {
      return new Response(
        JSON.stringify({ error: "PLAN_FEATURE_LOCKED", feature: "pdf_export", requiredPlan: "starter" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const branded = ["pro", "team", "business"].includes(plan);
    const whiteLabel = plan === "business";

    const pdf = await PDFDocument.create();
    const helv = await pdf.embedFont(StandardFonts.Helvetica);
    const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const accent = hexToRgb(brand?.primary_color);
    const ink = rgb(0.1, 0.1, 0.12);
    const muted = rgb(0.42, 0.45, 0.5);

    const page = pdf.addPage([612, 792]); // US Letter
    let y = 740;

    // Header band
    if (branded) {
      page.drawRectangle({ x: 0, y: 760, width: 612, height: 32, color: rgb(...accent) });
      page.drawText(ws?.name ?? "PhotoBrief", {
        x: 36, y: 770, size: 12, font: helvBold, color: rgb(1, 1, 1),
      });
    }

    page.drawText("Submission summary", { x: 36, y, size: 22, font: helvBold, color: ink });
    y -= 24;
    page.drawText(`Submitted by ${submission.submitter_name ?? "Recipient"}`, {
      x: 36, y, size: 11, font: helv, color: muted,
    });
    y -= 14;
    if (submission.submitted_at) {
      page.drawText(`Received ${new Date(submission.submitted_at).toLocaleString()}`, {
        x: 36, y, size: 10, font: helv, color: muted,
      });
      y -= 16;
    }
    if (typeof submission.readiness_score === "number") {
      page.drawText(`Readiness: ${submission.readiness_score}/100`, {
        x: 36, y, size: 12, font: helvBold, color: rgb(...accent),
      });
      y -= 18;
    }

    const wrap = (txt: string, max = 90) => {
      const out: string[] = [];
      const words = txt.split(/\s+/);
      let line = "";
      for (const w of words) {
        if ((line + " " + w).trim().length > max) { out.push(line); line = w; }
        else line = (line + " " + w).trim();
      }
      if (line) out.push(line);
      return out;
    };

    if (submission.ai_summary) {
      y -= 6;
      page.drawText("AI summary", { x: 36, y, size: 13, font: helvBold, color: ink });
      y -= 16;
      for (const ln of wrap(submission.ai_summary)) {
        page.drawText(ln, { x: 36, y, size: 10, font: helv, color: ink });
        y -= 13;
        if (y < 80) break;
      }
    }

    if (submission.next_action && y > 120) {
      y -= 8;
      page.drawText("Next action", { x: 36, y, size: 12, font: helvBold, color: ink });
      y -= 14;
      for (const ln of wrap(submission.next_action)) {
        page.drawText(ln, { x: 36, y, size: 10, font: helv, color: ink });
        y -= 13;
        if (y < 80) break;
      }
    }

    if (details && details.length && y > 140) {
      y -= 8;
      page.drawText("Extracted details", { x: 36, y, size: 12, font: helvBold, color: ink });
      y -= 14;
      for (const d of details) {
        const label = `${d.label}: `;
        page.drawText(label + (d.value ?? ""), { x: 36, y, size: 10, font: helv, color: ink });
        y -= 13;
        if (y < 80) break;
      }
    }

    // Photos pages — embed first ~12 images, 2 per page
    const photos = (media ?? []).filter((m) => m.file_url);
    let imgPage = pdf.addPage([612, 792]);
    let iy = 740;
    page.drawText(`${photos.length} photo${photos.length === 1 ? "" : "s"} attached`, {
      x: 36, y: 60, size: 9, font: helv, color: muted,
    });
    imgPage.drawText("Photos", { x: 36, y: iy, size: 18, font: helvBold, color: ink });
    iy -= 28;
    let imgCount = 0;
    for (const m of photos) {
      if (imgCount >= 12) break;
      try {
        const r = await fetch(m.file_url);
        if (!r.ok) continue;
        const buf = new Uint8Array(await r.arrayBuffer());
        const ct = r.headers.get("content-type") ?? "";
        const img = ct.includes("png") ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
        const maxW = 540;
        const maxH = 320;
        const ratio = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        if (iy - h < 80) {
          imgPage = pdf.addPage([612, 792]);
          iy = 740;
        }
        imgPage.drawImage(img, { x: 36, y: iy - h, width: w, height: h });
        iy -= h + 10;
        if (m.note) {
          imgPage.drawText(m.note.slice(0, 100), { x: 36, y: iy, size: 9, font: helv, color: muted });
          iy -= 14;
        }
        imgCount++;
      } catch { /* skip bad images */ }
    }

    // Footer on every page
    const pages = pdf.getPages();
    for (const p of pages) {
      if (!whiteLabel) {
        const footer = branded
          ? "Made with PhotoBrief"
          : "Made with PhotoBrief — upgrade for branded PDFs";
        p.drawText(footer, { x: 36, y: 24, size: 8, font: helv, color: muted });
      }
    }

    const bytes = await pdf.save();
    const path = `${submission.workspace_id}/exports/${submissionId}-${Date.now()}.pdf`;
    const { error: upErr } = await admin.storage.from("submission-media").upload(path, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: signed } = await admin.storage
      .from("submission-media")
      .createSignedUrl(path, 60 * 60);

    return new Response(
      JSON.stringify({ ok: true, url: signed?.signedUrl, path, branded, whiteLabel }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
