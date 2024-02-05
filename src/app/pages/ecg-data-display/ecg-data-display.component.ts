import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  Renderer2,
  RendererFactory2,
} from '@angular/core';
import { EdfDataService } from 'src/app/services/edf-data.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as echarts from 'echarts';
import { Decimal } from 'decimal.js';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ecg-data-display',
  templateUrl: './ecg-data-display.component.html',
  styleUrls: ['./ecg-data-display.component.scss'],
})
export class EcgDataDisplayComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  responseData: any = {};
  isLoading: boolean = true;

  private destroy$ = new Subject<void>();
  private chart: echarts.ECharts | undefined;
  private option: echarts.EChartsOption | null = null;
  private renderer: Renderer2;
  private resizeListener!: () => void;

  timeScale = { start: 0, end: 3 };

  @ViewChild('chart') chartRef!: ElementRef;

  constructor(
    private rendererFactory: RendererFactory2,
    private edfDataService: EdfDataService,
    private router: Router
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  ngOnInit(): void {
    this.option = {
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value}s',
        },
        axisPointer: {
          type: 'line', // or 'line'
        },
      },
      yAxis: {
        type: 'value',
        name: 'Amplitude(microvolts)',
      },
      legend: {
        show: true,
        // selectedMode: 'single',
      },
      tooltip: {
        trigger: 'axis',
        position: function (pt) {
          return [pt[0], '10%'];
        },
      },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          filterMode: 'empty',
        },
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'empty',
        },
      ],
      series: [] as any[],
    };

    this.edfDataService.dataRecords$
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        console.log('Response from EdfDataService:', response);
        if (response) {
          this.responseData = response;
          if (this.chart) {
            this.updateChart();
          }
          this.isLoading = false;
        }
      });
  }

  ngAfterViewInit(): void {
    if (!this.responseData._header) {
      this.router.navigate(['/']);
    }

    this.chart = echarts.init(this.chartRef.nativeElement);
    this.chart?.on('dataZoom', this.handleDataZoom);
    this.resizeListener = this.renderer.listen('window', 'resize', () => {
      this.chart?.resize();
    });

    this.updateChart();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.resizeListener) {
      this.resizeListener();
    }
  }
  updateChart(): void {
    this.isLoading = true;
    try {
      if (this.chart && this.responseData) {
        const numberOfSignals = parseInt(this.responseData._header.nbSignals);
        let countDuration: Decimal = new Decimal(
          this.responseData._header.durationDataRecordsSec
        );

        for (let i = 0; i < numberOfSignals; i++) {
          if (
            this.responseData._header.signalInfo[i].label !== 'EDF Annotations'
          ) {
            const numberOfSamplesPerTimeDuration = parseInt(
              this.responseData._header.signalInfo[i].nbOfSamples
            );

            let duration: Decimal = new Decimal(0);

            const color = this.getRandomColor();
            let newSeries: echarts.LineSeriesOption = {
              name: this.responseData._header.signalInfo[i].label,
              type: 'line',
              sampling: 'lttb',
              symbol: 'none',
              data: [] as [number, number][],
              step: 'middle',
              itemStyle: {
                color: color,
              },
            };

            if (this.option?.legend && !Array.isArray(this.option.legend)) {
              this.option.legend.selected = this.option.legend.selected || {};
              this.option.legend.selected[
                `${this.responseData._header.signalInfo[i].label}`
              ] = i === 0;
            }

            this.responseData._physicalSignals[i].forEach(
              (dataRecordDuration) => {
                if (
                  duration.greaterThanOrEqualTo(this.timeScale.start) &&
                  duration.lessThanOrEqualTo(this.timeScale.end)
                ) {
                  Object.entries(dataRecordDuration).forEach(
                    ([hzIndex, value]) => {
                      const data: [number, number] = [
                        duration
                          .plus(
                            countDuration.times(
                              parseInt(hzIndex) / numberOfSamplesPerTimeDuration
                            )
                          )
                          .toNumber(),
                        value as number,
                      ];
                      newSeries.data?.push(data);
                    }
                  );
                }
                duration = duration.plus(countDuration);
              }
            );

            if (Array.isArray(this.option?.series)) {
              this.option?.series.push(newSeries);
            }
          }
        }

        // now officially trying to mark the qt intervals

        this.markIntervals();

        if (this.option) {
          this.chart?.setOption(this.option);
        }
      }
    } catch (error) {
      console.error(error);
    }
    this.isLoading = false;
  }

  handleDataZoom = (params: any) => {
    const { start, end } = this.getZoomValues(params);
    const zoomLevel = end - start;
    const sampling = this.getSamplingStrategy(zoomLevel);

    if (Array.isArray(this.option?.series)) {
      this.option?.series.forEach((series) => {
        series['sampling'] = sampling;
      });
    } else if (this.option?.series) {
      this.option.series['sampling'] = sampling;
    }
    if (this.option?.legend) {
      let instanceOption: any = this.chart?.getOption()['legend'];
      this.option.legend['selected'] = instanceOption[0].selected;
      this.chart?.setOption(this.option);
    }
  };

  getZoomValues(params: any): { start: number; end: number } {
    let startValue: number;
    let endValue: number;

    try {
      startValue = params.batch[0].start;
      endValue = params.batch[0].end;
    } catch {
      startValue = params.start;
      endValue = params.end;
    }

    return { start: startValue, end: endValue };
  }

  getSamplingStrategy(zoomLevel: number): string {
    return zoomLevel > 20 ? 'lttb' : 'original';
  }

  private getRandomColor(): string {
    // Function to generate a random hex color
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
  }

  onTimeScaleChange(newTimeScale: { start: number; end: number }): void {
    // Update the chart with the new timescale

    this.option!.series = [];
    this.timeScale = newTimeScale;
    this.updateChart();
  }

  private markIntervals() {
    let seriesStrip = this.option?.series![0]!.data;
    let checkPeriod = new Decimal(0);
    let checkValue = new Decimal(0);
    seriesStrip.forEach((dataPoint: [number, number], index: number) => {
      if (checkPeriod.greaterThan(dataPoint[0])) {
        checkPeriod = checkPeriod.plus(0.5);

        if (
          checkValue.minus(dataPoint[1]).greaterThan(100) ||
          checkValue.minus(dataPoint[1]).lessThan(-100)
        ) {

          
        }

        checkValue = new Decimal(dataPoint[1]);
      }
    });
  }
}
