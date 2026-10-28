import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RequestsService } from '../core/requests.service';
import { PqrsItem, PqrsPayload, RequestType, ResponseChannel } from '../core/models';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="form-page">
      <a routerLink="/dashboard" class="back-link">← Volver a mis solicitudes</a>
      <div class="card form-card">
        <p class="eyebrow">PQRS · {{ editing ? 'EDICIÓN' : 'NUEVA RADICACIÓN' }}</p>
        <h1>{{ editing ? 'Editar solicitud' : 'Radicar una solicitud' }}</h1>
        @if (item) {
          <div class="serial-banner"><span>Número de radicado</span><strong>{{ item.serial_number }}</strong></div>
        }
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-grid">
            <label>Tipo de solicitud
              <select formControlName="requestType">
                <option value="">Selecciona</option>
                <option value="Peticion">Petición</option><option value="Queja">Queja</option>
                <option value="Reclamo">Reclamo</option><option value="Sugerencia">Sugerencia</option>
              </select>
            </label>
            <label>Fecha de los hechos
              <input type="date" formControlName="eventDate" [max]="today" [min]="minDate">
            </label>
            <label class="span-2">Asunto
              <input formControlName="subject" maxlength="120" placeholder="Resume el motivo de tu solicitud">
              <small class="hint">{{ form.controls.subject.value.length }}/120 caracteres (mínimo 10)</small>
            </label>
            <label class="span-2">Descripción
              <textarea rows="6" formControlName="description" maxlength="2000" placeholder="Describe los hechos y lo que solicitas"></textarea>
              <small class="hint">{{ form.controls.description.value.length }}/2000 caracteres (mínimo 30)</small>
            </label>
            <label>Dependencia relacionada
              <select formControlName="dependency">
                <option value="">Selecciona</option>
                <option>Atención al usuario</option><option>Facturación</option>
                <option>Soporte técnico</option><option>Talento humano</option><option>Otra</option>
              </select>
            </label>
            @if (form.controls.dependency.value === 'Otra') {
              <label>¿Cuál?
                <input formControlName="otherDependency" maxlength="60">
              </label>
            }
            @if (form.controls.requestType.value === 'Reclamo') {
              <label>Valor reclamado (COP)
                <input type="number" min="1" step="1" formControlName="claimedValue">
              </label>
            }
            <label>Canal de respuesta
              <select formControlName="responseChannel">
                <option value="">Selecciona</option><option value="Correo">Correo</option><option value="Teléfono">Teléfono</option>
              </select>
            </label>
          </div>
          <label class="checkbox-label">
            <input type="checkbox" formControlName="dataAuthorization">
            <span>Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012.</span>
          </label>
          @if (error) { <div class="alert error">{{ error }}</div> }
          <div class="form-actions">
            <a class="button secondary" routerLink="/dashboard">Cancelar</a>
            <button class="button primary" type="submit" [disabled]="form.invalid || loading">
              {{ loading ? 'Guardando…' : editing ? 'Guardar cambios' : 'Radicar solicitud' }}
            </button>
          </div>
        </form>
      </div>
    </section>
  `
})
export class RequestFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly requests = inject(RequestsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly today = new Date().toISOString().slice(0, 10);
  readonly minDate = (() => {
    const oldestDate = new Date();
    oldestDate.setFullYear(oldestDate.getFullYear() - 1);
    return oldestDate.toISOString().slice(0, 10);
  })();
  readonly form = this.fb.nonNullable.group({
    requestType: ['', Validators.required],
    subject: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.minLength(30), Validators.maxLength(2000)]],
    eventDate: ['', Validators.required],
    dependency: ['', Validators.required],
    otherDependency: [''],
    claimedValue: [null as number | null],
    responseChannel: ['', Validators.required],
    dataAuthorization: [false, Validators.requiredTrue]
  });
  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly editing = Number.isFinite(this.id) && this.id > 0;
  item: PqrsItem | null = null;
  loading = false;
  error = '';

  constructor() {
    if (this.editing) {
      this.requests.get(this.id).subscribe({
        next: ({ item }) => {
          this.item = item;
          this.form.patchValue({
            requestType: item.request_type,
            subject: item.subject,
            description: item.description,
            eventDate: item.event_date.slice(0, 10),
            dependency: item.dependency,
            otherDependency: item.other_dependency || '',
            claimedValue: item.claimed_value,
            responseChannel: item.response_channel,
            dataAuthorization: true
          });
        },
        error: (error: HttpErrorResponse) => {
          this.error = error.error?.message || 'No fue posible cargar la solicitud.';
        }
      });
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading) return;
    const form = this.form.getRawValue();
    const payload: PqrsPayload = {
      requestType: form.requestType as RequestType,
      subject: form.subject,
      description: form.description,
      eventDate: form.eventDate,
      dependency: form.dependency,
      otherDependency: form.otherDependency,
      claimedValue: form.claimedValue,
      responseChannel: form.responseChannel as ResponseChannel,
      dataAuthorization: form.dataAuthorization
    };
    this.loading = true;
    this.error = '';
    const request = this.editing
      ? this.requests.update(this.id, payload)
      : this.requests.create(payload);
    request.subscribe({
      next: () => void this.router.navigate(['/dashboard']),
      error: (error: HttpErrorResponse) => {
        this.error = error.error?.message || 'No fue posible guardar la solicitud.';
        this.loading = false;
      }
    });
  }
}
