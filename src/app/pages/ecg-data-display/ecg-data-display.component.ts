import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { EdfDataService } from 'src/app/services/edf-data.service';
import { Subscription } from 'rxjs';
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
  private subscriptions: Subscription[] = [];
  isLoading: boolean = true;
  chart: echarts.ECharts | undefined;

  @ViewChild('chart') chartRef!: ElementRef;

  constructor(private edfDataService: EdfDataService, private router: Router) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.edfDataService.dataRecords$.subscribe((response) => {
        console.log('Response from EdfDataService:', response);
        if (response) {
          this.responseData = response;
          if (this.chart) {
            this.updateChart();
          }
          this.isLoading = false;
        }
      })
    );
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  ngAfterViewInit(): void {
    if (!this.responseData._header) {
      this.router.navigate(['/']);
    }

    this.chart = echarts.init(this.chartRef.nativeElement);

    this.updateChart();
  }

  updateChart(): void {
    this.isLoading = true;
    try {
      if (this.chart && this.responseData) {
        const option: echarts.EChartsOption = {
          xAxis: {
            type: 'value',
            axisLabel: {
              formatter: '{value}s',
            },
            axisPointer: {
              type: 'shadow', // or 'line'
            },
          },
          yAxis: {
            type: 'value',
            name: 'Amplitude(microvolts)',
          },
          legend: {
            show: true,
            selected: {},
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
              sampling: 'max',
              symbol: 'none',
              data: [] as [number, number][],
              step: 'middle',
              itemStyle: {
                color: color,
              },
            };

            if (option.legend && !Array.isArray(option.legend)) {
              option.legend.selected = option.legend.selected || {};
              option.legend.selected[
                `${this.responseData._header.signalInfo[i].label}`
              ] = i === 0;
            }

            this.responseData._rawSignals[i].forEach((dataRecordDuration) => {
              if (duration.greaterThan(0) && duration.lessThan(20)) {
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
            });

            if (Array.isArray(option.series)) {
              option.series.push(newSeries);
            }
          }
        }

        this.chart.setOption(option);

        // Add dataZoom event listener
        this.chart.on('dataZoom', (params: any) => {
          var startValue = params.batch[0].start;
          var endValue = params.batch[0].end;
          var zoomLevel = endValue - startValue;
          
          var sampling;
          if (zoomLevel > 80) {
            sampling = 'min';
          } else if (zoomLevel > 60) {
            sampling = 'average';
          } else if (zoomLevel > 20){
            sampling = 'max';
          } else {
            sampling = 'original';
          }

          if (Array.isArray(option.series)) {
            option.series.forEach(function (series) {
              series["sampling"] = sampling;
            });
          } else if (option.series) {
            option.series["sampling"] = sampling;
          }

          this.chart?.setOption(option);
        });
      }
    } catch (error) {
      console.error(error);
    }
    this.isLoading = false;
  }

  private getRandomColor(): string {
    // Function to generate a random hex color
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
  }
}
