import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostListener,
  inject,
  input,
  Input,
  OnDestroy,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Page } from '../../core/models/user.models';

@Component({
  selector: 'app-searchable-dropdown',
  templateUrl: './searchable-dropdown.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableDropdownComponent),
      multi: true,
    },
  ],
})
export class SearchableDropdownComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {
  private readonly http  = inject(HttpClient);
  private readonly elRef = inject(ElementRef);

  readonly options = input<{ label: string; value: string }[]>([]);
  @Input() searchUrl: string | null = null;
  @Input() searchParam: string = 'name';
  @Input() labelFn: (item: any) => string = (i) => i.label ?? i.name ?? String(i);
  @Input() valueFn:  (item: any) => string = (i) => i.value ?? i.id  ?? String(i);
  @Input() secondaryLabelFn?: (item: any) => string;
  @Input() placeholder: string = 'Search...';
  @Input() invalid: boolean = false;
  @Input() small: boolean = true;

  @Input() set value(v: string | undefined) { if (v !== undefined) this.writeValue(v); }
  @Output() valueChange = new EventEmitter<string>();
  @Output() labelChange = new EventEmitter<string>();

  @ViewChild('trigger') triggerEl?:   ElementRef<HTMLElement>;
  @ViewChild('panel')   panelEl?:     ElementRef<HTMLElement>;
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  readonly _selectedLabel = signal('');
  readonly _selectedValue = signal('');
  readonly _searchText    = signal('');
  readonly _panelOpen     = signal(false);
  readonly _loading       = signal(false);
  readonly _asyncItems    = signal<any[]>([]);
  readonly _disabled      = signal(false);
  readonly _panelTop      = signal(0);
  readonly _panelLeft     = signal(0);
  readonly _panelWidth    = signal(0);
  readonly _panelVisible  = signal(false);

  readonly _filteredItems = computed(() => {
    if (this.searchUrl) return this._asyncItems();
    const opts = this.options();
    const text = this._searchText().toLowerCase();
    if (!text) return opts;
    return opts.filter(o => this.labelFn(o).toLowerCase().includes(text));
  });

  private readonly _search$ = new Subject<string>();
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  // Reposition on scroll/resize so the panel tracks the trigger
  private readonly _onScrollOrResize = (): void => this.positionPanel();

  constructor() {
    this._search$.pipe(
      debounceTime(300),
      takeUntilDestroyed(),
    ).subscribe(q => this.fetch(q));
  }

  // Move the panel to <body> so position:fixed is relative to the viewport,
  // not to a transformed ancestor in the layout tree.
  ngAfterViewInit(): void {
    if (this.panelEl?.nativeElement) {
      document.body.appendChild(this.panelEl.nativeElement);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this._onScrollOrResize, { capture: true });
    window.removeEventListener('resize', this._onScrollOrResize);
    const el = this.panelEl?.nativeElement;
    if (el && el.parentNode === document.body) {
      document.body.removeChild(el);
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    const target = event.target as Node;
    // Panel lives in <body> outside this component's host — check both
    if (
      !this.elRef.nativeElement.contains(target) &&
      !this.panelEl?.nativeElement.contains(target)
    ) {
      this._closePanel();
    }
  }

  togglePanel(): void {
    if (this._disabled()) return;
    if (this._panelOpen()) {
      this._closePanel();
      return;
    }
    this._searchText.set('');
    this._panelVisible.set(false);
    this._panelOpen.set(true);
    if (this.searchUrl) this.fetch('');
    setTimeout(() => {
      this.positionPanel();
      this._panelVisible.set(true);
      // capture:true catches scroll on any container, not just window
      window.addEventListener('scroll', this._onScrollOrResize, { capture: true, passive: true });
      window.addEventListener('resize', this._onScrollOrResize, { passive: true });
      this.searchInput?.nativeElement.focus();
    }, 0);
  }

  private _closePanel(): void {
    this._panelOpen.set(false);
    this._panelVisible.set(false);
    window.removeEventListener('scroll', this._onScrollOrResize, { capture: true });
    window.removeEventListener('resize', this._onScrollOrResize);
  }

  private positionPanel(): void {
    const rect = this.triggerEl?.nativeElement.getBoundingClientRect();
    if (!rect) return;
    this._panelTop.set(rect.bottom + 1);
    this._panelLeft.set(rect.left);
    this._panelWidth.set(rect.width);
  }

  onSearch(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this._searchText.set(text);
    if (this.searchUrl) this._search$.next(text);
  }

  select(item: any): void {
    const value = this.valueFn(item);
    const label = this.labelFn(item);
    this._selectedValue.set(value);
    this._selectedLabel.set(label);
    this._closePanel();
    this.onChange(value);
    this.onTouched();
    this.valueChange.emit(value);
    this.labelChange.emit(label);
  }

  clear(): void {
    this._selectedValue.set('');
    this._selectedLabel.set('');
    this._closePanel();
    this.onChange('');
    this.onTouched();
    this.valueChange.emit('');
    this.labelChange.emit('');
  }

  writeValue(v: string): void {
    this._selectedValue.set(v ?? '');
    if (!v) this._selectedLabel.set('');
  }

  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this._disabled.set(disabled); }

  private fetch(q: string): void {
    if (!this.searchUrl) return;
    this._loading.set(true);
    const url = `${this.searchUrl}?${this.searchParam}=${encodeURIComponent(q)}&size=20`;
    this.http.get<Page<any> | any[]>(url).subscribe({
      next:  (res) => {
        const items = Array.isArray(res) ? res : (res.content ?? []);
        this._asyncItems.set(items);
        this._loading.set(false);
      },
      error: () => { this._loading.set(false); },
    });
  }
}
