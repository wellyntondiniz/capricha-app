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

const { lerQrConexao } = load('src/features/conexoes/parse-connection-qr.ts');
const { httpConexaoService: service } = load('src/features/conexoes/http-conexao-service.ts');
const { CheckInError } = load('src/features/check-in/types.ts');
const token = 'credencial-principal';
const qrToken = 'd9732c36-7bdb-4818-a5e5-6c6610843f53';
const qr = JSON.stringify({ type: 'USER_CONNECT', token: qrToken });
const originalFetch = global.fetch;
let chamadas;
function responder(status, corpo) {
  global.fetch = async (url, init) => {
    chamadas.push({ url, init });
    return { ok: status < 400, status, json: async () => corpo };
  };
}
beforeEach(() => {
  chamadas = [];
  global.fetch = async () => { throw new Error('Rede não configurada no teste'); };
});
require('node:test').after(() => { global.fetch = originalFetch; });

test('QR de conexão válido devolve só o token; lixo, outros tipos e tokens inválidos são recusados', () => {
  assert.equal(lerQrConexao(qr), qrToken);
  assert.equal(lerQrConexao(`  ${qr}\n`), qrToken);
  for (const value of ['texto', 'null', '[]', '{}', JSON.stringify({ type: 'USER_CONNECT' }),
    JSON.stringify({ type: 'USER_CONNECT', token: 'abc' }), JSON.stringify({ type: 'USER_CONNECT', token: 42 }),
    JSON.stringify({ type: 'OUTRO', token: qrToken }), 'x'.repeat(1025)]) {
    assert.throws(() => lerQrConexao(value), (e) => e instanceof CheckInError && e.code === 'INVALID_QR', value.slice(0, 30));
  }
});

test('QR de check-in escaneado na tela de conexão recebe uma mensagem específica', () => {
  const evento = JSON.stringify({ type: 'EVENT_CHECKIN', eventId: 7, token: qrToken });
  assert.throws(() => lerQrConexao(evento), (e) => e.code === 'INVALID_QR' && /check-in/.test(e.message));
});

test('identificar valida o QR antes da rede e envia só o token e o evento, com a credencial da sessão', async () => {
  await assert.rejects(service.identificar('texto', 3, token), (e) => e.code === 'INVALID_QR');
  assert.equal(chamadas.length, 0);
  responder(200, { nome: 'Ana', foto: null, relacao: 'NONE', solicitacaoId: null });
  const r = await service.identificar(qr, 3, token);
  assert.equal(r.qrToken, qrToken);
  assert.equal(r.perfil.nome, 'Ana');
  assert.equal(chamadas[0].url, 'http://api.test:8080/conexoes/identificar');
  assert.equal(chamadas[0].init.method, 'POST');
  assert.equal(chamadas[0].init.headers.get('Authorization'), `Bearer ${token}`);
  assert.deepEqual(JSON.parse(chamadas[0].init.body), { qrToken, eventoId: 3 });
});

test('resposta com formato inesperado é tratada como erro, não como sucesso', async () => {
  responder(200, { nome: 'Ana', relacao: 'QUALQUER' });
  await assert.rejects(service.identificar(qr, 3, token), (e) => e.code === 'UNKNOWN');
  responder(200, { recebidas: [], enviadas: [] });
  await assert.rejects(service.getResumo(token), (e) => e.code === 'UNKNOWN');
  responder(200, { id: 1, status: 'RECUSADA', xp: 0 });
  await assert.rejects(service.aceitar(1, token), (e) => e.code === 'UNKNOWN');
});

test('erros do servidor mantêm código e mensagem; 401 vira AUTH_REQUIRED', async () => {
  responder(409, { code: 'ALREADY_CONNECTED', mensagem: 'Vocês já estão conectados neste evento.' });
  await assert.rejects(service.solicitar(qrToken, 3, token), (e) => e.status === 409 && e.message === 'Vocês já estão conectados neste evento.');
  responder(401, { mensagem: 'Sua sessão expirou.' });
  await assert.rejects(service.getResumo(token), (e) => e.code === 'AUTH_REQUIRED');
  await assert.rejects(service.getMeuQr(''), (e) => e.code === 'AUTH_REQUIRED');
});

test('aceitar e recusar chamam a solicitação certa', async () => {
  responder(200, { id: 5, status: 'ACEITA', xp: 150, message: 'ok' });
  assert.equal((await service.aceitar(5, token)).xp, 150);
  assert.equal(chamadas[0].url, 'http://api.test:8080/conexoes/solicitacoes/5/aceitar');
  responder(200, { id: 6, status: 'RECUSADA', xp: 0, message: 'ok' });
  await service.recusar(6, token);
  assert.equal(chamadas.at(-1).url, 'http://api.test:8080/conexoes/solicitacoes/6/recusar');
});

const { conexoesProgress, missaoConexoes, META_CONEXOES } = load('src/features/conexoes/conexoes-progress.ts');
const evento = { id: 7, nome: 'Evento' };
const conexao = (id, eventoId) => ({ id, nome: 'X', foto: null, eventoId, eventoNome: 'E', conectadaEm: null, xp: 150 });
const recebida = (id, eventoId) => ({ id, nome: 'Y', foto: null, eventoId, eventoNome: 'E', criadaEm: '' });

test('card da Home: carregando, erro e resposta ausente não mostram número inventado', () => {
  assert.equal(conexoesProgress('carregando', evento, null).texto, 'Consultando conexões...');
  assert.equal(conexoesProgress('erro', evento, null).texto, 'Não foi possível consultar as conexões');
  assert.equal(conexoesProgress('pronto', evento, null).texto, 'Não foi possível consultar as conexões');
});

test('card da Home: sem check-in pede o check-in; com dados mostra só as conexões do evento ativo', () => {
  const vazio = { recebidas: [], enviadas: [], conexoes: [] };
  assert.deepEqual(conexoesProgress('pronto', undefined, vazio),
    { tipo: 'progresso', atual: 0, total: META_CONEXOES, texto: 'Faça check-in para se conectar · 20 conexões concluem a missão' });
  assert.deepEqual(conexoesProgress('pronto', evento, vazio),
    { tipo: 'progresso', atual: 0, total: 20, texto: '0 de 20 conexões' });
  const resumo = { recebidas: [], enviadas: [], conexoes: [conexao(1, 7), conexao(2, 99), conexao(3, 99)] };
  assert.deepEqual(conexoesProgress('pronto', evento, resumo),
    { tipo: 'progresso', atual: 1, total: 20, texto: '1 de 20 conexões' });
});

test('card da Home: solicitações recebidas aparecem como pendentes e a meta conclui a missão', () => {
  const um = { recebidas: [recebida(1, 7), recebida(2, 99)], enviadas: [], conexoes: [conexao(1, 7)] };
  assert.equal(conexoesProgress('pronto', evento, um).texto, '1 de 20 conexões · 1 pendente');
  const dois = { recebidas: [recebida(1, 7), recebida(2, 7)], enviadas: [], conexoes: [] };
  assert.equal(conexoesProgress('pronto', evento, dois).texto, '0 de 20 conexões · 2 pendentes');
  const quase = { recebidas: [], enviadas: [], conexoes: Array.from({ length: 19 }, (_, i) => conexao(i + 1, 7)) };
  assert.deepEqual(conexoesProgress('pronto', evento, quase), { tipo: 'progresso', atual: 19, total: 20, texto: '19 de 20 conexões' });
  const meta = { recebidas: [], enviadas: [], conexoes: Array.from({ length: 20 }, (_, i) => conexao(i + 1, 7)) };
  assert.deepEqual(conexoesProgress('pronto', evento, meta), { tipo: 'concluido', texto: '20 conexões · missão concluída' });
  const extra = { recebidas: [], enviadas: [], conexoes: Array.from({ length: 23 }, (_, i) => conexao(i + 1, 7)) };
  assert.deepEqual(conexoesProgress('pronto', evento, extra), { tipo: 'concluido', texto: '23 conexões · missão concluída' });
});

test('missão: meta de 20 completa a missão, mas conexões extras continuam contando', () => {
  assert.equal(META_CONEXOES, 20);
  const feitas = (n) => ({ recebidas: [], enviadas: [], conexoes: Array.from({ length: n }, (_, i) => conexao(i + 1, 7)) });
  assert.deepEqual(missaoConexoes(evento, feitas(5)), { feitas: 5, meta: 20, faltam: 15, extras: 0, concluida: false, xpGanho: 750 });
  assert.deepEqual(missaoConexoes(evento, feitas(20)), { feitas: 20, meta: 20, faltam: 0, extras: 0, concluida: true, xpGanho: 3000 });
  assert.deepEqual(missaoConexoes(evento, feitas(22)), { feitas: 22, meta: 20, faltam: 0, extras: 2, concluida: true, xpGanho: 3300 });
  assert.equal(missaoConexoes(undefined, feitas(5)).feitas, 0);
});
