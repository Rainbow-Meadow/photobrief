import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requestStatusOptions } from "@/config/statusOptions";
import type { RequestStatus, TeamMember } from "@/types/photobrief";

export type ReadinessBucket = "all" | "high" | "medium" | "low" | "none";
export type ActivityBucket = "all" | "today" | "week" | "older";

export interface InboxFilterState {
  search: string;
  status: RequestStatus | "all";
  guide: string;
  assignee: string;
  readiness: ReadinessBucket;
  activity: ActivityBucket;
}

export const defaultInboxFilters: InboxFilterState = {
  search: "",
  status: "all",
  guide: "all",
  assignee: "all",
  readiness: "all",
  activity: "all",
};

interface Props {
  value: InboxFilterState;
  onChange: (next: InboxFilterState) => void;
  guides: { id: string; name: string }[];
  assignees: TeamMember[];
}

export function InboxFilters({ value, onChange, guides, assignees }: Props) {
  const update = <K extends keyof InboxFilterState>(key: K, v: InboxFilterState[K]) =>
    onChange({ ...value, [key]: v });

  const isDirty =
    value.search !== "" ||
    value.status !== "all" ||
    value.guide !== "all" ||
    value.assignee !== "all" ||
    value.readiness !== "all" ||
    value.activity !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search recipient or guide…"
          value={value.search}
          onChange={(e) => update("search", e.target.value)}
        />
      </div>

      <Select value={value.status} onValueChange={(v) => update("status", v as InboxFilterState["status"])}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {Object.entries(requestStatusOptions).map(([key, opt]) => (
            <SelectItem key={key} value={key}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.guide} onValueChange={(v) => update("guide", v)}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Guide" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All guides</SelectItem>
          {guides.map((g) => (
            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.assignee} onValueChange={(v) => update("assignee", v)}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Assignee" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any assignee</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {assignees.map((m) => (
            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.readiness} onValueChange={(v) => update("readiness", v as ReadinessBucket)}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Readiness" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any readiness</SelectItem>
          <SelectItem value="high">High (85+)</SelectItem>
          <SelectItem value="medium">Medium (60–84)</SelectItem>
          <SelectItem value="low">Low (&lt;60)</SelectItem>
          <SelectItem value="none">Not yet scored</SelectItem>
        </SelectContent>
      </Select>

      <Select value={value.activity} onValueChange={(v) => update("activity", v as ActivityBucket)}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Last activity" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any time</SelectItem>
          <SelectItem value="today">Last 24 hours</SelectItem>
          <SelectItem value="week">Last 7 days</SelectItem>
          <SelectItem value="older">Older than 7 days</SelectItem>
        </SelectContent>
      </Select>

      {isDirty ? (
        <Button variant="ghost" size="sm" onClick={() => onChange(defaultInboxFilters)} className="gap-1">
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      ) : null}
    </div>
  );
}

export function applyInboxFilters<T extends {
  recipientName: string;
  guideName: string;
  guideId: string;
  status: RequestStatus;
  readinessScore?: number;
  lastActivityAt?: string;
  assigneeId?: string;
}>(items: T[], f: InboxFilterState): T[] {
  const now = Date.now();
  return items.filter((r) => {
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!r.recipientName.toLowerCase().includes(q) && !r.guideName.toLowerCase().includes(q)) return false;
    }
    if (f.status !== "all" && r.status !== f.status) return false;
    if (f.guide !== "all" && r.guideId !== f.guide) return false;
    if (f.assignee !== "all") {
      if (f.assignee === "unassigned") {
        if (r.assigneeId) return false;
      } else if (r.assigneeId !== f.assignee) return false;
    }
    if (f.readiness !== "all") {
      const s = r.readinessScore;
      if (f.readiness === "none") {
        if (s !== undefined) return false;
      } else if (s === undefined) {
        return false;
      } else if (f.readiness === "high" && s < 85) return false;
      else if (f.readiness === "medium" && (s < 60 || s >= 85)) return false;
      else if (f.readiness === "low" && s >= 60) return false;
    }
    if (f.activity !== "all") {
      if (!r.lastActivityAt) return false;
      const ageH = (now - new Date(r.lastActivityAt).getTime()) / 36e5;
      if (f.activity === "today" && ageH > 24) return false;
      if (f.activity === "week" && (ageH < 0 || ageH > 24 * 7)) return false;
      if (f.activity === "older" && ageH <= 24 * 7) return false;
    }
    return true;
  });
}
