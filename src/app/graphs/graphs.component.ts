import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { type } from 'os';
import { Candle_Data } from '../candlestickDataInt';
import { intervals, interval_s_to_n, ranges, range_n_to_s } from '../conversions';
import { Graph } from '../graphInt';
import { Interval_Number, Interval_String, Range_Number, Range_String } from '../intervalType';
import { graphs_layout, Plotly_Layout } from '../overviewLayout';
import { DataPoint_N, SERVER_DATA_FREQUENCY } from '../serverInts';
import { StockServerService } from '../stock-server.service';
import { SupabaseService } from '../supabase.service';

@Component({
  selector: 'app-graphs',
  templateUrl: './graphs.component.html',
  styleUrls: ['./graphs.component.scss']
})
export class GraphsComponent implements OnInit {

  new_date_range_ctrl = new FormGroup({
    start: new FormControl(new Date(Date.now() - 1000*60*60*24)),
    end: new FormControl(new Date()),
  })

  milliseconds_per_day = 1_000 * 60 * 60 * 24;

  new_symbol_ctrl = new FormControl();
  
  new_number_range_ctrl = new FormControl(this.milliseconds_per_day);

  new_interval_ctrl = new FormControl(intervals[0].view_value);

  controls: any[] = [];

  all_data: {[symbol: string]: DataPoint_N[]} = {};

  rows: any[] = [1, 2];

  tracked_symbols: string[] = [];

  graphs: Graph[] = [];

  // layout: Plotly_Layout = graphs_layout;

  candle_graphs: {data: Candle_Data[], layout: Plotly_Layout}[] = [];

  ranges: {value: Range_Number, view_value: Range_String}[] = ranges;

  new_type: "Fixed" | "Relative" = "Relative";

  types: string[] = ["Fixed", "Relative"];
  
  intervals: {value: Interval_Number, view_value: Interval_String}[] = intervals;

  range_n_to_s: {[N in Range_Number]: Range_String} = range_n_to_s;

  interval_s_to_n: {[K in Interval_String]: Interval_Number} = interval_s_to_n;

  constructor(private supabase: SupabaseService, private dummy: StockServerService) { }

  ngOnInit(): void
  {
    // Get updates about what symbols are being tracked
    this.supabase.symbol_subject.subscribe(items => {
      this.tracked_symbols = items;

      if (this.tracked_symbols)
      {
        this.new_symbol_ctrl.setValue(this.tracked_symbols[0]);
      }
    });

    // This sends updates about what the graph should look like. Often times this just sends back
    // a graph object that's the same as the one we have already stored, but this ensures the
    // service is always the one providing/controlling the data
    this.supabase.graph_subject.subscribe(items => {
      this.graphs = items.slice(1);

      console.log(items, this.graphs);

      this.controls = [];
      this.candle_graphs = [];

      this.graphs.forEach(item => {
        this.controls.push({
          date_range_ctrl: new FormGroup({
            start: new FormControl(),
            end: new FormControl(),
          }),
          number_range_ctrl: new FormControl(this.milliseconds_per_day),
        });
        this.candle_graphs.push({data: [{open: [], close: [], high: [], low: [], x: [], type: "candlestick"}], layout: {...graphs_layout}});
      });

      this.update_graphs();
    });

    // Gets the latest data from the stock server service
    this.dummy.live_updates.subscribe(data => {
      this.all_data = data;

      this.update_graphs();
    });
  }

  update_graphs(): void
  {
    // If we're not tracking any stocks, just exit
    if (this.tracked_symbols.length == 0) return;

    let cur_data: DataPoint_N[];

    let start_index: number;
    let end_index: number;

    // Sometimes the tracked stocks will be loaded but not their data, so we exit if their data is missing
    if (!this.all_data[this.tracked_symbols[0]]) return;

    // This simply gets the number of datapoints available for each stock, which is the same for all stocks
    let len = this.all_data[this.tracked_symbols[0]].length;

    this.graphs.forEach((grph, i) => {
      grph.start = new Date(grph.start);
      grph.end = new Date(grph.end);
      console.log(grph);
      if (grph.range_type == "Relative")
      {
        start_index = len - ((grph.range_number / SERVER_DATA_FREQUENCY) + 2);
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

        console.log(grph.start, grph.end)
  
        let s = new Date(grph.start).setHours(0, 0, 0, 0);
        let e = new Date(grph.end).setHours(0, 0, 0, 0) + 1000*60*60*24;
        start_index = len - (((today - s) / SERVER_DATA_FREQUENCY) + minutes_so_far);
        end_index = len - (((today - e) / SERVER_DATA_FREQUENCY) + minutes_so_far - 2);

        console.log(start_index, end_index, len);
  
        if (start_index > len || start_index < 0)
        {
          start_index = 0;
        }
  
        if (end_index > len || end_index < 0)
        {
          end_index = len;
        }
      }
  
      console.log(start_index, end_index, len);

      this.candle_graphs[i].layout.title = `${grph.symbol}: Intervals of ${grph.interval}`;

      if (grph.range_type == "Relative")
      {
        this.candle_graphs[i].layout.title += `<br>${range_n_to_s[grph.range_number]}`;
      }
      else
      {
        this.candle_graphs[i].layout.title += `<br>${grph.start.toLocaleDateString()} to ${grph.end.toLocaleDateString()}`;
      }
      cur_data = this.all_data[grph.symbol].slice(start_index, end_index);

      let open: number[] = [];
      let close: number[] = [];
      let high: number[] = [];
      let low: number[] = [];
      let times: Date[] = [];

      let len2 = cur_data.length;
      let iter = this.interval_s_to_n[grph.interval] / SERVER_DATA_FREQUENCY;

      console.log(cur_data, iter);

      for (let i = iter; i < len2; i += iter)
      {
        open.push(cur_data[i-iter].open);
        close.push(cur_data[i].open);
        high.push(cur_data.slice(i-iter, i+1).reduce((a,c)=>a > c.high ? a : c.high, 0));
        low.push(cur_data.slice(i-iter, i+1).reduce((a,c)=>a < c.low ? a : c.low, 9999));
        times.push(cur_data[i-iter].timestamp);
      }

      this.candle_graphs[i].data[0].open = open;
      this.candle_graphs[i].data[0].close = close;
      this.candle_graphs[i].data[0].high = high;
      this.candle_graphs[i].data[0].low = low;
      this.candle_graphs[i].data[0].x = times;
    });

    console.log(this.candle_graphs);
  }

  submit(): void
  {
    let new_graph: Graph =
    {
      symbol: this.new_symbol_ctrl.value,
      range_type: this.new_type,
      range_number: this.new_number_range_ctrl.value,
      end: this.new_date_range_ctrl.value.end,
      start: this.new_date_range_ctrl.value.start,
      interval: this.new_interval_ctrl.value,
    };

    this.supabase.add_graph(new_graph);

    this.new_symbol_ctrl.setValue(this.tracked_symbols[0]);
    this.new_number_range_ctrl.setValue(this.milliseconds_per_day);
    this.new_date_range_ctrl.setValue({start: new Date(Date.now() - 1000*60*60*24), end: new Date()});
    this.new_interval_ctrl.setValue(intervals[0].view_value);
  }

  remove(index: number): void
  {
    this.supabase.remove_graph(index);
  }
}
