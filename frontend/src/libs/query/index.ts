import {
  QueryClient,
  VueQueryPlugin,
  type VueQueryPluginOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/vue-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

export const vueQueryOptions: VueQueryPluginOptions = {
  queryClient
};

export {
  QueryClient,
  VueQueryPlugin,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
};
