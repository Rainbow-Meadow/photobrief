// Per-request branding context, so the layout header can show the
// requesting business's name/color without prop-drilling.
// Mock-only in Phase 2; populated from the request token in later phases.
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

export interface RecipientBranding {
  businessName: string;
  brandColor?: string;
  logoUrl?: string;
  completionBody?: string;
}

const Ctx = createContext<RecipientBranding | null>(null);

export function RecipientBrandingProvider({
  value,
  children,
}: {
  value: RecipientBranding;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRecipientBranding(): RecipientBranding {
  return (
    useContext(Ctx) ?? { businessName: "PhotoBrief" }
  );
}
