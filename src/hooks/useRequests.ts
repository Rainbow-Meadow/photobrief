import { useMemo } from "react";
import { requestsService } from "@/services/requestsService";

export function useRequests() {
  return useMemo(() => requestsService.list(), []);
}

export function useRequest(id: string | undefined) {
  return useMemo(() => (id ? requestsService.getById(id) : undefined), [id]);
}

export function useRequestByToken(token: string | undefined) {
  return useMemo(() => (token ? requestsService.getByToken(token) : undefined), [token]);
}
