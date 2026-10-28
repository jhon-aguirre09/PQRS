const express = require('express');
const pool = require('../config/database');
const { authenticate, allowRoles } = require('../middleware/auth');
const { generateDraft } = require('../services/aiResponder');

const router = express.Router();
const requestTypes = new Set(['Peticion', 'Queja', 'Reclamo', 'Sugerencia']);
const dependencies = new Set(['Atención al usuario', 'Facturación', 'Soporte técnico', 'Talento humano', 'Otra']);
const channels = new Set(['Correo', 'Teléfono']);
const statuses = new Set(['Radicada', 'En trámite', 'Respondida', 'Cerrada']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

router.param('id', (req, res, next, value) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ message: 'El identificador de solicitud no es válido.' });
  }
  req.params.id = String(id);
  return next();
});

function validateRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'El formulario de solicitud no es válido.';
  }
  if (!requestTypes.has(body.requestType)) return 'Selecciona un tipo de solicitud válido.';
  if (typeof body.subject !== 'string' || body.subject.trim().length < 10 || body.subject.trim().length > 120) {
    return 'El asunto debe tener entre 10 y 120 caracteres.';
  }
  if (typeof body.description !== 'string' || body.description.trim().length < 30 || body.description.trim().length > 2000) {
    return 'La descripción debe tener entre 30 y 2000 caracteres.';
  }
  if (typeof body.eventDate !== 'string' || !datePattern.test(body.eventDate)) {
    return 'Ingresa una fecha de los hechos válida.';
  }
  const eventDate = new Date(`${body.eventDate}T00:00:00Z`);
  if (Number.isNaN(eventDate.getTime()) || eventDate.toISOString().slice(0, 10) !== body.eventDate) {
    return 'Ingresa una fecha de los hechos válida.';
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const oldestAllowedDate = new Date(today);
  oldestAllowedDate.setUTCFullYear(oldestAllowedDate.getUTCFullYear() - 1);
  if (eventDate > today || eventDate < oldestAllowedDate) {
    return 'La fecha no puede ser futura ni anterior a un año.';
  }
  if (!dependencies.has(body.dependency)) return 'Selecciona una dependencia válida.';
  if (body.dependency === 'Otra' &&
      (typeof body.otherDependency !== 'string' || body.otherDependency.trim().length < 3 || body.otherDependency.trim().length > 60)) {
    return 'Especifica la dependencia (entre 3 y 60 caracteres).';
  }
  if (!channels.has(body.responseChannel)) return 'Selecciona un canal de respuesta válido.';
  if (body.requestType === 'Reclamo' && (!Number.isSafeInteger(Number(body.claimedValue)) || Number(body.claimedValue) <= 0)) {
    return 'El valor reclamado debe ser un número entero mayor que cero.';
  }
  if (body.dataAuthorization !== true) return 'Debes autorizar el tratamiento de datos para radicar.';
  return null;
}

async function findRequest(id) {
  const [rows] = await pool.execute(
    `SELECT r.*, u.full_name AS requester_name, u.document_type, u.document_number,
            u.email AS requester_email, u.phone AS requester_phone
     FROM pqrs_requests r JOIN users u ON u.id = r.user_id WHERE r.id = ?`,
    [id]
  );
  return rows[0];
}

function canAccess(user, request) {
  return user.role === 'FUNCIONARIO' || request.user_id === user.id;
}

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { status, type, from, to, page = '1', limit = '10' } = req.query;
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 10));
    const conditions = [];
    const values = [];

    if (req.user.role === 'SOLICITANTE') {
      conditions.push('r.user_id = ?');
      values.push(req.user.id);
    }
    if (status && statuses.has(status)) {
      conditions.push('r.status = ?');
      values.push(status);
    }
    if (type && requestTypes.has(type)) {
      conditions.push('r.request_type = ?');
      values.push(type);
    }
    if (from && datePattern.test(from)) {
      conditions.push('DATE(r.created_at) >= ?');
      values.push(from);
    }
    if (to && datePattern.test(to)) {
      conditions.push('DATE(r.created_at) <= ?');
      values.push(to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [counts] = await pool.execute(
      `SELECT COUNT(*) AS total FROM pqrs_requests r ${where}`,
      values
    );
    const offset = (pageNumber - 1) * pageSize;
    const [rows] = await pool.execute(
      `SELECT r.id, r.serial_number, r.request_type, r.subject, r.status, r.created_at,
              r.event_date, u.full_name AS requester_name
       FROM pqrs_requests r JOIN users u ON u.id = r.user_id
       ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );
    return res.json({ items: rows, page: pageNumber, limit: pageSize, total: counts[0].total });
  } catch (error) {
    return next(error);
  }
});

router.post('/', allowRoles('SOLICITANTE'), async (req, res, next) => {
  const validationError = validateRequest(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const year = new Date().getFullYear();
    await connection.execute(
      'INSERT IGNORE INTO pqrs_counters (year, current_value) VALUES (?, 0)',
      [year]
    );
    const [counterRows] = await connection.execute(
      'SELECT current_value FROM pqrs_counters WHERE year = ? FOR UPDATE',
      [year]
    );
    const sequence = counterRows[0].current_value + 1;
    await connection.execute(
      'UPDATE pqrs_counters SET current_value = ? WHERE year = ?',
      [sequence, year]
    );
    const serialNumber = `PQRS-${year}-${String(sequence).padStart(6, '0')}`;
    const [result] = await connection.execute(
      `INSERT INTO pqrs_requests
       (serial_number, user_id, request_type, subject, description, event_date, dependency,
        other_dependency, claimed_value, response_channel, data_authorization, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 'Radicada')`,
      [
        serialNumber, req.user.id, req.body.requestType, req.body.subject.trim(),
        req.body.description.trim(), req.body.eventDate, req.body.dependency,
        req.body.dependency === 'Otra' ? req.body.otherDependency.trim() : null,
        req.body.requestType === 'Reclamo' ? Number(req.body.claimedValue) : null,
        req.body.responseChannel
      ]
    );
    await connection.commit();
    const created = await findRequest(result.insertId);
    return res.status(201).json({ item: created, message: 'Solicitud radicada correctamente.' });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection?.release();
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await findRequest(Number(req.params.id));
    if (!item) return res.status(404).json({ message: 'No se encontró la solicitud.' });
    if (!canAccess(req.user, item)) return res.status(403).json({ message: 'No tienes permiso para ver esta solicitud.' });
    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', allowRoles('SOLICITANTE'), async (req, res, next) => {
  const validationError = validateRequest(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  try {
    const existing = await findRequest(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: 'No se encontró la solicitud.' });
    if (existing.user_id !== req.user.id) return res.status(403).json({ message: 'Solo puedes modificar tus propias solicitudes.' });
    if (existing.status !== 'Radicada') return res.status(409).json({ message: 'Solo se pueden modificar solicitudes en estado Radicada.' });

    await pool.execute(
      `UPDATE pqrs_requests
       SET request_type = ?, subject = ?, description = ?, event_date = ?, dependency = ?,
           other_dependency = ?, claimed_value = ?, response_channel = ?
       WHERE id = ? AND user_id = ? AND status = 'Radicada'`,
      [
        req.body.requestType, req.body.subject.trim(), req.body.description.trim(), req.body.eventDate,
        req.body.dependency, req.body.dependency === 'Otra' ? req.body.otherDependency.trim() : null,
        req.body.requestType === 'Reclamo' ? Number(req.body.claimedValue) : null,
        req.body.responseChannel, existing.id, req.user.id
      ]
    );
    return res.json({ item: await findRequest(existing.id), message: 'Solicitud actualizada correctamente.' });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', allowRoles('SOLICITANTE'), async (req, res, next) => {
  try {
    const [result] = await pool.execute(
      `DELETE FROM pqrs_requests WHERE id = ? AND user_id = ? AND status = 'Radicada'`,
      [Number(req.params.id), req.user.id]
    );
    if (!result.affectedRows) {
      const existing = await findRequest(Number(req.params.id));
      if (!existing) return res.status(404).json({ message: 'No se encontró la solicitud.' });
      if (existing.user_id !== req.user.id) return res.status(403).json({ message: 'Solo puedes eliminar tus propias solicitudes.' });
      return res.status(409).json({ message: 'Solo se pueden eliminar solicitudes en estado Radicada.' });
    }
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/draft', allowRoles('FUNCIONARIO'), async (req, res, next) => {
  try {
    const item = await findRequest(Number(req.params.id));
    if (!item) return res.status(404).json({ message: 'No se encontró la solicitud.' });
    if (item.status !== 'En trámite') {
      return res.status(409).json({ message: 'Debes iniciar el trámite antes de generar la respuesta.' });
    }
    return res.json({ draft: generateDraft(item), provider: 'plantilla-local' });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/response', allowRoles('FUNCIONARIO'), async (req, res, next) => {
  const responseText = typeof req.body.responseText === 'string' ? req.body.responseText.trim() : '';
  if (responseText.length < 20 || responseText.length > 2000) {
    return res.status(400).json({ message: 'La respuesta debe tener entre 20 y 2000 caracteres.' });
  }
  try {
    const item = await findRequest(Number(req.params.id));
    if (!item) return res.status(404).json({ message: 'No se encontró la solicitud.' });
    if (item.status !== 'En trámite') {
      return res.status(409).json({ message: 'La solicitud debe estar En trámite antes de responder.' });
    }
    await pool.execute(
      `UPDATE pqrs_requests
       SET response_text = ?, responded_by = ?, responded_at = CURRENT_TIMESTAMP, status = 'Respondida'
       WHERE id = ?`,
      [responseText, req.user.id, item.id]
    );
    return res.json({ item: await findRequest(item.id), message: 'Respuesta enviada y solicitud marcada como Respondida.' });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/status', allowRoles('FUNCIONARIO'), async (req, res, next) => {
  const allowedTransitions = {
    'Radicada': new Set(['En trámite']),
    'En trámite': new Set(['Respondida', 'Cerrada']),
    'Respondida': new Set(['Cerrada']),
    'Cerrada': new Set()
  };
  try {
    const item = await findRequest(Number(req.params.id));
    if (!item) return res.status(404).json({ message: 'No se encontró la solicitud.' });
    if (!statuses.has(req.body.status) || !allowedTransitions[item.status].has(req.body.status)) {
      return res.status(409).json({ message: 'El cambio de estado no está permitido.' });
    }
    await pool.execute('UPDATE pqrs_requests SET status = ? WHERE id = ?', [req.body.status, item.id]);
    return res.json({ item: await findRequest(item.id) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
