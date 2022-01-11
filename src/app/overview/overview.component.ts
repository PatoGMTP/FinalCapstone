import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Interval, Range_Number, Range_String } from '../intervalType';
import { Graph } from '../graphInt';
import { SupabaseService } from '../supabase.service';
import { stat } from 'fs';
import { start } from 'repl';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {
  
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
    {value: 604800000, view_value: "Last Week"},
    {value: 2592000000, view_value: "Last Month"},
    {value: 7776000000, view_value: "Last Quarter"},
  ]

  obj: {[number: number]: Range_String} = {
    86400000 : "Last 24 hours",
    604800000 : "Last Week",
    2592000000 : "Last Month",
    7776000000 : "Last Quarter",
  }

  selected_range: Range_String = "Last 24 hours";
  selected_symbol: string = "All";
  selected_interval: Interval = "5 minutes";

  type: "Fixed" | "Relative" = "Fixed";
  tracked_symbols: string[] = [];
  intervals: Interval[] = ["5 minutes", "15 minutes", "1 hour", "1 day"];

  data: {x: number[], y: number[], type: string, mode?: string, marker?: Object}[] =
  [
    { x: [1, 2, 3], y: [2, 6, 3], type: 'scatter', mode: 'lines+points', marker: {color: 'red'} },
    { x: [1, 2, 3], y: [2, 5, 3], type: 'bar' },
  ];

  layout: {width: number, height: number, title: string} = {width: 320, height: 240, title: 'A Fancy Plot'};

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

  constructor(private supabase: SupabaseService) { }

  ngOnInit(): void
  {
    this.supabase.symbol_subject.subscribe(items => this.tracked_symbols = ["All", ...items]);
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

    this.supabase.update_overview(this.state);
  }
}
