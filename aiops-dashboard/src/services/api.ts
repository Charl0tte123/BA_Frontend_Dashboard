import type { Anomaly } from '../types';

const sample: Anomaly[] = [
  {
    anomalyId: 'we-OrderAPI-1.14.3-HTTP5XX-20250819T1205',
    ts: '2025-08-19T12:05:00Z',
    firstSeenTs: '2025-08-19T12:00:00Z',
    source: 'appinsights',
    pivot: { service: 'OrderAPI', region: 'westeurope', version: '1.14.3', errorCode: 'HTTP_5XX' },
    observed: 182, expected: 45, lift: 4.04, impactShare: 0.37,
    riskLevel: 'S2',
    llmSummary: 'Seit 11:55Z starker Anstieg HTTP 5xx in OrderAPI (WE, v1.14.3).',
    recommendation: 'Rollback auf 1.14.2; AppGW Timeout prüfen.',
    status: 'unchecked'
  },
  {
    anomalyId: 'ne-BillingAPI-CPU-20250819T1150',
    ts: '2025-08-19T11:50:00Z',
    firstSeenTs: '2025-08-19T11:45:00Z',
    source: 'perf',
    pivot: { service: 'BillingAPI', region: 'northeurope', errorCode: 'CPU_HIGH' },
    observed: 95, expected: 40, lift: 2.38, impactShare: 0.21,
    riskLevel: 'S3',
    llmSummary: 'CPU-Spitze in BillingAPI (NE). Mögliche Ursache: Batch-Job.',
    recommendation: 'Autoscaling prüfen; Limits anpassen.',
    status: 'acknowledged', checkedTs: '2025-08-19T11:52:00Z'
  }
];

export async function fetchAnomalies(): Promise<Anomaly[]> {
  // Keine API mehr im Einsatz; nur für lokale Tests belassen.
  await new Promise(r => setTimeout(r, 200));
  // structuredClone kann bei Proxies scheitern -> sichere JSON-Kopie
  return JSON.parse(JSON.stringify(sample)) as Anomaly[];
}

export async function updateAnomalyStatus(id: string, status: Anomaly['status']): Promise<void> {
  // Keine echte API. No-op.
  return;
}
