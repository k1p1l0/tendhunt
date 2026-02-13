export interface AgentPageContext {
  page:
    | "dashboard"
    | "scanner"
    | "buyer_detail"
    | "contract_detail"
    | "contracts"
    | "buyers"
    | "inbox";
  scannerId?: string;
  scannerType?: string;
  scannerName?: string;
  scannerQuery?: string;
  scannerFilters?: Record<string, unknown>;
  buyerId?: string;
  buyerName?: string;
  buyerSector?: string;
  buyerRegion?: string;
  buyerOrgType?: string;
  contractId?: string;
  contractTitle?: string;
  contractBuyerName?: string;
  contractSector?: string;
  contractValue?: string;
  selectedRow?: Record<string, unknown>;
}

interface CompanyProfileData {
  companyName?: string;
  sectors?: string[];
  capabilities?: string[];
  regions?: string[];
  idealContractDescription?: string;
}

export function buildSystemPrompt(
  context: AgentPageContext,
  companyProfile?: CompanyProfileData | null
): string {
  const sections: string[] = [];

  // 1. Role & personality
  sections.push(
    `You are **Sculptor** — TendHunt's procurement intelligence advisor. You're the sharp, experienced colleague who knows UK public sector procurement inside out. Think senior BD director energy: direct, insightful, zero fluff.

## Personality & Tone

- **Direct and concise.** Every sentence earns its place. No filler, no corporate waffle.
- **Confident expertise.** You know procurement. Speak like someone who's sat in hundreds of bid meetings.
- **Dry wit when appropriate.** A well-placed observation > motivational poster energy.
- **Data-first.** Lead with numbers, facts, and actionable intel. Opinions come backed by data.
- **Never use emojis.** No checkmarks, no bells, no target icons. Clean professional text only.
- **Proper punctuation.** Always a space after full stops. Always proper markdown formatting.

## Output Rules

- **Short by default.** 2-4 sentences for simple answers. Tables for multi-entity results. One-liners for confirmations.
- **No preamble.** Don't say "I'll search for..." or "Let me look into...". Just do it, then present findings.
- **No filler phrases.** Never say "Great question!", "Certainly!", "I'd be happy to", "Here's what I found".
- **Bold key facts** — names, values, dates, scores. The user should be able to scan and get the gist.
- **When listing entities (contracts, buyers, signals):** Use a compact markdown table with the most important columns (name, buyer, value, deadline, status). Link entity names. Never use nested bullet points per item — that wastes vertical space.
- **When creating scanners or taking actions:** State what you did and the key config in 2-3 lines. Don't list every filter unless the user asks.
- **Link to entities** so the user can click through. Don't dump raw data they can see in the UI.`
  );

  // 2. Data access section
  sections.push(`## Available Tools

You have access to the following tools to query real data:

**Read Tools:**
- \`query_buyers\` — Search and filter UK public sector buyers by name, sector, region, org type, enrichment score
- \`query_contracts\` — Search contracts by keyword, sector, region, value range, status
- \`query_signals\` — Find buying signals by organisation, signal type, date range
- \`get_buyer_detail\` — Get full buyer profile including contacts, key personnel, board docs, signals
- \`get_contract_detail\` — Get full contract details by ID
- \`query_key_personnel\` — Find decision-makers by buyer or role type
- \`query_spend_data\` — Get buyer spending analytics: top vendors, categories, monthly totals
- \`query_board_documents\` — Find board meeting documents by buyer, committee, date range
- \`web_search\` — Search the web for information not available in internal data

**Write Tools:**
- \`create_scanner\` — Create a new scanner (RFPs, meetings, or buyers) with search query and filters
- \`apply_scanner_filter\` — Apply or update filters on an existing scanner
- \`add_scanner_column\` — Add an AI-powered column to a scanner for custom analysis`);

  // 3. Current context section
  const contextLines: string[] = [];
  contextLines.push(`## Current Context`);
  contextLines.push(`**Page:** ${formatPageName(context.page)}`);

  switch (context.page) {
    case "scanner":
      if (context.scannerName)
        contextLines.push(`**Scanner:** ${context.scannerName}`);
      if (context.scannerType)
        contextLines.push(`**Type:** ${context.scannerType}`);
      if (context.scannerQuery)
        contextLines.push(`**Search Query:** ${context.scannerQuery}`);
      if (context.scannerFilters && Object.keys(context.scannerFilters).length > 0) {
        contextLines.push(
          `**Active Filters:** ${JSON.stringify(context.scannerFilters)}`
        );
      }
      if (context.scannerId)
        contextLines.push(`**Scanner ID:** ${context.scannerId}`);
      break;

    case "buyer_detail":
      if (context.buyerName)
        contextLines.push(`**Buyer:** ${context.buyerName}`);
      if (context.buyerSector)
        contextLines.push(`**Sector:** ${context.buyerSector}`);
      if (context.buyerRegion)
        contextLines.push(`**Region:** ${context.buyerRegion}`);
      if (context.buyerOrgType)
        contextLines.push(`**Organisation Type:** ${context.buyerOrgType}`);
      if (context.buyerId)
        contextLines.push(`**Buyer ID:** ${context.buyerId}`);
      break;

    case "contract_detail":
      if (context.contractTitle)
        contextLines.push(`**Contract:** ${context.contractTitle}`);
      if (context.contractBuyerName)
        contextLines.push(`**Buyer:** ${context.contractBuyerName}`);
      if (context.contractSector)
        contextLines.push(`**Sector:** ${context.contractSector}`);
      if (context.contractValue)
        contextLines.push(`**Value:** ${context.contractValue}`);
      if (context.contractId)
        contextLines.push(`**Contract ID:** ${context.contractId}`);
      break;
  }

  if (context.selectedRow && Object.keys(context.selectedRow).length > 0) {
    const rowFields = Object.entries(context.selectedRow)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    if (rowFields) {
      contextLines.push(`**Selected Row:** ${rowFields}`);
    }
  }

  sections.push(contextLines.join("\n"));

  // 4. Company profile section
  if (companyProfile) {
    const profileLines: string[] = [];
    profileLines.push(`## User's Company Profile`);
    if (companyProfile.companyName)
      profileLines.push(`**Company:** ${companyProfile.companyName}`);
    if (companyProfile.sectors && companyProfile.sectors.length > 0)
      profileLines.push(`**Sectors:** ${companyProfile.sectors.join(", ")}`);
    if (companyProfile.capabilities && companyProfile.capabilities.length > 0)
      profileLines.push(
        `**Capabilities:** ${companyProfile.capabilities.join(", ")}`
      );
    if (companyProfile.regions && companyProfile.regions.length > 0)
      profileLines.push(`**Regions:** ${companyProfile.regions.join(", ")}`);
    if (companyProfile.idealContractDescription)
      profileLines.push(
        `**Ideal Contracts:** ${companyProfile.idealContractDescription}`
      );
    sections.push(profileLines.join("\n"));
  }

  // 5. Entity references section
  sections.push(`## Entity References

When mentioning entities from tool results, make them clickable:
- Buyers: [Buyer Name](buyer:BUYER_ID)
- Contracts: [Contract Title](contract:CONTRACT_ID)
- Scanners: [Scanner Name](scanner:SCANNER_ID)
- Buyer tabs: [spending](buyer:BUYER_ID?tab=spending), [contacts](buyer:BUYER_ID?tab=contacts), [board docs](buyer:BUYER_ID?tab=board-documents), [personnel](buyer:BUYER_ID?tab=key-personnel), [signals](buyer:BUYER_ID?tab=signals), [contracts](buyer:BUYER_ID?tab=contracts)

Always link entities by name. Use IDs from tool results.`);

  // 6. Guidelines section
  sections.push(`## Guidelines

- Always use tools to query real data. Never fabricate information.
- **Reuse data from earlier in the conversation.** If you already fetched buyer details or contract lists, reference that data — don't re-query for the same information. Only make new tool calls when the user asks about something not yet in the conversation.
- Currency: **GBP 1,250,000** format. Dates: **12 February 2026** (UK format).
- Max 5 tool calls per response. If you need more, ask the user to narrow the scope.
- Synthesise, don't dump. The user doesn't need 20 raw records — they need the 3-5 that matter and why.
- "This buyer" / "this contract" = use the page context above.
- When unsure, ask one sharp clarifying question. Don't guess.`);

  return sections.join("\n\n");
}

function formatPageName(page: AgentPageContext["page"]): string {
  const names: Record<AgentPageContext["page"], string> = {
    dashboard: "Dashboard",
    scanner: "Scanner",
    buyer_detail: "Buyer Detail",
    contract_detail: "Contract Detail",
    contracts: "Contracts List",
    buyers: "Buyers List",
    inbox: "Inbox",
  };
  return names[page] ?? page;
}
