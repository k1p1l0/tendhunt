/**
 * Sector values used across the app. Must match the values stored in MongoDB
 * (derived from CPV 2-digit codes in apps/workers/data-sync/src/mappers/ocds-mapper.ts).
 *
 * Only the most commonly searched sectors are included here for UI dropdowns.
 * The full list of 44 sectors exists in the contracts collection.
 */
export const SECTORS = [
  "Health & Social",
  "Construction",
  "Business Services",
  "Architecture & Engineering",
  "Environmental Services",
  "IT Services",
  "Education",
  "Transport",
  "Software",
  "Medical Equipment",
  "Financial Services",
  "R&D",
  "Repair & Maintenance",
  "Hospitality",
  "Laboratory Equipment",
  "Security & Defence",
  "Real Estate",
  "Energy",
  "Telecoms",
  "Publishing & Printing",
  "Utilities",
  "Public Administration",
  "Recreation & Culture",
  "Food & Beverages",
  "IT Equipment",
  "Furniture",
  "Industrial Machinery",
] as const;

export type Sector = (typeof SECTORS)[number];
