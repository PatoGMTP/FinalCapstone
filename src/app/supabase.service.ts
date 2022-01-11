import { Injectable } from '@angular/core';
import { AuthChangeEvent, createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Graph } from './graphInt';
import { Investment } from './investmentInt';
import { Profile } from './profileInt';
import { StockServerService } from './stock-server.service';
import { Graph_Entry, Investment_Entry } from './supabaseInts';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  all_symbols: string[] = [];

  tracked_symbols: string[] = [];
  logged_in: boolean = false;
  overview_state: Graph = {symbol: "all", range_type: "relative", start: new Date(0), end: new Date(1_000_000), interval: "5 minutes"};
  custom_graphs: Graph[] = [this.overview_state];
  investments_list: Investment[] = [];

  page_state = 
  {
    tracked_symbols: this.tracked_symbols,
    custom_graphs: this.custom_graphs,
    overview_state: this.overview_state,
    investments_list: this.investments_list,
  };

  symbol_subject = new BehaviorSubject<string[]>([]);
  graph_subject = new BehaviorSubject<Graph[]>(this.custom_graphs);
  investments_subject = new BehaviorSubject<Investment[]>([]);

  constructor(private dummy: StockServerService)
  {
    console.log(this.all_symbols);

    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    this.dummy.getStockList().subscribe(obj => {
      this.all_symbols = obj.symbols;
      console.log(this.all_symbols);
    });
  }

  get user() {
    return this.supabase.auth.user();
  }

  get session() {
    return this.supabase.auth.session();
  }

  get profile() {
    return this.supabase
      .from('profiles')
      .select(`*`)
      .eq('id', this.user?.id)
      .single();
  }

  get graphs() {
    return this.supabase
      .from('graphs')
      .select(`*`)
      .eq('owner', this.user?.id);
  }

  get investments() {
    return this.supabase
      .from('investments')
      .select(`*`)
      .eq('owner', this.user?.id);
  }

  authChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    console.log("Pasta", this.session)
    return this.supabase.auth.onAuthStateChange(callback);
  }

  add_tracker(symbol: string): void
  {
    console.log("add!", this.session);

    let investment = {symbol, units: 0};

    this.tracked_symbols.push(symbol);
    this.investments_list.push(investment);

    // If logged in, update Supabase as well
    if (this.session)
    {
      this.updateInvestment({owner: this.user?.id!, options: investment}).then(console.log);
    }

    this.symbol_subject.next(this.tracked_symbols);

    localStorage.setItem("page_state", JSON.stringify(this.page_state));
  }

  remove_tracker(symbol: string): void
  {
    console.log("remove!", this.session);

    const index = this.tracked_symbols.indexOf(symbol);

    if (index >= 0)
    {
      let removed_investment = this.investments_list.find(item => item.symbol == symbol)!;
      let list_removed_graphs = this.custom_graphs.filter(item => item.symbol == symbol);

      console.log(removed_investment, list_removed_graphs);

      // If logged in, let Supabase know about changes
      if (this.session)
      {
        this.removeInvestment(removed_investment).then(result => console.log(result));

        list_removed_graphs.forEach(item => {
          this.removeGraph(item).then(console.log);
        });
      }

      this.tracked_symbols.splice(index, 1);
      this.investments_list = this.investments_list.filter(item => item.symbol != symbol);
      this.custom_graphs = this.custom_graphs.filter(item => item.symbol != symbol);

      this.symbol_subject.next(this.tracked_symbols);
      this.graph_subject.next(this.custom_graphs);
      this.investments_subject.next(this.investments_list);

      localStorage.setItem("page_state", JSON.stringify(this.page_state));
    }

  }

  new_user(): void
  {
    this.load_local();

    // Register new user
    this.updateProfile({id: this.user?.id!, updated_at: new Date(), username: "New User"}).then(prof => {
      console.log(prof);

      // Register Overview widget as first "custom graph"
      this.updateGraph({owner: this.user?.id!, options: this.overview_state}).then(val => {
        console.log(val);

        // Register everything else
        this.custom_graphs.forEach(graph => {
          this.updateGraph({owner: this.user?.id!, options: graph}).then(console.log);
        });
        
        this.investments_list.forEach((investment, i) => {
          this.updateInvestment({owner: this.user?.id!, options: investment}).then(console.log);
        });
      });

    });
  };

  load_user(): void
  {
    this.graphs.then(resp => {
      console.log(resp)

      this.custom_graphs = resp.data?.map(item => {return {id: item.id, ...item.options}}) as Graph[];
      this.overview_state = this.custom_graphs[0];

      console.log(this.custom_graphs, this.overview_state);

      this.graph_subject.next(this.custom_graphs);
    });

    this.investments.then(resp => {
      console.log(resp)

      this.investments_list = resp.data?.map(item => {return {id: item.id, ...item.options}}) as Investment[];
      this.tracked_symbols = this.investments_list.map(item => item.symbol);

      console.log(this.investments_list, this.tracked_symbols);

      this.symbol_subject.next(this.tracked_symbols);
      this.investments_subject.next(this.investments_list);
    });
  }

  load_local(): void
  {
    let text = localStorage.getItem("page_state");

    if (text)
    {
      this.page_state = JSON.parse(text);
  
      this.tracked_symbols = this.page_state.tracked_symbols;
      this.custom_graphs = this.page_state.custom_graphs;
      this.overview_state = this.page_state.overview_state;
      this.investments_list = this.page_state.investments_list;
  
      this.symbol_subject.next(this.tracked_symbols);
      this.graph_subject.next(this.custom_graphs);
      this.investments_subject.next(this.investments_list);
    }
  }

  async signin(): Promise<void>
  {
    localStorage.setItem("page_state", JSON.stringify(this.page_state));

    const { user, session, error, provider, url } = await this.supabase.auth.signIn({
      provider: 'google',
    })

    console.log(user, session, error, provider, url)
  }

  signout(): void
  {
    this.supabase.auth.signOut();
  }

  updateProfile(profile: Profile)
  {
    profile.updated_at = new Date();

    return this.supabase.from('profiles').upsert(profile, {
      returning: "representation", // Don't return the value after inserting
    });
  }

  updateGraph(graph: Graph_Entry)
  {
    return this.supabase.from('graphs').upsert(graph, {
      returning: "representation", // Don't return the value after inserting
    });
  }

  removeGraph(graph: Graph)
  {
    // return this.supabase.from('graphs').delete().match({owner: this.user?.id, options: graph});
    return this.supabase.from('graphs').delete().eq("id", graph.id);
  }

  updateInvestment(investment: Investment_Entry)
  {
    return this.supabase.from('investments').upsert(investment, {
      returning: "representation", // Don't return the value after inserting
    });
  }

  removeInvestment(investment: Investment)
  {
    // return this.supabase.from('investments').delete().match({owner: this.user?.id, options: investment});
    return this.supabase.from('investments').delete().eq("id", investment.id);
  }
}
