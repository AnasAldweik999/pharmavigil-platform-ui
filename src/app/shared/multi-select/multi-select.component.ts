import {
  afterNextRender,
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Injector,
  Input,
  OnDestroy,
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
export class MultiSelectComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() placeholder = 'Select…';
  @Input() options: any[] = [];
  @Input() searchUrl: string | null = null;
  @Input() searchParam = 'name';
  @Input() labelFn: (item: any) => string = (item) => item.label ?? item.name ?? String(item);
  @Input() valueFn: (item: any) => string = (item) => item.value ?? item.id ?? String(item);
  @Input() secondaryLabelFn?: (item: any) => string;

  @Output() selectionChange = new EventEmitter<string[]>();

  @ViewChild('container') containerRef!: ElementRef<HTMLElement>;

  private readonly http     = inject(HttpClient);
  private readonly injector = inject(Injector);

  readonly isOpen      = signal(false);
  readonly searchText  = signal('');
  readonly selected    = signal<{ label: string; value: string }[]>([]);
  readonly dynamicOpts = signal<any[]>([]);
  readonly loading     = signal(false);

  readonly hiddenCount   = signal(0);
  readonly visibleItems  = computed(() =>
    this.selected().slice(0, this.selected().length - this.hiddenCount())
  );
  readonly hiddenItems   = computed(() =>
    this.selected().slice(this.selected().length - this.hiddenCount())
  );
  readonly hiddenTooltip = computed(() =>
    this.hiddenItems().map(i => i.label).join(', ')
  );

  private readonly search$ = new Subject<string>();
  private resizeObserver?: ResizeObserver;

  constructor() {
    effect(() => {
      this.selected();
      this.hiddenCount.set(0);
      afterNextRender(() => this.measureOverflow(), { injector: this.injector });
    });
  }

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

  ngAfterViewInit(): void {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.selected().length > 0) {
        this.hiddenCount.set(0);
        afterNextRender(() => this.measureOverflow(), { injector: this.injector });
      }
    });
    this.resizeObserver.observe(this.containerRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private measureOverflow(): void {
    const root = this.containerRef?.nativeElement;
    if (!root) return;

    const items = this.selected();
    if (items.length === 0) { this.hiddenCount.set(0); return; }

    const bubblesEl = root.querySelector<HTMLElement>('.pv-ms-bubbles');
    if (!bubblesEl) return;

    const bubbles = Array.from(
      bubblesEl.querySelectorAll<HTMLElement>('.pv-ms-bubble:not(.pv-ms-bubble--more)')
    );
    if (bubbles.length === 0) return;

    const containerWidth = bubblesEl.clientWidth;
    if (containerWidth === 0) return;

    const CHIP_W = 44; // "+N" chip width estimate including gap

    const lastBubble = bubbles[bubbles.length - 1];
    const lastRight  = lastBubble.offsetLeft + lastBubble.offsetWidth;
    const moreHidden = this.hiddenCount() > 0 || items.length > bubbles.length;
    const threshold  = moreHidden ? containerWidth - CHIP_W : containerWidth;

    if (lastRight <= threshold) return; // all visible items fit

    // Scan right-to-left to find cut point
    let hidden = 0;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const rightEdge  = bubbles[i].offsetLeft + bubbles[i].offsetWidth;
      const chipNeeded = i < bubbles.length - 1 || hidden > 0 || items.length > bubbles.length;
      const limit      = chipNeeded ? containerWidth - CHIP_W : containerWidth;
      if (rightEdge > limit) {
        hidden++;
      } else {
        break;
      }
    }

    const safe = Math.min(hidden, items.length - 1); // always show ≥ 1 bubble
    if (safe !== this.hiddenCount()) {
      this.hiddenCount.set(safe);
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
