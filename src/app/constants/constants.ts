export const chartTemplate: any = {
    xAxis: {
      axisLabel: {
        hideOverlap: true,
        formatter: '{value}ms',
      },
      axisTick: {
        show: false
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
          color: '#ddd',
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
          color: '#ddd',
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
      show: false,
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
      },
      {
        type: 'inside',
        xAxisIndex: 0,
        moveOnMouseMove: false,
      },
    ],
    series: [] as any[],
  };