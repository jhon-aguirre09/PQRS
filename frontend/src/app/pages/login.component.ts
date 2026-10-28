import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-layout">
      <div class="auth-intro">
        <p class="eyebrow">ATENCIÓN CIUDADANA</p>
        <h1>Tu voz ayuda a mejorar el servicio.</h1>
        <p>Radica y consulta tus peticiones, quejas, reclamos y sugerencias desde un solo lugar.</p>
      </div>
      <form class="card auth-card" [formGroup]="form" (ngSubmit)="submit()">
        <p class="eyebrow">BIENVENIDO</p>
        <h2>Iniciar sesión</h2>
        <label>Correo electrónico
          <input type="email" formControlName="email" autocomplete="email" placeholder="nombre@correo.com">
        </label>
        @if (form.controls.email.touched && form.controls.email.invalid) {
          <small class="field-error">Ingresa un correo válido.</small>
        }
        <label>Contraseña
          <input type="password" formControlName="password" autocomplete="current-password" placeholder="Tu contraseña">
        </label>
        @if (form.controls.password.touched && form.controls.password.invalid) {
          <small class="field-error">La contraseña es obligatoria.</small>
        }
        @if (error) { <div class="alert error">{{ error }}</div> }
        <button class="button primary full" type="submit" [disabled]="form.invalid || loading">
          {{ loading ? 'Ingresando…' : 'Ingresar' }}
        </button>
        <p class="auth-switch">¿Aún no tienes cuenta? <a routerLink="/register">Regístrate aquí</a></p>
      </form>
    </section>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });
  loading = false;
  error = '';

  submit(): void {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.form.getRawValue().email, this.form.getRawValue().password).subscribe({
      next: () => void this.router.navigate(['/dashboard']),
      error: (error: HttpErrorResponse) => {
        this.error = error.error?.message || 'No fue posible iniciar sesión. Revisa la conexión e inténtalo de nuevo.';
        this.loading = false;
      }
    });
  }
}
