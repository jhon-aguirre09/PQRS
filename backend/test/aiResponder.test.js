const test = require('node:test');
const assert = require('node:assert/strict');
const { generateDraft } = require('../src/services/aiResponder');

test('generates a draft that references the request subject', () => {
  const draft = generateDraft({ request_type: 'Queja', subject: 'Atención recibida' });
  assert.match(draft, /Atención recibida/);
  assert.match(draft, /queja/i);
});

test('uses the petition template for unsupported request types', () => {
  const draft = generateDraft({ request_type: 'Otro', subject: 'Consulta general' });
  assert.match(draft, /petición/i);
  assert.match(draft, /Consulta general/);
});
