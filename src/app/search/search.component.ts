import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { SupabaseService } from '../supabase.service';
import { StockServerService } from '../stock-server.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {

  tracked_symbols: string[] = [];
  all_symbols: string[] = [];
  symbol_ctrl = new FormControl();
  filtered_symbols: Observable<string[]>;
  @ViewChild('symbol_input') symbol_input!: ElementRef<HTMLInputElement>;
  separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor(private supabase: SupabaseService, private dummy: StockServerService)
  {
    this.filtered_symbols = this.symbol_ctrl.valueChanges.pipe(
      startWith(null),
      map((symbol: string | null) => (symbol ? this._filter(symbol) : this.all_symbols.slice())),
    );
  }

  ngOnInit(): void {
    this.supabase.symbol_subject.subscribe(list => this.tracked_symbols = list);
    this.dummy.getStockList().subscribe(resp => this.all_symbols = resp.symbols);
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim().toUpperCase();

    if (value && this.all_symbols.includes(value) && !this.tracked_symbols.includes(value))
    {
      this.supabase.add_tracker(value);
    }

    event.chipInput!.clear();
    this.symbol_ctrl.setValue(null);
  }

  remove(symbol: string): void
  {
    const index = this.tracked_symbols.indexOf(symbol);

    if (index >= 0) {
      // this.tracked_symbols.splice(index, 1);

      this.supabase.remove_tracker(symbol);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.supabase.add_tracker(event.option.viewValue);
    this.symbol_input.nativeElement.value = '';
    this.symbol_ctrl.setValue(null);
  }

  private _filter(value: string): string[]
  {
    const filterValue = value.toLowerCase();

    return this.all_symbols.filter(symbol => symbol.toLowerCase().includes(filterValue));
  }

}
