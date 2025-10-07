import { buildApiUrl, buildAppApiUrl } from "./config";
import { getAuthToken } from "./auth-storage";
import { getCisApiKey } from "./cis-api-key";

export type ApiTarget = "app" | "external";

interface RequestOptions extends Omit<RequestInit, "body"> {
  path: string;
  target?: ApiTarget;
  requiresAuth?: boolean;
  body?: BodyInit | Record<string, unknown>;
}

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

export async function apiRequest<TResponse>(options: RequestOptions): Promise<TResponse> {
  const {
    path,
    target = "app",
    requiresAuth = true,
    body,
    headers,
    method = "GET",
    ...rest
  } = options;

  const url = target === "external" ? buildApiUrl(path) : buildAppApiUrl(path);

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  const cisApiKey = getCisApiKey();
  if (cisApiKey) {
    requestHeaders.set("x-cis-api-key", cisApiKey);
  }

  const finalInit: RequestInit = {
    method,
    headers: requestHeaders,
    ...rest,
  };

  if (body && typeof body === "object" && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
    finalInit.body = JSON.stringify(body);
  } else if (body) {
    finalInit.body = body as BodyInit;
  }

  if (requiresAuth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;

  try {
    response = await fetch(url, finalInit);
  } catch (networkError) {
    throw {
      status: 0,
      message: "Unable to reach the server",
      details: networkError,
    } satisfies ApiError;
  }

  let payload: unknown = null;
  const isJson = response.headers.get("content-type")?.includes("application/json");

  if (isJson) {
    payload = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const message = (payload as { message?: string } | null)?.message ?? response.statusText;
    throw {
      status: response.status,
      message,
      details: payload,
    } satisfies ApiError;
  }

  return (payload as TResponse) ?? ({} as TResponse);
}
