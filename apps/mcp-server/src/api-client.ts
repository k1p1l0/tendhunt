const API_BASE_URL =
  process.env.TENDHUNT_BASE_URL || "https://app.tendhunt.com";
const API_KEY = process.env.TENDHUNT_API_KEY || "";

interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>,
  params?: Record<string, string | number | undefined>
): Promise<ApiResponse<T>> {
  const url = new URL(`${API_BASE_URL}${endpoint}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    Accept: "application/json",
  };

  const init: RequestInit = { method, headers };

  if (body && method === "POST") {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), init);
  const data = (await res.json()) as ApiResponse<T>;

  if (!res.ok) {
    return {
      ok: false,
      error: data.error || `API returned ${res.status}`,
    };
  }

  return data;
}

export function validateApiKey(): void {
  if (!API_KEY) {
    console.error(
      "ERROR: TENDHUNT_API_KEY environment variable is required.\n" +
        "Get your API key from https://app.tendhunt.com/settings"
    );
    process.exit(1);
  }
}

export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("fetch")) {
      return "Error: Could not connect to TendHunt API. Check TENDHUNT_BASE_URL and network.";
    }
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
}
