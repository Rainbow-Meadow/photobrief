import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <PageHeader
        title="Set up your workspace"
        description="A few quick details so your request links look like you. Phase 1 placeholder."
      />
      <form
        className="space-y-5 rounded-lg border bg-card p-6 shadow-elev-sm"
        onSubmit={(e) => {
          e.preventDefault();
          navigate("/dashboard");
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="business">Business name</Label>
          <Input id="business" placeholder="Bright Spark Plumbing" defaultValue="Bright Spark Plumbing" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" placeholder="Plumbing" defaultValue="Plumbing" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="color">Brand color</Label>
          <Input id="color" type="color" defaultValue="#0A6BFF" className="h-10 w-20 p-1" />
        </div>
        <Button type="submit" className="w-full">Continue to dashboard</Button>
      </form>
    </div>
  );
}
