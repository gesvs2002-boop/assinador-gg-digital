const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/jief-pdf.js');

function response() {
  return {
    statusCode: 200, headers: {}, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    send(value) { this.body = value; return this; },
    end() { return this; }
  };
}

const id = '11111111-2222-4333-8444-555555555555';
const request = { method: 'GET', query: { id }, headers: { authorization: 'Bearer test-token' } };

test('JIEF PDF endpoint refuses requests without an admin-visible registration', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => [] });
  try {
    const res = response();
    await handler(request, res);
    assert.equal(res.statusCode, 404);
    assert.equal(res.headers['Cache-Control'], 'private, no-store');
  } finally { global.fetch = originalFetch; }
});

test('JIEF PDF endpoint reuses the public form generator for an admin-visible registration', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return { ok: true, json: async () => [{
      team: 'Turma teste', team_name: 'Equipe teste', leader_name: 'Lider teste',
      leader_phone: '11999999999', submission_code: 'JIEF-2026-TESTE',
      rosters: [{ title: 'Futsal masculino', note: 'Teste', entries: [{ name: 'Atleta Teste', origin: '__mesma_turma__', gender: 'M' }] }]
    }] };
  };
  try {
    const res = response();
    await handler(request, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Content-Type'], 'application/pdf');
    assert.equal(res.body.subarray(0, 4).toString(), '%PDF');
    assert.ok(res.body.length > 2000);
  } finally { global.fetch = originalFetch; }
});
