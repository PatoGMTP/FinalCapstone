import { Component } from '@angular/core';
import { StockServerService } from './stock-server.service';
import { SupabaseService } from './supabase.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'FinalCapstone';

  logged_in: boolean = false;

  constructor(
    private supabase: SupabaseService,
    private dummy: StockServerService,
    )
  {

  }

  ngOnInit(): void
  {
    this.dummy.getStockList().subscribe(console.log);

    this.dummy.requestStockList();
  }

  login(): void
  {
    this.logged_in = true;
  }

  logout(): void
  {
    this.logged_in = false;
  }
}
