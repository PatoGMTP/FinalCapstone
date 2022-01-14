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

  constructor
  (
    private supabase: SupabaseService,
    private dummy: StockServerService,
  )
  {

  }

  ngOnInit(): void
  {
    let logged_in_string = localStorage.getItem("signed_in");

    // This configures the application to run the following function anytime Supabase reports a change in "login status"
    this.supabase.authChanges((_, session) => {
      this.session = session;

      // If user is logged in...
      if (this.session)
      {
        this.supabase.profile.then(resp => {
          // If user doesn't exist on DB yet, make a new entry with local storage data
          if (resp.error && !resp.body)
          {
            this.supabase.new_user();
          }
          // If user does exist on DB, load data from DB
          else
          {
            this.supabase.load_user();
          }
        });
      }
    });

    // If user isn't logged in...
    if (!this.session)
    {
      // If user isn't in the process of logging in...
      if (logged_in_string != "true")
      {
        this.supabase.load_local();
      }
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

  purge(): void
  {
    this.supabase.purge();
  }
}
