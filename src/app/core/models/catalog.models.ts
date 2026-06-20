export interface CatalogItem {
  id: string;
  name: string;
  createdAt: string;
}

export interface CreateCatalogRequest {
  name: string;
}

export interface ShiftItem {
  id: string;
  name: string;
  createdAt: string;
}

export interface CreateShiftRequest {
  name: string;
}
