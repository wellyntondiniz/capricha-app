const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Executa os módulos TS reais sem Metro/câmera. Só a URL e a rede são substituídas.
const modules = new Map();
function load(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (name) => {
    if (name === '@/services/api' || name === './api') return { __esModule: true, default: 'http://api.test:8080' };
    if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), `${name}.ts`)));
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}

const { parseQrCode } = load('src/features/check-in/parse-qr-code.ts');
const { httpCheckInService: service } = load('src/features/check-in/http-check-in-service.ts');
const { restaurarSessao, mesclarSessao, encerrarSessao } = load('src/services/sessaoService.ts');
const token = 'credencial-principal';
const qr = { type: 'EVENT_CHECKIN', eventId: 7, token: 'd9732c36-7bdb-4818-a5e5-6c6610843f53' };
const session = { id: 9, nome: 'Ana', token, expiraEm: new Date(Date.now() + 3600000).toISOString() };
const originalFetch = global.fetch;
beforeEach(() => { global.fetch = async () => { throw new Error('Rede não configurada no teste'); }; });
require('node:test').after(() => { global.fetch = originalFetch; });

test('QR válido é interpretado; conteúdo malformado, IDs e tokens inválidos são recusados', () => {
  assert.deepEqual(parseQrCode(JSON.stringify(qr)), qr);
  for (const value of ['texto', 'null', '[]', '{}', JSON.stringify({ ...qr, eventId: -1 }),
    JSON.stringify({ ...qr, eventId: 1.5 }), JSON.stringify({ ...qr, eventId: 2147483648 }),
    JSON.stringify({ ...qr, type: 'OUTRO' }), JSON.stringify({ ...qr, token: '' }), 'x'.repeat(1025)]) {
    assert.throws(() => parseQrCode(value), { code: 'INVALID_QR' });
  }
});

test('listagem usa URL principal e credencial recebida, sem segundo login', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'http://api.test:8080/evento/check-in');
    assert.equal(init.headers.get('Authorization'), `Bearer ${token}`);
    return Response.json([]);
  };
  assert.deepEqual(await service.getEvents(token), []);
});

test('QR é validado pelo backend antes de apresentar os dados do evento', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'http://api.test:8080/evento/7/check-in/validar');
    assert.deepEqual(JSON.parse(init.body), { qrToken: qr.token });
    return Response.json({ id: 7, nome: 'Evento da develop', descricao: null, dataInicio: null,
      dataTermino: null, checkedInAt: null, hasCheckedIn: false, canCheckIn: false, status: 'upcoming' });
  };
  const result = await service.getEventByQrCode(JSON.stringify(qr), token);
  assert.equal(result.nome, 'Evento da develop');
  assert.equal(result.qrToken, qr.token);
});

test('confirmação envia somente QR, sem aceitar ID de usuário como autenticação', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'http://api.test:8080/evento/7/check-in');
    assert.deepEqual(JSON.parse(init.body), { qrToken: qr.token });
    return Response.json({ id: 31, eventId: 7, checkedInAt: new Date().toISOString() }, { status: 201 });
  };
  assert.equal((await service.checkIn(7, qr.token, token)).id, 31);
});

test('resposta incompleta nunca é tratada como confirmação de sucesso', async () => {
  global.fetch = async () => Response.json({});
  await assert.rejects(service.checkIn(7, qr.token, token), { code: 'UNKNOWN' });
  await assert.rejects(service.getEvents(token), { code: 'UNKNOWN' });
  await assert.rejects(service.getEventByQrCode(JSON.stringify(qr), token), { code: 'UNKNOWN' });
});

test('rede indisponível e respostas inválidas são tratadas como erro', async () => {
  await assert.rejects(service.checkIn(7, qr.token, token), { code: 'NETWORK_ERROR' });
  global.fetch = async () => new Response('<html>Erro</html>', { status: 502 });
  await assert.rejects(service.checkIn(7, qr.token, token), { code: 'UNKNOWN' });
});

test('401, duplicidade e QR de outro evento preservam o motivo da falha', async () => {
  for (const [status, code] of [[401, 'AUTH_REQUIRED'], [409, 'ALREADY_CHECKED_IN'], [400, 'INVALID_EVENT_TOKEN']]) {
    global.fetch = async () => Response.json({ code, mensagem: 'Falha esperada' }, { status });
    await assert.rejects(service.checkIn(7, qr.token, token), { code, message: 'Falha esperada' });
  }
  await assert.rejects(service.getEvents(''), { code: 'AUTH_REQUIRED' });
});

test('restauração conserva credencial e atualiza dados públicos do usuário', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'http://api.test:8080/auth/sessao');
    assert.equal(init.headers.Authorization, `Bearer ${token}`);
    return Response.json({ id: 9, nome: 'Ana atualizada' });
  };
  assert.deepEqual(await restaurarSessao(session), { ...session, nome: 'Ana atualizada' });
});

test('sessões antigas, expiradas e revogadas retornam ao login principal', async () => {
  assert.equal(await restaurarSessao({ id: 9 }), null);
  assert.equal(await restaurarSessao({ ...session, expiraEm: 'inválido' }), null);
  assert.equal(await restaurarSessao({ ...session, expiraEm: '2020-01-01T00:00:00Z' }), null);
  global.fetch = async () => Response.json({ mensagem: 'Sessão expirada' }, { status: 401 });
  assert.equal(await restaurarSessao(session), null);
});

test('indisponibilidade da API preserva sessão local sem simular presença', async () => {
  assert.deepEqual(await restaurarSessao(session), session);
});

test('atualização do perfil preserva credencial, mas nunca a transfere para outro usuário', () => {
  assert.deepEqual(mesclarSessao(session, { id: 9, foto: 'nova.png' }), {
    id: 9, foto: 'nova.png', token, expiraEm: session.expiraEm,
  });
  assert.deepEqual(mesclarSessao(session, { id: 10 }), { id: 10 });
});

test('logout solicita revogação da credencial principal', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'http://api.test:8080/auth/logout');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Authorization, `Bearer ${token}`);
    return new Response(null, { status: 204 });
  };
  await encerrarSessao(token);
});
