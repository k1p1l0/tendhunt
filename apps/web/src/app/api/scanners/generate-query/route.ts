import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import { anthropic } from "@/lib/anthropic";
import CompanyProfile from "@/models/company-profile";
import type { ScannerType } from "@/models/scanner";

const TYPE_PROMPTS: Record<ScannerType, string> = {
  rfps: `You are generating a scanner configuration for a UK government contract monitoring tool.
Based on the company profile below, generate:
1. A short scanner name (3-5 words, like "IT Services Contract Monitor" or "Healthcare Procurement Tracker")
2. A one-sentence description of what this scanner monitors
3. A search query as OR-joined conditions that capture the types of contracts most relevant to this company. Each condition should be a keyword phrase or capability match. Generate 5-8 conditions.

Example search query format: "cloud infrastructure services OR managed IT support OR cybersecurity consulting OR digital transformation projects OR software development services"`,

  meetings: `You are generating a scanner configuration for a UK board meeting signal monitoring tool.
Based on the company profile below, generate:
1. A short scanner name (3-5 words, like "NHS Board Signal Tracker" or "Council Strategy Monitor")
2. A one-sentence description of what signals this scanner looks for
3. A search query as OR-joined conditions that capture board meeting topics most relevant to this company's offerings. Each condition should describe a procurement signal or strategic discussion topic. Generate 5-8 conditions.

Example search query format: "discussed digital transformation strategy OR raised concerns about IT infrastructure OR approved procurement of consulting services OR reviewed technology modernisation plan"`,

  buyers: `You are generating a scanner configuration for a UK public sector buyer organization monitoring tool.
Based on the company profile below, generate:
1. A short scanner name (3-5 words, like "NHS Trust Account Finder" or "Council Buyer Tracker")
2. A one-sentence description of what buyer organizations this scanner targets
3. A search query as OR-joined conditions that describe the types of organizations most likely to buy from this company. Each condition should describe an org characteristic or procurement pattern. Generate 5-8 conditions.

Example search query format: "NHS trust with IT procurement needs OR local authority digital services OR central government technology department OR defence contractor requiring cybersecurity"`,

  schools: `You are generating a scanner configuration for a UK Ofsted school monitoring tool used by tuition companies.
Based on the company profile below, generate:
1. A short scanner name (3-5 words, like "Recently Downgraded Schools" or "Literacy Catch-up Targets")
2. A one-sentence description of what schools this scanner finds
3. A search query as OR-joined conditions that describe school characteristics most relevant to this company's tuition/education services. Each condition should describe a school need or characteristic. Generate 5-8 conditions.

Example search query format: "recently downgraded Ofsted rating OR requires improvement in quality of education OR literacy catch-up needed OR pupil premium attainment gaps OR secondary school numeracy support"`,
};

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as { type?: ScannerType };

    if (!body.type || !["rfps", "meetings", "buyers", "schools"].includes(body.type)) {
      return Response.json(
        { error: "Valid scanner type is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const profile = await CompanyProfile.findOne({ userId }).lean();
    if (!profile) {
      return Response.json(
        { error: "No company profile found. Please complete onboarding first." },
        { status: 400 }
      );
    }

    const companyContext = `Company: ${profile.companyName || "Unknown"}
Summary: ${profile.summary || "No summary"}
Sectors: ${(profile.sectors as string[] || []).join(", ") || "Not specified"}
Capabilities: ${(profile.capabilities as string[] || []).join(", ") || "Not specified"}
Keywords: ${(profile.keywords as string[] || []).join(", ") || "Not specified"}
Regions: ${(profile.regions as string[] || []).join(", ") || "National"}
Company Size: ${profile.companySize || "Not specified"}
Ideal Contract: ${profile.idealContractDescription || "Not specified"}`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: TYPE_PROMPTS[body.type],
      messages: [
        {
          role: "user",
          content: `Generate a scanner configuration for this company:\n\n${companyContext}\n\nRespond with valid JSON only:\n{\n  "name": "...",\n  "description": "...",\n  "searchQuery": "..."\n}`,
        },
      ],
      output_config: {
        format: {
          type: "json_schema" as const,
          schema: {
            type: "object" as const,
            properties: {
              name: { type: "string" as const },
              description: { type: "string" as const },
              searchQuery: { type: "string" as const },
            },
            required: ["name", "description", "searchQuery"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.content[0];
    if (content.type === "text") {
      const result = JSON.parse(content.text) as {
        name: string;
        description: string;
        searchQuery: string;
      };
      return Response.json(result);
    }

    // Fallback if AI fails
    const fallbackNames: Record<string, string> = {
      rfps: "Contract",
      meetings: "Meeting Signal",
      buyers: "Buyer",
      schools: "Schools",
    };
    const fallbackDescs: Record<string, string> = {
      rfps: "government contracts",
      meetings: "board meeting signals",
      buyers: "buyer organizations",
      schools: "Ofsted-inspected schools",
    };
    return Response.json({
      name: `${fallbackNames[body.type] || "Entity"} Scanner`,
      description: `Monitors ${fallbackDescs[body.type] || "entities"} relevant to your company`,
      searchQuery: (profile.keywords as string[] || []).join(" OR ") || (profile.capabilities as string[] || []).join(" OR ") || "",
    });
  } catch (error) {
    console.error("Generate query error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate search query",
      },
      { status: 500 }
    );
  }
}
