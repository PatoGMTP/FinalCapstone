import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timestamp } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { DataPoint, DataPoint_N, Historical, List, Live, SERVER_DATA_FREQUENCY } from './serverInts';

@Injectable({
  providedIn: 'root'
})
export class StockServerService {

  private url = "https://sheltered-bastion-43662.herokuapp.com/";
  private socket: Socket = io(this.url);

  live_data: {[symbol: string]: DataPoint_N[]} = {};
  live_updates = new BehaviorSubject<{[symbol: string]: DataPoint_N[]}>(this.live_data);

  symbols: {symbol: string, updated: boolean}[] = [];
  symbol_updates = new BehaviorSubject<string[]>([]);

  constructor()
  {
    this.listen_for_stock_list().subscribe(resp => {
      this.symbols = [];

      resp.symbols.forEach(sym => {
        this.symbols.push({
          symbol: sym,
          updated: false,
        })

        this.live_data[sym] = [];
      });

      this.symbol_updates.next(this.symbols.map(item => item.symbol));

      this.socket.on("historical", (hist: Historical) => {
        console.log(hist);

        hist.data.forEach(item => {
          this.live_data[item.symbol] = this.live_data[item.symbol].concat(item.data.map(item => {
            return {
              timestamp: new Date(item.timestamp),
              open: Number(item.open),
              close: Number(item.close),
              high: Number(item.high),
              low: Number(item.low),
            }
          }).reverse());
        });

        console.log(this.live_data);

        this.live_updates.next(this.live_data);
  
        this.socket.on("live", (data:Live) => {
          let incoming_date = new Date(data['new-value'].data[0].timestamp);

          let old_date = this.live_data[data['new-value'].symbol]
          [
            this.live_data[data['new-value'].symbol].length - 1
          ]
          .timestamp;

          if (old_date < incoming_date)
          {
            let new_data: DataPoint_N = {
              timestamp: incoming_date,
              open: Number(data['new-value'].data[0].open),
              close: Number(data['new-value'].data[0].close),
              high: Number(data['new-value'].data[0].high),
              low: Number(data['new-value'].data[0].low),
            };
            
            this.live_data[data['new-value'].symbol].push(new_data);

            this.symbols.find(item => item.symbol == data['new-value'].symbol)!.updated = true;

            if (this.symbols.every(item => item.updated))
            {
              this.live_updates.next(this.live_data);
              console.log(this.live_data);

              localStorage.setItem("local_hist_data", JSON.stringify(this.live_data));

              this.symbols.forEach(sym => sym.updated = false);
            }
          }
        });

        this.socket.emit("live", {
          'request-type': "live",
          symbols: resp.symbols
        });
      });
      
      let now = new Date().setSeconds(0, 0);
      console.log(new Date(now));
      
      // Get data for the last 30 days + 1 extra data point
      this.socket.emit("historical", {symbols: resp.symbols, start: new Date(now - (1000*60*60*24*30 + SERVER_DATA_FREQUENCY))});
    });

    this.socket.emit('list');
  }

  listen_for_stock_list(): Observable<List>
  {
    return new Observable((observer:any) => {
      this.socket.on('list', (data:List) => {
        observer.next(data);
      })
    })
  }

//   getStockHistoricalData(): Observable<Historical>
//   {
//     return new Observable((observer:any) => {
//       this.socket.on('list', (data:Historical) => {
//         observer.next(data);
//       })
//     })
//   }

//   getStockLiveData(symbols: string[]): Observable<Live>
//   {
//     this.socket.emit('live', {symbols:symbols});

//     return new Observable((observer:any) => {
//       this.socket.on('live', (data:Live) => {
//         observer.next(data);
//       })
//     })
//   }

}
