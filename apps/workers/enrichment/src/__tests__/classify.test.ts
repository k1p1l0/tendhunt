import { describe, it, expect } from "vitest";
import { normalizeName, classifyByHeuristic } from "../stages/01-classify";

// ---------------------------------------------------------------------------
// normalizeName — strip institutional words and normalize for fuzzy matching
// ---------------------------------------------------------------------------

describe("normalizeName", () => {
  it("strips 'London Borough of' prefix", () => {
    expect(normalizeName("London Borough of Hackney")).toBe("hackney");
  });

  it("strips 'London Borough' without 'of'", () => {
    expect(normalizeName("London Borough Hackney")).toBe("hackney");
  });

  it("strips 'Ministry of' prefix from central gov names", () => {
    // "Ministry" is not in strip list, but "of" is
    expect(normalizeName("Ministry of Defence")).toBe("ministry defence");
  });

  it("strips 'NHS Foundation Trust' suffix", () => {
    expect(normalizeName("NHS Foundation Trust X")).toBe("x");
  });

  it("strips 'NHS Trust' suffix", () => {
    expect(normalizeName("NHS Trust Worthing")).toBe("worthing");
  });

  it("strips standalone 'NHS'", () => {
    expect(normalizeName("NHS England")).toBe("england");
  });

  it("strips 'Council' from council names", () => {
    expect(normalizeName("Sheffield Council")).toBe("sheffield");
  });

  it("strips 'Borough' from borough names", () => {
    expect(normalizeName("Hackney Borough")).toBe("hackney");
  });

  it("strips 'City' keyword", () => {
    expect(normalizeName("City of Edinburgh")).toBe("edinburgh");
  });

  it("strips 'Royal' prefix", () => {
    expect(normalizeName("Royal Borough of Greenwich")).toBe("greenwich");
  });

  it("strips 'the' article", () => {
    expect(normalizeName("The Council")).toBe("");
  });

  it("strips 'Metropolitan' and 'District'", () => {
    expect(normalizeName("Metropolitan Borough of Wigan")).toBe("wigan");
  });

  it("strips 'County' keyword", () => {
    expect(normalizeName("Hampshire County Council")).toBe("hampshire");
  });

  it("strips 'Unitary Authority'", () => {
    expect(normalizeName("Bath and North East Somerset Unitary Authority")).toBe(
      "bath and north east somerset"
    );
  });

  it("strips 'Combined Authority'", () => {
    expect(normalizeName("West Midlands Combined Authority")).toBe("west midlands");
  });

  it("strips 'Authorities' (plural)", () => {
    expect(normalizeName("Fire Authorities Association")).toBe("fire association");
  });

  it("handles multiple strips in one name", () => {
    // "Royal Borough of London Greenwich" has Royal, Borough, of, London
    expect(normalizeName("Royal Borough of London Greenwich")).toBe("greenwich");
  });

  it("collapses multiple spaces into one", () => {
    expect(normalizeName("London  Borough   of   Hackney")).toBe("hackney");
  });

  it("lowercases result", () => {
    expect(normalizeName("HACKNEY")).toBe("hackney");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeName("  Hackney Council  ")).toBe("hackney");
  });

  it("returns empty string if all words are stripped", () => {
    expect(normalizeName("The Royal City of London Council")).toBe("");
  });

  it("handles London Borough names correctly after normalization fix", () => {
    // London Borough names should strip completely to just the name
    const londonBoroughs = [
      { input: "London Borough of Camden", expected: "camden" },
      { input: "London Borough of Islington", expected: "islington" },
      { input: "London Borough of Tower Hamlets", expected: "tower hamlets" },
      { input: "London Borough of Barking and Dagenham", expected: "barking and dagenham" },
      { input: "Royal Borough of Kensington and Chelsea", expected: "kensington and chelsea" },
    ];

    for (const { input, expected } of londonBoroughs) {
      expect(normalizeName(input)).toBe(expected);
    }
  });
});

// ---------------------------------------------------------------------------
// classifyByHeuristic — fallback classification when Fuse.js finds no match
// ---------------------------------------------------------------------------

describe("classifyByHeuristic", () => {
  describe("central_government", () => {
    it("classifies 'Department for Education'", () => {
      expect(classifyByHeuristic("Department for Education", "")).toBe("central_government");
    });

    it("classifies 'Department of Health'", () => {
      expect(classifyByHeuristic("Department of Health", "")).toBe("central_government");
    });

    it("classifies 'Ministry of Defence'", () => {
      expect(classifyByHeuristic("Ministry of Defence", "")).toBe("central_government");
    });

    it("classifies 'HM Treasury'", () => {
      expect(classifyByHeuristic("HM Treasury", "")).toBe("central_government");
    });

    it("classifies 'Cabinet Office'", () => {
      expect(classifyByHeuristic("Cabinet Office", "")).toBe("central_government");
    });

    it("classifies 'Home Office'", () => {
      expect(classifyByHeuristic("Home Office", "")).toBe("central_government");
    });

    it("classifies 'HMRC'", () => {
      expect(classifyByHeuristic("HMRC", "")).toBe("central_government");
    });

    it("classifies 'Government Digital Service'", () => {
      expect(classifyByHeuristic("Government Digital Service", "")).toBe("central_government");
    });

    it("classifies 'Crown Commercial Service'", () => {
      expect(classifyByHeuristic("Crown Commercial Service", "")).toBe("central_government");
    });

    it("classifies 'Government Property Agency'", () => {
      expect(classifyByHeuristic("Government Property Agency", "")).toBe("central_government");
    });

    it("classifies 'Government Legal Department'", () => {
      expect(classifyByHeuristic("Government Legal Department", "")).toBe("central_government");
    });
  });

  describe("devolved_government", () => {
    it("classifies 'Scottish Government'", () => {
      expect(classifyByHeuristic("Scottish Government", "")).toBe("devolved_government");
    });

    it("classifies 'Welsh Government'", () => {
      expect(classifyByHeuristic("Welsh Government", "")).toBe("devolved_government");
    });

    it("classifies 'Northern Ireland Executive'", () => {
      expect(classifyByHeuristic("Northern Ireland Executive", "")).toBe("devolved_government");
    });
  });

  describe("local_council_other", () => {
    it("classifies names with 'Council'", () => {
      expect(classifyByHeuristic("Glasgow City Council", "")).toBe("local_council_other");
    });

    it("classifies 'Aberdeenshire Council'", () => {
      expect(classifyByHeuristic("Aberdeenshire Council", "")).toBe("local_council_other");
    });
  });

  describe("local_council_london", () => {
    it("classifies names with 'Borough' (no council keyword)", () => {
      expect(classifyByHeuristic("London Borough of Hackney", "")).toBe("local_council_london");
    });

    it("matches 'Royal Borough' pattern", () => {
      expect(classifyByHeuristic("Royal Borough of Greenwich", "")).toBe("local_council_london");
    });
  });

  describe("nhs_other", () => {
    it("classifies names with 'NHS'", () => {
      expect(classifyByHeuristic("NHS England", "")).toBe("nhs_other");
    });

    it("classifies Health & Social sector trusts", () => {
      expect(classifyByHeuristic("Barking Trust", "Health & Social")).toBe("nhs_other");
    });

    it("classifies Health & Social sector hospitals", () => {
      expect(classifyByHeuristic("Royal Liverpool Hospital", "Health & Social")).toBe("nhs_other");
    });
  });

  describe("university", () => {
    it("classifies names with 'University'", () => {
      expect(classifyByHeuristic("University of Oxford", "")).toBe("university");
    });

    it("classifies 'Manchester Metropolitan University'", () => {
      expect(classifyByHeuristic("Manchester Metropolitan University", "")).toBe("university");
    });
  });

  describe("mat", () => {
    it("classifies multi-academy trusts", () => {
      expect(classifyByHeuristic("Bright Futures Academy Trust", "")).toBe("mat");
    });

    it("classifies 'Multi Academy Trust' pattern", () => {
      expect(classifyByHeuristic("Harris Multi Academy Trust", "")).toBe("mat");
    });

    it("classifies MAT with school keyword", () => {
      expect(classifyByHeuristic("Academies Enterprise Trust School", "")).toBe("mat");
    });
  });

  describe("fe_college", () => {
    it("classifies names with 'College'", () => {
      expect(classifyByHeuristic("Leeds City College", "")).toBe("fe_college");
    });
  });

  describe("police_pcc", () => {
    it("classifies names with 'Police'", () => {
      expect(classifyByHeuristic("Metropolitan Police Service", "")).toBe("police_pcc");
    });

    it("classifies 'constabulary' keyword", () => {
      expect(classifyByHeuristic("Avon and Somerset Constabulary", "")).toBe("police_pcc");
    });
  });

  describe("fire_rescue", () => {
    it("classifies names with 'Fire'", () => {
      expect(classifyByHeuristic("London Fire Brigade", "")).toBe("fire_rescue");
    });

    it("classifies names with 'Rescue'", () => {
      expect(classifyByHeuristic("Devon and Somerset Rescue Service", "")).toBe("fire_rescue");
    });
  });

  describe("housing_association", () => {
    it("classifies names with 'Housing'", () => {
      expect(classifyByHeuristic("Peabody Housing Association", "")).toBe("housing_association");
    });

    it("classifies names with 'Homes'", () => {
      expect(classifyByHeuristic("L&Q Homes", "")).toBe("housing_association");
    });
  });

  describe("alb (arms-length bodies)", () => {
    it("classifies known regulators", () => {
      expect(classifyByHeuristic("Ofsted", "")).toBe("alb");
    });

    it("classifies 'Environment Agency'", () => {
      expect(classifyByHeuristic("Environment Agency", "")).toBe("alb");
    });

    it("classifies transport bodies", () => {
      expect(classifyByHeuristic("Transport for London", "")).toBe("alb");
    });

    it("classifies 'Network Rail'", () => {
      expect(classifyByHeuristic("Network Rail", "")).toBe("alb");
    });
  });

  describe("private_company", () => {
    it("classifies 'Ltd' companies", () => {
      expect(classifyByHeuristic("Serco Ltd", "")).toBe("private_company");
    });

    it("classifies 'PLC' companies", () => {
      expect(classifyByHeuristic("BT Group PLC", "")).toBe("private_company");
    });

    it("classifies 'Limited' companies", () => {
      expect(classifyByHeuristic("Capita Business Services Limited", "")).toBe("private_company");
    });
  });

  describe("no match", () => {
    it("returns null for unrecognizable names", () => {
      expect(classifyByHeuristic("Acme Inc", "")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(classifyByHeuristic("", "")).toBeNull();
    });
  });

  describe("priority ordering (first match wins)", () => {
    // "Council" appears in both central_government (not directly) and local_council_other
    // "Scottish Government" should match devolved_government before "council" rule
    it("devolved government takes priority over council", () => {
      expect(classifyByHeuristic("Scottish Government Council", "")).toBe("devolved_government");
    });

    // "Department for" matches central_government before "council"
    it("central government takes priority over council", () => {
      expect(classifyByHeuristic("Department for Council Affairs", "")).toBe("central_government");
    });

    // "NHS" alone matches nhs_other before university
    it("NHS matches before other patterns", () => {
      expect(classifyByHeuristic("NHS University Hospital", "")).toBe("nhs_other");
    });
  });
});
