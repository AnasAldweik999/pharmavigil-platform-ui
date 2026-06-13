export interface GridColumn {
  key: string;
  label: string;
  sortable?: boolean;
  type?: 'text' | 'date' | 'badge';
  badgeClass?: (value: string) => string;
}

export interface GridFilterField {
  key: string;
  label: string;
  type: 'text' | 'select';
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export interface GridAction {
  key: string;
  label: string;
  btnClass?: string;
  condition?: (row: unknown) => boolean;
}

export interface GridSortState {
  field: string;
  direction: 'asc' | 'desc';
}

export interface GridState {
  filters: Record<string, string>;
  sort: GridSortState | null;
  page: number;
  size: number;
}
