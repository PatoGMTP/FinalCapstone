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
    // console.log("add!", this.session);

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
    // console.log("remove!", this.session);

    const index = this.tracked_symbols.indexOf(symbol);

    if (index >= 0)
    {
      let removed_investment = this.investments_list.find(item => item.symbol == symbol)!;
      let list_removed_graphs = this.custom_graphs.filter(item => item.symbol == symbol);

      // console.log(removed_investment, list_removed_graphs);

      // If logged in, let Supabase know about changes
      if (this.session)
      {
        this.removeInvestment(removed_investment).then(result => console.log(result));

        list_removed_graphs.forEach(item => {
          this.removeGraph(item).then(console.log);
        });
      }

      this.tracked_symbols.splice(index, 1);

      // this.investments_list = this.investments_list.filter(item => item.symbol != symbol);
      this.investments_list.forEach((item, index, object) =>
      {
        if (item.symbol == symbol)
        {
          object.splice(index, 1);
        }
      });

      // this.custom_graphs = this.custom_graphs.filter(item => item.symbol != symbol);
      this.custom_graphs.forEach((item, index, object) =>
      {
        if (item.symbol == symbol)
        {
          object.splice(index, 1);
        }
      });

      this.symbol_subject.next(this.tracked_symbols);
      this.graph_subject.next(this.custom_graphs);
      this.investments_subject.next(this.investments_list);

      localStorage.setItem("page_state", JSON.stringify(this.page_state));
    }
  }

  update_overview(input: Graph): void
  {
    // console.log("OLD:", this.overview_state)

    // console.log(this.page_state);

    Object.assign(this.overview_state, input)

    // console.log("NEW:", this.overview_state)
    // this.overview_state = input;
    // this.custom_graphs[0] = input;
    // this.page_state.overview_state = input;

    // console.log("test", this.overview_state === this.custom_graphs[0]);

    this.graph_subject.next(this.custom_graphs);

    if (this.session)
    {
      this.updateGraph({id: input.id, owner: this.user?.id!, options: this.overview_state}).then(resp => console.log(resp));
    }

    // console.log(this.page_state);
    localStorage.setItem("page_state", JSON.stringify(this.page_state));
  }

  new_user(): void
  {
    console.log("Should be initial state", this.page_state);
    this.load_local();
    console.log("Should be restored", this.page_state);

    // Register new user
    this.updateProfile({id: this.user?.id!, updated_at: new Date(), username: "New User"}).then(prof => {
      // console.log(prof);

      // Register Overview widget as first "custom graph"
      this.updateGraph({owner: this.user?.id!, options: this.overview_state}).then(val => {
        // console.log(val);
          this.overview_state.id = val.data![0].id;
          // this.custom_graphs[0] = this.overview_state;
          // this.page_state.overview_state = this.overview_state;
          console.log("assigned id", this.overview_state.id);
          this.graph_subject.next(this.custom_graphs);

          console.log("Should have id on first graph", this.page_state);

        // Register everything else
        this.custom_graphs.forEach((graph, i) => {
          if (i != 0)
          {
            this.updateGraph({owner: this.user?.id!, options: graph}).then(resp => {
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
          }
        });
        
        this.investments_list.forEach(investment => {
          console.log(this.user?.id);
          this.updateInvestment({owner: this.user?.id!, options: investment}).then(resp => {
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
    console.log("Should be inital state", this.page_state);

    this.graphs.then(resp => {
      // console.log(resp)

      this.custom_graphs.length = 0;

      // this.custom_graphs = resp.data?.map(item => {return {id: item.id, ...item.options}}) as Graph[];
      resp.data?.map(item => {return {id: item.id, ...item.options} as Graph}).forEach(item => this.custom_graphs.push(item));
      Object.assign(this.overview_state, this.custom_graphs[0]);
      // this.overview_state = this.custom_graphs[0];

      // console.log(this.custom_graphs, this.overview_state);

      this.graph_subject.next(this.custom_graphs);

      console.log("Should have graphs loaded", this.page_state);
    });

    this.investments.then(resp => {
      // console.log(resp)

      this.investments_list.length = 0;

      // this.investments_list = resp.data?.map(item => {return {id: item.id, ...item.options}}) as Investment[];
      resp.data?.map(item => {return {id: item.id, ...item.options} as Investment}).forEach(item => this.investments_list.push(item));
      
      this.tracked_symbols.length = 0;
      // this.tracked_symbols = this.investments_list.map(item => item.symbol);
      this.investments_list.map(item => item.symbol).forEach(item => this.tracked_symbols.push(item));

      // console.log(this.investments_list, this.tracked_symbols);

      console.log("Should have investments loaded", this.page_state);

      this.symbol_subject.next(this.tracked_symbols);
      this.investments_subject.next(this.investments_list);
    });
  }

  load_local(): void
  {
    let text = localStorage.getItem("page_state");

    if (text)
    {
      console.log("Should have initial state", this.page_state);

      this.page_state = JSON.parse(text);
      this.page_state.overview_state = this.page_state.custom_graphs[0];

      console.log("Should have loaded local", this.page_state);
  
      this.tracked_symbols = this.page_state.tracked_symbols;
      this.custom_graphs = this.page_state.custom_graphs;
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
    localStorage.setItem("page_state", JSON.stringify(this.page_state));

    const { user, session, error, provider, url } = await this.supabase.auth.signIn({provider: 'google'})
  }

  signout(): void
  {
    this.supabase.auth.signOut();
  }

  updateProfile(profile: Profile)
  {
    profile.updated_at = new Date();

    return this.supabase.from('profiles').upsert(profile, {returning: "representation"});
  }

  updateGraph(graph: Graph_Entry)
  {
    console.log(graph.id);
    return this.supabase.from('graphs').upsert(graph, {returning: "representation"});
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
