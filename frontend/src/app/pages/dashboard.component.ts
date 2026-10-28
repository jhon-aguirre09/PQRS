import { Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { PqrsItem, RequestStatus } from '../core/models';
import { RequestFilters, RequestsService } from '../core/requests.service';

@Component({
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink],
  template: `
    <section class="dashboard">
      <div class="page-heading">
        <div>
          <p class="eyebrow">{{ isEmployee ? 'GESTIÓN DE SOLICITUDES' : 'ESPACIO CIUDADANO' }}</p>
          <h1>{{ isEmployee ? 'Bandeja de PQRS' : 'Mis solicitudes' }}</h1>
          <p class="muted">{{ isEmployee ? 'Consulta, clasifica y responde las solicitudes recibidas.' : 'Consulta el estado y las respuestas de tus radicados.' }}</p>
        </div>
        @if (!isEmployee) { <a class="button primary" routerLink="/requests/new">＋ Nueva solicitud</a> }
      </div>

      <div class="card filters">
        @if (isEmployee) {
          <label>Estado
            <select [(ngModel)]="filters.status">
              <option value="">Todos</option><option>Radicada</option><option>En trámite</option>
              <option>Respondida</option><option>Cerrada</option>
            </select>
          </label>
          <label>Tipo
            <select [(ngModel)]="filters.type">
              <option value="">Todos</option><option value="Peticion">Petición</option>
              <option>Queja</option><option>Reclamo</option><option>Sugerencia</option>
            </select>
          </label>
          <label>Desde <input type="date" [(ngModel)]="filters.from"></label>
          <label>Hasta <input type="date" [(ngModel)]="filters.to"></label>
          <button class="button secondary" type="button" (click)="load()">Filtrar</button>
        } @else {
          <span class="filter-label">Historial de solicitudes radicadas</span>
          <button class="button secondary" type="button" (click)="load()">Actualizar</button>
        }
      </div>

      @if (error) { <div class="alert error">{{ error }}</div> }
      @if (success) { <div class="alert success">{{ success }}</div> }
      <div class="dashboard-grid">
        <section class="card list-card">
          <div class="section-title"><h2>Solicitudes</h2><span class="count">{{ total }}</span></div>
          @if (loading) {
            <p class="empty-state">Cargando solicitudes…</p>
          } @else if (items.length === 0) {
            <div class="empty-state"><span class="empty-icon">◎</span><strong>No hay solicitudes</strong><p>Cuando registres una PQRS aparecerá aquí.</p></div>
          } @else {
            <div class="request-list">
              @for (item of items; track item.id) {
                <button class="request-row" [class.selected]="selected?.id === item.id" type="button" (click)="select(item)">
                  <span class="request-row-main">
                    <strong>{{ item.serial_number }}</strong>
                    <span>{{ item.subject }}</span>
                    @if (isEmployee) { <small>{{ item.requester_name }}</small> }
                  </span>
                  <span class="request-row-side">
                    <span class="status" [attr.data-status]="item.status">{{ item.status }}</span>
                    <small>{{ item.created_at | date:'mediumDate' }}</small>
                  </span>
                </button>
              }
            </div>
          }
        </section>

        <section class="card detail-card">
          @if (selected) {
            <div class="section-title">
              <div><p class="eyebrow">{{ selected.request_type }}</p><h2>{{ selected.serial_number }}</h2></div>
              <span class="status" [attr.data-status]="selected.status">{{ selected.status }}</span>
            </div>
            <h3>{{ selected.subject }}</h3>
            <dl class="detail-grid">
              @if (isEmployee) { <div><dt>Solicitante</dt><dd>{{ selected.requester_name }}</dd></div> }
              <div><dt>Fecha de radicación</dt><dd>{{ selected.created_at | date:'medium' }}</dd></div>
              <div><dt>Fecha de los hechos</dt><dd>{{ selected.event_date | date:'longDate' }}</dd></div>
              <div><dt>Dependencia</dt><dd>{{ selected.dependency }}{{ selected.other_dependency ? ': ' + selected.other_dependency : '' }}</dd></div>
              <div><dt>Canal de respuesta</dt><dd>{{ selected.response_channel }}</dd></div>
              @if (selected.claimed_value) { <div><dt>Valor reclamado</dt><dd>{{ selected.claimed_value | currency:'COP':'symbol':'1.0-0' }}</dd></div> }
            </dl>
            <div class="description-block"><strong>Descripción</strong><p>{{ selected.description }}</p></div>

            @if (isEmployee && selected.status === 'Radicada') {
              <button class="button secondary" type="button" (click)="changeStatus(selected, 'En trámite')">Iniciar trámite</button>
            }
            @if (isEmployee && selected.status === 'En trámite') {
              <div class="response-editor">
                <div class="section-title"><div><h3>Respuesta al solicitante</h3><p class="muted">Genera un borrador local y revísalo antes de enviar.</p></div></div>
                <button class="button secondary" type="button" (click)="draft()" [disabled]="drafting">
                  {{ drafting ? 'Generando…' : '✦ Generar borrador con IA' }}
                </button>
                <textarea rows="6" [(ngModel)]="responseText" maxlength="2000" placeholder="Escribe o revisa el borrador de respuesta (20 a 2000 caracteres)"></textarea>
                <button class="button primary" type="button" (click)="sendResponse()" [disabled]="sending || responseText.trim().length < 20">
                  {{ sending ? 'Enviando…' : 'Enviar respuesta' }}
                </button>
              </div>
            }
            @if (selected.response_text) {
              <div class="response-box"><strong>Respuesta oficial</strong><p>{{ selected.response_text }}</p></div>
            }
            @if (!isEmployee && selected.status === 'Radicada') {
              <div class="form-actions">
                <a class="button secondary" [routerLink]="['/requests', selected.id, 'edit']">Editar</a>
                <button class="button danger" type="button" (click)="remove(selected)">Eliminar</button>
              </div>
            }
            @if (isEmployee && selected.status === 'Respondida') {
              <button class="button secondary" type="button" (click)="changeStatus(selected, 'Cerrada')">Cerrar solicitud</button>
            }
          } @else {
            <div class="empty-state detail-empty"><span class="empty-icon">↖</span><strong>Selecciona una solicitud</strong><p>El detalle y las acciones disponibles aparecerán aquí.</p></div>
          }
        </section>
      </div>
    </section>
  `
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly requests = inject(RequestsService);
  private readonly router = inject(Router);
  readonly isEmployee = this.auth.currentUser()?.role === 'FUNCIONARIO';
  items: PqrsItem[] = [];
  selected: PqrsItem | null = null;
  total = 0;
  loading = false;
  drafting = false;
  sending = false;
  responseText = '';
  error = '';
  success = '';
  filters: RequestFilters = { status: '', type: '', from: '', to: '' };

  constructor() {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.requests.list(this.filters).subscribe({
      next: (result) => {
        this.items = result.items;
        this.total = result.total;
        if (this.selected && !this.items.some((item) => item.id === this.selected?.id)) {
          this.selected = null;
        }
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.error = error.error?.message || 'No fue posible cargar las solicitudes.';
        this.loading = false;
      }
    });
  }

  select(item: PqrsItem): void {
    this.error = '';
    this.success = '';
    this.responseText = '';
    this.requests.get(item.id).subscribe({
      next: ({ item: detail }) => this.selected = detail,
      error: (error: HttpErrorResponse) => this.error = error.error?.message || 'No fue posible abrir la solicitud.'
    });
  }

  draft(): void {
    if (!this.selected) return;
    this.drafting = true;
    this.error = '';
    this.requests.generateDraft(this.selected.id).subscribe({
      next: ({ draft }) => {
        this.responseText = draft;
        this.drafting = false;
      },
      error: (error: HttpErrorResponse) => {
        this.error = error.error?.message || 'No fue posible generar el borrador.';
        this.drafting = false;
      }
    });
  }

  sendResponse(): void {
    if (!this.selected || this.responseText.trim().length < 20 || this.sending) return;
    this.sending = true;
    this.error = '';
    this.requests.sendResponse(this.selected.id, this.responseText).subscribe({
      next: ({ item, message }) => {
        this.selected = item;
        this.success = message;
        this.sending = false;
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.error = error.error?.message || 'No fue posible enviar la respuesta.';
        this.sending = false;
      }
    });
  }

  changeStatus(item: PqrsItem, status: RequestStatus): void {
    this.error = '';
    this.requests.changeStatus(item.id, status).subscribe({
      next: ({ item: updated }) => {
        this.selected = updated;
        this.success = `La solicitud pasó a estado ${status}.`;
        this.load();
      },
      error: (error: HttpErrorResponse) => this.error = error.error?.message || 'No fue posible cambiar el estado.'
    });
  }

  remove(item: PqrsItem): void {
    if (!window.confirm(`¿Eliminar la solicitud ${item.serial_number}? Esta acción no se puede deshacer.`)) return;
    this.error = '';
    this.requests.remove(item.id).subscribe({
      next: () => {
        this.selected = null;
        this.success = 'Solicitud eliminada.';
        this.load();
      },
      error: (error: HttpErrorResponse) => this.error = error.error?.message || 'No fue posible eliminar la solicitud.'
    });
  }
}
