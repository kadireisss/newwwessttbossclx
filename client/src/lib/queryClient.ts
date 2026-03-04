import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    if (import.meta.env.DEV) {
      console.error("[api]", res.status, text);
    }
    throw new Error(`Request failed (${res.status})`);
  }
}

export async function apiRequest(
  methodOrUrl: string,
  urlOrOptions?: string | { method?: string; body?: string; headers?: Record<string, string> },
  data?: unknown | undefined,
): Promise<Response> {
  let method: string;
  let url: string;
  let body: string | undefined;

  if (typeof urlOrOptions === 'string') {
    method = methodOrUrl;
    url = urlOrOptions;
    body = data ? JSON.stringify(data) : undefined;
  } else if (typeof urlOrOptions === 'object') {
    url = methodOrUrl;
    method = urlOrOptions.method || 'GET';
    body = urlOrOptions.body;
  } else {
    url = methodOrUrl;
    method = 'GET';
    body = undefined;
  }

  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000, // 30s stale time (was Infinity - bad for live data)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
