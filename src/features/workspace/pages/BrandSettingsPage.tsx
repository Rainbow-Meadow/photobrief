import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BrandSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Brand" description="How your recipient pages look and sound." />
      <form className="max-w-xl space-y-5 rounded-lg border bg-card p-6 shadow-elev-sm">
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
      </form>
    </div>
  );
}
