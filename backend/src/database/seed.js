require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function seed() {
  const users = [
    ['Ana Solicitante', 'CC', '1000000001', 'ana@example.com', '3000000001', 'Solicitante123!', 'SOLICITANTE'],
    ['Luis Solicitante', 'CC', '1000000002', 'luis@example.com', '3000000002', 'Solicitante123!', 'SOLICITANTE'],
    ['Funcionario Uno', 'CC', '2000000001', 'funcionario@example.com', '3100000001', 'Funcionario123!', 'FUNCIONARIO'],
    ['Funcionario Dos', 'CC', '2000000002', 'funcionario2@example.com', '3100000002', 'Funcionario123!', 'FUNCIONARIO']
  ];

  try {
    for (const [fullName, documentType, documentNumber, email, phone, password, role] of users) {
      const hash = await bcrypt.hash(password, 12);
      await pool.execute(
        `INSERT INTO users (full_name, document_type, document_number, email, phone, password_hash, role)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           full_name = VALUES(full_name), document_type = VALUES(document_type),
           document_number = VALUES(document_number), email = VALUES(email),
           phone = VALUES(phone), password_hash = VALUES(password_hash), role = VALUES(role)`,
        [fullName, documentType, documentNumber, email, phone, hash, role]
      );
    }
    console.log('Usuarios de prueba creados/actualizados.');
  } finally {
    await pool.end();
  }
}

seed().catch((error) => {
  console.error('No fue posible cargar los datos de prueba:', error.message);
  process.exitCode = 1;
});
