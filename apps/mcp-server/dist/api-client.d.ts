interface ApiResponse<T = unknown> {
    ok: boolean;
    data?: T;
    error?: string;
}
export declare function apiRequest<T = unknown>(endpoint: string, method?: "GET" | "POST", body?: Record<string, unknown>, params?: Record<string, string | number | undefined>): Promise<ApiResponse<T>>;
export declare function validateApiKey(): void;
export declare function handleApiError(error: unknown): string;
export {};
