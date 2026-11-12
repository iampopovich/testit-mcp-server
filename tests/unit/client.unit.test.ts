import { afterEach, describe, expect, it, vi } from "vitest";
import { TokenManager } from "../../src/auth.js";
import { formatErrorDetail, TestITApiClient, TestITApiError } from "../../src/client.js";

function makeClient(token = "secret") {
  return new TestITApiClient({
    baseUrl: "https://testit.example/",
    tokenManager: new TokenManager({ baseUrl: "https://testit.example", apiToken: token }),
  });
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("TestITApiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("sends PrivateToken auth, JSON body and query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(makeClient().post("/api/v2/x", { a: 1 }, { Skip: 5, tags: ["a", "b"], no: undefined })).resolves.toEqual({
      ok: true,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://testit.example/api/v2/x?Skip=5&tags=a&tags=b");
    expect(init.headers.Authorization).toBe("PrivateToken secret");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe('{"a":1}');
  });

  it("keeps an explicit Bearer token as is", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(makeClient("Bearer abc").delete("/api/v2/x")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer abc");
  });

  it("retries 429 for any method, honoring Retry-After", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, {}, { "retry-after": "2" }))
      .mockResolvedValueOnce(jsonResponse(201, { id: "1" }));
    vi.stubGlobal("fetch", fetchMock);
    const promise = makeClient().post("/api/v2/x", {});
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toEqual({ id: "1" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries 503 only for GET", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, [1]))
      .mockResolvedValueOnce(jsonResponse(503, {}));
    vi.stubGlobal("fetch", fetchMock);
    const get = makeClient().get("/api/v2/x");
    await vi.advanceTimersByTimeAsync(300);
    await expect(get).resolves.toEqual([1]);
    await expect(makeClient().post("/api/v2/x", {})).rejects.toThrow("(503)");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("throws TestITApiError with a short detail and a hint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(404, { error: { type: "NotFoundException", key: "WorkItem not found" } })),
    );
    const error = await makeClient().get("/api/v2/workItems/1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TestITApiError);
    expect((error as TestITApiError).status).toBe(404);
    expect((error as Error).message).toBe(
      "TestIT API GET /api/v2/workItems/1 failed (404): NotFoundException: WorkItem not found " +
        "Hint: Entity not found — check the ID; it may also be archived or purged.",
    );
  });

  it.each([
    "/api/v2/workItems/../projects/p1",
    "/api/v2/workItems/%2e%2e/projects/p1",
    "/api/v2/workItems/.%2E/projects/p1",
    "/api/v2/testRuns//start",
    "/api/v2/testRuns/x?foo=1/start",
    "/api/v2/testRuns/x#y",
    "/api/v2/testRuns/a%2Fb",
    "/api/v2/testRuns/a\\b",
  ])("rejects unsafe path %s without sending a request", async (path) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(makeClient().delete(path)).rejects.toThrow("Invalid request path");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts normal paths with UUIDs and numeric ids", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);
    await makeClient().get("/api/v2/workItems/01a1ce94-6275-70d1-bf63-cf1bd8135b5e/versions");
    await makeClient().get("api/v2/workItems/648");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("formatErrorDetail handles validation errors, plain text and long bodies", () => {
    expect(formatErrorDetail(JSON.stringify({ title: "Validation failed.", errors: { Name: ["required"] } }))).toBe(
      "Validation failed. Name: required",
    );
    expect(
      formatErrorDetail(JSON.stringify({ error: { type: "SomeException", key: "SomeException" } })),
    ).toBe("SomeException");
    expect(formatErrorDetail("oops")).toBe("oops");
    expect(formatErrorDetail("")).toBe("(empty response)");
    expect(formatErrorDetail("x".repeat(600))).toHaveLength(501);
  });
});
