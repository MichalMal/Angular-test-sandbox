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
  timeScale = { start: 0, end: 4000 };
  
  RRIntervalsPerSample: [
    [{ mvolts: number; time: Decimal; sampleIndex: number }]
  ] = [[{ mvolts: 0, time: new Decimal(0), sampleIndex: 0 }]];
  QTIntervalsPerSignal: Decimal[][][] = [];

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
        axisLabel: {
          formatter: '{value}ms',
        },
        maxInterval: 200,
        minInterval: 200,
        splitLine: {
          show: true,
          lineStyle: {
            color: '#999',
          },
        },
        minorTick: {
          show: true,
          splitNumber: 5,
        },
        minorSplitLine: {
          show: true,
          lineStyle: {
            color: '#ddd',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: 'Amplitude(microvolts)',
      },
      legend: {
        show: true,
        selectedMode: 'single',
      },
      tooltip: {
        trigger: 'axis',
        position: function (pt) {
          return [pt[0], '10%'];
        },
      },
      brush: {
        toolbox: ['clear'],
        xAxisIndex: 'all',
        yAxisIndex: 'none',
        transformable: false,
        brushStyle: {
          borderWidth: 1,
          color: 'rgba(120,140,180,0.5)',
          borderColor: 'rgba(120,140,180,0.8)'
        },
      },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
        },
        {
          type: 'inside',
          xAxisIndex: 0,
          moveOnMouseMove: false,
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
    this.chart?.on('brushEnd', this.handleBrush);
    // this.chart?.getZr().on('click', this.handleGraphClick);
    this.resizeListener = this.renderer.listen('window', 'resize', () => {
      this.chart?.resize();
    });

    this.updateChart();



        if (this.chart) {
          this.chart.dispatchAction({
            type: 'takeGlobalCursor',
            key: 'brush',
            brushOption: {
              brushType: 'lineX',
              brushMode: 'multiple',
            },
          });
        }


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
        ).times(1000);

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
                color: '#2e2491',
              },
              markLine: {
                silent: true,
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
                  !this.RRIntervalsPerSample[i][0].time.equals(new Decimal(0))
                    ? this.RRIntervalsPerSample[i].map((interval) => {
                        return { xAxis: interval['time'].toNumber() };
                      })
                    : [],
              },
              markArea: {
                silent: true,
                label: {
                  position: 'insideTop',
                  color: '#000',
                },
                itemStyle: {
                  color: 'rgba(255, 173, 177, 0.4)',
                },
                data:
                  this.QTIntervalsPerSignal &&
                  this.QTIntervalsPerSignal[i] &&
                  this.QTIntervalsPerSignal[i][0]
                    ? this.QTIntervalsPerSignal[i].map((interval) => {
                        return [
                          {
                            name:
                              'QT Interval: ' + interval[2].toNumber() + 's',
                            xAxis: interval[0].toNumber(),
                          },
                          {
                            xAxis: interval[1].toNumber(),
                          },
                        ];
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
    return zoomLevel > 50 ? 'lttb' : 'original';
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

  handleBrush = (params: any) => {
    params.areas.forEach(brush => {
      // console.log('brush', brush.coordRange);
      let time = brush.coordRange[1] - brush.coordRange[0];
      console.log('time: ', time);
    });
  };

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

          if (!this.RRIntervalsPerSample![i]) {
            this.RRIntervalsPerSample![i] = [
              {
                mvolts: 0,
                time: new Decimal(0),
                sampleIndex: 0,
              },
            ];
          }

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
              this.RRIntervalsPerSample![i][0].time.equals(new Decimal(0))
            ) {
              this.RRIntervalsPerSample![i] = [
                {
                  mvolts: highestYValueIndex,
                  time: new Decimal(peakSample[0]),
                  sampleIndex: highestYValueIndex,
                },
              ];
            } else {
              this.RRIntervalsPerSample![i].push({
                mvolts: highestYValueIndex,
                time: new Decimal(peakSample[0]),
                sampleIndex: highestYValueIndex,
              });
            }

            this.RRIntervalsPerSample![i].sort(
              (a, b) => a.time.toNumber() - b.time.toNumber()
            );

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
              silent: true,
              symbol: 'none',
              data: data,
            };

            this.chart?.setOption(option!);
          }
        }
      });
    }
  };

  findValueAt(signalIndex: number, timeIndex: number): any {
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

  calculateQTIntervals(signalIndex: number): void {
    let option = this.chart?.getOption();
    let QWaveTimes: Decimal[] = this.getQWaveTimes(signalIndex);
    let TWaveTimes: Decimal[] = this.getTWaveTimes(signalIndex);
    let data = [[{ name: '', xAxis: 0 }, { xAxis: 0 }]];

    if (QWaveTimes.length !== TWaveTimes.length) {
      console.error('Mismatch in Q and T wave counts');
    }

    for (let i = 0; i < QWaveTimes.length; i++) {
      let Q = new Decimal(QWaveTimes[i]);
      let T = new Decimal(TWaveTimes[i]);

      let QTInterval = T.minus(Q);

      if (!this.QTIntervalsPerSignal![signalIndex]) {
        this.QTIntervalsPerSignal![signalIndex] = [];
      }
      if (!this.QTIntervalsPerSignal![signalIndex][i]) {
        this.QTIntervalsPerSignal![signalIndex][i] = [];
      }
      this.QTIntervalsPerSignal![signalIndex][i][0] = Q;
      this.QTIntervalsPerSignal![signalIndex][i][1] = T;
      this.QTIntervalsPerSignal![signalIndex][i][2] = QTInterval;

      if (option!['series']![signalIndex]['markArea']['data']) {
        option!['series']![signalIndex]['markArea']['data'].push([
          {
            name: 'QT Interval',
            xAxis: this.QTIntervalsPerSignal![signalIndex][i][0].toNumber(),
          },
          {
            xAxis: this.QTIntervalsPerSignal![signalIndex][i][1].toNumber(),
          },
        ]);
        data = option!['series']![signalIndex]['markArea']['data'];
      } else {
        data = [
          [
            {
              name: 'QT Interval',
              xAxis: this.QTIntervalsPerSignal![signalIndex][i][0].toNumber(),
            },
            {
              xAxis: this.QTIntervalsPerSignal![signalIndex][i][1].toNumber(),
            },
          ],
        ];
      }
    }
    option!['series']![signalIndex]['markArea'] = {
      silent: true,
      label: {
        position: 'insideTop',
        color: '#000',
      },
      itemStyle: {
        color: 'rgba(255, 173, 177, 0.4)',
      },
      data: data,
    };

    this.chart?.setOption(option!);
  }

  getQWaveTimes(signalIndex: number): Decimal[] {
    let QWaveTimes: Decimal[] = [];
    let signalData = this.chart?.getOption()!['series']![signalIndex].data;

    this.RRIntervalsPerSample[signalIndex].forEach((interval, i) => {
      let lowestYValue = signalData[interval.sampleIndex][1];
      let lowestYValueIndex = interval.sampleIndex;

      while (signalData[lowestYValueIndex - 1][1] < lowestYValue) {
        lowestYValueIndex--;
        lowestYValue = signalData[lowestYValueIndex][1];
      }

      QWaveTimes.push(signalData[lowestYValueIndex][0]);
    });
    return QWaveTimes;
  }

  getTWaveTimes(signalIndex: number): Decimal[] {
    let TWaveTimes: Decimal[] = [];
    let signalData = this.chart?.getOption()!['series']![signalIndex].data;
    this.RRIntervalsPerSample[signalIndex].forEach((interval, i) => {});

    this.RRIntervalsPerSample[signalIndex].forEach((interval, i) => {
      let lowestYValue = signalData[interval.sampleIndex][1];
      let lowestYValueIndex = interval.sampleIndex;

      while (signalData[lowestYValueIndex + 1][1] < lowestYValue) {
        lowestYValueIndex++;
        lowestYValue = signalData[lowestYValueIndex][1];
      }

      while (signalData[lowestYValueIndex + 1][1] > lowestYValue) {
        lowestYValueIndex++;
        lowestYValue = signalData[lowestYValueIndex][1];
      }

      while (signalData[lowestYValueIndex + 1][1] < lowestYValue) {
        lowestYValueIndex++;
        lowestYValue = signalData[lowestYValueIndex][1];
      }

      TWaveTimes.push(signalData[lowestYValueIndex][0]);
    });

    return TWaveTimes;
  }
}
