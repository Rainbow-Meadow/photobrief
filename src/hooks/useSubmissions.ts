import { useMemo } from "react";
import { submissionsService } from "@/services/submissionsService";

export function useSubmissions() {
  return useMemo(() => submissionsService.list(), []);
}

export function useSubmission(id: string | undefined) {
  return useMemo(() => (id ? submissionsService.getById(id) : undefined), [id]);
}
