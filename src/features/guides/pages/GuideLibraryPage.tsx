import { NavLink } from "react-router-dom";
import { Plus, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { mockGuides } from "@/config/mockData";

export default function GuideLibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Guide library"
        description="Reusable photo guides. New guides = config, not new screens."
        actions={
          <Button asChild className="gap-1.5">
            <NavLink to="/guides/new">
              <Plus className="h-4 w-4" /> New guide
            </NavLink>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockGuides.map((g) => (
          <NavLink
            key={g.id}
            to={`/guides/${g.id}`}
            className="group rounded-lg border bg-card p-5 shadow-elev-sm transition-shadow hover:shadow-elev-md"
          >
            <div className="flex items-start gap-3">
              <span className="rounded-md bg-accent p-2 text-accent-foreground">
                <BookOpen className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {g.category}
                </p>
                <h3 className="mt-0.5 text-sm font-semibold text-foreground group-hover:text-primary">
                  {g.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.description}</p>
              </div>
            </div>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
