import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Interval_Number, Interval_String, Range_Number, Range_String } from '../intervalType';
import { Graph } from '../graphInt';
import { SupabaseService } from '../supabase.service';
import { StockServerService } from '../stock-server.service';
import { DataPoint_N, SERVER_DATA_FREQUENCY } from '../serverInts';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {

  all_data: {[symbol: string]: DataPoint_N[]} = {};
  
  date_range_ctrl = new FormGroup({
    start: new FormControl(),
    end: new FormControl(),
  });

  milliseconds_per_second = 1000;
  milliseconds_per_minute = this.milliseconds_per_second * 60; // 60000
  milliseconds_per_hour = this.milliseconds_per_minute * 60; // 3600000
  milliseconds_per_day = this.milliseconds_per_hour * 24; // 86400000
  milliseconds_per_week = this.milliseconds_per_day * 7; // 604800000
  milliseconds_per_month = this.milliseconds_per_day * 30; // 2592000000
  milliseconds_per_quarter = this.milliseconds_per_day * 90; // 7776000000

  number_range_ctrl = new FormControl(this.milliseconds_per_day);

  ranges: {value: Range_Number, view_value: Range_String}[] =
  [
    {value: 86400000, view_value: "Last 24 hours"},
    {value: 259200000, view_value: "Last 3 Days"},
    {value: 604800000, view_value: "Last Week"},
    {value: 1209600000, view_value: "Last 2 Weeks"},
  ]

  range_n_to_s: {[N in Range_Number]: Range_String} = {
    86400000 : "Last 24 hours",
    259200000 : "Last 3 Days",
    604800000 : "Last Week",
    1209600000 : "Last 2 Weeks",
  }

  interval_s_to_n: {[K in Interval_String]: Interval_Number} =
  {
    "5 minutes": 300000,
    "15 minutes": 900000,
    "1 hour": 3600000, 
    "1 day": 86400000,
  }

  selected_range: Range_String = "Last 24 hours";
  selected_symbol: string = "All";
  selected_interval: Interval_String = "5 minutes";

  type: "Fixed" | "Relative" = "Fixed";
  tracked_symbols: string[] = [];
  intervals: Interval_String[] = ["5 minutes", "15 minutes", "1 hour", "1 day"];

  candle_data: {x: Date[], open: number[], close: number[], high: number[], low: number[], type: string}[] =
  [
    { x: [], open: [], close: [], high: [], low: [], type: 'candlestick'}
  ];

  dashes: string[] = ["solid", "dashdot", "dot"];

  sample: {} = 
  {
    x: [],
    y: [],
    mode: 'lines',
    name: '',
    line: {
      dash: '',
      width: 2
    }
  }

  line_data: {}[] = [];

  layout: {width: number, height: number, title: string, yaxis: Object, xaxis: Object} =
  {
    width: 1200,
    height: 550,
    title: '',
    yaxis: {
      tickprefix: "$",
    },
    xaxis: {
      autorange: true,
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

  line_graph = 
  {
    data: this.line_data,
    layout: this.layout,
  };

  candle_graph = 
  {
    data: this.candle_data,
    layout: this.layout,
  };

  state: Graph =
  {
    symbol: this.selected_symbol,
    range_type: this.type,
    range_number: 86400000,
    start: new Date(),
    end: new Date(),
    interval: this.selected_interval,
  };

  constructor(private supabase: SupabaseService, private dummy: StockServerService) { }

  ngOnInit(): void
  {
    // Get updates about what symbols are being tracked
    this.supabase.symbol_subject.subscribe(items => {
      this.tracked_symbols = ["All", ...items];

      // console.log(this.tracked_symbols, this.selected_symbol);

      // If the currently displayed symbol is no longer tracked, ensure we've switched to "All"
      if (!this.tracked_symbols.includes(this.selected_symbol))
      {
        if (this.selected_symbol != this.tracked_symbols[0])
        {
          this.selected_symbol = this.tracked_symbols[0];
          this.update_graph();
  
          // Obscure rendering issue: values are already set correctly, but not shown, re-setting fixes this
          setTimeout(() => {
            this.selected_symbol = this.tracked_symbols[0];
          }, 10);
        }
      }
      // If we're displaying "All", we definitely had some changes happen to the line graph if the tracked symbols changed
      else if (this.selected_symbol == "All")
      {
        this.update_graph();
      }
    });

    // This sends updates about what the graph should look like. Often times this just sends back
    // a graph object that's the same as the one we have already stored, but this ensures the
    // service is always the one providing/controlling the data
    this.supabase.graph_subject.subscribe(items => {
      // Item 0 is always the "overview_state"
      this.state = items[0];

      // console.log(items[0].id, this.state.id);

      this.date_range_ctrl.setValue({start: this.state.start, end: this.state.end});
      this.number_range_ctrl.setValue(this.state.range_number);

      // Obscure rendering issue: values are already set correctly, but not shown, re-setting fixes this
      setTimeout(() => {
        this.number_range_ctrl.setValue(this.state.range_number);
        this.date_range_ctrl.setValue({start: this.state.start, end: this.state.end});
      }, 10);

      this.selected_symbol = this.state.symbol;
      this.selected_range = this.range_n_to_s[this.state.range_number];
      this.selected_interval = this.state.interval;
      this.type = this.state.range_type;
    });

    // Gets the latest data from the stock server service
    this.dummy.live_updates.subscribe(data => {
      this.all_data = data;

      this.update_graph();
    });
  }

  update_graph(): void
  {
    // If we're not tracking any stocks, just exit
    if (this.tracked_symbols.length == 1) return;

    let cur_data: DataPoint_N[];

    let start_index: number;
    let end_index: number;

    // Sometimes the tracked stocks will be loaded but not their data, so we exit if their data is missing
    if (!this.all_data[this.tracked_symbols[1]]) return;

    // This simply gets the number of datapoints available for each stock, which is often the same for all stocks
    let len = this.all_data[this.tracked_symbols[1]].length;

    // The following code all does a similar thing: converts some time range into an index for the stock server
    // data. This often involves dividing something by 60_000 (SERVER_DATA_FREQUENCY), as that's the number of 
    // milliseconds in a minute, and the stock server has data in intervals of a minute.

    // Some indexes also have a +-2, this is because the code currently makes one less datapoint than expected 
    // without that, likely something in the code below needs to be fixed but having the +-2 currently gets around this.

    if (this.type == "Relative")
    {
      start_index = len - ((this.number_range_ctrl.value / SERVER_DATA_FREQUENCY) + 2);
      end_index = len;
      if (start_index < 0) start_index = 0;
    }
    else
    {
      // The .setHours(0, 0, 0, 0) converts the date to local time and sets it to 12am
      let today = new Date().setHours(0, 0, 0, 0);
      let minutes_so_far = -1;

      // Finds the number of minutes that have passed today
      for (let i = len - 1; i >= 0; i--)
      {
        if (new Date(this.all_data[this.tracked_symbols[1]][i].timestamp).getTime() == today)
        {
          minutes_so_far = len - i;
        }
      }

      let s = new Date(this.date_range_ctrl.value.start).setHours(0, 0, 0, 0);
      let e = new Date(this.date_range_ctrl.value.end).setHours(0, 0, 0, 0);
      start_index = len - (((today - s) / SERVER_DATA_FREQUENCY) + minutes_so_far);
      end_index = len - (((today - e) / SERVER_DATA_FREQUENCY) + minutes_so_far - 2);

      if (start_index > len)
      {
        start_index = 0;
      }

      if (end_index > len)
      {
        end_index = len;
      }
    }

    if (this.selected_symbol == "All")
    {
      this.layout.title = "Median Stock Price";
      this.line_graph.data = [];

      // This is used to make each line on the graph slightly different
      let z = 0;

      this.tracked_symbols.slice(1).forEach(sym => {
        cur_data = this.all_data[sym].slice(start_index, end_index);

        let y: number[] = [];
        let times: Date[] = [];
  
        len = cur_data.length;
        let iter = (this.interval_s_to_n[this.selected_interval] / SERVER_DATA_FREQUENCY);

        // This gets an average of the open and close to use as the datapoint
        for (let i = iter; i < len; i += iter)
        {
          let avg = (cur_data[i-iter].open + cur_data[i-iter].close) / 2;
          y.push(avg);
          times.push(cur_data[i-iter].timestamp);
        }

        this.line_graph.data.push(
          {
            x: times,
            y: y,
            mode: 'lines+markers',
            name: sym,
            marker: {
              size: 2,
            },
            line: {
              dash: this.dashes[z],
              width: z+1,
            }
          }
        );
        z == 2 ? z = 0 : z++;
      });
    }
    else if (this.all_data[this.selected_symbol])
    {
      this.layout.title = this.selected_symbol;
      cur_data = this.all_data[this.selected_symbol].slice(start_index, end_index);

      let open: number[] = [];
      let close: number[] = [];
      let high: number[] = [];
      let low: number[] = [];
      let times: Date[] = [];

      len = cur_data.length;
      let iter = (this.interval_s_to_n[this.selected_interval] / SERVER_DATA_FREQUENCY);

      for (let i = iter; i < len; i += iter)
      {
        open.push(cur_data[i-iter].open);
        close.push(cur_data[i].open);
        high.push(cur_data.slice(i-iter, i+1).reduce((a,c)=>a > c.high ? a : c.high, 0));
        low.push(cur_data.slice(i-iter, i+1).reduce((a,c)=>a < c.low ? a : c.low, 9999));
        times.push(cur_data[i-iter].timestamp);
      }

      this.candle_graph.data[0].open = open;
      this.candle_graph.data[0].close = close;
      this.candle_graph.data[0].high = high;
      this.candle_graph.data[0].low = low;
      this.candle_graph.data[0].x = times;
    }
  }

  toggle_type(): void
  {
    if (this.type == "Fixed") this.type = "Relative";
    else this.type = "Fixed";

    this.update();
  }

  update(event?: any): void
  {
    this.state =
    {
      id: this.state.id,
      symbol: this.selected_symbol,
      range_type: this.type,
      range_number: this.number_range_ctrl.value,
      start: this.date_range_ctrl.value.start,
      end: this.date_range_ctrl.value.end,
      interval: this.selected_interval
    };

    this.update_graph();

    this.supabase.update_overview(this.state);
  }
}
