import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io } from 'socket.io-client';

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

  getStockList(): Observable<any>
  {
    return new Observable((observer:any) => {
      this.socket.on('list', (data:any) => {
        observer.next(data);
      })
    })
  }

  getStockHistoricalData(): Observable<any>
  {
    return new Observable((observer:any) => {
      this.socket.on('list', (data:any) => {
        observer.next(data);
      })
    })
  }

  getStockLiveData(symbols: string[]): Observable<any>
  {
    this.socket.emit('live', {symbols:symbols});

    return new Observable((observer:any) => {
      this.socket.on('live', (data:any) => {
        observer.next(data);
      })
    })
  }
}
