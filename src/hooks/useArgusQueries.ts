import { useQuery } from "@tanstack/react-query";

import type { ComponentRecord, CveRecord, OverviewData } from "@/types/domain";
import { request } from "@/utils/http";

type CveResponse = { data: CveRecord[]; meta?: { total: number; page: number; pageSize: number } };
type ComponentResponse = { data: ComponentRecord[] };
type OverviewResponse = { data: OverviewData };
type UserResponse = { data: { email: string; role: string } };

export const argusQueryKeys = {
  all: ["argus"] as const,
  cves: (params: {
    query: string;
    page: number;
    pageSize: number;
    severity: string;
    status: string;
    ecosystem: string;
  }) => ["argus", "cves", params] as const,
  components: () => ["argus", "components"] as const,
  overview: () => ["argus", "overview"] as const,
  user: () => ["argus", "user"] as const,
};

export function useArgusQueries(params: {
  query: string;
  page: number;
  pageSize: number;
  severity: string;
  status: string;
  ecosystem: string;
}) {
  const cves = useQuery({
    queryKey: argusQueryKeys.cves(params),
    queryFn: () => {
      const search = new URLSearchParams({
        query: params.query,
        page: String(params.page),
        pageSize: String(params.pageSize),
      });
      if (params.severity) search.set("severity", params.severity);
      if (params.status) search.set("status", params.status);
      if (params.ecosystem) search.set("ecosystem", params.ecosystem);
      return request<CveResponse>(`/api/cves?${search.toString()}`);
    },
  });
  const components = useQuery({
    queryKey: argusQueryKeys.components(),
    queryFn: () => request<ComponentResponse>("/api/components"),
  });
  const overview = useQuery({
    queryKey: argusQueryKeys.overview(),
    queryFn: () => request<OverviewResponse>("/api/overview"),
  });
  const user = useQuery({
    queryKey: argusQueryKeys.user(),
    queryFn: () => request<UserResponse>("/api/auth/me"),
  });

  return { cves, components, overview, user };
}
