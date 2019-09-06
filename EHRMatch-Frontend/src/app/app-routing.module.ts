import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ClusterGraphComponent } from './components/cluster-graph/cluster-graph.component';
import { SearchbarComponent } from './components/searchbar/searchbar.component';
import { PatientProfileComponent } from './components/patient-profile/patient-profile.component';
import { PatientComparisonComponent } from './components/patient-comparison/patient-comparison.component'
import { SearchedGuard } from './core/services/searched.guard';

const routes: Routes = [
  { path: '', component: SearchbarComponent },
  { path: 'clustering', component: ClusterGraphComponent, canActivate: [SearchedGuard] },
  { path: 'patient-profile', component: PatientProfileComponent, canActivate: [SearchedGuard] },
  { path: 'patient-comparison', component: PatientComparisonComponent, canActivate: [SearchedGuard] }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
