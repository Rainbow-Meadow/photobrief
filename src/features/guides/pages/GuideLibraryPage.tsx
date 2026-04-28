import { useMemo, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { Plus, Wrench, Home, PackageCheck, Megaphone, Sparkles, EyeOff, Eye } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useLaunchGuides, useInternalGuides } from "@/hooks/useGuides";
import { curatedCategories } from "@/config/curatedCategories";
import type { CuratedCategory, PhotoGuide } from "@/types/photobrief";
import { GuideCard } from "@/features/guides/components/GuideCard";
import { GuidePreviewDialog } from "@/features/guides/components/GuidePreviewDialog";
import { UpgradePromptCard } from "@/components/shared/UpgradePromptCard";
import { usePlan } from "@/hooks/usePlan";
import { toast } from "sonner";

const iconMap = { Wrench, Home, PackageCheck, Megaphone, Sparkles };

export default function GuideLibraryPage() {
  const launchGuides = useLaunchGuides();
  const internalGuides = useInternalGuides();
  const navigate = useNavigate();
  const { can } = usePlan();
  const canCustomGuides = can("custom_guides");
  const [previewGuide, setPreviewGuide] = useState<PhotoGuide | null>(null);
  const [showInternal, setShowInternal] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<CuratedCategory, PhotoGuide[]>();
    for (const g of launchGuides) {
      if (!g.curatedCategory) continue;
      const list = map.get(g.curatedCategory) ?? [];
      list.push(g);
      map.set(g.curatedCategory, list);
    }
    return map;
  }, [launchGuides]);

  function handleUse(guide: PhotoGuide) {
    setPreviewGuide(null);
    navigate(`/requests/new?guide=${guide.id}`);
    toast.success(`Starting a new request from "${guide.name}"`);
  }
  function handleCustomize(guide: PhotoGuide) {
    setPreviewGuide(null);
    navigate(`/guides/${guide.id}`);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Guide library"
        description="Curated, launch-ready guides organized by what your business needs to capture."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowInternal((v) => !v)}
            >
              {showInternal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showInternal ? "Hide internal templates" : "Show internal templates"}
            </Button>
            {canCustomGuides ? (
              <Button asChild className="gap-1.5">
                <NavLink to="/guides/new">
                  <Plus className="h-4 w-4" /> New guide
                </NavLink>
              </Button>
            ) : (
              <Button
                className="gap-1.5"
                onClick={() => toast.error("Custom guides are on Pro", { description: "Upgrade to build your own." })}
              >
                <Plus className="h-4 w-4" /> New guide
                <span className="ml-1 text-[10px] uppercase tracking-wide opacity-80">Pro</span>
              </Button>
            )}
          </div>
        }
      />

      {!canCustomGuides ? <UpgradePromptCard feature="custom_guides" variant="inline" /> : null}

      {curatedCategories.map((cat) => {
        const guides = grouped.get(cat.id) ?? [];
        if (guides.length === 0) return null;
        const Icon = iconMap[cat.icon];
        return (
          <section key={cat.id} className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="rounded-md bg-accent p-2 text-accent-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-foreground">{cat.label}</h2>
                <p className="text-sm text-muted-foreground">{cat.blurb}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((g) => (
                <GuideCard
                  key={g.id}
                  guide={g}
                  onUse={handleUse}
                  onPreview={setPreviewGuide}
                  onCustomize={handleCustomize}
                />
              ))}
            </div>
          </section>
        );
      })}

      {showInternal ? (
        <section className="space-y-4 rounded-lg border border-dashed bg-muted/20 p-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Internal templates</h2>
            <p className="text-xs text-muted-foreground">
              Raw entries from the Template Directory workbook. Not shown to customers — review and curate before launch.
            </p>
          </div>
          <ul className="divide-y rounded-md border bg-card">
            {internalGuides.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{g.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {g.category} · {g.steps.length} steps
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setPreviewGuide(g)}>Preview</Button>
                  <Button size="sm" variant="outline" onClick={() => handleCustomize(g)}>Curate</Button>
                </div>
              </li>
            ))}
            {internalGuides.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                Nothing left in the backlog — every template has been curated.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <GuidePreviewDialog
        guide={previewGuide}
        open={previewGuide !== null}
        onOpenChange={(o) => !o && setPreviewGuide(null)}
        onUse={handleUse}
        onCustomize={handleCustomize}
      />
    </div>
  );
}
