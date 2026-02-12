/**
 * Static NUTS/ITL code to human-readable region name mapping for the UK.
 *
 * Covers levels 0-3 (~250 entries) including BOTH NUTS 2016 and NUTS 2021
 * codes for Scotland and London where the classification was restructured.
 *
 * Sources:
 * - Eurostat NUTS 2021 classification for UK
 * - ONS International Geographies
 * - Scottish Government ITL consultation (2021 restructuring)
 *
 * Next update expected: 2027 (NUTS codes are updated every ~5 years)
 */

export const NUTS_REGIONS: Record<string, string> = {
  // ── Level 0 ──────────────────────────────────────────────────────────
  UK: "United Kingdom",

  // ── Level 1 (12 regions) ─────────────────────────────────────────────
  UKC: "North East England",
  UKD: "North West England",
  UKE: "Yorkshire and The Humber",
  UKF: "East Midlands",
  UKG: "West Midlands",
  UKH: "East of England",
  UKI: "London",
  UKJ: "South East England",
  UKK: "South West England",
  UKL: "Wales",
  UKM: "Scotland",
  UKN: "Northern Ireland",

  // ── Level 2: North East England (UKC) ────────────────────────────────
  UKC1: "Tees Valley and Durham",
  UKC2: "Northumberland and Tyne and Wear",

  // ── Level 3: North East England (UKC) ────────────────────────────────
  UKC11: "Hartlepool and Stockton-on-Tees",
  UKC12: "South Teesside",
  UKC13: "Darlington",
  UKC14: "Durham CC",
  UKC21: "Northumberland",
  UKC22: "Tyneside",
  UKC23: "Sunderland",

  // ── Level 2: North West England (UKD) ────────────────────────────────
  UKD1: "Cumbria",
  UKD3: "Greater Manchester",
  UKD4: "Lancashire",
  UKD6: "Cheshire",
  UKD7: "Merseyside",

  // ── Level 3: North West England (UKD) ────────────────────────────────
  UKD11: "West Cumbria",
  UKD12: "East Cumbria",
  UKD33: "Manchester",
  UKD34: "Greater Manchester South West",
  UKD35: "Greater Manchester South East",
  UKD36: "Greater Manchester North West",
  UKD37: "Greater Manchester North East",
  UKD41: "Blackburn with Darwen",
  UKD42: "Blackpool",
  UKD44: "Lancaster and Wyre",
  UKD45: "Mid Lancashire",
  UKD46: "East Lancashire",
  UKD47: "Chorley and West Lancashire",
  UKD61: "Warrington",
  UKD62: "Cheshire East",
  UKD63: "Cheshire West and Chester",
  UKD71: "East Merseyside",
  UKD72: "Liverpool",
  UKD73: "Sefton",
  UKD74: "Wirral",

  // ── Level 2: Yorkshire and The Humber (UKE) ──────────────────────────
  UKE1: "East Yorkshire and Northern Lincolnshire",
  UKE2: "North Yorkshire",
  UKE3: "South Yorkshire",
  UKE4: "West Yorkshire",

  // ── Level 3: Yorkshire and The Humber (UKE) ──────────────────────────
  UKE11: "Kingston upon Hull, City of",
  UKE12: "East Riding of Yorkshire",
  UKE13: "North and North East Lincolnshire",
  UKE21: "York",
  UKE22: "North Yorkshire CC",
  UKE31: "Barnsley, Doncaster and Rotherham",
  UKE32: "Sheffield",
  UKE41: "Bradford",
  UKE42: "Leeds",
  UKE44: "Calderdale and Kirklees",
  UKE45: "Wakefield",

  // ── Level 2: East Midlands (UKF) ────────────────────────────────────
  UKF1: "Derbyshire and Nottinghamshire",
  UKF2: "Leicestershire, Rutland and Northamptonshire",
  UKF3: "Lincolnshire",

  // ── Level 3: East Midlands (UKF) ────────────────────────────────────
  UKF11: "Derby",
  UKF12: "East Derbyshire",
  UKF13: "South and West Derbyshire",
  UKF14: "Nottingham",
  UKF15: "North Nottinghamshire",
  UKF16: "South Nottinghamshire",
  UKF21: "Leicester",
  UKF22: "Leicestershire CC and Rutland",
  UKF24: "West Northamptonshire",
  UKF25: "North Northamptonshire",
  UKF30: "Lincolnshire",

  // ── Level 2: West Midlands (UKG) ────────────────────────────────────
  UKG1: "Herefordshire, Worcestershire and Warwickshire",
  UKG2: "Shropshire and Staffordshire",
  UKG3: "West Midlands",

  // ── Level 3: West Midlands (UKG) ────────────────────────────────────
  UKG11: "Herefordshire, County of",
  UKG12: "Worcestershire",
  UKG13: "Warwickshire",
  UKG21: "Telford and Wrekin",
  UKG22: "Shropshire CC",
  UKG23: "Stoke-on-Trent",
  UKG24: "Staffordshire CC",
  UKG31: "Birmingham",
  UKG32: "Solihull",
  UKG33: "Coventry",
  UKG34: "Dudley",
  UKG35: "Sandwell",
  UKG36: "Walsall",
  UKG37: "Wolverhampton",

  // ── Level 2: East of England (UKH) ──────────────────────────────────
  UKH1: "East Anglia",
  UKH2: "Bedfordshire and Hertfordshire",
  UKH3: "Essex",

  // ── Level 3: East of England (UKH) ──────────────────────────────────
  UKH11: "Peterborough",
  UKH12: "Cambridgeshire CC",
  UKH14: "Suffolk",
  UKH15: "Norwich and East Norfolk",
  UKH16: "North and West Norfolk",
  UKH17: "Breckland and South Norfolk",
  UKH21: "Luton",
  UKH23: "Hertfordshire",
  UKH24: "Bedford",
  UKH25: "Central Bedfordshire",
  UKH31: "Southend-on-Sea",
  UKH32: "Thurrock",
  UKH34: "Essex Haven Gateway",
  UKH35: "West Essex",
  UKH36: "Heart of Essex",
  UKH37: "Essex Thames Gateway",

  // ── Level 2: London (UKI) — NUTS 2021 ───────────────────────────────
  UKI3: "Inner London - West",
  UKI4: "Inner London - East",
  UKI5: "Outer London - East and North East",
  UKI6: "Outer London - South",
  UKI7: "Outer London - West and North West",

  // ── Level 3: London (UKI) — NUTS 2021 ───────────────────────────────
  UKI31: "Camden and City of London",
  UKI32: "Westminster",
  UKI33: "Kensington and Chelsea, and Hammersmith and Fulham",
  UKI34: "Wandsworth",
  UKI41: "Hackney and Newham",
  UKI42: "Tower Hamlets",
  UKI43: "Haringey and Islington",
  UKI44: "Lewisham and Southwark",
  UKI45: "Lambeth",
  UKI51: "Bexley and Greenwich",
  UKI52: "Barking and Dagenham, and Havering",
  UKI53: "Redbridge and Waltham Forest",
  UKI54: "Enfield",
  UKI61: "Bromley",
  UKI62: "Croydon",
  UKI63: "Merton, Kingston upon Thames and Sutton",
  UKI71: "Barnet",
  UKI72: "Brent",
  UKI73: "Ealing",
  UKI74: "Harrow and Hillingdon",
  UKI75: "Hounslow and Richmond upon Thames",

  // ── Level 2: London (UKI) — NUTS 2016 (legacy) ──────────────────────
  UKI1: "Inner London",
  UKI2: "Outer London",

  // ── Level 3: London (UKI) — NUTS 2016 (legacy) ──────────────────────
  UKI11: "Inner London - West",
  UKI12: "Inner London - East",
  UKI21: "Outer London - East and North East",
  UKI22: "Outer London - South",
  UKI23: "Outer London - West and North West",

  // ── Level 2: South East England (UKJ) ───────────────────────────────
  UKJ1: "Berkshire, Buckinghamshire and Oxfordshire",
  UKJ2: "Surrey, East and West Sussex",
  UKJ3: "Hampshire and Isle of Wight",
  UKJ4: "Kent",

  // ── Level 3: South East England (UKJ) ───────────────────────────────
  UKJ11: "Berkshire",
  UKJ12: "Milton Keynes",
  UKJ13: "Buckinghamshire CC",
  UKJ14: "Oxfordshire",
  UKJ21: "Brighton and Hove",
  UKJ22: "East Sussex CC",
  UKJ25: "West Surrey",
  UKJ26: "East Surrey",
  UKJ27: "West Sussex (North East)",
  UKJ28: "West Sussex (South West)",
  UKJ31: "Portsmouth",
  UKJ32: "Southampton",
  UKJ34: "Isle of Wight",
  UKJ35: "South Hampshire",
  UKJ36: "Central Hampshire",
  UKJ37: "North Hampshire",
  UKJ41: "Medway",
  UKJ43: "Kent Thames Gateway",
  UKJ44: "East Kent",
  UKJ45: "Mid Kent",
  UKJ46: "West Kent",

  // ── Level 2: South West England (UKK) ───────────────────────────────
  UKK1: "Gloucestershire, Wiltshire and Bristol/Bath area",
  UKK2: "Dorset and Somerset",
  UKK3: "Cornwall and Isles of Scilly",
  UKK4: "Devon",

  // ── Level 3: South West England (UKK) ───────────────────────────────
  UKK11: "Bristol, City of",
  UKK12: "Bath and North East Somerset, North Somerset and South Gloucestershire",
  UKK13: "Gloucestershire",
  UKK14: "Swindon",
  UKK15: "Wiltshire CC",
  UKK21: "Bournemouth and Poole",
  UKK22: "Dorset CC",
  UKK23: "Somerset",
  UKK30: "Cornwall and Isles of Scilly",
  UKK41: "Plymouth",
  UKK42: "Torbay",
  UKK43: "Devon CC",

  // ── Level 2: Wales (UKL) ────────────────────────────────────────────
  UKL1: "West Wales and The Valleys",
  UKL2: "East Wales",

  // ── Level 3: Wales (UKL) ────────────────────────────────────────────
  UKL11: "Isle of Anglesey",
  UKL12: "Gwynedd",
  UKL13: "Conwy and Denbighshire",
  UKL14: "South West Wales",
  UKL15: "Central Valleys",
  UKL16: "Gwent Valleys",
  UKL17: "Bridgend and Neath Port Talbot",
  UKL18: "Swansea",
  UKL21: "Monmouthshire and Newport",
  UKL22: "Cardiff and Vale of Glamorgan",
  UKL23: "Flintshire and Wrexham",
  UKL24: "Powys",

  // ── Level 2: Scotland (UKM) — NUTS 2021 ─────────────────────────────
  UKM5: "North Eastern Scotland",
  UKM6: "Highlands and Islands",
  UKM7: "Eastern Scotland",
  UKM8: "West Central Scotland",
  UKM9: "Southern Scotland",

  // ── Level 3: Scotland (UKM) — NUTS 2021 ─────────────────────────────
  UKM50: "Aberdeen City and Aberdeenshire",
  UKM61: "Caithness and Sutherland and Ross and Cromarty",
  UKM62: "Inverness and Nairn and Moray, Badenoch and Strathspey",
  UKM63: "Lochaber, Skye and Lochalsh, Argyll and the Islands",
  UKM64: "Eilean Siar (Western Isles)",
  UKM65: "Orkney Islands",
  UKM66: "Shetland Islands",
  UKM71: "Angus and Dundee City",
  UKM72: "Clackmannanshire and Fife",
  UKM73: "East Lothian and Midlothian",
  UKM74: "Scottish Borders",
  UKM75: "Edinburgh, City of",
  UKM76: "Falkirk",
  UKM77: "Perth and Kinross and Stirling",
  UKM78: "West Lothian",
  UKM81: "East Dunbartonshire, West Dunbartonshire and Helensburgh",
  UKM82: "Glasgow City",
  UKM83: "Inverclyde, East Renfrewshire and Renfrewshire",
  UKM84: "North Lanarkshire",
  UKM91: "Dumfries and Galloway",
  UKM92: "East and North Ayrshire",
  UKM93: "South Ayrshire",
  UKM94: "South Lanarkshire",

  // ── Level 2: Scotland (UKM) — NUTS 2016 (legacy) ────────────────────
  UKM2: "Eastern Scotland (2016)",
  UKM3: "South Western Scotland (2016)",

  // ── Level 3: Scotland (UKM) — NUTS 2016 (legacy) ────────────────────
  UKM21: "Angus and Dundee City",
  UKM22: "Clackmannanshire and Fife",
  UKM23: "East Lothian and Midlothian",
  UKM24: "Scottish Borders",
  UKM25: "Edinburgh, City of",
  UKM26: "Falkirk",
  UKM27: "Perth and Kinross and Stirling",
  UKM28: "West Lothian",
  UKM31: "East Dunbartonshire, West Dunbartonshire and Helensburgh",
  UKM32: "Dumfries and Galloway",
  UKM33: "East and North Ayrshire and Arran",
  UKM34: "Glasgow City",
  UKM35: "Inverclyde, East Renfrewshire and Renfrewshire",
  UKM36: "North Lanarkshire",
  UKM37: "South Ayrshire",
  UKM38: "South Lanarkshire",

  // ── Level 2: Northern Ireland (UKN) ─────────────────────────────────
  UKN0: "Northern Ireland",

  // ── Level 3: Northern Ireland (UKN) ─────────────────────────────────
  UKN06: "Belfast",
  UKN07: "Armagh City, Banbridge and Craigavon",
  UKN08: "Newry, Mourne and Down",
  UKN09: "Ards and North Down",
  UKN10: "Derry City and Strabane",
  UKN11: "Fermanagh and Omagh",
  UKN12: "Mid Ulster",
  UKN13: "Causeway Coast and Glens",
  UKN14: "Antrim and Newtownabbey",
  UKN15: "Lisburn and Castlereagh",
  UKN16: "Mid and East Antrim",
};

/**
 * Resolve a NUTS/ITL code to a human-readable region name.
 *
 * Strategy:
 * 1. Returns "Not specified" for null/undefined/empty
 * 2. Tries exact match in NUTS_REGIONS
 * 3. Falls back to progressively shorter codes (UKE41 -> UKE4 -> UKE -> UK)
 * 4. Returns raw code as final fallback if nothing matches
 */
export function resolveRegionName(code: string | null | undefined): string {
  if (!code) return "Not specified";

  // Try exact match
  if (NUTS_REGIONS[code]) return NUTS_REGIONS[code];

  // Try progressively shorter codes (UKE41 -> UKE4 -> UKE -> UK)
  let truncated = code;
  while (truncated.length > 2) {
    truncated = truncated.slice(0, -1);
    if (NUTS_REGIONS[truncated]) {
      return NUTS_REGIONS[truncated];
    }
  }

  // Fallback: return raw code
  return code;
}
