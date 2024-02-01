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
import { Chart } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
Chart.register(zoomPlugin);
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
  chart: Chart | undefined;

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

    this.chart = new Chart(this.chartRef.nativeElement, {
      type: 'line',
      data: {
        labels: [], // This will be filled with the channel numbers
        datasets: [], // This will be filled with the signal data
      },
      options: {
        responsive: true,
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            title: {
              display: true,
              text: 'Time',
            },
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Amplitude',
            },
          },
        },
        plugins: {
          zoom: {
            pan: {
              enabled: true,
              mode: 'x',
              threshold: 10,
            },
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true,
              },
              mode: 'x',
            },
          },
        },
      },
    });

    this.updateChart();
  }

  updateChart(): void {
    this.isLoading = true;
    try {
      if (this.chart && this.responseData) {
        this.chart.data.labels = [];
        this.chart.data.datasets = [];

        const numberOfSignals = parseInt(this.responseData._header.nbSignals);
        let countDuration: Decimal = new Decimal(
          this.responseData._header.durationDataRecordsSec
        );

        for (let i = 0; i < numberOfSignals; i++) {
          if (i == 26 || i ==27) {
            const numberOfSamplesPerTimeDuration = parseInt(
              this.responseData._header.signalInfo[i].nbOfSamples
            );

            // console.log(
            //   `Number of hz in Data Record ${i} with duration of ${countDuration} seconds: ${numberOfSamplesPerTimeDuration}`
            // );

            let duration: Decimal = new Decimal(0);

            const color = this.getRandomColor();
            let newDataSet = {
              label: this.responseData._header.signalInfo[i].label,
              borderColor: color,
              backgroundColor: color,
              data: [] as { x: number; y: number }[],
            };

            // if (firstDataset){
            //   newDataSet.hidden = false;
            //   firstDataset = false;
            // }

            this.responseData._rawSignals[i].forEach((dataRecordDuration) => {
              if (duration.greaterThan(0) && duration.lessThan(10)) {
                Object.entries(dataRecordDuration).forEach(
                  ([hzIndex, value]) => {
                    const data: { x: number; y: number } = {
                      x: duration
                        .plus(
                          countDuration.times(
                            parseInt(hzIndex) / numberOfSamplesPerTimeDuration
                          )
                        )
                        .toNumber(),
                      y: value as number,
                    };
                    newDataSet.data.push(data);
                  }
                );
              }
              duration = duration.plus(countDuration);
            });
            this.chart.data.datasets.push(newDataSet);
            this.chart.update();
          }
        }

        this.chart.data.datasets.forEach((dataset, index) => {
          if (index == 0) {
            dataset.hidden = false;
          } else {
            dataset.hidden = true;
          }
        });

        // Update the chart
        this.chart.update();
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
