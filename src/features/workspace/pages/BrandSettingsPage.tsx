import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UpgradePromptCard } from "@/components/shared/UpgradePromptCard";
import { usePlan } from "@/hooks/usePlan";

export default function BrandSettingsPage() {
  const { can } = usePlan();
  const canBrand = can("branding");
  const canWhiteLabel = can("white_label");

  return (
    <div className="space-y-6">
      <PageHeader title="Brand" description="How your recipient pages look and sound." />

      {!canBrand ? (
        <UpgradePromptCard feature="branding" className="max-w-xl" />
      ) : null}

      <form
        className="max-w-xl space-y-5 rounded-lg border bg-card p-6 shadow-elev-sm"
        aria-disabled={!canBrand}
      >
        <fieldset disabled={!canBrand} className="space-y-5 disabled:opacity-60">
          <div className="space-y-1.5">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" defaultValue="Bright Spark Plumbing" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="color">Brand color</Label>
            <Input id="color" type="color" defaultValue="#0A6BFF" className="h-10 w-20 p-1" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="intro">Intro message</Label>
            <Input id="intro" defaultValue="Hi! Help us help you — a few quick photos." />
          </div>
          <Button type="button">Save changes</Button>
        </fieldset>
      </form>

      <div className="max-w-xl space-y-3">
        <h3 className="text-sm font-semibold text-foreground">White-label</h3>
        {canWhiteLabel ? (
          <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground shadow-elev-sm">
            White-label is enabled — recipient pages and emails won't show PhotoBrief branding.
          </div>
        ) : (
          <UpgradePromptCard feature="white_label" variant="inline" />
        )}
      </div>
    </div>
  );
}
