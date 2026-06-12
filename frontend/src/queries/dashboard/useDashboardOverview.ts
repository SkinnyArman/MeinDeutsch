import { useQuery } from "@/libs/query";
import type { DashboardOverviewPayload } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useDashboardOverviewQuery = (options?: { refetchInterval?: number }) => {
  return useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: async () => (await fetchJson<DashboardOverviewPayload>(API_PATHS.dashboardOverview)).data,
    refetchInterval: options?.refetchInterval
  });
};
