export type MachineStatus = 'RUNNING' | 'STOPPED' | 'MAINTENANCE' | 'READY';

export interface ShiftRef    { id: string; name: string; }
export interface MachineRef  { id: string; name: string; }
export interface StopTypeRef { id: string; name: string; }

export interface CreateWorkReportRequest {
  reportDate: string;
  shiftId:    string;
  machines:   MachineEntryRequest[];
}
export interface MachineEntryRequest {
  machineId: string;
  status:    MachineStatus;
  products:  ProductEntryRequest[];
  incidents: IncidentRequest[];
}
export interface ProductEntryRequest {
  productName:  string;
  batchNo:      string;
  outputUnits:  number;
  stops:        StopRequest[];
  quality:      QualityRequest;
}
export interface StopRequest {
  stopTypeId: string;
  duration:   number;
}
export interface QualityRequest {
  deviation:        boolean;
  deviationDetails: string | null;
  hold:             boolean;
  holdDetails:      string | null;
}
export interface IncidentRequest {
  description: string;
}

export interface WorkReportResponse {
  id:         string;
  shiftId:    string;
  shiftName:  string;
  reportDate: string;
  createdAt:  string;
  updatedAt:  string;
  machines:   MachineEntryResponse[];
}
export interface MachineEntryResponse {
  id:          string;
  machineId:   string;
  machineName: string;
  status:      MachineStatus;
  products:    ProductEntryResponse[];
  incidents:   IncidentResponse[];
}
export interface ProductEntryResponse {
  id:          string;
  productName: string;
  batchNo:     string;
  outputUnits: number;
  stops:       StopResponse[];
  quality:     QualityResponse;
}
export interface StopResponse {
  id:           string;
  stopTypeId:   string;
  stopTypeName: string;
  duration:     number;
}
export interface QualityResponse {
  deviation:        boolean;
  deviationDetails: string | null;
  hold:             boolean;
  holdDetails:      string | null;
}
export interface IncidentResponse {
  id:          string;
  description: string;
}
