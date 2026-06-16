import {
  Component,
  computed,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnInit,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';

@Component({
  selector: 'app-multi-select',
  imports: [FormsModule],
  templateUrl: './multi-select.component.html',
})
export class MultiSelectComponent implements OnInit {
  @Input() placeholder = 'Select…';
  @Input() options: any[] = [];
  @Input() searchUrl: string | null = null;
  @Input() searchParam = 'name';
  @Input() labelFn: (item: any) => string = (item) => item.label ?? item.name ?? String(item);
  @Input() valueFn: (item: any) => string = (item) => item.value ?? item.id ?? String(item);
  @Input() secondaryLabelFn?: (item: any) => string;

  @Output() selectionChange = new EventEmitter<string[]>();

  @ViewChild('container') containerRef!: ElementRef<HTMLElement>;

  private readonly http = inject(HttpClient);

  readonly isOpen       = signal(false);
  readonly searchText   = signal('');
  readonly selected     = signal<{ label: string; value: string }[]>([]);
  readonly dynamicOpts  = signal<any[]>([]);
  readonly loading      = signal(false);

  private readonly search$ = new Subject<string>();

  readonly displayOptions = computed(() => {
    if (this.searchUrl) return this.dynamicOpts();
    const q = this.searchText().toLowerCase();
    return q
      ? this.options.filter(o => this.labelFn(o).toLowerCase().includes(q))
      : this.options;
  });

  ngOnInit(): void {
    if (this.searchUrl) {
      this.search$.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(q => {
          this.loading.set(true);
          const url = `${this.searchUrl}?${this.searchParam}=${encodeURIComponent(q)}&size=20`;
          return this.http.get<any>(url);
        }),
      ).subscribe({
        next: (res) => {
          const items = Array.isArray(res) ? res : (res.content ?? []);
          this.dynamicOpts.set(items);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
      this.search$.next('');
    }
  }

  toggle(event: MouseEvent): void {
    this.isOpen.update(v => !v);
  }

  toggleOption(item: any): void {
    const value = this.valueFn(item);
    const label = this.labelFn(item);
    const current = this.selected();
    const idx = current.findIndex(s => s.value === value);
    if (idx >= 0) {
      this.selected.set(current.filter((_, i) => i !== idx));
    } else {
      this.selected.set([...current, { label, value }]);
    }
    this.selectionChange.emit(this.selected().map(s => s.value));
  }

  remove(value: string, event: MouseEvent): void {
    event.stopPropagation();
    this.selected.update(s => s.filter(x => x.value !== value));
    this.selectionChange.emit(this.selected().map(s => s.value));
  }

  clearAll(event: MouseEvent): void {
    event.stopPropagation();
    this.selected.set([]);
    this.selectionChange.emit([]);
  }

  isSelected(value: string): boolean {
    return this.selected().some(s => s.value === value);
  }

  onSearchInput(text: string): void {
    this.searchText.set(text);
    if (this.searchUrl) this.search$.next(text);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.containerRef && !this.containerRef.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }
}
