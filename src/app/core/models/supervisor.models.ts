export interface SupervisorReportListItem {
  id: string;
  staffName: string;
  staffEmail: string;
  reportDate: string;
  createdAt: string;
  shiftName: string;
}

export interface DashboardSummaryResponse {
  group: string;
  reportCount: number;
  totalDowntimeMinutes: number;
  avgDowntimeMinutes: number;
  totalIncidents: number;
  machineCounts: Record<string, number>;
}

export interface ProductRowResponse {
  staffName: string;
  staffEmail: string;
  reportDate: string;
  shiftName: string;
  machineName: string;
  machineStatus: 'RUNNING' | 'STOPPED' | 'MAINTENANCE' | 'READY';
  productName: string;
  batchNo: string;
  outputUnits: number;
  deviationDetails: string | null;
  holdDetails: string | null;
  stopCount: number;
}

export type SavedChartType = 'PIE' | 'BAR' | 'LINE';
export type ChartMetric = 'REPORT_COUNT' | 'TOTAL_DOWNTIME' | 'AVG_DOWNTIME' | 'TOTAL_INCIDENTS' | 'MACHINE_COUNTS';
export type SummaryGroupBy = 'DATE' | 'SHIFT' | 'USER';

export interface SavedChartResponse {
  id: string;
  name: string;
  chartType: SavedChartType;
  fromDate: string | null;
  toDate: string | null;
  shiftId: string | null;
  staffEmail: string | null;
  groupBy: SummaryGroupBy | null;
  metrics: ChartMetric[];
  createdAt: string;
}

export interface CreateSavedChartRequest {
  name: string;
  chartType: SavedChartType;
  fromDate?: string;
  toDate?: string;
  shiftId?: string;
  staffEmail?: string;
  groupBy?: SummaryGroupBy;
  metrics: ChartMetric[];
}

export interface UpdateSavedChartRequest {
  name: string;
  chartType: SavedChartType;
  fromDate?: string;
  toDate?: string;
  shiftId?: string;
  staffEmail?: string;
  groupBy?: SummaryGroupBy;
  metrics: ChartMetric[];
}
