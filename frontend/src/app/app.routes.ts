import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { DashboardComponent } from './pages/dashboard.component';
import { LoginComponent } from './pages/login.component';
import { RegisterComponent } from './pages/register.component';
import { RequestFormComponent } from './pages/request-form.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'requests/new', component: RequestFormComponent, canActivate: [authGuard] },
  { path: 'requests/:id/edit', component: RequestFormComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' }
];
