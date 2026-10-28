require('dotenv').config();
const app = require('./app');
const pool = require('./config/database');

const port = Number(process.env.PORT || 3000);

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET debe configurarse con al menos 32 caracteres.');
  }
  await pool.query('SELECT 1');
  app.listen(port, () => {
    console.log(`API PQRS disponible en http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('No fue posible iniciar la API:', error.message);
  process.exitCode = 1;
});
