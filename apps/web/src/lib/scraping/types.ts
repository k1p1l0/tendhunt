export interface ScrapeResult {
  success: boolean;
  data: Record<string, unknown>;
  error?: string;
  scrapedAt: Date;
  source: string;
}

export interface LinkedInCompanyData {
  description?: string;
  employeeCount?: number;
  employeeCountRange?: { start: number; end: number };
  specialties?: string[];
  industry?: string;
  headquarters?: string;
  logoUrl?: string;
  recentPosts?: Array<{
    text: string;
    date: string;
    likes: number;
  }>;
}

export interface GoogleSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebsiteScrapedData {
  emails: string[];
  phones: string[];
  personnel: Array<{
    name: string;
    title?: string;
    email?: string;
    phone?: string;
  }>;
  procurementInfo?: string;
  aboutText?: string;
}
