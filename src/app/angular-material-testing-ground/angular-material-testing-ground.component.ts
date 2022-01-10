import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import {COMMA, ENTER} from '@angular/cdk/keycodes';

@Component({
  selector: 'app-angular-material-testing-ground',
  templateUrl: './angular-material-testing-ground.component.html',
  styleUrls: ['./angular-material-testing-ground.component.scss']
})
export class AngularMaterialTestingGroundComponent implements OnInit {

  // Basic auto
  myControl = new FormControl();
  options: string[] = ["test", "moo", "Hello", "Multiple words", "1wei3d"];
  filteredOptions: Observable<string[]>;

  // Chips with auto
  fruits: string[] = ["apple"];
  all_fruits: string[] = ["apple", "pear", "banana"];
  fruitCtrl = new FormControl();
  filteredFruits: Observable<string[]>;
  @ViewChild('fruitInput') fruitInput!: ElementRef<HTMLInputElement>;
  separatorKeysCodes: number[] = [ENTER, COMMA];

  // Datepicker
  range = new FormGroup({
    start: new FormControl(),
    end: new FormControl(),
  });

  constructor()
  {
    this.filteredOptions = this.myControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value)),
    );

    this.filteredFruits = this.fruitCtrl.valueChanges.pipe(
      startWith(null),
      map((fruit: string | null) => (fruit ? this._filter2(fruit) : this.all_fruits.slice())),
    );
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.options.filter(option => option.toLowerCase().includes(filterValue));
  }



  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our fruit
    if (value) {
      this.fruits.push(value);
    }

    // Clear the input value
    event.chipInput!.clear();

    this.fruitCtrl.setValue(null);
  }

  remove(fruit: string): void {
    const index = this.fruits.indexOf(fruit);

    if (index >= 0) {
      this.fruits.splice(index, 1);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.fruits.push(event.option.viewValue);
    this.fruitInput.nativeElement.value = '';
    this.fruitCtrl.setValue(null);
  }

  private _filter2(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.all_fruits.filter(fruit => fruit.toLowerCase().includes(filterValue));
  }

  ngOnInit(): void {
  }

}
