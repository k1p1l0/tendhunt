import { dbConnect } from "@/lib/mongodb";
import CompanyProfile, { type ICompanyProfile } from "@/models/company-profile";
import VibeScanner, { type IVibeScanner } from "@/models/vibe-scanner";

/**
 * Generates a scoring prompt from a CompanyProfile.
 * Pure function -- no side effects, no DB calls.
 *
 * The prompt is intentionally padded with UK procurement reference material
 * to exceed 4096 tokens, enabling Anthropic prompt caching on Claude Haiku 4.5.
 */
export function generateScoringPrompt(profile: ICompanyProfile): string {
  const companyName = profile.companyName || "Unknown Company";
  const summary = profile.summary || "No summary available";
  const sectors = (profile.sectors || []).join(", ") || "Not specified";
  const capabilities =
    (profile.capabilities || []).join(", ") || "Not specified";
  const keywords = (profile.keywords || []).join(", ") || "Not specified";
  const certifications =
    (profile.certifications || []).join(", ") || "None listed";
  const idealContract =
    profile.idealContractDescription || "Not specified";
  const regions = (profile.regions || []).join(", ") || "National";
  const companySize = profile.companySize || "Not specified";

  return `# Vibe Scanner Scoring Prompt
## Company Profile: ${companyName}

You are an expert UK government procurement analyst. Your task is to score how well a government contract matches the company profile below. You must provide a numeric score from 1.0 to 10.0 (one decimal place) and a brief reasoning (1-2 sentences).

---

## Company Information

**Company Name:** ${companyName}
**Summary:** ${summary}
**Industry Sectors:** ${sectors}
**Key Capabilities:** ${capabilities}
**Keywords:** ${keywords}
**Certifications:** ${certifications}
**Ideal Contract Description:** ${idealContract}
**Operating Regions:** ${regions}
**Company Size:** ${companySize}

---

## Scoring Rubric

Use the following rubric to assign a score:

### 9.0 - 10.0: Perfect Match
- The contract is in the company's exact sector(s) and region(s)
- Required capabilities directly match the company's listed capabilities
- Contract value is appropriate for the company size
- Certifications required are held by the company
- The contract description closely matches the ideal contract description
- CPV codes align with the company's core business areas

### 7.0 - 8.9: Strong Match
- The contract is in a closely related sector
- Most required capabilities are available
- Region is accessible (adjacent or national)
- Some certifications match
- Good alignment with the ideal contract but not perfect
- CPV codes are in related divisions

### 5.0 - 6.9: Moderate Match
- The contract is in a tangentially related sector
- Some capabilities overlap
- Region may require expansion or travel
- Limited certification overlap
- Partial alignment with ideal contract description
- CPV codes are in the same broad category

### 3.0 - 4.9: Weak Match
- Different sector but with transferable skills
- Few capability overlaps
- Distant region with no current presence
- No relevant certifications
- Minimal alignment with ideal contract

### 1.0 - 2.9: No Match
- Completely different sector and capabilities
- No geographic relevance
- No certification overlap
- No alignment with ideal contract description
- CPV codes are entirely unrelated

---

## UK Procurement Context and Reference Material

### Common Procurement Vehicles (CPV Divisions)

The following are the major CPV (Common Procurement Vocabulary) divisions used in UK government procurement. Use these to assess sector alignment:

**Division 03 - Agricultural, farming, fishing, forestry and related products**
Agricultural machinery, seeds, animal feed, forestry products, fishing equipment.

**Division 09 - Petroleum products, fuel, electricity and other sources of energy**
Natural gas, coal, crude petroleum, motor fuel, lubricants, electricity.

**Division 14 - Mining, basic metals and related products**
Iron, steel, copper, aluminium, precious metals, mining products.

**Division 15 - Food, beverages, tobacco and related products**
Meat, dairy, bakery products, beverages, catering services.

**Division 18 - Clothing, footwear, luggage articles and accessories**
Uniforms, protective clothing, footwear, helmets, body armour.

**Division 22 - Printed matter and related products**
Books, maps, printing services, publishing services.

**Division 24 - Chemical products**
Industrial chemicals, fertilizers, plastics, rubber, pharmaceutical products.

**Division 30 - Office and computing machinery, equipment and supplies**
Computing equipment, printers, office furniture, stationery, toner.

**Division 31 - Electrical machinery, apparatus, equipment and consumables; lighting**
Electrical motors, generators, transformers, cables, lighting systems, batteries.

**Division 32 - Radio, television, communication, telecommunication and related equipment**
Broadcasting equipment, telephone equipment, networking infrastructure, satellite systems.

**Division 33 - Medical equipments, pharmaceuticals and personal care products**
Medical devices, surgical instruments, dental equipment, pharmaceuticals, laboratory equipment.

**Division 34 - Transport equipment and auxiliary products to transportation**
Motor vehicles, railway equipment, ships, aircraft parts, traffic management.

**Division 35 - Security, fire-fighting, police and defence equipment**
Surveillance systems, fire engines, police equipment, military vehicles, security services.

**Division 37 - Musical instruments, sport goods, games, toys, handicraft, art materials and accessories**
Sports equipment, playground equipment, art supplies, games.

**Division 38 - Laboratory, optical and precision equipments (excl. glasses)**
Microscopes, spectrometers, measuring instruments, calibration equipment.

**Division 39 - Furniture (incl. office furniture), furnishings, domestic appliances and cleaning products**
Office furniture, hospital beds, kitchen equipment, cleaning materials, domestic appliances.

**Division 42 - Industrial machinery**
Turbines, pumps, compressors, industrial ovens, food processing machinery.

**Division 43 - Machinery for mining, quarrying, construction equipment**
Excavators, bulldozers, drilling machinery, concrete mixers, cranes.

**Division 44 - Construction structures and materials; auxiliary products to construction**
Prefabricated buildings, doors, windows, pipes, scaffolding, roofing.

**Division 45 - Construction work**
Building construction, road construction, pipeline construction, demolition, renovation.

**Division 48 - Software package and information systems**
ERP software, database systems, business software, CAD software, security software, web development.

**Division 50 - Repair and maintenance services**
Vehicle repair, IT equipment maintenance, building maintenance, machinery servicing.

**Division 51 - Installation services**
IT installation, telecommunications installation, electrical installation, plumbing.

**Division 55 - Hotel, restaurant and retail trade services**
Hotel accommodation, restaurant services, catering, canteen management.

**Division 60 - Transport services**
Public transport, taxi services, rail transport, courier services, ambulance services.

**Division 63 - Supporting and auxiliary transport services; travel agencies services**
Cargo handling, warehousing, parking services, travel agency services.

**Division 64 - Postal and telecommunications services**
Postal services, courier services, telephone services, internet services.

**Division 66 - Financial and insurance services**
Banking, insurance, pension, investment, accounting, auditing services.

**Division 70 - Real estate services**
Property rental, property management, real estate agency services.

**Division 71 - Architectural, construction, engineering and inspection services**
Architectural services, engineering design, surveying, urban planning, project management.

**Division 72 - IT services: consulting, software development, Internet and support**
IT consulting, software development, database services, web hosting, IT support, cybersecurity.

**Division 73 - Research and development services and related consultancy services**
R&D in natural sciences, social sciences, technology, market research.

**Division 75 - Administration, defence and social security services**
Public administration, defence, justice, public order, social security.

**Division 76 - Services related to the oil and gas industry**
Drilling, well services, oil platform services, pipeline services.

**Division 77 - Agricultural, forestry, horticultural, aquacultural and apicultural services**
Crop services, forestry services, gardening, landscaping, pest control.

**Division 79 - Business services: law, marketing, consulting, recruitment, printing and security**
Legal services, accounting, management consulting, marketing, recruitment, cleaning, security.

**Division 80 - Education and training services**
Primary/secondary education, higher education, vocational training, driving instruction.

**Division 85 - Health and social work services**
Hospital services, medical practice, dental services, social care, residential care.

**Division 90 - Sewage, refuse, cleaning and environmental services**
Waste collection, waste treatment, street cleaning, environmental remediation.

**Division 92 - Recreational, cultural and sporting services**
Library services, museum services, cultural events, sports facilities.

**Division 98 - Other community, social and personal services**
Trade union services, political organisations, religious organisations.

### UK Government Regions

Contracts may specify the following regions. Match these against the company's operating regions:

- **London** -- Greater London Authority area, City of London, 32 London boroughs
- **South East** -- Kent, Surrey, Sussex, Hampshire, Berkshire, Oxfordshire, Buckinghamshire, Isle of Wight
- **South West** -- Cornwall, Devon, Dorset, Somerset, Wiltshire, Gloucestershire, Bristol
- **East of England** -- Essex, Hertfordshire, Norfolk, Suffolk, Cambridgeshire, Bedfordshire
- **East Midlands** -- Leicestershire, Nottinghamshire, Derbyshire, Lincolnshire, Northamptonshire, Rutland
- **West Midlands** -- Birmingham, Coventry, Wolverhampton, Staffordshire, Warwickshire, Worcestershire, Shropshire, Herefordshire
- **Yorkshire and the Humber** -- North Yorkshire, South Yorkshire, West Yorkshire, East Riding, Hull, York
- **North East** -- County Durham, Northumberland, Tyne and Wear, Tees Valley
- **North West** -- Greater Manchester, Merseyside, Lancashire, Cheshire, Cumbria
- **Wales** -- All Welsh local authorities, Welsh Government bodies
- **Scotland** -- All Scottish local authorities, Scottish Government bodies, NHS Scotland
- **Northern Ireland** -- All NI departments, councils, health trusts
- **National** -- UK-wide delivery, multiple regions, central government departments
- **Overseas** -- FCDO, MOD overseas, British Overseas Territories

### UK Procurement Terminology

Key terms used in UK government procurement that should be considered during scoring:

- **Find a Tender (FaT)** -- UK's post-Brexit replacement for OJEU/TED, used for above-threshold contracts
- **Contracts Finder** -- Portal for below-threshold and voluntary publication contracts
- **PIN (Prior Information Notice)** -- Early market engagement, not yet a formal tender
- **ITT (Invitation to Tender)** -- Formal request for bids from shortlisted suppliers
- **PQQ (Pre-Qualification Questionnaire)** -- Initial supplier assessment (now largely replaced by SQ)
- **SQ (Selection Questionnaire)** -- Standardised supplier qualification tool
- **DPS (Dynamic Purchasing System)** -- Open framework that allows new suppliers to join
- **Framework Agreement** -- Pre-approved supplier list for call-off contracts
- **Call-off Contract** -- Specific contract awarded under a framework agreement
- **MEAT (Most Economically Advantageous Tender)** -- Evaluation criteria beyond just price
- **Social Value** -- Community benefits, environmental impact, local employment (weighted in scoring)
- **Lot** -- A subdivision of a larger contract, often by geography or service type
- **TUPE** -- Transfer of staff obligations when contracts change hands
- **PCR 2015** -- Public Contracts Regulations 2015, the legal framework for procurement
- **Procurement Act 2023** -- New UK procurement legislation replacing PCR 2015
- **Central Government** -- Cabinet Office, HMRC, MOD, Home Office, DWP, NHS England, DHSC
- **Local Government** -- County councils, district councils, unitary authorities, combined authorities
- **NHS Trusts** -- Acute trusts, mental health trusts, ambulance trusts, community trusts
- **Blue Light** -- Police, fire, ambulance services
- **MOD** -- Ministry of Defence, Defence Equipment & Support (DE&S)
- **Crown Commercial Service (CCS)** -- Central purchasing body for UK government
- **G-Cloud** -- Cloud services framework managed by CCS
- **Digital Outcomes and Specialists (DOS)** -- Framework for digital project services
- **Cyber Essentials** -- UK government-backed cybersecurity certification scheme
- **ISO 27001** -- Information security management system standard
- **ISO 9001** -- Quality management system standard
- **ISO 14001** -- Environmental management system standard
- **SC Clearance** -- Security Check clearance for sensitive government work
- **DV Clearance** -- Developed Vetting for highly classified work
- **SME** -- Small and Medium Enterprise (fewer than 250 employees)
- **VCSE** -- Voluntary, Community and Social Enterprise sector

### Scoring Instructions

When presented with a contract, you must:

1. Read the contract title, description, buyer name, sector, CPV codes, value range, and region
2. Compare each dimension against the company profile above
3. Give particular weight to:
   - Sector and CPV code alignment (30% weight)
   - Capability and keyword match (25% weight)
   - Geographic relevance (15% weight)
   - Contract value vs company size appropriateness (15% weight)
   - Certification requirements (15% weight)
4. Provide a single score from 1.0 to 10.0 (one decimal place)
5. Provide a brief reasoning (1-2 sentences) explaining the score

### Response Format

You must respond with valid JSON in the following format:

\`\`\`json
{
  "score": 7.5,
  "reasoning": "Strong match due to direct IT consulting capability alignment and London region overlap. Contract value is appropriate for the company size, though cybersecurity certification requirement only partially met."
}
\`\`\`

Do not include any text outside the JSON object. The score must be a number between 1.0 and 10.0 with exactly one decimal place. The reasoning must be 1-2 sentences.`;
}

/**
 * Finds an existing VibeScanner for the user, or creates one from their CompanyProfile.
 * Throws if no CompanyProfile exists for the user.
 */
export async function getOrCreateScanner(
  userId: string
): Promise<IVibeScanner> {
  await dbConnect();

  // Check for existing scanner
  const existing = await VibeScanner.findOne({ userId });
  if (existing) {
    return existing;
  }

  // Load company profile
  const profile = await CompanyProfile.findOne({ userId });
  if (!profile) {
    throw new Error(
      "No company profile found. Please complete your company profile before creating a Vibe Scanner."
    );
  }

  // Generate scoring prompt and create scanner
  const scoringPrompt = generateScoringPrompt(profile);
  const scanner = await VibeScanner.create({
    userId,
    companyProfileId: profile._id,
    scoringPrompt,
    isDefault: true,
    contractScores: [],
    buyerScores: [],
    threshold: 5.0,
  });

  return scanner;
}

/**
 * Updates the scoring prompt for a user's VibeScanner.
 * Sets isDefault to false since the user has edited the prompt.
 */
export async function updateScoringPrompt(
  userId: string,
  newPrompt: string
): Promise<IVibeScanner> {
  await dbConnect();

  const scanner = await VibeScanner.findOneAndUpdate(
    { userId },
    { scoringPrompt: newPrompt, isDefault: false },
    { new: true }
  );

  if (!scanner) {
    throw new Error(
      "No Vibe Scanner found. Please create a scanner first."
    );
  }

  return scanner;
}
