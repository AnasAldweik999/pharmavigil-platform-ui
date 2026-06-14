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
  totalDowntimeMinutes: number;
  totalProducts: number;
  totalOutputUnits: number;
  totalStops: number;
  totalIncidents: number;
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

export type SummaryGroupBy = 'DATE' | 'SHIFT' | 'USER';
