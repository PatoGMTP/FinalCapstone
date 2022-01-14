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
  logged_in: boolean = false;
  current_date = new Date();

  page_state: {
    tracked_symbols: string[],
    custom_graphs: Graph[],
    investments_list: Investment[],
  } = {
    tracked_symbols: [],
    custom_graphs: [
      {
        symbol: "All",
        range_type: "Relative",
        range_number: 86400000,
        start: new Date(this.current_date.getTime() - 86400000),
        end: this.current_date,
        interval: "5 minutes"
      }
    ],
    investments_list: [],
  };

  symbol_subject = new BehaviorSubject<string[]>([]);
  graph_subject = new BehaviorSubject<Graph[]>(this.page_state.custom_graphs);
  investments_subject = new BehaviorSubject<Investment[]>([]);

  constructor(private dummy: StockServerService)
  {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    this.dummy.getStockList().subscribe(obj => {
      this.all_symbols = obj.symbols;
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
    return this.supabase.auth.onAuthStateChange(callback);
  }

  add_tracker(symbol: string): void
  {
    let investment = {symbol, units: 0};

    this.page_state.tracked_symbols.push(symbol);
    this.page_state.investments_list.push(investment);

    // If logged in, update Supabase as well
    if (this.session)
    {
      this.updateInvestment({owner: this.user?.id!, options: investment}).then(console.log);
    }

    this.symbol_subject.next(this.page_state.tracked_symbols);

    localStorage.setItem("page_state", JSON.stringify(this.page_state));
  }

  remove_tracker(symbol: string): void
  {
    const index = this.page_state.tracked_symbols.indexOf(symbol);

    if (index >= 0)
    {
      let removed_investment = this.page_state.investments_list.find(item => item.symbol == symbol)!;
      let list_removed_graphs = this.page_state.custom_graphs.filter((item, i) => item.symbol == symbol && i != 0);

      // If logged in, let Supabase know about changes
      if (this.session)
      {
        this.removeInvestment(removed_investment).then(result => console.log(result));

        list_removed_graphs.forEach(item => {
          this.removeGraph(item).then(console.log);
        });
      }

      this.page_state.tracked_symbols.splice(index, 1);
      
      this.page_state.investments_list.forEach((item, index, object) =>
      {
        if (item.symbol == symbol)
        {
          object.splice(index, 1);
        }
      });

      this.page_state.custom_graphs.forEach((item, index, object) =>
      {
        if (item.symbol == symbol && index != 0)
        {
          object.splice(index, 1);
        }
      });

      // If we're deleting the currently displayed symbol, switch the currently displayed symbol to "All"
      if (this.page_state.custom_graphs[0].symbol == symbol)
      {
        this.page_state.custom_graphs[0].symbol = "All";

        if (this.session)
        {
          this.updateGraph(this.page_state.custom_graphs[0]).then(resp => console.log(resp));
        }
      }

      this.graph_subject.next(this.page_state.custom_graphs);
      this.symbol_subject.next(this.page_state.tracked_symbols);
      this.investments_subject.next(this.page_state.investments_list);

      localStorage.setItem("page_state", JSON.stringify(this.page_state));
    }
  }

  update_overview(input: Graph): void
  {
    // Overview is always custom graphs #1 (index 0)
    this.update_custom_graph(input, 0);
  }

  update_custom_graph(input: Graph, index: number): void
  {
    // We use Object.assign() to ensure we don't change pointers/addresses
    Object.assign(this.page_state.custom_graphs[index], input)

    this.graph_subject.next(this.page_state.custom_graphs);

    if (this.session)
    {
      this.updateGraph(input).then(resp => console.log(resp));
    }

    let text = JSON.stringify(this.page_state);

    localStorage.setItem("page_state", text);
  }

  new_user(): void
  {
    // User has just logged in, but Supabase DB has no info for them, so we load local storage and
    // populate the DB with that data as the initial state
    this.load_local();

    // Register new user
    this.updateProfile({id: this.user?.id!, updated_at: new Date(), username: "New User"}).then(prof => {

      // Register Overview widget as first "custom graph"
      this.updateGraph(this.page_state.custom_graphs[0]).then(val => {
        if (val.data)
        {
          this.page_state.custom_graphs[0].id = val.data![0].id;
          console.log("assigned id", this.page_state.custom_graphs[0].id);
          this.graph_subject.next(this.page_state.custom_graphs);
        }
        else
        {
          console.log("ERROR! (Overview):", val, this.page_state.custom_graphs[0]);
        }

        // Register everything else
        this.page_state.custom_graphs.slice(1).forEach(graph => {
          this.updateGraph(graph).then(resp => {

            // The following ensures that once each graph is registered in the DB, we locally assign each graph
            // the id the database gave them.
            if (resp.data)
            {
              graph.id = resp.data[0].id
              console.log("assigned id", graph.id, graph);
              this.graph_subject.next(this.page_state.custom_graphs);
            }
            else
            {
              console.log("ERROR! (Custom Graph):", resp, graph);
            }
          });
        });
        
        this.page_state.investments_list.forEach(investment => {

          this.updateInvestment({owner: this.user?.id!, options: investment}).then(resp => {

            // Same as above, assign each investment/stock/symbol their id given by Supabase
            if (resp.data)
            {
              investment.id = resp.data[0].id
              console.log("assigned id", investment.id, investment);
              this.investments_subject.next(this.page_state.investments_list);
            }
            else
            {
              console.log("ERROR! (Investment):", resp, investment);
            }
          });
        });
      });
    });
  };

  load_user(): void
  {
    // Loads the data from Supabase

    this.graphs.then(resp => {
      // Load data from DB
      this.page_state.custom_graphs = resp.data?.map(item => {return {id: item.id, ...item.options}}) as Graph[];

      // Let subscribers know about changes
      this.graph_subject.next(this.page_state.custom_graphs);
    });

    this.investments.then(resp => {
      // Load data from DB
      this.page_state.investments_list = resp.data?.map(item => {return {id: item.id, ...item.options}}) as Investment[];
      this.page_state.tracked_symbols = this.page_state.investments_list.map(item => item.symbol);

      // Let subscribers know about changes
      this.symbol_subject.next(this.page_state.tracked_symbols);
      this.investments_subject.next(this.page_state.investments_list);
    });
  }

  load_local(): void
  {
    let text = localStorage.getItem("page_state");

    if (text)
    {
      // Load data from local storage
      this.page_state = JSON.parse(text);

      // Let subscribers know about changes
      this.symbol_subject.next(this.page_state.tracked_symbols);
      this.graph_subject.next(this.page_state.custom_graphs);
      this.investments_subject.next(this.page_state.investments_list);
    }
  }

  purge()
  {
    localStorage.removeItem("page_state");
  }

  async signin(): Promise<void>
  {
    console.log(this.page_state);

    let text = JSON.stringify(this.page_state);

    localStorage.setItem("page_state", text);

    localStorage.setItem("signed_in", "true");

    const { user, session, error, provider, url } = await this.supabase.auth.signIn({provider: 'google'})
  }

  signout(): void
  {
    localStorage.setItem("signed_in", "false");

    this.supabase.auth.signOut();
  }

  updateProfile(profile: Profile)
  {
    profile.updated_at = new Date();

    return this.supabase.from('profiles').upsert(profile, {returning: "representation"});
  }

  updateGraph(graph: Graph)
  {
    let output: Graph_Entry = {
      id: graph.id,
      owner: this.user?.id,
      options: graph,
    }

    console.log(output);
    return this.supabase.from('graphs').upsert(output, {returning: "representation"});
  }

  removeGraph(graph: Graph)
  {
    return this.supabase.from('graphs').delete().eq("id", graph.id);
  }

  updateInvestment(investment: Investment_Entry)
  {
    return this.supabase.from('investments').upsert(investment, {returning: "representation"});
  }

  removeInvestment(investment: Investment)
  {
    return this.supabase.from('investments').delete().eq("id", investment.id);
  }
}
