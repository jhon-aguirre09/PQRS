CREATE DATABASE IF NOT EXISTS pqrs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pqrs;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(80) NOT NULL,
  document_type ENUM('CC', 'CE', 'TI', 'Pasaporte') NOT NULL,
  document_number VARCHAR(12) NOT NULL UNIQUE,
  email VARCHAR(254) NOT NULL UNIQUE,
  phone CHAR(10) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('SOLICITANTE', 'FUNCIONARIO') NOT NULL DEFAULT 'SOLICITANTE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pqrs_counters (
  year SMALLINT UNSIGNED NOT NULL PRIMARY KEY,
  current_value INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pqrs_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  serial_number VARCHAR(20) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  request_type ENUM('Peticion', 'Queja', 'Reclamo', 'Sugerencia') NOT NULL,
  subject VARCHAR(120) NOT NULL,
  description VARCHAR(2000) NOT NULL,
  event_date DATE NOT NULL,
  dependency ENUM('Atención al usuario', 'Facturación', 'Soporte técnico', 'Talento humano', 'Otra') NOT NULL,
  other_dependency VARCHAR(60) NULL,
  claimed_value BIGINT UNSIGNED NULL,
  response_channel ENUM('Correo', 'Teléfono') NOT NULL,
  data_authorization BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('Radicada', 'En trámite', 'Respondida', 'Cerrada') NOT NULL DEFAULT 'Radicada',
  response_text VARCHAR(2000) NULL,
  responded_by BIGINT UNSIGNED NULL,
  responded_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pqrs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pqrs_employee FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_pqrs_status_created (status, created_at),
  INDEX idx_pqrs_user_created (user_id, created_at),
  INDEX idx_pqrs_type (request_type)
) ENGINE=InnoDB;
