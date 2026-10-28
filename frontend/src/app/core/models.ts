export type UserRole = 'SOLICITANTE' | 'FUNCIONARIO';
export type RequestType = 'Peticion' | 'Queja' | 'Reclamo' | 'Sugerencia';
export type RequestStatus = 'Radicada' | 'En trámite' | 'Respondida' | 'Cerrada';
export type ResponseChannel = 'Correo' | 'Teléfono';

export interface User {
  id: number;
  fullName: string;
  documentType: string;
  documentNumber: string;
  email: string;
  phone: string;
  role: UserRole;
}

export interface PqrsItem {
  id: number;
  serial_number: string;
  user_id: number;
  request_type: RequestType;
  subject: string;
  description: string;
  event_date: string;
  dependency: string;
  other_dependency: string | null;
  claimed_value: number | null;
  response_channel: ResponseChannel;
  status: RequestStatus;
  response_text: string | null;
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  created_at: string;
}

export interface PqrsList {
  items: PqrsItem[];
  page: number;
  limit: number;
  total: number;
}

export interface PqrsPayload {
  requestType: RequestType;
  subject: string;
  description: string;
  eventDate: string;
  dependency: string;
  otherDependency: string;
  claimedValue: number | null;
  responseChannel: ResponseChannel;
  dataAuthorization: boolean;
}
