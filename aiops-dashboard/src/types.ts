export type AnomalyStatus = 'unchecked' | 'acknowledged' | 'resolved';

export interface Pivot {
  service?: string;
  region?: string;
  version?: string;
  errorCode?: string;
}

export interface Anomaly {
  anomalyId: string;
  ts: string;            // ISO
  source: string;        // appinsights | diagnostics | perf | defender
  pivot: Pivot;
  observed: number;
  expected: number;
  lift: number;          // observed/expected
  impactShare: number;   // 0..1
  riskLevel?: 'S1'|'S2'|'S3'|'S4';
  llmSummary?: string;
  recommendation?: string;
  status: AnomalyStatus;
  firstSeenTs?: string;  // ISO (für TTF-Check)
  checkedTs?: string;    // ISO (wenn acknowledged/resolved)
}
