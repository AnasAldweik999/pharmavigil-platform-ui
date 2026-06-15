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
  type: 'text' | 'select' | 'date' | 'daterange' | 'searchable-select';
  placeholder?: string;
  options?: { label: string; value: string }[];
  fromKey?: string;
  toKey?: string;
  searchUrl?: string;
  searchParam?: string;
  labelFn?: (item: any) => string;
  valueFn?: (item: any) => string;
  secondaryLabelFn?: (item: any) => string;
}

export interface GridAction {
  key: string;
  label: string;
  btnClass?: string;
  icon?: 'view' | 'delete' | 'deactivate' | 'activate';
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
