import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <a class="brand" routerLink="/">PQRS<span>Portal de atención</span></a>
      @if (auth.currentUser(); as user) {
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active">Bandeja</a>
          @if (user.role === 'SOLICITANTE') {
            <a class="nav-cta" routerLink="/requests/new">Nueva solicitud</a>
          }
        </nav>
        <div class="profile">
          <span>{{ user.fullName }}<small>{{ user.role === 'FUNCIONARIO' ? 'Funcionario' : 'Solicitante' }}</small></span>
          <button class="link-button" type="button" (click)="logout()">Salir</button>
        </div>
      }
    </header>
    <main class="page-shell"><router-outlet /></main>
    <footer>Portal de Peticiones, Quejas, Reclamos y Sugerencias</footer>
  `
})
export class AppComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
