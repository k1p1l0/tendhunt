import type Anthropic from "@anthropic-ai/sdk";

export function getToolDefinitions(): Anthropic.Tool[] {
  return [
    // Read tools
    {
      name: "query_buyers",
      description:
        "Search and filter UK public sector buyers. Returns buyer name, sector, region, org type, enrichment score, and contract count.",
      input_schema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "Search buyers by name (case-insensitive partial match)",
          },
          sector: {
            type: "string",
            description:
              "Filter by sector. Must be one of: Health & Social, Construction, Business Services, Architecture & Engineering, Environmental Services, IT Services, Education, Transport, Software, Medical Equipment, Financial Services, R&D, Repair & Maintenance, Hospitality, Laboratory Equipment, Security & Defence, Real Estate, Energy, Telecoms, Publishing & Printing, Utilities, Public Administration, Recreation & Culture, Food & Beverages, IT Equipment, Furniture, Industrial Machinery. Note: NHS trusts are under 'Health & Social', schools/universities are under 'Education'.",
          },
          region: {
            type: "string",
            description:
              "Filter by region (e.g. 'London', 'South East', 'North West', 'Scotland', 'Wales')",
          },
          orgType: {
            type: "string",
            description:
              "Filter by organisation type. Values: nhs_trust_acute, nhs_trust_mental_health, nhs_trust_community, nhs_trust_ambulance, icb, local_council, local_council_london, local_council_metropolitan, local_council_unitary, local_council_county, local_council_district, fire_rescue, police, combined_authority, national_park, university, fe_college, mat",
          },
          minEnrichmentScore: {
            type: "number",
            description: "Minimum enrichment score (0-100)",
          },
          limit: {
            type: "number",
            description: "Maximum results to return (default 10, max 20)",
          },
        },
        required: [],
      },
    },
    {
      name: "query_contracts",
      description:
        "Search and filter procurement contracts. Returns title, buyer name, sector, value range, status, and deadline.",
      input_schema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "Full-text search on contract title and description",
          },
          sector: {
            type: "string",
            description: "Filter by sector",
          },
          region: {
            type: "string",
            description: "Filter by buyer region",
          },
          minValue: {
            type: "number",
            description: "Minimum contract value in GBP",
          },
          maxValue: {
            type: "number",
            description: "Maximum contract value in GBP",
          },
          status: {
            type: "string",
            description: "Filter by contract status (e.g. 'open', 'closed', 'awarded')",
          },
          limit: {
            type: "number",
            description: "Maximum results to return (default 10, max 20)",
          },
        },
        required: [],
      },
    },
    {
      name: "query_signals",
      description:
        "Search buying signals (procurement events, staffing changes, strategy shifts, financial indicators). Returns signal type, title, insight, and source date.",
      input_schema: {
        type: "object" as const,
        properties: {
          organizationName: {
            type: "string",
            description: "Filter by organisation name (partial match)",
          },
          signalType: {
            type: "string",
            description:
              "Filter by type: PROCUREMENT, STAFFING, STRATEGY, FINANCIAL, PROJECTS, REGULATORY",
          },
          sector: {
            type: "string",
            description: "Filter by sector",
          },
          dateFrom: {
            type: "string",
            description: "Start date in ISO format (e.g. '2025-01-01')",
          },
          dateTo: {
            type: "string",
            description: "End date in ISO format",
          },
          limit: {
            type: "number",
            description: "Maximum results to return (default 10, max 20)",
          },
        },
        required: [],
      },
    },
    {
      name: "get_buyer_detail",
      description:
        "Get full details for a specific buyer including contacts, key personnel, board documents, signals, enrichment data, and spending info. Pass buyerId if known, or buyerName as fallback when buyerId is unavailable.",
      input_schema: {
        type: "object" as const,
        properties: {
          buyerId: {
            type: "string",
            description: "MongoDB ObjectId of the buyer",
          },
          buyerName: {
            type: "string",
            description: "Exact buyer name — used as fallback if buyerId is missing or invalid",
          },
        },
        required: ["buyerId"],
      },
    },
    {
      name: "get_contract_detail",
      description: "Get full details for a specific contract by ID.",
      input_schema: {
        type: "object" as const,
        properties: {
          contractId: {
            type: "string",
            description: "MongoDB ObjectId of the contract",
          },
        },
        required: ["contractId"],
      },
    },
    {
      name: "query_key_personnel",
      description:
        "Find key decision-makers (CEOs, directors, procurement leads, board members) by buyer or role type.",
      input_schema: {
        type: "object" as const,
        properties: {
          buyerId: {
            type: "string",
            description: "MongoDB ObjectId of the buyer to find personnel for",
          },
          role: {
            type: "string",
            description:
              "Filter by role (e.g. 'chief_executive', 'procurement_lead', 'director')",
          },
          limit: {
            type: "number",
            description: "Maximum results to return (default 10, max 20)",
          },
        },
        required: [],
      },
    },
    {
      name: "query_spend_data",
      description:
        "Get spending analytics for a buyer: total spend, transaction count, top vendors, category breakdown, and monthly totals.",
      input_schema: {
        type: "object" as const,
        properties: {
          buyerId: {
            type: "string",
            description: "MongoDB ObjectId of the buyer",
          },
        },
        required: ["buyerId"],
      },
    },
    {
      name: "query_board_documents",
      description:
        "Find board meeting documents (minutes, agendas, reports) by buyer, committee name, or date range.",
      input_schema: {
        type: "object" as const,
        properties: {
          buyerId: {
            type: "string",
            description: "MongoDB ObjectId of the buyer",
          },
          committeeName: {
            type: "string",
            description: "Filter by committee name (partial match)",
          },
          dateFrom: {
            type: "string",
            description: "Start date in ISO format",
          },
          dateTo: {
            type: "string",
            description: "End date in ISO format",
          },
          limit: {
            type: "number",
            description: "Maximum results to return (default 10, max 20)",
          },
        },
        required: [],
      },
    },
    {
      name: "web_search",
      description:
        "Search the web for information not available in TendHunt's internal data. Use this when internal tools don't have the answer.",
      input_schema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "Search query",
          },
        },
        required: ["query"],
      },
    },

    // Write tools
    {
      name: "create_scanner",
      description:
        "Create a new scanner to monitor contracts (RFPs), meeting signals, or buyers. Returns the new scanner ID and a navigation link.",
      input_schema: {
        type: "object" as const,
        properties: {
          name: {
            type: "string",
            description: "Name for the new scanner",
          },
          type: {
            type: "string",
            enum: ["rfps", "meetings", "buyers", "schools"],
            description: "Scanner type: rfps (contracts), meetings (signals), buyers, or schools (Ofsted)",
          },
          searchQuery: {
            type: "string",
            description: "Optional search query for the scanner",
          },
          description: {
            type: "string",
            description: "Optional description of what this scanner monitors",
          },
        },
        required: ["name", "type"],
      },
    },
    {
      name: "apply_scanner_filter",
      description:
        "Apply or update filters on an existing scanner. Only provided filter fields are changed.",
      input_schema: {
        type: "object" as const,
        properties: {
          scannerId: {
            type: "string",
            description: "MongoDB ObjectId of the scanner to update",
          },
          filters: {
            type: "object",
            description: "Filter values to apply",
            properties: {
              sector: { type: "string" },
              region: { type: "string" },
              valueMin: { type: "number" },
              valueMax: { type: "number" },
            },
          },
        },
        required: ["scannerId", "filters"],
      },
    },
    {
      name: "enrich_buyer",
      description:
        "Trigger full data enrichment for a buyer — fetches org details, LinkedIn, logo, governance docs, board minutes, key personnel, and spending data. Takes 2-5 minutes. Call first WITHOUT confirmed=true to show confirmation UI. Call again WITH confirmed=true after user confirms.",
      input_schema: {
        type: "object" as const,
        properties: {
          buyerId: {
            type: "string",
            description: "MongoDB ObjectId of the buyer to enrich",
          },
          buyerName: {
            type: "string",
            description: "Buyer name — used as fallback if buyerId is invalid",
          },
          confirmed: {
            type: "boolean",
            description: "Set to true to actually start enrichment (after user confirms)",
          },
        },
        required: ["buyerId"],
      },
    },
    {
      name: "add_scanner_column",
      description:
        "Add an AI-powered analysis column to a scanner. The column runs an AI prompt against each row to generate scores or insights.",
      input_schema: {
        type: "object" as const,
        properties: {
          scannerId: {
            type: "string",
            description: "MongoDB ObjectId of the scanner",
          },
          name: {
            type: "string",
            description: "Display name for the column",
          },
          prompt: {
            type: "string",
            description:
              "AI prompt to evaluate each entity (e.g. 'Rate how well this contract matches our capabilities')",
          },
          useCase: {
            type: "string",
            enum: ["score", "research", "decision-makers", "bid-recommendation", "find-contacts"],
            description:
              "Analysis type. 'score' = numeric 1-10 score (default). All others = free-text analysis. Choose based on user intent.",
          },
        },
        required: ["scannerId", "name", "prompt"],
      },
    },
    {
      name: "test_score_column",
      description:
        "Test-score a single row for an AI column to preview the scoring prompt. Returns the score and reasoning inline. Use this after adding an AI column when the user wants to verify the prompt works before scoring all rows.",
      input_schema: {
        type: "object" as const,
        properties: {
          scannerId: {
            type: "string",
            description: "MongoDB ObjectId of the scanner",
          },
          columnId: {
            type: "string",
            description: "The columnId of the AI column to test",
          },
        },
        required: ["scannerId", "columnId"],
      },
    },
  ];
}
