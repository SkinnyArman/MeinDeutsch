import { useMutation } from "@/libs/query";
import type { ApiEndpointDefinition } from "@backend/contracts/api-manifest";
import { apiFetch } from "@/libs/http";

export const useApiTriggerMutation = () => {
  return useMutation({
    mutationFn: async (payload: { endpoint: ApiEndpointDefinition; body: Record<string, string> }) => {
      const { endpoint, body } = payload;
      const init: RequestInit = { method: endpoint.method };
      if (endpoint.method === "POST") {
        init.headers = { "Content-Type": "application/json" };
        init.body = JSON.stringify(body);
      }
      const res = await apiFetch(endpoint.path, init);
      const data = await res.json();
      return { res, data };
    }
  });
};
