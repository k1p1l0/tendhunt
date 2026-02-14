/**
 * Generate procurement signals from Ofsted inspection data.
 *
 * Creates Signal records for schools rated below "Good" (grade >= 3) in
 * any judgement area. These signals surface on buyer pages to help SMEs
 * identify education organisations that may need improvement services.
 *
 * Dedup key: URN + inspectionDate (prevents duplicate signals on re-run).
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/generate-ofsted-signals.ts
 *   DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/generate-ofsted-signals.ts --dry-run
 */
import { dbConnect } from "../src/lib/mongodb";
import OfstedSchool from "../src/models/ofsted-school";
import Signal from "../src/models/signal";

const DRY_RUN = process.argv.includes("--dry-run");

const GRADE_LABELS: Record<number, string> = {
  1: "Outstanding",
  2: "Good",
  3: "Requires Improvement",
  4: "Inadequate",
};

function gradeLabel(grade: number | null | undefined): string {
  if (grade == null) return "Not judged";
  return GRADE_LABELS[grade] ?? `Grade ${grade}`;
}

function getBelowGoodAreas(school: {
  qualityOfEducation?: number | null;
  behaviourAndAttitudes?: number | null;
  personalDevelopment?: number | null;
  leadershipAndManagement?: number | null;
}): string[] {
  const areas: string[] = [];
  if (school.qualityOfEducation != null && school.qualityOfEducation >= 3)
    areas.push(`Quality of Education: ${gradeLabel(school.qualityOfEducation)}`);
  if (school.behaviourAndAttitudes != null && school.behaviourAndAttitudes >= 3)
    areas.push(`Behaviour & Attitudes: ${gradeLabel(school.behaviourAndAttitudes)}`);
  if (school.personalDevelopment != null && school.personalDevelopment >= 3)
    areas.push(`Personal Development: ${gradeLabel(school.personalDevelopment)}`);
  if (school.leadershipAndManagement != null && school.leadershipAndManagement >= 3)
    areas.push(`Leadership & Management: ${gradeLabel(school.leadershipAndManagement)}`);
  return areas;
}

function getOverallLabel(school: {
  overallEffectiveness?: number | null;
}): string {
  if (school.overallEffectiveness != null) {
    return gradeLabel(school.overallEffectiveness);
  }
  return "Not graded (post Sep 2024)";
}

async function main() {
  await dbConnect();

  const prefix = DRY_RUN ? "[DRY RUN]" : "[WRITE]";
  console.log(`\n${prefix} Generating Ofsted signals...\n`);

  // Find schools rated below Good in any area
  const schools = await OfstedSchool.find({
    $or: [
      { overallEffectiveness: { $gte: 3 } },
      { qualityOfEducation: { $gte: 3 } },
      { behaviourAndAttitudes: { $gte: 3 } },
      { personalDevelopment: { $gte: 3 } },
      { leadershipAndManagement: { $gte: 3 } },
    ],
  }).lean();

  console.log(`Found ${schools.length} schools rated below Good`);

  let created = 0;
  let skipped = 0;
  const bulkOps = [];

  for (const school of schools) {
    const belowGoodAreas = getBelowGoodAreas(school);
    if (belowGoodAreas.length === 0) continue;

    const overallLabel = getOverallLabel(school);
    const orgName = school.matName || school.localAuthority || school.name;

    // Build dedup key from URN + inspection date
    const dedupTitle = `Ofsted: ${school.name} (URN ${school.urn})`;
    const dedupSourceDate = school.inspectionDate;

    const summary = `Ofsted rated ${school.name} as ${overallLabel} -- ${belowGoodAreas.join(", ")}`;

    const entities: { companies: string[]; amounts: string[]; dates: string[]; people: string[] } = {
      companies: [school.name],
      amounts: [],
      dates: school.inspectionDate
        ? [new Date(school.inspectionDate).toISOString().split("T")[0]]
        : [],
      people: [],
    };

    if (school.localAuthority) {
      entities.companies.push(school.localAuthority);
    }
    if (school.matName) {
      entities.companies.push(school.matName);
    }

    const signalDoc = {
      organizationName: orgName,
      buyerId: school.buyerId ?? undefined,
      signalType: "REGULATORY",
      title: dedupTitle,
      insight: summary,
      quote: belowGoodAreas.join("; "),
      entities,
      source: "Ofsted Inspection",
      sourceDate: dedupSourceDate,
      sector: "Education",
      confidence: 0.95,
    };

    if (DRY_RUN) {
      if (created < 5) {
        console.log(`  ${prefix} ${dedupTitle}`);
        console.log(`    ${summary}\n`);
      }
      created++;
      continue;
    }

    // Upsert by title (which includes URN) to avoid duplicates
    bulkOps.push({
      updateOne: {
        filter: {
          title: dedupTitle,
          signalType: "REGULATORY",
        },
        update: { $set: signalDoc },
        upsert: true,
      },
    });

    if (bulkOps.length >= 500) {
      const result = await Signal.bulkWrite(bulkOps);
      created += result.upsertedCount;
      skipped += result.modifiedCount;
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0 && !DRY_RUN) {
    const result = await Signal.bulkWrite(bulkOps);
    created += result.upsertedCount;
    skipped += result.modifiedCount;
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`${prefix} Signal Generation Summary:`);
  console.log(`  Schools below Good: ${schools.length}`);
  console.log(`  Signals created: ${created}`);
  console.log(`  Signals updated: ${skipped}`);
  console.log(`${"=".repeat(60)}\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Signal generation failed:", err);
  process.exit(1);
});
