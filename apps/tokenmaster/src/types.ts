export const ENGINE_VERSION = "20.0.28";
export const VERSION = "0.1.0";
export interface Totals {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  totalCost: number;
  unpricedModels?: string[];
}
export interface ModelUsage {
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  cost: number;
  extraTotalTokens?: number;
  missingPricing?: boolean;
}
export interface UsageRow extends Totals {
  agent: string;
  period: string;
  modelsUsed: string[];
  modelBreakdowns: ModelUsage[];
  agents?: UsageRow[];
  metadata?: {
    lastActivity?: string;
    projectPath?: string;
    reasoningOutputTokens?: number;
    agents?: string[];
  };
}
export interface Report {
  daily: UsageRow[];
  weekly: UsageRow[];
  monthly: UsageRow[];
  session: UsageRow[];
  totals: Totals;
}
export interface Block {
  id: string;
  startTime: string;
  endTime: string;
  actualEndTime: string | null;
  isActive: boolean;
  isGap: boolean;
  entries: number;
  totalTokens: number;
  costUSD: number;
  models: string[];
  tokenCounts: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
  };
  burnRate: { tokensPerMinute: number; costPerHour: number } | null;
  projection: {
    totalTokens: number;
    totalCost: number;
    remainingMinutes: number;
  } | null;
}
export interface BlockReport {
  blocks: Block[];
  totals: Record<string, number>;
}
export interface ProjectRow extends Totals {
  date: string;
  project: string;
  modelsUsed: string[];
  modelBreakdowns: ModelUsage[];
}
export interface ProjectReport {
  projects: Record<string, ProjectRow[]>;
  totals: Totals;
}
export interface Query {
  since?: string;
  until?: string;
  timezone?: string;
  mode?: "auto" | "calculate" | "display";
}
export interface Envelope<T> {
  data: T;
  readAt: string;
  engineVersion: string;
  pricing: string;
  durationMs: number;
}
