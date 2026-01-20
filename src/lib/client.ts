import { RsData } from "@/types/rs-data";

export class ApiError extends Error {
    resultCode: string;
    msgLines: string[];

    constructor(resultCode: string, msg: string) {
        super(msg);
        this.name = "ApiError";
        this.resultCode = resultCode;
        this.msgLines = msg.split("\n");
    }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

async function client<T>(path: string, options: RequestInit = {}): Promise<RsData<T>> {
    const url = `${BASE_URL}${path}`;

    const defaultHeaders = {
        "Content-Type": "application/json",
    };

    const response = await fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
        credentials: "include",
    });

    // Handle network 4xx/5xx that are not explicitly returning RsData (fallback)
    // But spec says 4xx/5xx also return RsData usually.
    // We will try to parse JSON first.
    let data: RsData<T> | null = null;
    try {
        data = await response.json();
    } catch (e) {
        // If JSON parsing fails, it's a severe error (e.g. 500 HTML response)
        throw new ApiError(`500-ParseError`, "Server response was not valid JSON");
    }

    if (!data) {
        throw new ApiError(`500-NoData`, "No data received");
    }

    // Check resultCode based on Spec 3.1 & 3.2
    // Success: 200-* or 201-*
    // We also check HTTP status? Spec says "Frontend handles based on HTTP status + resultCode".
    // But usually if we get RsData, resultCode is the source of truth for application logic.
    // Spec 3.2 Failure: 4xx, 5xx, or resultCode 400-*, 404-*, 500-*

    const isSuccess = data.resultCode.startsWith("200-") || data.resultCode.startsWith("201-");

    if (!isSuccess) {
        throw new ApiError(data.resultCode, data.msg);
    }

    return data;
}

export const api = {
    get: <T>(path: string) => client<T>(path, { method: "GET" }),
    post: <T>(path: string, body?: any) =>
        client<T>(path, { method: "POST", body: JSON.stringify(body) }),
    put: <T>(path: string, body?: any) =>
        client<T>(path, { method: "PUT", body: JSON.stringify(body) }),
    delete: <T>(path: string) => client<T>(path, { method: "DELETE" }),
    patch: <T>(path: string, body?: any) =>
        client<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
};
