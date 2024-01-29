import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { EdfHeader, EdfSignalHeader, EdfDataRecord } from 'src/app/models/edf-file.model';
import { EdfDataService } from 'src/app/services/edf-data.service';
import { Subscription } from 'rxjs';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-ecg-data-display',
  templateUrl: './ecg-data-display.component.html',
  styleUrls: ['./ecg-data-display.component.scss'],
})
export class EcgDataDisplayComponent implements OnInit, OnDestroy, AfterViewInit {
  header: EdfHeader | null = null;
  signalHeaders: EdfSignalHeader[] | null = null;
  dataRecords: EdfDataRecord[] | null = null;
  private subscriptions: Subscription[] = [];
  isLoading: boolean = true;
  chart: Chart | undefined;

  @ViewChild('chart') chartRef!: ElementRef;

  constructor(private edfDataService: EdfDataService) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.edfDataService.header$.subscribe(header => {
        this.header = header;
      }),
      this.edfDataService.signalHeaders$.subscribe(signalHeaders => {
        this.signalHeaders = signalHeaders;
      }),
      this.edfDataService.dataRecords$.subscribe(dataRecords => {
        if (dataRecords) {
          this.dataRecords = dataRecords;
          this.isLoading = false;
          if (this.chart) {
            this.updateChart();
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  ngAfterViewInit(): void {
    this.chart = new Chart(this.chartRef.nativeElement, {
      type: 'line',
      data: {
        labels: [], // This will be filled with the sample numbers
        datasets: [], // This will be filled with the signal data
      },
      options: {
        responsive: true,
        scales: {
          x: {
            display: true,
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
      },
    });

    // Trigger the chart update after the chart has been initialized
    this.updateChart();
  }

  updateChart(): void {
    if (this.chart && this.dataRecords && this.signalHeaders) {
      // Clear the existing data
      this.chart.data.labels = [];
      this.chart.data.datasets = [];
      console.log(this.dataRecords);

      // Calculate the number of samples from the first data record
      const numberOfSamples = this.dataRecords[0][this.signalHeaders[0].label].length;

      // Add labels for each sample
      this.chart.data.labels = Array.from({ length: numberOfSamples }, (_, i) => i);

      // Add the new data
      for (const signalHeader of this.signalHeaders) {
        const data = this.dataRecords.map(record => record[signalHeader.label]).flat();
        this.chart.data.datasets.push({
          label: signalHeader.label,
          data,
          fill: false,
          borderColor: this.getRandomColor(),
          tension: 0.1,
        });
      }

      // Update the chart
      this.chart.update();
    }
  }

  private getRandomColor(): string {
    // Function to generate a random hex color
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
  }
}