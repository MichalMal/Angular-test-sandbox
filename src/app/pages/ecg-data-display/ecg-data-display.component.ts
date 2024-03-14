import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  Renderer2,
  RendererFactory2,
  ChangeDetectorRef,
} from '@angular/core';
import { EdfDataService } from 'src/app/services/edf-data.service';
import { Subject } from 'rxjs';
import * as moment from 'moment';
import { takeUntil } from 'rxjs/operators';
import * as echarts from 'echarts';
import { Decimal } from 'decimal.js';
import { Router } from '@angular/router';
import { NgbAccordion } from '@ng-bootstrap/ng-bootstrap';

import { chartTemplate } from 'src/app/constants/constants';
import { ToasterAlertService } from 'src/app/services/toaster-alert.service';

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
  // timeScale = { start: 430000, end: 480000 };
  timeScale = { start: 0, end: 10000 };
  currentRenderedChart = '';
  selectedSeriesIndex = 0;
  averageHr = 0;
  sampleNames: string[] = [];

  brushStrokes: {
    startTime: number;
    endTime: number;
    R: number;
    S: number;
    Qtc: number[];
  }[][] = [];

  private destroy$ = new Subject<void>();
  private chart: echarts.ECharts | undefined;
  private option: echarts.EChartsOption | null = null;
  private renderer: Renderer2;
  private resizeListener!: () => void;

  @ViewChild('chart') chartRef!: ElementRef;
  @ViewChild('accordion') accordion!: NgbAccordion;

  constructor(
    private rendererFactory: RendererFactory2,
    private edfDataService: EdfDataService,
    private router: Router,
    private cdRef: ChangeDetectorRef,
    private toasterService: ToasterAlertService
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  ngOnInit(): void {
    this.option = chartTemplate;
    this.option!.xAxis!['min'] = this.timeScale['start'];
    this.option!.xAxis!['min'] = this.timeScale['start'];

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
          if (this.responseData.data) {
            this.sampleNames = Object.keys(
              this.responseData.data.enhanced.samples
            ) as Array<string>;
          }
        }
      });
  }

  ngAfterViewInit(): void {
    if (this.responseData._header || this.responseData.data) {
      this.chart = echarts.init(this.chartRef.nativeElement);
      this.chart?.on('dataZoom', this.handleDataZoom);
      this.chart?.on('brushEnd', this.handleBrush);
      this.chart?.on('legendselectchanged', this.handleLegendClick);
      this.resizeListener = this.renderer.listen('window', 'resize', () => {
        this.chart?.resize();
      });

      this.updateChart();

      // if (this.chart) {
      //   this.chart.dispatchAction({
      //     type: 'takeGlobalCursor',
      //     key: 'brush',
      //     brushOption: {
      //       brushType: 'lineX',
      //     },
      //   });
      // }
    } else {
      this.router.navigate(['/']);
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
        let numberOfSignals = 0;
        let countDuration: Decimal = new Decimal(0);
        let date = new Date();

        if (this.responseData._header) {
          numberOfSignals = parseInt(this.responseData._header.nbSignals);
          countDuration = new Decimal(
            this.responseData._header.durationDataRecordsSec
          ).times(1000);
        } else if (this.responseData.data) {
          numberOfSignals = Object.keys(
            this.responseData.data.enhanced.samples
          ).length;
        }

        for (let i = 0; i < numberOfSignals; i++) {
          if (
            !this.responseData.data &&
            this.responseData._header.signalInfo[i].label === 'EDF Annotations'
          ) {
            continue;
          }

          let duration: Decimal = new Decimal(0);

          let newSeries: echarts.LineSeriesOption = {
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
              label: {
                show: false,
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
                color: 'rgba(150, 230, 150, 0.4)',
              },
              data:
                this.brushStrokes &&
                this.brushStrokes[i] &&
                this.brushStrokes[i][0]
                  ? this.brushStrokes[i].map((interval) => {
                      return [
                        {
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

          if (this.responseData._rawSignals) {
            newSeries.name = this.responseData._header.signalInfo[i].label;
            if (this.option?.legend && !Array.isArray(this.option.legend)) {
              this.option.legend.selected = this.option.legend.selected || {};
              this.option.legend.selected[
                `${this.responseData._header.signalInfo[i].label}`
              ] = i === 0;
            }

            const numberOfSamplesPerTimeDuration = parseInt(
              this.responseData._header.signalInfo[i].nbOfSamples
            );

            this.responseData._rawSignals[i].forEach((dataRecordDuration) => {
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
                      (value as number) / 1000,
                    ];
                    newSeries.data?.push(data);
                  }
                );
              }
              duration = duration.plus(countDuration);
            });

            date = new Date(this.responseData._header.recordingDate);
          } else if (this.responseData.data) {
            newSeries.name = Object.keys(
              this.responseData.data.enhanced.samples
            )[i];
            if (this.option?.legend && !Array.isArray(this.option.legend)) {
              this.option.legend.selected = this.option.legend.selected || {};
              this.option.legend.selected[
                `${Object.keys(this.responseData.data.enhanced.samples)[i]}`
              ] = i === 0;
            }

            this.responseData.data.enhanced.samples[
              Object.keys(this.responseData.data.enhanced.samples)[i]
            ].forEach((value, hrzIndex) => {
              const data: [number, number] = [
                ((hrzIndex / this.responseData.data.enhanced.frequency) *
                  1000) as number,
                value / 1000,
              ];
              // console.log('data', data);
              newSeries.data?.push(data);
            });

            date = new Date(this.responseData.recordedAt);
          }

          this.option!.tooltip!['formatter'] = (params: any) => {
            date.setMilliseconds(date.getMilliseconds() + params[0].value[0]);

            let formattedString =
              moment(date).format('dddd, Do MMMM YYYY') +
              '<br/><b style="font-size: 12px">' +
              moment(date).format('H:mm:ss') +
              ':' +
              date.getMilliseconds() +
              '</b><br/>' +
              params[0].value[0] +
              ' ms<br/>' +
              params[0].value[1] +
              ' mv';
            return formattedString;
          };

          if (Array.isArray(this.option?.series)) {
            this.option?.series.push(newSeries);
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

  async onAcordianShown(panelId: string) {
    await new Promise((f) => setTimeout(f, 100));
    this.currentRenderedChart = panelId;
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

  onTimeScaleChange(newTimeScale: { start: number; end: number }): void {
    // Update the chart with the new timescale
    console.log('onTimeScaleChange', newTimeScale);
    this.option!.series = [];
    this.timeScale = newTimeScale;

    (this.option!.xAxis!['min'] = this.timeScale['start']),
      (this.option!.xAxis!['max'] = this.timeScale['end']),
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
          Qtc: [],
        });
      } else {
        this.brushStrokes[this.selectedSeriesIndex] = [
          { startTime, endTime, R, S, Qtc: [] },
        ];
      }
    });

    this.brushStrokes[this.selectedSeriesIndex].sort((a, b) => {
      return a.startTime - b.startTime;
    });

    this.chart?.dispatchAction({
      type: 'brush',
      command: 'clear',
      areas: [],
    });

    this.calculateQTc();
    this.markBrushStrokes();
  };

  markBrushStrokes() {
    let option = this.chart?.getOption();

    option!['series']![this.selectedSeriesIndex]['markArea'] = {
      label: {
        position: 'insideTop',
        color: '#000',
      },
      itemStyle: {
        color: 'rgba(150, 230, 150, 0.4)',
      },
    };

    option!['series']![this.selectedSeriesIndex]['markLine'] = {
      silent: true,
      symbol: 'none',
      lineStyle: {
        color: 'rgba(242, 25, 25, 0.4)',
        type: 'solid',
      },
      label: {
        show: false,
      },
    };

    this.brushStrokes[this.selectedSeriesIndex].forEach((brush) => {
      if (option!['series']![this.selectedSeriesIndex]['markArea']['data']) {
        option!['series']![this.selectedSeriesIndex]['markArea']['data'].push([
          {
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
      this.brushStrokes[this.selectedSeriesIndex].sort((a, b) => {
        return a.startTime - b.startTime;
      });
      if (this.brushStrokes[this.selectedSeriesIndex][0]) {
        this.brushStrokes[this.selectedSeriesIndex][0]['Qtc'] = [];
      }

      this.brushStrokes[this.selectedSeriesIndex].forEach((series, i) => {
        let QTInterval = series.endTime - series.startTime;

        if (this.brushStrokes[this.selectedSeriesIndex][i + 1]) {
          let RRInterval =
            this.brushStrokes[this.selectedSeriesIndex][i + 1]['R'] - series.R;

          let Bqtc = (QTInterval / 1000 / Math.sqrt(RRInterval / 1000)) * 1000;
          this.brushStrokes[this.selectedSeriesIndex][i + 1]['Qtc'][1] =
            Math.round(Bqtc * 100) / 100;

          let Fqtc =
            (QTInterval / 1000 + 0.154 * (1 - RRInterval / 1000)) * 1000;
          this.brushStrokes[this.selectedSeriesIndex][i + 1]['Qtc'][2] =
            Math.round(Fqtc * 100) / 100;

          let Fdqtc = (QTInterval / 1000 / Math.cbrt(RRInterval / 1000)) * 1000;
          this.brushStrokes[this.selectedSeriesIndex][i + 1]['Qtc'][3] =
            Math.round(Fdqtc * 100) / 100;
        }
      });

      let RRIntervals = this.brushStrokes[this.selectedSeriesIndex].map(
        (interval) => {
          return interval.R;
        }
      );

      let RRIntervalSum = 0;
      RRIntervals.forEach((interval, i) => {
        if (i !== 0) {
          RRIntervalSum += interval - RRIntervals[i - 1];
        }
      });

      let hr = 60000 / (RRIntervalSum / (RRIntervals.length - 1));
      this.averageHr = Math.round(hr * 100) / 100;
    } else {
      this.averageHr = 0;
    }
  }

  onIntervalTimeChange(
    brush: {
      startTime: number;
      endTime: number;
      R: number;
      S: number;
      Qtc: number[];
    }[],
    accordionIndex: number
  ): void {
    this.cdRef.detectChanges();

    this.brushStrokes[this.selectedSeriesIndex] = brush;

    this.accordion.toggle(`ngb-accordion-item-1`);
    let option = this.chart?.getOption();

    option!['series']![this.selectedSeriesIndex]['markArea']['data'] = [];
    this.calculateQTc();
    this.markBrushStrokes();
    this.accordion.toggle(`ngb-accordion-item-${accordionIndex}`);
  }

  higlightQT(brushIndex: number) {
    let option = this.chart?.getOption();
    option!['series']![this.selectedSeriesIndex]['markArea']['data'][
      brushIndex
    ][0]['itemStyle'] = {
      color: 'rgba(150, 230, 150, 0.7)',
    };
    this.chart?.setOption(option!);
  }

  dimmQT(brushIndex: number) {
    let option = this.chart?.getOption();
    option!['series']![this.selectedSeriesIndex]['markArea']['data'][
      brushIndex
    ][0]['itemStyle'] = {
      color: 'rgba(150, 230, 150, 0.4)',
    };
    this.chart?.setOption(option!);
  }

  fetchQtData(brush: {
    startTime: number;
    endTime: number;
    R: number;
    S: number;
    Qtc: number[];
  }) {
    let option = this.chart?.getOption();

    let startTimeIndex = option!['series']![this.selectedSeriesIndex][
      'data'
    ].findIndex((sample) => sample[0] === brush.startTime);
    let endTimeIndex = option!['series']![this.selectedSeriesIndex][
      'data'
    ].findIndex((sample) => sample[0] === brush.endTime);

    let filteredData = option!['series']![this.selectedSeriesIndex][
      'data'
    ].slice(startTimeIndex, endTimeIndex + 1);

    return filteredData;
  }

  removeInterval(brushIndex: number) {
    let option = this.chart?.getOption();
    option!['series']![this.selectedSeriesIndex]['markArea']['data'].splice(
      brushIndex,
      1
    );
    option!['series']![this.selectedSeriesIndex]['markLine']['data'].splice(
      brushIndex * 2,
      1
    );
    option!['series']![this.selectedSeriesIndex]['markLine']['data'].splice(
      brushIndex * 2,
      1
    );
    this.brushStrokes[this.selectedSeriesIndex].splice(brushIndex, 1);
    this.chart?.setOption(option!);
    this.calculateQTc();
  }
}
