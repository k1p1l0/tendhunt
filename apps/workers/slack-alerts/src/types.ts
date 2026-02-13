export interface Env {
  MONGODB_URI: string;
  APP_URL: string;
}

export interface SlackIntegration {
  _id: string;
  userId: string;
  teamId: string;
  teamName: string;
  botToken: string;
  channelId: string;
  channelName: string;
  isActive: boolean;
}

export interface SlackAlertConfig {
  _id: string;
  userId: string;
  slackIntegrationId: string;
  alertType: "scanner_threshold" | "daily_digest" | "new_contracts" | "new_signals";
  scannerId?: string;
  columnId?: string;
  threshold?: number;
  digestTime?: string;
  digestDays?: string[];
  channelOverride?: string;
  isActive: boolean;
}

export interface Contract {
  _id: string;
  title: string;
  buyerName: string;
  value: number;
  deadline: string;
  sector: string;
  region: string;
  createdAt: Date;
  status: string;
}

export interface Signal {
  _id: string;
  title: string;
  type: string;
  organizationName: string;
  date: string;
  createdAt: Date;
}

export interface CompanyProfile {
  _id: string;
  userId: string;
  sectors: string[];
  keywords: string[];
  regions: string[];
}

export interface StageResult {
  sent: number;
  errors: number;
}
