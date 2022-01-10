import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AngularMaterialTestingGroundComponent } from './angular-material-testing-ground/angular-material-testing-ground.component';
import { GraphsComponent } from './graphs/graphs.component';
import { HomeComponent } from './home/home.component';
import { InvestmentsComponent } from './investments/investments.component';

const routes: Routes = [
  {path: "home", component:HomeComponent},
  {path: "graphs", component:GraphsComponent},
  {path: "investments", component:InvestmentsComponent},
  {path: "test", component:AngularMaterialTestingGroundComponent},
  {path: "", redirectTo: "home", pathMatch: "full"},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
