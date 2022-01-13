import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Interval_Number, Interval_String, Range_Number, Range_String } from '../intervalType';
import { Graph } from '../graphInt';
import { SupabaseService } from '../supabase.service';
import { stat } from 'fs';
import { start } from 'repl';
import { StockServerService } from '../stock-server.service';
import { DataPoint, DataPoint_N } from '../serverInts';

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

  obj: {[N in Range_Number]: Range_String} = {
    86400000 : "Last 24 hours",
    259200000 : "Last 3 Days",
    604800000 : "Last Week",
    1209600000 : "Last 2 Weeks",
  }

  decode: {[K in Interval_String]: Interval_Number} =
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

  data: {x: Date[], open: number[], close: number[], high: number[], low: number[], type: string}[] =
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

  layout: {width: number, height: number, title: string, xaxis: Object} =
  {
    width: 800,
    height: 500,
    title: 'A Fancy Plot',
    xaxis: {
      autorange: true,
      title: 'Date',
      rangeselector: 
      {
        x: 0,
        y: 1.2,
        xanchor: 'left',
        font: {size:8},
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

  scatter = 
  {
    data: this.line_data,
    layout: this.layout,
  };

  graph = 
  {
    data: this.data,
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
    this.supabase.symbol_subject.subscribe(items => {
      this.tracked_symbols = ["All", ...items];

      console.log(this.tracked_symbols, this.selected_symbol);

      if (!this.tracked_symbols.includes(this.selected_symbol))
      {
        this.selected_symbol = this.tracked_symbols[0];
        this.update_graph();

        // Obscure rendering issue: values are already set correctly, but not shown, re-setting fixes this
        setTimeout(() => {
          this.selected_symbol = this.tracked_symbols[0];
        }, 10);
      }
      else if (this.selected_symbol == "All")
      {
        this.update_graph();
      }
    });

    this.supabase.graph_subject.subscribe(items => {
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
      this.selected_range = this.obj[this.state.range_number];
      this.selected_interval = this.state.interval;
      this.type = this.state.range_type;
    });

    this.dummy.live_updates.subscribe(data => {
      this.all_data = data;

      console.log(this.all_data);

      this.update_graph();
    });
  }

  update_graph(): void
  {
    if (this.tracked_symbols.length == 1) return;

    let cur_data: DataPoint_N[];

    let start_index: number;
    let end_index: number;

    if (!this.all_data[this.tracked_symbols[1]]) return;

    let len = this.all_data[this.tracked_symbols[1]].length;

    if (this.type == "Relative")
    {
      start_index = len - ((this.number_range_ctrl.value / 60000) + 2);
      end_index = len;
      if (start_index < 0) start_index = 0;
    }
    else
    {
      let today = new Date().setHours(0, 0, 0, 0);
      let minutes_so_far = -1;

      for (let i = len - 1; i >= 0; i--)
      {
        if (new Date(this.all_data[this.tracked_symbols[1]][i].timestamp).getTime() == today)
        {
          minutes_so_far = len - i;
          console.log("time zero?", this.all_data[this.tracked_symbols[1]][i]);
        }
      }

      let s = new Date(this.date_range_ctrl.value.start).setHours(0, 0, 0, 0);
      let e = new Date(this.date_range_ctrl.value.end).setHours(0, 0, 0, 0);
      console.log(today, s, e, minutes_so_far);
      start_index = len - (((today - s) / 60000) + minutes_so_far);
      end_index = len - (((today - e) / 60000) + minutes_so_far - 2);

      console.log(start_index, end_index);

      if (start_index > len)
      {
        start_index = 0;
      }

      if (end_index > len)
      {
        end_index = len;
      }

      console.log(start_index, end_index);
    }

    if (this.selected_symbol == "All")
    {
      this.scatter.data = [];
      let i = 0;
      this.tracked_symbols.slice(1).forEach(sym => {
        cur_data = this.all_data[sym].slice(start_index, end_index);

        let y: number[] = [];
        let times: Date[] = [];
  
        len = cur_data.length;
        let iter = (this.decode[this.selected_interval] / 60000);
  
        for (let i = iter; i < len; i += iter)
        {
          let avg = (cur_data[i-iter].open + cur_data[i-iter].close) / 2;
          y.push(avg);
          times.push(cur_data[i-iter].timestamp);
        }

        this.scatter.data.push(
          {
            x: times,
            y: y,
            mode: 'lines+markers',
            name: sym,
            marker: {
              size: 2,
            },
            line: {
              dash: this.dashes[i],
              width: i+1,
            }
          }
        );
        i == 2 ? i = 0 : i++;
      });

      // setTimeout(() => {
      //   this.selected_symbol = "";
      //   setTimeout(() => {
      //     this.selected_symbol = "All";
      //   }, 10);
      // }, 10);
    }
    else if (this.all_data[this.selected_symbol])
    {
      cur_data = this.all_data[this.selected_symbol].slice(start_index, end_index);

      let open: number[] = [];
      let close: number[] = [];
      let high: number[] = [];
      let low: number[] = [];
      let times: Date[] = [];

      len = cur_data.length;
      let iter = (this.decode[this.selected_interval] / 60000);

      for (let i = iter; i < len; i += iter)
      {
        open.push(cur_data[i-iter].open);
        close.push(cur_data[i].open);
        high.push(cur_data.slice(i-iter, i+1).reduce((a,c)=>a > c.high ? a : c.high, 0));
        low.push(cur_data.slice(i-iter, i+1).reduce((a,c)=>a < c.low ? a : c.low, 9999));
        times.push(cur_data[i-iter].timestamp);
      }

      this.graph.data[0].open = open;
      this.graph.data[0].close = close;
      this.graph.data[0].high = high;
      this.graph.data[0].low = low;
      this.graph.data[0].x = times;
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
