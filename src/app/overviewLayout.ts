export interface Plotly_Layout
{
    width: number,
    height: number,
    title: string,
    margin: Object,
    yaxis: Object,
    xaxis: Object,
}

export const overview_layout: Plotly_Layout =
  {
    width: 1200,
    height: 500,
    title: '',
    margin: {
      b: 25,
      l: 45,
      r: 45,
    },
    yaxis: {
      fixedrange: false,
      tickprefix: "$",
    },
    xaxis: {
      autorange: true,
      rangeslider: {
        yaxis: {
          rangemode: "auto",
        },
      },
      // title: 'Date',
      rangeselector: 
      {
        x: 0,
        y: 1.2,
        xanchor: 'left',
        font: {size:12},
        buttons: [
          {
            step: 'hour',
            stepmode: 'backward',
            count: 3,
            label: '3 hours'
          },
          {
            step: 'hour',
            stepmode: 'backward',
            count: 6,
            label: '6 hours'
          },
          {
            step: 'hour',
            stepmode: 'backward',
            count: 12,
            label: '12 hours'
          },
          {
            step: 'day',
            stepmode: 'backward',
            count: 1,
            label: '1 day'
          },
          {
            step: 'day',
            stepmode: 'backward',
            count: 5,
            label: '5 days'
          },
          {
            step: 'all',
            label: 'All dates'
          }
        ]
      }
    },
  };

  export const graphs_layout: Plotly_Layout =
  {
    width: 650,
    height: 315,
    title: '',
    margin: {
      b: 45,
      l: 45,
      r: 25,
      t: 45,
    },
    yaxis: {
      fixedrange: false,
      tickprefix: "$",
    },
    xaxis: {
      rangeslider: {
       visible: false
     }
    }
  };