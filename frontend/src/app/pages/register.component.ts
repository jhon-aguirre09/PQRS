import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="form-page narrow">
      <a routerLink="/login" class="back-link">← Volver al inicio de sesión</a>
      <div class="card form-card">
        <p class="eyebrow">CREA TU CUENTA</p>
        <h1>Registro de solicitante</h1>
        <p class="muted">Completa tus datos para radicar y hacer seguimiento a tus solicitudes.</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-grid">
            <label class="span-2">Nombre completo
              <input formControlName="fullName" autocomplete="name" placeholder="Nombre y apellidos">
              @if (form.controls.fullName.touched && form.controls.fullName.invalid) {
                <small class="field-error">Usa entre 5 y 80 letras y espacios.</small>
              }
            </label>
            <label>Tipo de documento
              <select formControlName="documentType">
                <option value="">Selecciona</option>
                <option value="CC">CC</option><option value="CE">CE</option>
                <option value="TI">TI</option><option value="Pasaporte">Pasaporte</option>
              </select>
            </label>
            <label>Número de documento
              <input formControlName="documentNumber" autocomplete="off">
              @if (form.controls.documentNumber.touched && form.controls.documentNumber.invalid) {
                <small class="field-error">Entre 5 y 12 caracteres alfanuméricos.</small>
              }
            </label>
            <label class="span-2">Correo electrónico
              <input type="email" formControlName="email" autocomplete="email">
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <small class="field-error">Ingresa un correo válido.</small>
              }
            </label>
            <label>Teléfono
              <input type="tel" formControlName="phone" inputmode="numeric" autocomplete="tel" placeholder="10 dígitos">
              @if (form.controls.phone.touched && form.controls.phone.invalid) {
                <small class="field-error">Debe contener exactamente 10 dígitos.</small>
              }
            </label>
            <label>Contraseña
              <input type="password" formControlName="password" autocomplete="new-password">
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <small class="field-error">Mínimo 8 caracteres, una mayúscula, una minúscula y un número.</small>
              }
            </label>
            <label class="span-2">Confirmar contraseña
              <input type="password" formControlName="confirmPassword" autocomplete="new-password">
              @if (form.controls.confirmPassword.touched && form.controls.confirmPassword.invalid) {
                <small class="field-error">Las contraseñas deben coincidir.</small>
              }
            </label>
          </div>
          @if (error) { <div class="alert error">{{ error }}</div> }
          <button class="button primary full" type="submit" [disabled]="form.invalid || loading">
            {{ loading ? 'Creando cuenta…' : 'Crear cuenta' }}
          </button>
        </form>
      </div>
    </section>
  `
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(80), Validators.pattern(/^[\p{L}\s]+$/u)]],
    documentType: ['', Validators.required],
    documentNumber: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(12), Validators.pattern(/^[A-Za-z0-9]+$/)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)]],
    confirmPassword: ['', Validators.required]
  });
  loading = false;
  error = '';

  submit(): void {
    if (this.form.invalid || this.loading) return;
    const data = this.form.getRawValue();
    if (data.password !== data.confirmPassword) {
      this.form.controls.confirmPassword.setErrors({ mismatch: true });
      return;
    }
    this.loading = true;
    this.error = '';
    this.auth.register(data).subscribe({
      next: () => void this.router.navigate(['/login'], { queryParams: { registered: '1' } }),
      error: (error: HttpErrorResponse) => {
        this.error = error.error?.message || 'No fue posible crear la cuenta. Inténtalo nuevamente.';
        this.loading = false;
      }
    });
  }
}
