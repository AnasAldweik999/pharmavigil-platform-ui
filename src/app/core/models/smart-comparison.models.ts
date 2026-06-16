export type SmartGroupBy = 'MACHINE' | 'STAFF' | 'SHIFT' | 'DATE';

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
export type AnyGroupRow = MachineGroupRow | StaffGroupRow | ShiftGroupRow | DateGroupRow;

export interface ScPageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
