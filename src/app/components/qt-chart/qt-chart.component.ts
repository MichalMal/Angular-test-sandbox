import {
  Component,
  ElementRef,
  OnChanges,
  SimpleChanges,
  Input,
  Renderer2,
  RendererFactory2,
  ViewChild,
} from '@angular/core';
import * as echarts from 'echarts';
import { ToasterAlertService } from 'src/app/services/toaster-alert.service';

@Component({
  selector: 'app-qt-chart',
  templateUrl: './qt-chart.component.html',
  styleUrls: ['./qt-chart.component.scss'],
})
export class QtChartComponent implements OnChanges {
  @Input() data = [];
  @Input() qtInterval1 = {};
  @Input() qtInterval2 = {};
  @ViewChild('chart') chartRef!: ElementRef;

  private chart: echarts.ECharts | undefined;
  private option: echarts.EChartsOption | null = null;
  private renderer: Renderer2;
  private resizeListener!: () => void;

  constructor(
    private rendererFactory: RendererFactory2,
    private toasterService: ToasterAlertService
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  ngOnInit(): void {
    this.updateChart();
  }

  ngOnChanges(changes: SimpleChanges) {

  }

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.chartRef.nativeElement);
    this.resizeListener = this.renderer.listen('window', 'resize', () => {
      this.chart?.resize();
    });
    this.chart?.getZr().on('click', this.handleGraphClick);
    this.updateChart();
  }

  ngOnDestroy(): void {
    if (this.resizeListener) {
      this.resizeListener();
    }
  }

  updateChart() {
    this.option = {
      animation: false,  
      xAxis: {
        min: this.data[0][0],
        max: this.data[this.data.length - 1][0],
        axisLabel: {
          formatter: '{value}ms',
        },
        axisLine: {
          lineStyle: {
            color: '#000',
          },
        },
        axisTick: {
          show: false,
        },
        maxInterval: 200,
        minInterval: 200,
        splitLine: {
          show: true,
          lineStyle: {
            color: 'pink',
          },
        },
        minorTick: {
          show: true,
          splitNumber: 5,
        },
        minorSplitLine: {
          show: true,
          lineStyle: {
            color: 'pink',
            width: 0.3,
          },
        },
      },
      yAxis: {
        type: 'value',
        name: 'mv',
        scale: true,
        maxInterval: 0.5,
        minInterval: 0.5,
        splitLine: {
          show: true,
          lineStyle: {
            color: 'pink',
          },
        },
        minorTick: {
          show: true,
          splitNumber: 5,
        },
        minorSplitLine: {
          show: true,
          lineStyle: {
            color: 'pink',
            width: 0.3,
          },
        },
      },
      grid: {
        left: '5%',
        right: '5%',
        top: '20%',
        bottom: '15%',
      },
      tooltip: {
        // show: false,
        trigger: 'axis',
        position: function (pt) {
          return [pt[0], '10%'];
        },
      },
      series: [
        {
          type: 'line',
          showSymbol: false,
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              color: 'rgba(242, 25, 25, 0.8)',
              type: 'solid',
            },
            label: {
              show: false,
            },
            data: [
              {
                label: {
                  formatter: 'R',
                  show: true,
                  color: '#f00',
                },
                xAxis: this.qtInterval1['R'],
              },
              {
                label: {
                  formatter: 'S',
                  show: true,
                  color: '#f00',
                },
                xAxis: this.qtInterval1['S'],
              },
              {
                label: {
                  formatter: 'R',
                  show: true,
                  color: '#f00',
                },
                xAxis: this.qtInterval2['R'],
              },
              {
                label: {
                  formatter: 'S',
                  show: true,
                  color: '#f00',
                },
                xAxis: this.qtInterval2['S'],
              },
            ],
          },
          markArea: {
            silent: true,
            data: [
              [
                {
                  name: 'QT 1',
                  xAxis: this.qtInterval1['startTime'],
                  itemStyle: {
                    color: 'rgba(150, 230, 150, 0.4)',
                  },
                },
                {
                  xAxis: this.qtInterval1['endTime'],
                },
              ],
              [
                {
                  name: 'QT 2',
                  xAxis: this.qtInterval2['startTime'],
                  itemStyle: {
                    color: 'rgba(150, 230, 150, 0.4)',
                  },
                },
                {
                  xAxis: this.qtInterval2['endTime'],
                },
              ],
            ],
            label: {
              position: 'insideTop',
              color: '#000',
          },
          },
          data: this.data.map((item: any) => {
            return [item[0], item[1]];
          }),
          itemStyle: {
            color: '#2e2491',
          },
        },
      ],
    };
    this.chart?.setOption(this.option!);
  }

  handleGraphClick = (params: any) => {
    // copy time value to clipboard

    let pointInPixel = [params.offsetX, params.offsetY];
    let option = this.chart?.getOption();
    if (this.chart?.containPixel('grid', pointInPixel)) {
      let pointInData = this.chart?.convertFromPixel('series', pointInPixel);
      let closestSample = option!['series']![0]['data'].reduce((prev, curr) => {
        return Math.abs(curr[0] - pointInData[0]) <
          Math.abs(prev[0] - pointInData[0])
          ? curr
          : prev;
      });

      var xAxisValue = closestSample[0];

      navigator.clipboard.writeText(xAxisValue.toString()).then(
        () => {
          console.log('Copying to clipboard was successful!');
          this.toasterService.showSuccess(
            'Copied value to clipboard',
            'Success'
          );
        },
        function (err) {
          console.error('Could not copy text: ', err);
        }
      );
    }
  };
}
