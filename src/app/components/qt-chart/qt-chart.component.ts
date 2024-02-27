import { Component, ElementRef, Input, Renderer2, RendererFactory2, ViewChild } from '@angular/core';
import * as echarts from 'echarts';

@Component({
  selector: 'app-qt-chart',
  templateUrl: './qt-chart.component.html',
  styleUrls: ['./qt-chart.component.scss'],
})
export class QtChartComponent {
  @Input() data = [];
  @Input() qtInterval = {};
  @ViewChild('chart') chartRef!: ElementRef;

  private chart: echarts.ECharts | undefined;
  private option: echarts.EChartsOption | null = null;
  private renderer: Renderer2;
  private resizeListener!: () => void;

  constructor(
    private rendererFactory: RendererFactory2,
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  ngOnInit(): void {
    this.option = {
      xAxis: {
        min: this.data[0][0],
        max: this.data[this.data.length - 1][0],
        axisLabel: {
          formatter: '{value}ms',
        },
        maxInterval: 200,
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
        name: 'mv',
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
            data:[
              {
                label: 
                {
                  formatter: 'R',
                  show: true,
                  color: '#f00',
                },
                xAxis: this.qtInterval['R'],
              },
              {
                label: 
                {
                  formatter: 'S',
                  show: true,
                  color: '#f00',
                },
                xAxis: this.qtInterval['S'],
              },
            ],
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
  }

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.chartRef.nativeElement);
    this.resizeListener = this.renderer.listen('window', 'resize', () => {
      this.chart?.resize();
    });
    this.updateChart();
  }

  ngOnDestroy(): void {
    if (this.resizeListener) {
      this.resizeListener();
    }
  }

  updateChart() {
    this.chart?.setOption(this.option!);
  }
}
