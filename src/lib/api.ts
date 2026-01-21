export type RsData<T> = {
  resultCode: string;
  msg: string;
  data: T;
};

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
  const isSuccess = response.ok && isSuccessResultCode(json.resultCode);
  if (!isSuccess) {
    return { rsData: json, errorMessage: json.msg || "요청에 실패했습니다." };
  }
  return { rsData: json, errorMessage: null };
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
