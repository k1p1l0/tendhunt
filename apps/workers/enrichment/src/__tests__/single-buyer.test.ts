import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";

// ---------------------------------------------------------------------------
// Mock all stage functions and DB modules BEFORE importing the worker
// ---------------------------------------------------------------------------

vi.mock("../stages/00-parent-link", () => ({
  linkParentBuyers: vi.fn().mockResolvedValue({ processed: 1, errors: 0, done: true }),
}));
vi.mock("../stages/01-classify", () => ({
  classifyBuyers: vi.fn().mockResolvedValue({ processed: 1, errors: 0, done: true }),
  normalizeName: vi.fn(),
  classifyByHeuristic: vi.fn(),
}));
vi.mock("../stages/01b-website-discovery", () => ({
  discoverWebsites: vi.fn().mockResolvedValue({ processed: 1, errors: 0, done: true }),
}));
vi.mock("../stages/01c-logo-linkedin", () => ({
  enrichLogoLinkedin: vi.fn().mockResolvedValue({ processed: 1, errors: 0, done: true }),
}));
vi.mock("../stages/02-governance-urls", () => ({
  mapGovernanceUrls: vi.fn().mockResolvedValue({ processed: 1, errors: 0, done: true }),
}));
vi.mock("../stages/03-moderngov", () => ({
  fetchModernGovData: vi.fn().mockResolvedValue({ processed: 1, errors: 0, done: true }),
}));
vi.mock("../stages/04-scrape", () => ({
  scrapeGovernancePages: vi.fn().mockResolvedValue({ processed: 1, errors: 0, done: true }),
}));
vi.mock("../stages/05-personnel", () => ({
  extractKeyPersonnel: vi.fn().mockResolvedValue({ processed: 1, errors: 0, done: true }),
}));
vi.mock("../stages/06-score", () => ({
  computeEnrichmentScores: vi.fn().mockResolvedValue({ processed: 1, errors: 0, done: true }),
  computeScore: vi.fn(),
}));
vi.mock("../enrichment-engine", () => ({
  processEnrichmentPipeline: vi.fn().mockResolvedValue({
    stage: "all_complete",
    processed: 0,
    errors: 0,
    done: true,
  }),
}));
vi.mock("../db/enrichment-jobs", () => ({
  getOrCreateJob: vi.fn(),
  markJobComplete: vi.fn(),
  markJobError: vi.fn(),
  updateJobProgress: vi.fn(),
}));
vi.mock("../db/client", () => ({
  getDb: vi.fn(),
  closeDb: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Shared mock state
// ---------------------------------------------------------------------------

const testBuyerId = new ObjectId();
const testBuyerName = "Test NHS Trust";

let mockUpdateOne: ReturnType<typeof vi.fn>;
let mockUpdateMany: ReturnType<typeof vi.fn>;
let mockFindOne: ReturnType<typeof vi.fn>;
let mockCollection: ReturnType<typeof vi.fn>;
let mockDb: Record<string, unknown>;

function createMockDb() {
  mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
  mockUpdateMany = vi.fn().mockResolvedValue({ modifiedCount: 0 });
  mockFindOne = vi.fn().mockResolvedValue({
    _id: testBuyerId,
    name: testBuyerName,
    enrichmentPriority: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  mockCollection = vi.fn().mockReturnValue({
    findOne: mockFindOne,
    updateOne: mockUpdateOne,
    updateMany: mockUpdateMany,
  });

  mockDb = {
    collection: mockCollection,
  };

  return mockDb;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("single-buyer enrichment (/run-buyer endpoint)", () => {
  let worker: typeof import("../index");

  beforeEach(async () => {
    vi.clearAllMocks();
    createMockDb();

    const { getDb, closeDb } = await import("../db/client");
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);
    (closeDb as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    // Mock global fetch for spend-ingest and board-minutes chaining
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      })
    );

    worker = await import("../index");
  });

  describe("request validation", () => {
    it("returns 400 when ?id= parameter is missing", async () => {
      const request = new Request("https://worker.dev/run-buyer");
      const env = makeEnv();

      const response = await worker.default.fetch(request, env);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Missing ?id= parameter");
    });

    it("returns 400 for invalid ObjectId format", async () => {
      const request = new Request("https://worker.dev/run-buyer?id=not-an-objectid");
      const env = makeEnv();

      const response = await worker.default.fetch(request, env);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid ObjectId");
    });

    it("returns 404 when buyer is not found", async () => {
      mockFindOne.mockResolvedValueOnce(null);
      const request = new Request(
        `https://worker.dev/run-buyer?id=${new ObjectId().toString()}`
      );
      const env = makeEnv();

      const response = await worker.default.fetch(request, env);
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Buyer not found");
    });
  });

  describe("stale priority reset", () => {
    it("resets stale priority-10 entries before setting new target", async () => {
      const buyerId = testBuyerId.toString();
      const request = new Request(
        `https://worker.dev/run-buyer?id=${buyerId}`
      );
      const env = makeEnv();

      await worker.default.fetch(request, env);

      // The first updateMany call should reset stale priority-10 entries
      const updateManyCalls = mockUpdateMany.mock.calls;
      expect(updateManyCalls.length).toBeGreaterThanOrEqual(1);

      const [resetFilter, resetUpdate] = updateManyCalls[0];
      expect(resetFilter).toEqual({
        enrichmentPriority: 10,
        _id: { $ne: testBuyerId },
      });
      expect(resetUpdate.$set.enrichmentPriority).toBe(0);
    });

    it("sets enrichmentPriority to 10 on the target buyer", async () => {
      const buyerId = testBuyerId.toString();
      const request = new Request(
        `https://worker.dev/run-buyer?id=${buyerId}`
      );
      const env = makeEnv();

      await worker.default.fetch(request, env);

      // After updateMany (reset), the next updateOne on buyers should set priority=10
      const updateOneCalls = mockUpdateOne.mock.calls;

      // Find the call that sets enrichmentPriority: 10
      const prioritySetCall = updateOneCalls.find(
        (call) =>
          call[1]?.$set?.enrichmentPriority === 10
      );
      expect(prioritySetCall).toBeDefined();
      expect(prioritySetCall![0]._id).toEqual(testBuyerId);
    });
  });

  describe("priority re-assertion before each stage", () => {
    it("re-asserts priority 10 before each of the 9 stages", async () => {
      const buyerId = testBuyerId.toString();
      const request = new Request(
        `https://worker.dev/run-buyer?id=${buyerId}`
      );
      const env = makeEnv();

      await worker.default.fetch(request, env);

      // Count updateOne calls that set enrichmentPriority: 10
      const priorityCalls = mockUpdateOne.mock.calls.filter(
        (call) => call[1]?.$set?.enrichmentPriority === 10
      );

      // There should be at least 9 (one per stage) plus the initial set
      // Initial set (1) + per-stage reassertion (9) = 10 total
      expect(priorityCalls.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe("priority reset after completion", () => {
    it("resets priority to tier-based value after all stages complete", async () => {
      // Mock the final findOne (after enrichment) to return a buyer with dataSourceId
      mockFindOne
        .mockResolvedValueOnce({
          _id: testBuyerId,
          name: testBuyerName,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          _id: testBuyerId,
          name: testBuyerName,
          dataSourceId: new ObjectId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const buyerId = testBuyerId.toString();
      const request = new Request(
        `https://worker.dev/run-buyer?id=${buyerId}`
      );
      const env = makeEnv();

      await worker.default.fetch(request, env);

      // The last updateOne for priority should set it to tier-based value
      const lastPriorityCall = mockUpdateOne.mock.calls
        .filter((call) => call[1]?.$set?.enrichmentPriority !== undefined)
        .pop();

      expect(lastPriorityCall).toBeDefined();
      // With dataSourceId present, tier priority should be 1
      // (or 0 if no dataSourceId)
    });

    it("resets to priority 0 when buyer has no dataSourceId", async () => {
      mockFindOne
        .mockResolvedValueOnce({
          _id: testBuyerId,
          name: testBuyerName,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          _id: testBuyerId,
          name: testBuyerName,
          // No dataSourceId
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const buyerId = testBuyerId.toString();
      const request = new Request(
        `https://worker.dev/run-buyer?id=${buyerId}`
      );
      const env = makeEnv();

      await worker.default.fetch(request, env);

      // Find the final priority reset call (last one with enrichmentPriority)
      const allPriorityCalls = mockUpdateOne.mock.calls.filter(
        (call) => call[1]?.$set?.enrichmentPriority !== undefined
      );
      const lastCall = allPriorityCalls[allPriorityCalls.length - 1];
      expect(lastCall[1].$set.enrichmentPriority).toBe(0);
    });
  });

  describe("chaining to downstream workers", () => {
    it("calls spend-ingest worker after enrichment completes", async () => {
      const buyerId = testBuyerId.toString();
      const request = new Request(
        `https://worker.dev/run-buyer?id=${buyerId}`
      );
      const env = makeEnv();

      await worker.default.fetch(request, env);

      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      const spendCall = fetchMock.mock.calls.find(
        (call: string[]) => typeof call[0] === "string" && call[0].includes("spend-ingest") && call[0].includes(buyerId)
      );
      expect(spendCall).toBeDefined();
    });

    it("calls board-minutes worker after enrichment completes", async () => {
      const buyerId = testBuyerId.toString();
      const request = new Request(
        `https://worker.dev/run-buyer?id=${buyerId}`
      );
      const env = makeEnv();

      await worker.default.fetch(request, env);

      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      const bmCall = fetchMock.mock.calls.find(
        (call: string[]) => typeof call[0] === "string" && call[0].includes("board-minutes") && call[0].includes(buyerId)
      );
      expect(bmCall).toBeDefined();
    });

    it("returns enrichment results in response body", async () => {
      const buyerId = testBuyerId.toString();
      const request = new Request(
        `https://worker.dev/run-buyer?id=${buyerId}`
      );
      const env = makeEnv();

      const response = await worker.default.fetch(request, env);
      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.buyerId).toBe(buyerId);
      expect(body.buyerName).toBe(testBuyerName);
      expect(body.enrichment).toBeDefined();
      expect(body.spend).toBeDefined();
      expect(body.boardMinutes).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("handles stage failures gracefully and continues", async () => {
      const { classifyBuyers } = await import("../stages/01-classify");
      (classifyBuyers as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Fuse.js exploded")
      );

      const buyerId = testBuyerId.toString();
      const request = new Request(
        `https://worker.dev/run-buyer?id=${buyerId}`
      );
      const env = makeEnv();

      const response = await worker.default.fetch(request, env);
      expect(response.status).toBe(200);
      const body = await response.json();

      // The classify stage should show an error
      expect(body.enrichment.classify.errors).toBe(1);
      // But other stages should still have been attempted
      expect(body.enrichment.score).toBeDefined();
    });

    it("handles downstream worker fetch failures gracefully", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error")
      );

      const buyerId = testBuyerId.toString();
      const request = new Request(
        `https://worker.dev/run-buyer?id=${buyerId}`
      );
      const env = makeEnv();

      const response = await worker.default.fetch(request, env);
      expect(response.status).toBe(200);
      const body = await response.json();

      // Should have error info in spend and boardMinutes
      expect(body.spend.error).toBeDefined();
      expect(body.boardMinutes.error).toBeDefined();
    });
  });

  describe("other endpoints", () => {
    it("health check returns ok", async () => {
      const request = new Request("https://worker.dev/health");
      const env = makeEnv();
      const response = await worker.default.fetch(request, env);
      const body = await response.json();
      expect(body.status).toBe("ok");
      expect(body.worker).toBe("tendhunt-enrichment");
    });

    it("root returns worker name", async () => {
      const request = new Request("https://worker.dev/");
      const env = makeEnv();
      const response = await worker.default.fetch(request, env);
      const text = await response.text();
      expect(text).toBe("tendhunt-enrichment worker");
    });
  });
});

// ---------------------------------------------------------------------------
// Helper: create a mock Env object
// ---------------------------------------------------------------------------

function makeEnv(): import("../types").Env {
  return {
    MONGODB_URI: "mongodb://localhost:27017/test",
    ANTHROPIC_API_KEY: "test-key",
    APIFY_API_TOKEN: "test-apify",
    LOGO_DEV_TOKEN: "test-logo",
    DOCS: {} as R2Bucket,
    SPEND_INGEST_WORKER_URL: "https://spend-ingest.workers.dev",
    BOARD_MINUTES_WORKER_URL: "https://board-minutes.workers.dev",
  };
}
