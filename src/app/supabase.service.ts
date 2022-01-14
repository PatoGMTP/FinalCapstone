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
  current_date = new Date();

  overview_state: Graph = 
  {
    symbol: "All",
    range_type: "Relative",
    range_number: 86400000,
    start: new Date(this.current_date.getTime() - 86400000),
    end: this.current_date,
    interval: "5 minutes"
  };

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
    const index = this.tracked_symbols.indexOf(symbol);

    if (index >= 0)
    {
      let removed_investment = this.investments_list.find(item => item.symbol == symbol)!;
      let list_removed_graphs = this.custom_graphs.filter((item, i) => item.symbol == symbol && i != 0);

      // If logged in, let Supabase know about changes
      if (this.session)
      {
        this.removeInvestment(removed_investment).then(result => console.log(result));

        list_removed_graphs.forEach(item => {
          this.removeGraph(item).then(console.log);
        });
      }

      this.tracked_symbols.splice(index, 1);
      
      // Much of the code on this page will focus on modifying an object without changing its reference/pointer,
      // hence why we use the following loops and "splice"
      this.investments_list.forEach((item, index, object) =>
      {
        if (item.symbol == symbol)
        {
          object.splice(index, 1);
        }
      });

      this.custom_graphs.forEach((item, index, object) =>
      {
        if (item.symbol == symbol && index != 0)
        {
          object.splice(index, 1);
        }
      });

      // If we're deleting the currently displayed symbol, switch the currently displayed symbol to "All"
      if (this.overview_state.symbol == symbol)
      {
        this.overview_state.symbol = "All";

        if (this.session)
        {
          this.updateGraph(this.overview_state).then(resp => console.log(resp));
        }
      }

      this.graph_subject.next(this.custom_graphs);
      this.symbol_subject.next(this.tracked_symbols);
      this.investments_subject.next(this.investments_list);

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
    Object.assign(this.custom_graphs[index], input)

    this.graph_subject.next(this.custom_graphs);

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
      this.updateGraph(this.overview_state).then(val => {
          this.overview_state.id = val.data![0].id;

          console.log("assigned id", this.overview_state.id);
          this.graph_subject.next(this.custom_graphs);

          console.log("Should have id on first graph", this.page_state);

        // Register everything else
        this.custom_graphs.slice(1).forEach(graph => {
          this.updateGraph(graph).then(resp => {

            // The following ensures that once each graph is registered in the DB, we locally assign each graph
            // the id the database gave them.
            let g = this.custom_graphs.find(i => i == graph);
            if (!g?.id)
            {
              g!.id = resp.data![0].id;
              console.log("assigned id", g?.id);
              this.graph_subject.next(this.custom_graphs);

              console.log("Should have id on next graph", this.page_state);
            }
            else
            {
              console.log("ERROR", g);
            }
          });
        });
        
        this.investments_list.forEach(investment => {

          this.updateInvestment({owner: this.user?.id!, options: investment}).then(resp => {

            // Same as above, assign each investment/stock/symbol their id given by Supabase
            let target = this.investments_list.find(i => i == investment);
            if (!target?.id)
            {
              target!.id = resp.data![0].id;
              console.log("assigned id", target?.id);
              this.investments_subject.next(this.investments_list);

              console.log("Should have id on next investment", this.page_state);
            }
            else
            {
              console.log("ERROR", target);
            }
          });
        });
      });
    });
  };

  load_user(): void
  {
    // Loads the data from Supabase

    // I left in some old code here that shows how I originally wrote this, before I realized that
    // because of the way I wanted the code to behave, I needed to be careful about how I change object pointers/addresses.
    // The original code often assigned new objects, while the new code keeps the original objects
    // whenever possible and focuses on instead transferring the data from object to object

    // This handles Graphs, which covers the Overview graph and all other custom graphs
    this.graphs.then(resp => {

      this.custom_graphs.length = 0;

      // this.custom_graphs = resp.data?.map(item => {return {id: item.id, ...item.options}}) as Graph[];
      resp.data?.map(item => {return {id: item.id, ...item.options} as Graph}).forEach(item => this.custom_graphs.push(item));
      
      // These are the few assignments we still need to do in order to preserve the special condition that
      // custom graph #1 (index 0) is always the overview graph
      this.overview_state = this.custom_graphs[0];
      this.page_state.overview_state = this.overview_state;

      // this.page_state.custom_graphs = this.custom_graphs;
      // this.overview_state = this.custom_graphs[0];

      // console.log("Check 1", this.custom_graphs === this.page_state.custom_graphs);
      // console.log("Check 2", this.overview_state === this.page_state.custom_graphs[0]);
      // console.log("Check 3", this.overview_state === this.page_state.overview_state);
      // console.log("Check 4", this.page_state.overview_state === this.page_state.custom_graphs[0]);

      // console.log(this.custom_graphs, this.overview_state);

      this.graph_subject.next(this.custom_graphs);
    });

    this.investments.then(resp => {

      this.investments_list.length = 0;

      // this.investments_list = resp.data?.map(item => {return {id: item.id, ...item.options}}) as Investment[];
      resp.data?.map(item => {return {id: item.id, ...item.options} as Investment}).forEach(item => this.investments_list.push(item));
      
      this.tracked_symbols.length = 0;
      // this.tracked_symbols = this.investments_list.map(item => item.symbol);
      this.investments_list.map(item => item.symbol).forEach(item => this.tracked_symbols.push(item));

      // this.page_state.investments_list = this.investments_list;
      // this.page_state.tracked_symbols = this.tracked_symbols;

      // console.log("Check 1", this.investments_list === this.page_state.investments_list);
      // console.log("Check 2", this.tracked_symbols === this.page_state.tracked_symbols);

      this.symbol_subject.next(this.tracked_symbols);
      this.investments_subject.next(this.investments_list);
    });
  }

  load_local(): void
  {
    let text = localStorage.getItem("page_state");

    if (text)
    {
      // We could have made a temporary object with the parsed data, and assigned that object's
      // contents to page_state, but it was actually more concise here to simply reassign pointers/addresses
      this.page_state = JSON.parse(text);

      this.tracked_symbols = this.page_state.tracked_symbols;
      this.custom_graphs = this.page_state.custom_graphs;
      this.custom_graphs[0] = this.page_state.overview_state;
      this.overview_state = this.page_state.overview_state;
      this.investments_list = this.page_state.investments_list;
  
      this.symbol_subject.next(this.tracked_symbols);
      this.graph_subject.next(this.custom_graphs);
      this.investments_subject.next(this.investments_list);
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
