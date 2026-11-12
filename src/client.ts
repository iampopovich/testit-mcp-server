import { TokenManager } from "./auth.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;

export interface TestITApiClientOptions {
  baseUrl: string;
  tokenManager: TokenManager;
  defaultProjectId?: string;
}

const MAX_ERROR_DETAIL_LENGTH = 500;
const MAX_RETRY_AFTER_MS = 10000;

const STATUS_HINTS: Record<number, string> = {
  401: "Check TESTIT_TOKEN (private API token) and TESTIT_URL.",
  403: "The token's user lacks permission for this project or action.",
  404: "Entity not found — check the ID; it may also be archived or purged.",
  429: "Rate limited by TestIT; retry later.",
};

export class TestITApiError extends Error {
  constructor(
    readonly method: string,
    readonly path: string,
    readonly status: number,
    readonly detail: string,
  ) {
    const hint = STATUS_HINTS[status];
    super(`TestIT API ${method} ${path} failed (${status}): ${detail}${hint ? ` Hint: ${hint}` : ""}`);
    this.name = "TestITApiError";
  }
}

/** Extracts a short, readable error detail from a TestIT error response body. */
export function formatErrorDetail(text: string): string {
  try {
    const parsed = JSON.parse(text) as {
      error?: { key?: string; type?: string };
      title?: string;
      errors?: Record<string, string[]>;
    };
    if (parsed.error?.key) {
      return parsed.error.type ? `${parsed.error.type}: ${parsed.error.key}` : parsed.error.key;
    }
    if (parsed.errors) {
      const fields = Object.entries(parsed.errors)
        .map(([field, messages]) => `${field}: ${messages.join("; ")}`)
        .join(" | ");
      return parsed.title ? `${parsed.title} ${fields}` : fields;
    }
  } catch {
    // not JSON
  }
  const trimmed = text.trim();
  return trimmed.length > MAX_ERROR_DETAIL_LENGTH
    ? `${trimmed.slice(0, MAX_ERROR_DETAIL_LENGTH)}…`
    : trimmed || "(empty response)";
}

export class TestITApiClient {
  private readonly baseUrl: string;
  private readonly tokenManager: TokenManager;
  readonly defaultProjectId: string | undefined;
  private readonly maxGetRetries = 2;
  private readonly maxRateLimitRetries = 2;
  private readonly requestTimeoutMs = 30000;

  constructor(options: TestITApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.tokenManager = options.tokenManager;
    this.defaultProjectId = options.defaultProjectId;
  }

  async get<T>(path: string, query?: QueryParams): Promise<T> {
    return this.request<T>("GET", path, undefined, query);
  }

  async post<T>(
    path: string,
    body?: unknown,
    query?: QueryParams,
  ): Promise<T> {
    return this.request<T>("POST", path, body, query);
  }

  async patch<T>(
    path: string,
    body?: unknown,
    query?: QueryParams,
  ): Promise<T> {
    return this.request<T>("PATCH", path, body, query);
  }

  async put<T>(path: string, body?: unknown, query?: QueryParams): Promise<T> {
    return this.request<T>("PUT", path, body, query);
  }

  async delete<T = unknown>(path: string, query?: QueryParams, body?: unknown): Promise<T> {
    return this.request<T>("DELETE", path, body, query);
  }

  async postMultipart<T>(path: string, formData: FormData, query?: QueryParams): Promise<T> {
    const response = await this.send("POST", path, query, async () => ({
      Accept: "application/json",
      Authorization: await this.authHeader(),
    }), formData);
    return this.parseBody<T>(response);
  }

  async getRaw(path: string, query?: QueryParams): Promise<{ contentType: string; content: string; encoding: string }> {
    const response = await this.send("GET", path, query, async () => ({
      Authorization: await this.authHeader(),
    }));
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const buffer = await response.arrayBuffer();
    const content = Buffer.from(buffer).toString("base64");

    return { contentType, content, encoding: "base64" };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: QueryParams,
  ): Promise<T> {
    const response = await this.send(
      method,
      path,
      query,
      async () => ({
        Accept: "application/json",
        Authorization: await this.authHeader(),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      }),
      body !== undefined ? JSON.stringify(body) : undefined,
    );
    return this.parseBody<T>(response);
  }

  /**
   * Sends a request with retries:
   * - GET: network errors and 502/503/504 (idempotent);
   * - any method: 429, honoring Retry-After (the request was not processed).
   */
  private async send(
    method: string,
    path: string,
    query: QueryParams | undefined,
    headers: () => Promise<Record<string, string>>,
    body?: RequestInit["body"],
  ): Promise<Response> {
    const url = this.buildUrl(path, query);
    const transientRetries = method === "GET" ? this.maxGetRetries : 0;
    let transientAttempts = 0;
    let rateLimitAttempts = 0;

    for (;;) {
      let response: Response;
      try {
        response = await fetch(url, {
          method,
          headers: await headers(),
          body,
          signal: AbortSignal.timeout(this.requestTimeoutMs),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (transientAttempts < transientRetries && this.isRetryableNetworkError(message)) {
          transientAttempts += 1;
          await this.wait(300 * transientAttempts);
          continue;
        }
        throw error;
      }

      if (response.ok) {
        return response;
      }

      if (response.status === 429 && rateLimitAttempts < this.maxRateLimitRetries) {
        rateLimitAttempts += 1;
        await response.text();
        await this.wait(this.retryAfterMs(response.headers.get("retry-after"), rateLimitAttempts));
        continue;
      }
      if (transientAttempts < transientRetries && [502, 503, 504].includes(response.status)) {
        transientAttempts += 1;
        await response.text();
        await this.wait(300 * transientAttempts);
        continue;
      }

      throw new TestITApiError(method, path, response.status, formatErrorDetail(await response.text()));
    }
  }

  private async parseBody<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }
    return (await response.text()) as T;
  }

  private async authHeader(): Promise<string> {
    const accessToken = await this.tokenManager.getAccessToken();
    return accessToken.startsWith("Bearer ") || accessToken.startsWith("PrivateToken ")
      ? accessToken
      : `PrivateToken ${accessToken}`;
  }

  private retryAfterMs(header: string | null, attempt: number): number {
    const seconds = header ? Number(header) : Number.NaN;
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
    }
    return Math.min(1000 * attempt, MAX_RETRY_AFTER_MS);
  }

  private buildUrl(path: string, query?: QueryParams): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);

    if (!query) {
      return url.toString();
    }

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, String(item));
        }
      } else {
        url.searchParams.append(key, String(value));
      }
    }

    return url.toString();
  }

  private isRetryableNetworkError(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes("fetch failed") ||
      lower.includes("timed out") ||
      lower.includes("econnreset") ||
      lower.includes("eai_again")
    );
  }

  private async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
