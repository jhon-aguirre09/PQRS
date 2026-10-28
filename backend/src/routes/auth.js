const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const documentTypes = new Set(['CC', 'CE', 'TI', 'Pasaporte']);

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    documentType: user.document_type,
    documentNumber: user.document_number,
    email: user.email,
    phone: user.phone,
    role: user.role
  };
}

router.post('/register', async (req, res, next) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { fullName, documentType, documentNumber, email, phone, password, confirmPassword } = body;

  if (typeof fullName !== 'string' || !/^[\p{L}\s]{5,80}$/u.test(fullName.trim())) {
    return res.status(400).json({ message: 'El nombre debe tener entre 5 y 80 letras y espacios.' });
  }
  if (!documentTypes.has(documentType)) {
    return res.status(400).json({ message: 'Selecciona un tipo de documento válido.' });
  }
  if (typeof documentNumber !== 'string' || !/^[A-Za-z0-9]{5,12}$/.test(documentNumber)) {
    return res.status(400).json({ message: 'El documento debe tener entre 5 y 12 caracteres alfanuméricos.' });
  }
  if (typeof email !== 'string' || !emailPattern.test(email)) {
    return res.status(400).json({ message: 'Ingresa un correo electrónico válido.' });
  }
  if (typeof phone !== 'string' || !/^\d{10}$/.test(phone)) {
    return res.status(400).json({ message: 'El teléfono debe tener exactamente 10 dígitos.' });
  }
  if (typeof password !== 'string' || password.length < 8 ||
      !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return res.status(400).json({ message: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Las contraseñas no coinciden.' });
  }

  try {
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR document_number = ? LIMIT 1',
      [email.trim().toLowerCase(), documentNumber]
    );
    if (existing.length) {
      return res.status(409).json({ message: 'El correo o número de documento ya está registrado.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      `INSERT INTO users (full_name, document_type, document_number, email, phone, password_hash, role)
       VALUES (?, ?, ?, ?, ?, ?, 'SOLICITANTE')`,
      [fullName.trim(), documentType, documentNumber, email.trim().toLowerCase(), phone, passwordHash]
    );
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
    return res.status(201).json({ user: publicUser(rows[0]), message: 'Cuenta creada correctamente.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'El correo o número de documento ya está registrado.' });
    }
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { email, password } = body;
  if (typeof email !== 'string' || !emailPattern.test(email) || typeof password !== 'string') {
    return res.status(400).json({ message: 'Correo y contraseña son obligatorios.' });
  }

  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email.trim().toLowerCase()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role, fullName: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    return res.json({ token, user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) {
      return res.status(401).json({ message: 'La cuenta ya no existe.' });
    }
    return res.json({ user: publicUser(rows[0]) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
