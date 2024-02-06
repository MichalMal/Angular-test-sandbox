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
  timeScale = { start: 0, end: 3 };
  signalSelection = '';
  signalSelectionIndex = 0;
  RRIntervalsPerSample: [[{ index: number; value: Decimal }]] = [
    [{ index: 0, value: new Decimal(0) }],
  ];

  private destroy$ = new Subject<void>();
  private chart: echarts.ECharts | undefined;
  private option: echarts.EChartsOption | null = null;
  private renderer: Renderer2;
  private resizeListener!: () => void;

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
          moveOnMouseMove: false,
        },
      ],
      series: [] as any[],
    };

    this.edfDataService.dataRecords$
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        // console.log('Response from EdfDataService:', response);
        if (response) {
          this.responseData = response;
          this.signalSelection = this.responseData._header.signalInfo[0].label;
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
    this.chart?.on('legendselected', this.handleLegendSelect);
    this.chart?.getZr().on('click', this.handleGraphClick);
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
              markLine: {
                symbol: 'none',
                // label: {
                //   formatter: function(params) {
                //     console.log('params: ', params);
                //     return params.data['xAxis'];
                //   },
                // },
                data:
                  this.RRIntervalsPerSample &&
                  this.RRIntervalsPerSample[i] &&
                  this.RRIntervalsPerSample[i][0].index !== 0
                    ? this.RRIntervalsPerSample[i].map((time) => {
                        return { xAxis: time['value'].toNumber() };
                      })
                    : [],
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
    let option = this.chart?.getOption();
    (option!['series'] as []).forEach((_, i) => {
      option!['series']![i]['sampling'] = sampling;
    });
    this.chart?.setOption(option!);
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

  handleGraphClick = (params: any) => {
    let pointInPixel = [params.offsetX, params.offsetY];
    let option = this.chart?.getOption();
    if (this.chart?.containPixel('grid', pointInPixel)) {
      let pointInData = this.chart?.convertFromPixel('series', pointInPixel);
      let seriesCount = option!['series'] as [];
      seriesCount!.forEach((series: any, i: number) => {
        if (option!['legend']![0]['selected'][series.name]) {
          let closestSample = series['data'].reduce((prev, curr) => {
            return Math.abs(curr[0] - pointInData[0]) <
              Math.abs(prev[0] - pointInData[0])
              ? curr
              : prev;
          });
          let closestSampleIndex = series['data'].findIndex(
            (sample) =>
              sample[0] === closestSample[0] && sample[1] === closestSample[1]
          );
          let highestYValue = series['data'][closestSampleIndex][1];
          let highestYValueIndex = closestSampleIndex;
          while (series['data'][highestYValueIndex + 1][1] > highestYValue) {
            highestYValueIndex++;
            highestYValue = series['data'][highestYValueIndex][1];
          }
          while (series['data'][highestYValueIndex - 1][1] > highestYValue) {
            highestYValueIndex--;
            highestYValue = series['data'][highestYValueIndex][1];
          }

          let peakSample = series['data'][highestYValueIndex];
          console.log(
            'highestYValue: ' +
              highestYValue +
              ' at index: ' +
              highestYValueIndex
          );
          console.log('peakSample: ', peakSample);

          if (
            !this.RRIntervalsPerSample![i].some((obj) =>
              Object.values(obj).some(
                (item) =>
                  item instanceof Decimal &&
                  item.equals(new Decimal(peakSample[0]))
              )
            )
          ) {
            if (
              this.RRIntervalsPerSample![i] === undefined ||
              this.RRIntervalsPerSample![i][0].index === 0
            ) {
              this.RRIntervalsPerSample![i] = [
                {
                  index: highestYValueIndex,
                  value: new Decimal(peakSample[0]),
                },
              ];
            } else {
              this.RRIntervalsPerSample![i].push({
                index: highestYValueIndex,
                value: new Decimal(peakSample[0]),
              });
            }

            this.RRIntervalsPerSample![i].sort((a, b) => a.index - b.index);

            let data = [{ xAxis: Decimal }];
            if (option!['series']![i]['markLine']['data']) {
              option!['series']![i]['markLine']['data'].push({
                xAxis: peakSample[0],
              });
              data = option!['series']![i]['markLine']['data'];
            } else {
              data = [{ xAxis: peakSample[0] }];
            }

            option!['series']![i]['markLine'] = {
              data: data,
            };

            console.log(this.RRIntervalsPerSample![i]);
            this.chart?.setOption(option!);
          }
        }
      });
    }
  };

  handleLegendSelect = (params: any) => {
    console.log('params: ', params);
  };

  findValueAt(signalIndex: number, timeIndex: number): any {
    let value = 0;
    let series = this.option?.series;
    if (series) {
      let data = series[signalIndex].data;
      if (data) {
        let found = data[timeIndex];
        if (found) {
          return found[1];
        }
      }
    }
    return 'not found';
  }
}
