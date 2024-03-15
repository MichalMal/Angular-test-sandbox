export const chartTemplate: any = {
  title: {
    subtext: 'Paper Speed: 25mm/s\nAmplitude: 10mm/mV',
    left: '10%',
  },
  xAxis: {
    axisLabel: {
      hideOverlap: true,
      formatter: '{value}ms',
    },
    axisLine: {
      lineStyle: {
        color: "#000",
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
      show: false,
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
    // max: 6,
    // min: -6,
    maxInterval: 0.5,
    minInterval: 0.5,
    // axisTick: {
    //   lineStyle: {
    //     width: 1
    //   },
    // },
    splitLine: {
      show: true,
      lineStyle: {
        color: 'pink',
      },
    },
    minorTick: {
      show: true,
      splitNumber: 5,
      lineStyle: {
        width: 0.3
      }
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
  },
  legend: {
    show: true,
    selectedMode: 'single',
  },
  tooltip: {
    // show: false,
    trigger: 'axis',
    textStyle: {
      fontSize: 9,
    },
    showDelay: 400,
    position: function (pt) {
      return [pt[0], '10%'];
    },
  },
  toolbox: {
    right: '10%',
    itemSize: 20,
    emphasis: {
      iconStyle: {
        borderColor: 'red',
      },
    },
    feature: {
      brush: {
        title: {
          lineX: 'Select QT Intervals'
        }
      }
    }
  },
  brush: {
    toolbox: ['lineX'],
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
  // visualMap: {
  //   type: 'piecewise',
  //   show: false,
  //   seriesIndex: 0,

  // },
  // PLAY AROUND WITH THIS
  dataZoom: [
    {
      type: 'slider',
      xAxisIndex: 0,
      filterMode: "none"
    },
    {
      type: 'slider',
      yAxisIndex: 0,
      filterMode: "none",
      right: '3%',
    },
    {
      type: 'inside',
      xAxisIndex: 0,
      moveOnMouseMove: true,
    },
    {
      type: 'inside',
      yAxisIndex: 0,
      moveOnMouseMove: true,
    },
  ],
  series: [] as any[],
};
