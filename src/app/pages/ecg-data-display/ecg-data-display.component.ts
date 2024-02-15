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
import { Subject, interval } from 'rxjs';
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

  selectedSeriesIndex = 0;
  QTc = 0;

  brushStrokes: {
    startTime: number;
    endTime: number;
    R: number;
    S: number;
  }[][] = [];

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
        maxInterval: 1000,
        minInterval: 200,
        splitNumber: 200,
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
      grid: {
        left: '5%',
        right: '5%',
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
        brushLink: 'all',
        brushStyle: {
          borderWidth: 1,
          color: 'rgba(120,140,180,0.5)',
          borderColor: 'rgba(120,140,180,0.8)',
        },
      },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          filterMode: 'none',
        },
        {
          type: 'inside',
          xAxisIndex: 0,
          moveOnMouseMove: false,
          filterMode: 'none',
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
    this.chart?.on('legendselectchanged', this.handleLegendClick);
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

  findMvValueAt(signalIndex: number, timeIndex: number): any {
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
                lineStyle: {
                  color: 'rgba(242, 25, 25, 0.4)',
                  type: 'solid',
                },
                data:
                  this.brushStrokes &&
                  this.brushStrokes[i] &&
                  this.brushStrokes[i][0]
                    ? this.brushStrokes[i].map((interval) => {
                        return { xAxis: interval['R'] };
                        // return { xAxis: interval['S'] };   // figure out later
                      })
                    : [],
              },
              markArea: {
                label: {
                  position: 'insideTop',
                  color: '#000',
                },
                itemStyle: {
                  color: 'rgba(255, 173, 177, 0.4)',
                },
                data:
                  this.brushStrokes &&
                  this.brushStrokes[i] &&
                  this.brushStrokes[i][0]
                    ? this.brushStrokes[i].map((interval) => {
                        return [
                          {
                            name: 'QT Interval',
                            xAxis: interval['startTime'],
                          },
                          {
                            xAxis: interval['endTime'],
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

  handleLegendClick = (params: any) => {
    this.chart?.dispatchAction({
      type: 'brush',
      command: 'clear',
      areas: [],
    });

    for (let i = 0; i < parseInt(this.responseData._header.nbSignals); i++) {
      if (this.responseData._header.signalInfo[i].label === params.name) {
        this.selectedSeriesIndex = i;
        break;
      }
    }

    this.calculateQTc();
  };

  handleBrush = (params: any) => {
    let option = this.chart?.getOption();
    let startTimeIndex = 0;
    let endTimeIndex = 0;
    let R = 0;
    let S = 0;
    let rIndex = 0;

    params.areas.forEach((brush: any) => {
      let startTime = option!['series']![this.selectedSeriesIndex][
        'data'
      ].reduce((prev, curr) => {
        return Math.abs(curr[0] - brush.coordRange[0]) <
          Math.abs(prev[0] - brush.coordRange[0])
          ? curr
          : prev;
      })[0];

      let endTime = option!['series']![this.selectedSeriesIndex]['data'].reduce(
        (prev, curr) => {
          return Math.abs(curr[0] - brush.coordRange[1]) <
            Math.abs(prev[0] - brush.coordRange[1])
            ? curr
            : prev;
        }
      )[0];

      startTimeIndex = option!['series']![this.selectedSeriesIndex][
        'data'
      ].findIndex((sample) => sample[0] === startTime);
      endTimeIndex = option!['series']![this.selectedSeriesIndex][
        'data'
      ].findIndex((sample) => sample[0] === endTime);

      let checkPointValue =
        option!['series']![this.selectedSeriesIndex]['data'][startTimeIndex][1];
      for (let i = startTimeIndex; i <= endTimeIndex; i++) {
        if (
          option!['series']![this.selectedSeriesIndex]['data'][i][1] >
          checkPointValue
        ) {
          checkPointValue =
            option!['series']![this.selectedSeriesIndex]['data'][i][1];
          R = option!['series']![this.selectedSeriesIndex]['data'][i][0];
          rIndex = i;
        }
      }

      checkPointValue =
        option!['series']![this.selectedSeriesIndex]['data'][rIndex][1];

      while (
        option!['series']![this.selectedSeriesIndex]['data'][rIndex + 1][1] <
        checkPointValue
      ) {
        rIndex++;
        checkPointValue =
          option!['series']![this.selectedSeriesIndex]['data'][rIndex][1];
        S = option!['series']![this.selectedSeriesIndex]['data'][rIndex][0];
      }

      if (this.brushStrokes[this.selectedSeriesIndex]) {
        this.brushStrokes[this.selectedSeriesIndex].push({
          startTime,
          endTime,
          R,
          S,
        });
      } else {
        this.brushStrokes[this.selectedSeriesIndex] = [
          { startTime, endTime, R, S },
        ];
      }
    });
    this.calculateQTc();
    this.markBrushStrokes();
  };

  markBrushStrokes() {
    let option = this.chart?.getOption();

    option!['series']![this.selectedSeriesIndex]['markArea'] = {
      silent: true,
      label: {
        position: 'insideTop',
        color: '#000',
      },
      itemStyle: {
        color: 'rgba(255, 173, 177, 0.4)',
      },
    };

    option!['series']![this.selectedSeriesIndex]['markLine'] = {
      silent: true,
      symbol: 'none',
      lineStyle: {
        color: 'rgba(242, 25, 25, 0.4)',
        type: 'solid',
      },
    };

    this.brushStrokes[this.selectedSeriesIndex].forEach((brush) => {
      if (option!['series']![this.selectedSeriesIndex]['markArea']['data']) {
        option!['series']![this.selectedSeriesIndex]['markArea']['data'].push([
          {
            name: 'QT Interval',
            xAxis: brush['startTime'],
          },
          {
            xAxis: brush['endTime'],
          },
        ]);
      } else {
        option!['series']![this.selectedSeriesIndex]['markArea']['data'] = [
          [
            {
              name: 'QT Interval',
              xAxis: brush['startTime'],
            },
            {
              xAxis: brush['endTime'],
            },
          ],
        ];
      }

      if (option!['series']![this.selectedSeriesIndex]['markLine']['data']) {
        option!['series']![this.selectedSeriesIndex]['markLine']['data'].push(
          {
            xAxis: brush['R'],
          },
          { xAxis: brush['S'] }
        );
      } else {
        option!['series']![this.selectedSeriesIndex]['markLine']['data'] = [
          { xAxis: brush['R'] },
          { xAxis: brush['S'] },
        ];
      }
    });

    this.chart?.setOption(option!);
  }

  calculateQTc() {
    if (this.brushStrokes[this.selectedSeriesIndex]) {
      let RRIntervals = this.brushStrokes[this.selectedSeriesIndex].map(
        (interval) => {
          return interval.R;
        }
      );
      let RRIntervalsSum = 0;
      RRIntervals.forEach((interval) => {
        RRIntervalsSum += interval;
      });

      let RRIntervalsAverage = RRIntervalsSum / RRIntervals.length;

      let QTIntervals = this.brushStrokes[this.selectedSeriesIndex].map(
        (interval) => {
          return interval.endTime - interval.startTime;
        }
      );
      let QTIntervalsSum = 0;
      QTIntervals.forEach((interval) => {
        QTIntervalsSum += interval;
      });

      let QTIntervalsAverage = QTIntervalsSum / QTIntervals.length;

      let exactQTc = QTIntervalsAverage / Math.sqrt(RRIntervalsAverage);
      console.log('exactQTc:', exactQTc);
      this.QTc = Math.round(exactQTc * 100) / 100;
    } else {
      this.QTc = 0;
    }
  }
}
