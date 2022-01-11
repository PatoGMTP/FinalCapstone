import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io } from 'socket.io-client';
import { Historical, List, Live } from './serverInts';

@Injectable({
  providedIn: 'root'
})
export class StockServerService {

  private url = "https://sheltered-bastion-43662.herokuapp.com/";
  private socket:any = io(this.url);

  constructor() { }

  requestStockList()
  {
    this.socket.emit('list');
  }

  getStockList(): Observable<List>
  {
    return new Observable((observer:any) => {
      this.socket.on('list', (data:List) => {
        observer.next(data);
      })
    })
  }

  getStockHistoricalData(): Observable<Historical>
  {
    return new Observable((observer:any) => {
      this.socket.on('list', (data:Historical) => {
        observer.next(data);
      })
    })
  }

  getStockLiveData(symbols: string[]): Observable<Live>
  {
    this.socket.emit('live', {symbols:symbols});

    return new Observable((observer:any) => {
      this.socket.on('live', (data:Live) => {
        observer.next(data);
      })
    })
  }
}
