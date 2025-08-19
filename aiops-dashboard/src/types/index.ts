export interface Anomaly {
  anomalyId: string;
  source: string;
  status: 'unchecked' | 'acknowledged' | 'resolved';
  detectedTs: string;
  checkedTs?: string;
  llmSummary?: string;
  pivot: {
    service?: string;
    errorCode?: string;
    region?: string;
    threshold?: number;
    version?: string;
  };
  // Optional fields from API data
  ts?: string;
  firstSeenTs?: string;
  observed?: number;
  expected?: number;
  lift?: number;
  impactShare?: number;
  riskLevel?: string;
  recommendation?: string;
}
