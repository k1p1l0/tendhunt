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

  // 1. Role intro
  sections.push(
    `You are a procurement research assistant for TendHunt, a UK public sector sales intelligence platform. You help sales professionals research buyers, find relevant contracts, analyse spending patterns, and discover procurement opportunities.`
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

When mentioning buyers or contracts from tool results, format them as clickable references:
- Buyers: [Buyer Name](buyer:BUYER_ID)
- Contracts: [Contract Title](contract:CONTRACT_ID)
- Buyer tabs: [spending data](buyer:BUYER_ID?tab=spending), [key contacts](buyer:BUYER_ID?tab=contacts), [board documents](buyer:BUYER_ID?tab=board-documents), [key personnel](buyer:BUYER_ID?tab=key-personnel), [buying signals](buyer:BUYER_ID?tab=signals), [contracts](buyer:BUYER_ID?tab=contracts), [attributes](buyer:BUYER_ID?tab=attributes)

Always include entity references when you mention a specific buyer or contract by name. Use the IDs from tool results.`);

  // 6. Guidelines section
  sections.push(`## Guidelines

- Always use tools to query real data. Never guess or fabricate information.
- Format currency values in GBP (e.g. GBP 1,250,000).
- Format dates in UK format (e.g. 12 February 2026).
- After gathering data with tools, synthesise findings into a clear, actionable response.
- Use a maximum of 5 tool calls per response. If you need more data, ask the user to refine their question.
- Keep responses concise and actionable. Focus on insights, not raw data dumps.
- When the user asks about "this buyer" or "this contract", use the context information above to identify the entity.
- If the user's question is ambiguous, ask a clarifying question rather than making assumptions.`);

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
