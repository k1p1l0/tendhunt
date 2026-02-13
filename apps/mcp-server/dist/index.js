#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { apiRequest, validateApiKey, handleApiError } from "./api-client.js";
const server = new McpServer({
    name: "tendhunt-mcp-server",
    version: "1.0.0",
});
// ─── Search Buyers ───────────────────────────────────────────────────────────
server.registerTool("tendhunt_search_buyers", {
    title: "Search UK Public Sector Buyers",
    description: `Search for UK public sector buyer organizations (councils, NHS trusts, universities, etc.).

Returns buyer name, sector, region, org type, enrichment score, and contract count.

Args:
  - query: Search by buyer name (partial match)
  - sector: Filter by sector (e.g. "NHS", "Education", "Defence")
  - region: Filter by UK region (e.g. "London", "South East")
  - org_type: Filter by org type (e.g. "nhs_trust_acute", "local_council_london")
  - min_enrichment_score: Minimum data quality score (0-100)
  - limit: Max results (1-20, default 10)

Examples:
  - "Find NHS trusts in London" → query="NHS", region="London"
  - "Show top-rated councils" → min_enrichment_score=80, org_type="local_council_london"`,
    inputSchema: {
        query: z.string().optional().describe("Search buyer name"),
        sector: z.string().optional().describe("Filter by sector"),
        region: z.string().optional().describe("Filter by UK region"),
        org_type: z.string().optional().describe("Filter by organization type"),
        min_enrichment_score: z
            .number()
            .min(0)
            .max(100)
            .optional()
            .describe("Minimum enrichment score (0-100)"),
        limit: z
            .number()
            .int()
            .min(1)
            .max(20)
            .default(10)
            .describe("Max results"),
    },
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
    },
}, async (params) => {
    try {
        const result = await apiRequest("/api/public/v1/buyers", "GET", undefined, {
            query: params.query,
            sector: params.sector,
            region: params.region,
            orgType: params.org_type,
            minEnrichmentScore: params.min_enrichment_score,
            limit: params.limit,
        });
        return formatResult(result);
    }
    catch (error) {
        return errorResult(error);
    }
});
// ─── Get Buyer Detail ────────────────────────────────────────────────────────
server.registerTool("tendhunt_get_buyer", {
    title: "Get Buyer Details",
    description: `Get full details for a specific buyer organization by ID.

Returns complete buyer profile: contacts, governance info, enrichment data, LinkedIn data, spending summary.

Args:
  - buyer_id: MongoDB ObjectId of the buyer (get from search results)`,
    inputSchema: {
        buyer_id: z.string().describe("Buyer ObjectId from search results"),
    },
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
    },
}, async (params) => {
    try {
        const result = await apiRequest(`/api/public/v1/buyers/${params.buyer_id}`);
        return formatResult(result);
    }
    catch (error) {
        return errorResult(error);
    }
});
// ─── Search Contracts ────────────────────────────────────────────────────────
server.registerTool("tendhunt_search_contracts", {
    title: "Search UK Government Contracts",
    description: `Search for UK public sector contract notices (tenders and awards).

Returns contract title, buyer, sector, value range, status, deadline.

Args:
  - query: Search by contract title/description
  - sector: Filter by sector
  - region: Filter by buyer region
  - min_value: Minimum contract value in GBP
  - max_value: Maximum contract value in GBP
  - limit: Max results (1-20, default 10)

Examples:
  - "Find IT contracts over £1M" → query="IT", min_value=1000000
  - "NHS contracts in Yorkshire" → sector="NHS", region="Yorkshire"`,
    inputSchema: {
        query: z.string().optional().describe("Search contract title"),
        sector: z.string().optional().describe("Filter by sector"),
        region: z.string().optional().describe("Filter by buyer region"),
        min_value: z
            .number()
            .optional()
            .describe("Minimum contract value (GBP)"),
        max_value: z
            .number()
            .optional()
            .describe("Maximum contract value (GBP)"),
        limit: z.number().int().min(1).max(20).default(10).describe("Max results"),
    },
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
    },
}, async (params) => {
    try {
        const result = await apiRequest("/api/public/v1/contracts", "GET", undefined, {
            query: params.query,
            sector: params.sector,
            region: params.region,
            minValue: params.min_value,
            maxValue: params.max_value,
            limit: params.limit,
        });
        return formatResult(result);
    }
    catch (error) {
        return errorResult(error);
    }
});
// ─── Get Contract Detail ─────────────────────────────────────────────────────
server.registerTool("tendhunt_get_contract", {
    title: "Get Contract Details",
    description: `Get full details for a specific contract by ID.

Returns complete contract: title, description, buyer, values, dates, status, documents.

Args:
  - contract_id: MongoDB ObjectId of the contract`,
    inputSchema: {
        contract_id: z.string().describe("Contract ObjectId"),
    },
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
    },
}, async (params) => {
    try {
        const result = await apiRequest(`/api/public/v1/contracts/${params.contract_id}`);
        return formatResult(result);
    }
    catch (error) {
        return errorResult(error);
    }
});
// ─── Search Signals ──────────────────────────────────────────────────────────
server.registerTool("tendhunt_search_signals", {
    title: "Search Buying Signals",
    description: `Search for procurement buying signals extracted from board meetings, governance documents, and public records.

Signals indicate future procurement intent — budget approvals, strategy changes, service reviews.

Args:
  - organization_name: Filter by organization name
  - signal_type: Filter by type (e.g. "budget_approval", "service_review", "strategy_change")
  - sector: Filter by sector
  - date_from: Start date (ISO format)
  - date_to: End date (ISO format)
  - limit: Max results (1-20, default 10)`,
    inputSchema: {
        organization_name: z
            .string()
            .optional()
            .describe("Filter by organization name"),
        signal_type: z.string().optional().describe("Filter by signal type"),
        sector: z.string().optional().describe("Filter by sector"),
        date_from: z
            .string()
            .optional()
            .describe("Start date (ISO format, e.g. 2026-01-01)"),
        date_to: z
            .string()
            .optional()
            .describe("End date (ISO format, e.g. 2026-12-31)"),
        limit: z.number().int().min(1).max(20).default(10).describe("Max results"),
    },
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
    },
}, async (params) => {
    try {
        const result = await apiRequest("/api/public/v1/signals", "GET", undefined, {
            organizationName: params.organization_name,
            signalType: params.signal_type,
            sector: params.sector,
            dateFrom: params.date_from,
            dateTo: params.date_to,
            limit: params.limit,
        });
        return formatResult(result);
    }
    catch (error) {
        return errorResult(error);
    }
});
// ─── Search Key Personnel ────────────────────────────────────────────────────
server.registerTool("tendhunt_search_personnel", {
    title: "Search Key Personnel",
    description: `Search for key decision-makers at UK public sector organizations.

Returns names, roles, confidence scores. Useful for finding procurement leads, directors, and C-suite contacts.

Args:
  - buyer_id: Filter by buyer ObjectId
  - role: Filter by role keyword (e.g. "Director", "CEO", "Procurement")
  - limit: Max results (1-20, default 10)`,
    inputSchema: {
        buyer_id: z.string().optional().describe("Filter by buyer ObjectId"),
        role: z.string().optional().describe("Filter by role keyword"),
        limit: z.number().int().min(1).max(20).default(10).describe("Max results"),
    },
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
    },
}, async (params) => {
    try {
        const result = await apiRequest("/api/public/v1/personnel", "GET", undefined, {
            buyerId: params.buyer_id,
            role: params.role,
            limit: params.limit,
        });
        return formatResult(result);
    }
    catch (error) {
        return errorResult(error);
    }
});
// ─── Get Spend Data ──────────────────────────────────────────────────────────
server.registerTool("tendhunt_get_spend", {
    title: "Get Buyer Spending Data",
    description: `Get spending data for a specific buyer organization.

Returns total spend, transaction count, and top vendors. Helps understand a buyer's procurement patterns and budget.

Args:
  - buyer_id: Buyer ObjectId`,
    inputSchema: {
        buyer_id: z.string().describe("Buyer ObjectId"),
    },
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
    },
}, async (params) => {
    try {
        const result = await apiRequest(`/api/public/v1/spend/${params.buyer_id}`);
        return formatResult(result);
    }
    catch (error) {
        return errorResult(error);
    }
});
// ─── Search Board Documents ──────────────────────────────────────────────────
server.registerTool("tendhunt_search_board_documents", {
    title: "Search Board Meeting Documents",
    description: `Search for board meeting papers, minutes, and governance documents from UK public sector organizations.

These documents often contain procurement signals, budget discussions, and strategy decisions.

Args:
  - buyer_id: Filter by buyer ObjectId
  - committee_name: Filter by committee name
  - date_from: Start date (ISO)
  - date_to: End date (ISO)
  - limit: Max results (1-20, default 10)`,
    inputSchema: {
        buyer_id: z.string().optional().describe("Filter by buyer ObjectId"),
        committee_name: z
            .string()
            .optional()
            .describe("Filter by committee name"),
        date_from: z.string().optional().describe("Start date (ISO)"),
        date_to: z.string().optional().describe("End date (ISO)"),
        limit: z.number().int().min(1).max(20).default(10).describe("Max results"),
    },
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
    },
}, async (params) => {
    try {
        const result = await apiRequest("/api/public/v1/board-documents", "GET", undefined, {
            buyerId: params.buyer_id,
            committeeName: params.committee_name,
            dateFrom: params.date_from,
            dateTo: params.date_to,
            limit: params.limit,
        });
        return formatResult(result);
    }
    catch (error) {
        return errorResult(error);
    }
});
// ─── List Scanners ───────────────────────────────────────────────────────────
server.registerTool("tendhunt_list_scanners", {
    title: "List Scanners",
    description: `List the user's saved scanners (saved searches with AI scoring columns).

Returns scanner name, type (rfps/meetings/buyers), search query, and creation date.`,
    inputSchema: {},
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
    },
}, async () => {
    try {
        const result = await apiRequest("/api/public/v1/scanners");
        return formatResult(result);
    }
    catch (error) {
        return errorResult(error);
    }
});
// ─── Create Scanner ──────────────────────────────────────────────────────────
server.registerTool("tendhunt_create_scanner", {
    title: "Create Scanner",
    description: `Create a new scanner (saved search) for monitoring contracts, meetings, or buyers.

Args:
  - name: Display name for the scanner
  - type: "rfps" (contracts), "meetings" (board meetings), or "buyers" (organizations)
  - search_query: Optional search filter text
  - description: Optional description`,
    inputSchema: {
        name: z.string().min(1).describe("Scanner name"),
        type: z
            .enum(["rfps", "meetings", "buyers"])
            .describe("Scanner type"),
        search_query: z.string().optional().describe("Search filter text"),
        description: z.string().optional().describe("Scanner description"),
    },
    annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
    },
}, async (params) => {
    try {
        const result = await apiRequest("/api/public/v1/scanners", "POST", {
            name: params.name,
            type: params.type,
            searchQuery: params.search_query,
            description: params.description,
        });
        return formatResult(result);
    }
    catch (error) {
        return errorResult(error);
    }
});
// ─── Add Scanner Column ──────────────────────────────────────────────────────
server.registerTool("tendhunt_add_scanner_column", {
    title: "Add AI Column to Scanner",
    description: `Add an AI-powered scoring column to an existing scanner.

The column uses Claude to evaluate each entity against a custom prompt and assigns a 0-10 score.

Args:
  - scanner_id: Scanner ObjectId
  - name: Column display name (e.g. "Relevance", "Bid Recommendation")
  - prompt: AI prompt for scoring (e.g. "Rate how relevant this contract is for an IT company specializing in cloud migration")`,
    inputSchema: {
        scanner_id: z.string().describe("Scanner ObjectId"),
        name: z.string().min(1).describe("Column display name"),
        prompt: z.string().min(10).describe("AI scoring prompt"),
    },
    annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
    },
}, async (params) => {
    try {
        const result = await apiRequest(`/api/public/v1/scanners/${params.scanner_id}/columns`, "POST", { name: params.name, prompt: params.prompt });
        return formatResult(result);
    }
    catch (error) {
        return errorResult(error);
    }
});
// ─── Scrape ──────────────────────────────────────────────────────────────────
server.registerTool("tendhunt_scrape", {
    title: "Scrape Web Data for Buyer",
    description: `Trigger web scraping to enrich buyer data. Supports LinkedIn company profiles, Google search, and website scraping.

Each scrape costs 1 credit. LinkedIn is rate-limited to 30/hour.

Args:
  - type: "linkedin" (company profile), "google" (search results), or "website" (contact scraping)
  - buyer_id: Buyer ObjectId to enrich
  - url: Required for linkedin type (LinkedIn company URL), optional for website type`,
    inputSchema: {
        type: z
            .enum(["linkedin", "google", "website"])
            .describe("Scrape type"),
        buyer_id: z.string().describe("Buyer ObjectId to enrich"),
        url: z.string().optional().describe("URL to scrape (required for linkedin)"),
    },
    annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
    },
}, async (params) => {
    try {
        const result = await apiRequest("/api/public/v1/scrape", "POST", {
            type: params.type,
            buyerId: params.buyer_id,
            url: params.url,
        });
        return formatResult(result);
    }
    catch (error) {
        return errorResult(error);
    }
});
// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatResult(result) {
    if (!result.ok) {
        return {
            isError: true,
            content: [
                {
                    type: "text",
                    text: `Error: ${result.error || "Unknown error"}`,
                },
            ],
        };
    }
    const text = typeof result.data === "string"
        ? result.data
        : JSON.stringify(result.data, null, 2);
    return {
        content: [{ type: "text", text }],
    };
}
function errorResult(error) {
    return {
        isError: true,
        content: [{ type: "text", text: handleApiError(error) }],
    };
}
// ─── Start ───────────────────────────────────────────────────────────────────
async function main() {
    validateApiKey();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("TendHunt MCP server running via stdio");
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map