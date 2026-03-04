import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  api, 
  buildUrl,
  type CreateDomainRequest,
  type UpdateDomainRequest,
  type CreateLandingPageRequest
} from "@shared/routes";

async function sessionFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    credentials: "include",
    ...init,
  });
}

// === STATS ===
export function useDashboardStats() {
  return useQuery({
    queryKey: [api.stats.dashboard.path],
    queryFn: async () => {
      const res = await sessionFetch(api.stats.dashboard.path);
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return api.stats.dashboard.responses[200].parse(await res.json());
    },
    refetchInterval: 30000, // Refresh every 30s
  });
}

// === DOMAINS ===
export function useDomains() {
  return useQuery({
    queryKey: [api.domains.list.path],
    queryFn: async () => {
      const res = await sessionFetch(api.domains.list.path);
      if (!res.ok) throw new Error("Failed to fetch domains");
      return api.domains.list.responses[200].parse(await res.json());
    },
  });
}

export function useDomain(id: number) {
  return useQuery({
    queryKey: [api.domains.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.domains.get.path, { id });
      const res = await sessionFetch(url);
      if (!res.ok) throw new Error("Failed to fetch domain");
      return api.domains.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDomainRequest) => {
      const validated = api.domains.create.input.parse(data);
      const res = await sessionFetch(api.domains.create.path, {
        method: api.domains.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to create domain");
      return api.domains.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.domains.list.path] }),
  });
}

export function useUpdateDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateDomainRequest & { id: number }) => {
      const validated = api.domains.update.input.parse(data);
      const url = buildUrl(api.domains.update.path, { id });
      const res = await sessionFetch(url, {
        method: api.domains.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to update domain");
      return api.domains.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.domains.list.path] }),
  });
}

export function useDeleteDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.domains.delete.path, { id });
      const res = await sessionFetch(url, { method: api.domains.delete.method });
      if (!res.ok) throw new Error("Failed to delete domain");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.domains.list.path] }),
  });
}

// === LANDING PAGES ===
export function useLandingPages() {
  return useQuery({
    queryKey: [api.landingPages.list.path],
    queryFn: async () => {
      const res = await sessionFetch(api.landingPages.list.path);
      if (!res.ok) throw new Error("Failed to fetch landing pages");
      return api.landingPages.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateLandingPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateLandingPageRequest) => {
      const validated = api.landingPages.create.input.parse(data);
      const res = await sessionFetch(api.landingPages.create.path, {
        method: api.landingPages.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to create landing page");
      return api.landingPages.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.landingPages.list.path] }),
  });
}

export function useUpdateLandingPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateLandingPageRequest> & { id: number }) => {
      const validated = api.landingPages.update.input.parse(data);
      const url = buildUrl(api.landingPages.update.path, { id });
      const res = await sessionFetch(url, {
        method: api.landingPages.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to update landing page");
      return api.landingPages.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.landingPages.list.path] }),
  });
}

export function useDeleteLandingPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.landingPages.delete.path, { id });
      const res = await sessionFetch(url, { method: api.landingPages.delete.method });
      if (!res.ok) throw new Error("Failed to delete landing page");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.landingPages.list.path] }),
  });
}

// === LOGS ===
export function useLogs() {
  return useQuery({
    queryKey: [api.logs.list.path],
    queryFn: async () => {
      const res = await sessionFetch(api.logs.list.path);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return api.logs.list.responses[200].parse(await res.json());
    },
  });
}
