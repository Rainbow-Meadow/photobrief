import type { ReactNode } from "react";

/**
 * Recursively flatten React children into a plain string. Used to feed
 * visible FAQ answers (which contain JSX like <strong> or <a>) into
 * structured-data hooks (FAQPage JSON-LD) without duplicating content.
 *
 * Trade-off: any inline component that doesn't render text (e.g. icons)
 * is silently dropped, which is what we want for schema text.
 */
export function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object") {
    const maybe = node as unknown as { props?: { children?: ReactNode } };
    if (maybe.props && "children" in maybe.props) {
      return extractText(maybe.props.children ?? "");
    }
  }
  return "";
}
