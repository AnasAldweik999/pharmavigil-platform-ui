import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import flatpickr from 'flatpickr';
import { Instance } from 'flatpickr/dist/types/instance';

@Component({
  selector: 'app-date-range-picker',
  templateUrl: './date-range-picker.component.html',
})
export class DateRangePickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('rangeInput') rangeInputRef!: ElementRef<HTMLInputElement>;

  @Input() fromDate = '';
  @Input() toDate   = '';
  @Output() rangeChange = new EventEmitter<{ from: string; to: string }>();

  private readonly platformId = inject(PLATFORM_ID);
  private fp: Instance | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const defaultDate = [this.fromDate, this.toDate].filter(Boolean) as string[];
    this.fp = flatpickr(this.rangeInputRef.nativeElement, {
      mode: 'range',
      dateFormat: 'Y-m-d',
      defaultDate: defaultDate.length ? defaultDate : undefined,
      onChange: (dates: Date[]) => {
        const from = dates[0] ? dates[0].toLocaleDateString('en-CA') : '';
        const to   = dates[1] ? dates[1].toLocaleDateString('en-CA') : '';
        this.rangeChange.emit({ from, to });
      },
    }) as Instance;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.fp) return;
    if (changes['fromDate'] || changes['toDate']) {
      const dates = [this.fromDate, this.toDate].filter(Boolean) as string[];
      if (dates.length) {
        this.fp.setDate(dates, false);
      } else {
        this.fp.clear(false);
      }
    }
  }

  ngOnDestroy(): void {
    this.fp?.destroy();
  }
}
