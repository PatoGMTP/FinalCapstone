import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { AfterViewInit, Component, ElementRef, Injectable, OnInit, ViewChild } from '@angular/core';
import { MatTable } from '@angular/material/table';
import { BehaviorSubject, Observable } from 'rxjs';
import { Investment } from '../investmentInt';
import { DataPoint_N, SERVER_DATA_FREQUENCY } from '../serverInts';
import { StockServerService } from '../stock-server.service';
import { SupabaseService } from '../supabase.service';

interface Table
{
  "Stock": string,
  "Shares Owned": number,
  "Current Price": number,
  "Current Value of Shares": number,
  "Todays % Change": number,
  "Gains/Losses": number,
}

@Injectable({
  providedIn: 'root'
})
class MyData implements DataSource<Table> {

  investments: Investment[] = [];

  all_data: {[symbol: string]: DataPoint_N[]} = {};

  table_data: Table[] = [];

  subject = new BehaviorSubject<Table[]>([]);

  count = 0;
  total_current_value = 0;
  total_previous_value = 0;
  total_percent = 0;
  total_gl = 0;

  constructor(private supabase: SupabaseService, private dummy: StockServerService) { }

  connect(collectionViewer: CollectionViewer): Observable<readonly Table[]> 
  {
    console.log("CONNECT!");
    return this.subject.asObservable();
  }

  disconnect(collectionViewer: CollectionViewer): void 
  {
    // this.subject.complete();
  }

  update_data(): void
  {
    this.count = 0;
    this.total_current_value = 0;
    this.total_previous_value = 0;
    this.total_percent = 0;
    this.total_gl = 0;

    this.table_data = [];

    this.investments.forEach(inv => {
      let data = this.all_data[inv.symbol];
      let len = data.length;
      let current_price = data[len-1].close;
      let current_value = inv.units * current_price;
      let previous_price = data[(len-1) - (1000*60*60*24/SERVER_DATA_FREQUENCY)].close;
      let previous_value = inv.units * previous_price;
      let percent_change = (current_price - previous_price) / previous_price;
      let gl = current_value - previous_value;

      this.table_data.push({
        "Stock": inv.symbol,
        "Shares Owned": inv.units,
        "Current Price": current_price,
        "Current Value of Shares": current_value,
        "Todays % Change": percent_change,
        "Gains/Losses": gl,
      });

      this.total_current_value += current_value;
      this.total_previous_value += previous_value;
      this.total_gl += gl;
      this.count++;
    });

    this.subject.next(this.table_data);

    console.log("Done!", this.investments, this.table_data);
  }

  get_total_value(): number
  {
    return this.total_current_value;
  }

  get_total_percent(): number
  {
    if (this.total_previous_value == 0) return 0;
    else
    {
      return (this.total_current_value - this.total_previous_value) / this.total_previous_value;
    } 
  }

  get_total_gl(): number
  {
    return this.total_gl;
  }
}

@Component({
  selector: 'app-investments',
  templateUrl: './investments.component.html',
  styleUrls: ['./investments.component.scss']
})
export class InvestmentsComponent implements AfterViewInit {

  constructor(private supabase: SupabaseService, private dummy: StockServerService, public data: MyData) { }

  investments: Investment[] = [];

  all_data: {[symbol: string]: DataPoint_N[]} = {};

  headers: string[] = [
    "Stock",
    "Shares Owned",
    "Current Price",
    "Current Value of Shares",
    "Todays % Change",
    "Gains/Losses"
  ];

  ngAfterViewInit(): void
  {
    // Get updates about what symbols are being tracked
    this.supabase.investments_subject.subscribe(items => {
      this.investments = items;
      this.data.investments = this.investments;

      if (items.length > 0 && this.all_data[this.investments[0].symbol] && this.all_data[this.investments[0].symbol].length > 0)
      {
        this.data.update_data();
      }
    });

    // Gets the latest data from the stock server service
    this.dummy.live_updates.subscribe(data => {
      this.all_data = data;
      this.data.all_data = this.all_data;

      if (this.investments.length > 0 && data[this.investments[0].symbol] && data[this.investments[0].symbol].length > 0)
      {
        this.data.update_data();
      }
    });
  }

  update(symbol: string): void
  {
    console.log(symbol, this.data.investments, this.data.table_data);

    let target = this.data.investments.find(item => item.symbol == symbol)!;

    target.units = this.data.table_data.find(item => item.Stock == symbol)!['Shares Owned'];

    this.supabase.update_investment(target);
  }

  total_value(): number
  {
    return this.data.get_total_value();
  }

  total_percent(): number
  {
    return this.data.get_total_percent();
  }

  total_gl(): number
  {
    return this.data.get_total_gl();
  }
}
