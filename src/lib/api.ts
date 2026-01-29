export type RsData<T> = {
    resultCode: string;
    msg: string;
    data: T;
};

export type ApiResult<T> = {
    rsData: RsData<T> | null;
    errorMessage: string | null;
    response: Response;
};

export function getAuthHeaders(init?: HeadersInit): HeadersInit {
    const headers = new Headers(init || {});
    if (typeof window === "undefined") {
        return headers;
    }
    const apiKey = localStorage.getItem("buyerApiKey")?.trim();
    const accessToken = localStorage.getItem("accessToken")?.trim();

    // Only add Bearer if we actually have something to add
    if (apiKey || accessToken) {
        const parts = ["Bearer"];
        if (apiKey) parts.push(apiKey);
        if (accessToken) parts.push(accessToken);
        headers.set("Authorization", parts.join(" "));
    }
    return headers;
}

export function buildApiUrl(path: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    if (!baseUrl) return path;
    try {
        return new URL(path, baseUrl).toString();
    } catch {
        return path;
    }
}

export function isSuccessResultCode(resultCode?: string): boolean {
    if (!resultCode) return false;
    return resultCode.startsWith("200-") || resultCode.startsWith("201-");
}

export async function safeJson<T>(response: Response): Promise<T | null> {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        return null;
    }
    try {
        return (await response.json()) as T;
    } catch {
        return null;
    }
}

export async function parseRsData<T>(response: Response): Promise<{
    rsData: RsData<T> | null;
    errorMessage: string | null;
}> {
    const json = await safeJson<RsData<T>>(response);
    if (!json) {
        return { rsData: null, errorMessage: "응답 파싱에 실패했습니다." };
    }
    const isSuccess = response.ok && (json.resultCode ? isSuccessResultCode(json.resultCode) : true);
    if (!isSuccess) {
        return { rsData: json, errorMessage: json.msg || "요청에 실패했습니다." };
    }
    return { rsData: json, errorMessage: null };
}

export async function apiRequest<T>(
    path: string,
    init: RequestInit = {}
): Promise<ApiResult<T>> {
    const headers = getAuthHeaders(init.headers);
    const response = await fetch(buildApiUrl(path), {
        ...init,
        headers,
        // Always include credentials for HttpOnly cookies
        credentials: "include",
    });
    const { rsData, errorMessage } = await parseRsData<T>(response);
    return { rsData, errorMessage, response };
}

export function parseFieldErrors(msg: string): Record<string, string> {
    const fieldErrors: Record<string, string> = {};
    const lines = msg.split("\n").map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
        const [field, code, ...rest] = line.split("-");
        if (!field || !code) continue;
        const message = rest.length > 0 ? rest.join("-") : code;
        if (!fieldErrors[field]) {
            fieldErrors[field] = message;
        }
    }
    return fieldErrors;
}
export const DEFAULT_PROFILE_URL =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Ccircle cx='24' cy='24' r='24' fill='%23e0e0e0'/%3E%3Ccircle cx='24' cy='18' r='8' fill='%23bdbdbd'/%3E%3Cellipse cx='24' cy='38' rx='14' ry='10' fill='%23bdbdbd'/%3E%3C/svg%3E";

export function resolveImageUrl(url?: string | null): string {
    if (!url) return DEFAULT_PROFILE_URL;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return buildApiUrl(url);
}
