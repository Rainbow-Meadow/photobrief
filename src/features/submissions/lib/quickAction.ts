// Shared classifier for the AI's `suggestedNextAction` free-text. Used by
// per-shot QuickActions buttons and the page-level keyboard shortcuts so
// both surfaces map a suggestion to the same primary intent.

export type QuickActionKind = "reshoot" | "note" | "ready";

const RESHOOT_KEYWORDS = [
  "retake", "reshoot", "re-shoot", "re-take", "redo", "blurry", "out of focus",
  "too dark", "lighting", "ask for", "request another", "request a new",
  "unreadable", "illegible", "unclear", "obscured", "wider shot", "closer shot",
  "different angle", "from a different", "zoom in", "zoom out",
];
const NOTE_KEYWORDS = [
  "note", "flag", "follow up", "follow-up", "for the team", "internal",
  "remember", "double-check", "verify with", "confirm with",
];
const READY_KEYWORDS = [
  "approve", "looks good", "looks great", "ready", "no action", "accept",
  "mark as reviewed", "mark reviewed", "good to go", "all set", "proceed",
];

export function classifyAction(text: string | undefined | null): QuickActionKind {
  if (!text) return "ready";
  const t = text.toLowerCase();
  if (RESHOOT_KEYWORDS.some((k) => t.includes(k))) return "reshoot";
  if (NOTE_KEYWORDS.some((k) => t.includes(k))) return "note";
  if (READY_KEYWORDS.some((k) => t.includes(k))) return "ready";
  return "ready";
}
