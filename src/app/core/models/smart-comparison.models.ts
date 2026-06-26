export type SmartGroupBy = 'MACHINE' | 'STAFF' | 'SHIFT' | 'DATE' | 'STOP';

export interface SmartComparisonFilters {
  groupBy: SmartGroupBy;
  startDate: string;
  endDate: string;
  shifts?: string[];
  staffEmails?: string[];
  machineNames?: string[];
}

export interface SummaryCardsData {
  totalProducts: number;
  totalOutputUnits: number;
  totalStops: number;
  totalDowntimeMinutes: number;
  totalIncidents: number;
  totalHolds: number;
  totalDeviations: number;
  totalMachines: number;
}

export interface SmartSummaryResponse {
  summaryCards: SummaryCardsData;
  groupedDataLink: string;
}

export interface BaseGroupRow {
  productCount: number;
  outputUnits: number;
  stopCount: number;
  downtimeMinutes: number;
  incidentCount: number;
  holdCount: number;
  deviationCount: number;
  hasIncidents: boolean;
  _links: Record<string, string>;
}

export interface MachineGroupRow extends BaseGroupRow { machineName: string; }
export interface StaffGroupRow   extends BaseGroupRow { staffName: string; staffEmail: string; }
export interface ShiftGroupRow   extends BaseGroupRow { shiftName: string; }
export interface DateGroupRow    extends BaseGroupRow { date: string; }

export interface StopGroupRow {
  stopName: string;
  totalMachines: number;
  totalProducts: number;
  totalDowntimeMinutes: number;
  _links: Record<string, string>;
}

export interface StopMachineRow {
  machineName: string;
  machineStatus: string;
  staffName: string;
  staffEmail: string;
  shift: string;
  workingDate: string;
  totalProducts: number;
  totalDowntimeMinutes: number;
  _links: Record<string, string>;
}

export interface StopProductRow {
  productName: string;
  batchNo: string;
}

export type AnyGroupRow = MachineGroupRow | StaffGroupRow | ShiftGroupRow | DateGroupRow | StopGroupRow;

export interface ScPageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ProductStopRow {
  stopTypeName: string;
  duration: number;
}
