import { describe, it, expect, beforeEach, vi } from "vitest";
import { calculateGeminiCost } from "@/lib/gemini-cost";
import {
  checkRateLimit,
  checkDurableRateLimit,
  logGeminiUsage,
  getClientKey,
} from "@/lib/rate-limit";
import { extractInvoiceFromImage } from "@/lib/gemini/extract-invoice";

describe("Q27 · Gemini Rate Limits & Cost Monitoring", () => {
  describe("Cost Estimation (lib/gemini-cost.ts)", () => {
    it("calculates estimated cost accurately for tokens and images", () => {
      const result = calculateGeminiCost({
        promptTokens: 1000,
        candidatesTokens: 500,
        hasImage: true,
      });

      expect(result.costUsd).toBeGreaterThan(0);
      expect(result.costSar).toBeCloseTo(result.costUsd * 3.75, 4);
    });

    it("uses default base cost estimate when tokens are 0 or not provided", () => {
      const result = calculateGeminiCost();
      expect(result.costUsd).toBe(0.00015);
      expect(result.costSar).toBeCloseTo(0.00015 * 3.75, 4);
    });
  });

  describe("In-Memory & Durable Rate Limiting (lib/rate-limit.ts)", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("allows requests up to the defined limit and blocks excess requests", () => {
      const key = "test-user-ip-123";
      const opts = { limit: 3, windowMs: 60_000 };

      expect(checkRateLimit(key, opts)).toEqual({ allowed: true });
      expect(checkRateLimit(key, opts)).toEqual({ allowed: true });
      expect(checkRateLimit(key, opts)).toEqual({ allowed: true });

      const blocked = checkRateLimit(key, opts);
      expect(blocked.allowed).toBe(false);
      if (!blocked.allowed) {
        expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      }
    });

    it("checkDurableRateLimit falls back gracefully to in-memory check on mock/error", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
            }),
          }),
        }),
      } as any;

      const result = await checkDurableRateLimit({
        userId: "user-uuid-1",
        ipAddress: "127.0.0.1",
        limit: 5,
        client: mockSupabase,
      });

      expect(result.allowed).toBe(true);
    });

    it("checkDurableRateLimit returns blocked state when DB count exceeds limit", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
            }),
          }),
        }),
      } as any;

      const result = await checkDurableRateLimit({
        userId: "user-uuid-2",
        ipAddress: "127.0.0.1",
        limit: 5,
        client: mockSupabase,
      });

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.retryAfterSeconds).toBe(60);
      }
    });

    it("extracts client IP correctly from proxy headers", () => {
      const req = new Request("https://example.com", {
        headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
      });
      expect(getClientKey(req)).toBe("203.0.113.195");
    });
  });

  describe("Usage Logging (logGeminiUsage)", () => {
    it("inserts log entry into Supabase without throwing errors", async () => {
      const insertFn = vi.fn().mockResolvedValue({ error: null });
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          insert: insertFn,
        }),
      } as any;

      await logGeminiUsage({
        userId: "user-123",
        ipAddress: "192.168.1.1",
        status: "success",
        promptTokens: 300,
        candidatesTokens: 150,
        estimatedCostUsd: 0.0002,
        client: mockSupabase,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("gemini_usage_logs");
      expect(insertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          ip_address: "192.168.1.1",
          status: "success",
          prompt_tokens: 300,
          candidates_tokens: 150,
          estimated_cost_usd: 0.0002,
        })
      );
    });
  });

  describe("Dev Protection Mode (extractInvoiceFromImage)", () => {
    it("returns mock extraction result when GEMINI_DEV_MOCK is set to true", async () => {
      const origDevMock = process.env.GEMINI_DEV_MOCK;
      process.env.GEMINI_DEV_MOCK = "true";

      try {
        const res = await extractInvoiceFromImage({
          buffer: Buffer.from("fake image content"),
          mimeType: "image/png",
        });

        expect(res.data.serviceType).toBe("electricity");
        expect(res.data.accountNumber).toBe("10001234567");
        expect(res.promptTokens).toBe(250);
        expect(res.candidatesTokens).toBe(120);
      } finally {
        process.env.GEMINI_DEV_MOCK = origDevMock;
      }
    });
  });
});
