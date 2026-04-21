import { describe, it, expect, vi } from "vitest";

// Set env before module is imported
vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");

// Mock supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
      refreshSession: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Static import — module is evaluated once with the env already set
import { getUserMe } from "./api";

describe("getUserMe", () => {
  it("returns user profile on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: { id: "1", email: "a@b.com", fullName: "Jean", phone: "06" },
      }),
    });

    const result = await getUserMe();
    expect(result).toEqual({
      data: { id: "1", email: "a@b.com", fullName: "Jean", phone: "06" },
    });
  });

  it("passes through server error body on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });

    const result = await getUserMe();
    // apiFetch passes through the response body regardless of ok status
    expect(result).toEqual({ error: "Server error" });
  });
});
