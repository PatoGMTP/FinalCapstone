import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChip, MatChipInputEvent } from '@angular/material/chips';
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
  filtered_symbols: Observable<string[]> = new Observable<string[]>();
  @ViewChild('symbol_input') symbol_input!: ElementRef<HTMLInputElement>;
  @ViewChild('chips') chips!: ElementRef<HTMLDivElement>;
  separatorKeysCodes: number[] = [ENTER, COMMA];

  special = true;

  constructor(private supabase: SupabaseService, private dummy: StockServerService)
  {
  }

  ngOnInit(): void {
    this.supabase.symbol_subject.subscribe(list => {
      this.tracked_symbols = list;
    });

    this.dummy.symbol_updates.subscribe(symbols => {
      this.all_symbols = symbols;

      this.filtered_symbols = this.symbol_ctrl.valueChanges.pipe(
        startWith(null),
        map((symbol: string | null) => (symbol ? this._filter(symbol) : this.all_symbols.slice())),
      );

      this.filtered_symbols.subscribe(thing => console.log(thing));
    });
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim().toUpperCase();

    this.check(value);

    event.chipInput!.clear();
    this.symbol_ctrl.setValue(null);
  }

  remove(symbol: string): void
  {
    const index = this.tracked_symbols.indexOf(symbol);

    if (index >= 0) {
      this.supabase.remove_tracker(symbol);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    let value = event.option.viewValue;
    this.check(value);

    this.symbol_input.nativeElement.value = '';
    this.symbol_ctrl.setValue(null);
  }

  check(input: string): void
  {
    if (input && this.all_symbols.includes(input) && !this.tracked_symbols.includes(input))
    {
      this.supabase.add_tracker(input);
    }
  }

  focus(event: any): void
  {
    this.symbol_input.nativeElement.blur();
    this.symbol_input.nativeElement.focus();
  }

  reselect(evt: any): void
  {
    if (!evt.selected)
    {
      evt.source.select();
    }
  }

  private _filter(value: string): string[]
  {
    const filterValue = value.toLowerCase();

    return this.all_symbols.filter(symbol => symbol.toLowerCase().includes(filterValue));
  }
}
