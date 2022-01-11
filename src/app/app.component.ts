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

  session = this.supabase.session;

  constructor(
    private supabase: SupabaseService,
    private dummy: StockServerService,
    )
  {

  }

  ngOnInit(): void
  {
    this.dummy.getStockList().subscribe(resp => console.log(resp));

    this.dummy.requestStockList();

    this.supabase.authChanges((_, session) => {
      this.session = session;

      if (this.session)
      {
        this.supabase.profile.then(resp => {
          if (resp.error && !resp.body)
          {
            this.supabase.new_user();
          }
          else
          {
            this.supabase.load_user();
          }
        });
      }
    });

    if (!this.session)
    {
      this.supabase.load_local();
    }
  }

  login(): void
  {
    this.logged_in = true;
    this.supabase.signin();
  }

  logout(): void
  {
    this.logged_in = false;
    this.supabase.signout();
  }
}
