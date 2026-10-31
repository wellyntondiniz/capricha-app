const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Executa os módulos TS reais sem Metro. Só a URL da API é substituída.
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

const { quizProgress, quizXpDisponivel, quizXpTexto } = load('src/features/quiz/quiz-progress.ts');
const { escolherEventoAtivo } = load('src/features/home/evento-ativo.ts');
const service = load('src/services/quizService.ts');

const quiz = (id, eventoId, respondido, pontuacao = 100) => ({ id, pontuacao, respondido, palestra: { eventoId } });
const token = 'credencial-principal';

// ---------- card "Quiz" da Home ----------

test('Home: carregando, erro e resposta ausente não mostram número inventado', () => {
  assert.equal(quizProgress('carregando', null, 1).texto, 'Consultando quizzes...');
  assert.equal(quizProgress('erro', null, 1).texto, 'Não foi possível consultar os quizzes');
  assert.equal(quizProgress('pronto', null, 1).texto, 'Não foi possível consultar os quizzes');
});

test('Home: o progresso vem dos quizzes reais do evento ativo (nunca "2 de 3" fixo)', () => {
  assert.deepEqual(quizProgress('pronto', [], 1), { tipo: 'progresso', atual: 0, total: 0, texto: 'Nenhum quiz neste evento' });
  const lista = [quiz(1, 1, true), quiz(2, 1, false), quiz(3, 1, false), quiz(4, 2, true)];
  assert.deepEqual(quizProgress('pronto', lista, 1), { tipo: 'progresso', atual: 1, total: 3, texto: '1 de 3 quizzes' });
  assert.deepEqual(quizProgress('pronto', lista, 2), { tipo: 'concluido', texto: '1 de 1 quiz' });
  assert.equal(quizProgress('pronto', lista).texto, '2 de 4 quizzes');
});

test('Home: concluir todos os quizzes do evento marca a missão como concluída', () => {
  const lista = [quiz(1, 5, true), quiz(2, 5, true)];
  assert.deepEqual(quizProgress('pronto', lista, 5), { tipo: 'concluido', texto: '2 de 2 quizzes' });
});

test('Home: selo de XP mostra só o que ainda falta ganhar', () => {
  const lista = [quiz(1, 1, true, 100), quiz(2, 1, false, 100), quiz(3, 1, false, 250), quiz(4, 2, false, 999)];
  assert.equal(quizXpDisponivel(lista, 1), 350);
  assert.equal(quizXpTexto('pronto', lista, 1), 'até +350 XP');
  assert.equal(quizXpTexto('pronto', [quiz(1, 1, true)], 1), '—');
  assert.equal(quizXpTexto('carregando', null, 1), '—');
  assert.equal(quizXpTexto('erro', null, 1), '—');
});

// ---------- evento usado pela Home ----------

const ev = (id, extra) => ({ id, hasCheckedIn: false, canCheckIn: false, status: 'finished', ...extra });

test('Home: usa o evento em andamento com check-in, não o primeiro da lista', () => {
  const eventos = [ev(1), ev(2, { canCheckIn: true, status: 'available' }),
    ev(3, { canCheckIn: true, hasCheckedIn: true, status: 'available' })];
  assert.equal(escolherEventoAtivo(eventos).id, 3);
});

test('Home: sem check-in escolhe o em andamento; depois o encerrado com presença; depois o próximo; por fim o primeiro', () => {
  assert.equal(escolherEventoAtivo([ev(1), ev(2, { canCheckIn: true, status: 'available' })]).id, 2);
  assert.equal(escolherEventoAtivo([ev(1), ev(2, { hasCheckedIn: true })]).id, 2);
  assert.equal(escolherEventoAtivo([ev(1), ev(2, { status: 'upcoming' })]).id, 2);
  assert.equal(escolherEventoAtivo([ev(1), ev(2)]).id, 1);
  assert.equal(escolherEventoAtivo([]), undefined);
});

// ---------- contrato HTTP ----------

const originalFetch = global.fetch;
let chamadas;
function responder(status, corpo) {
  global.fetch = async (url, init) => {
    chamadas.push({ url, init });
    return Response.json(corpo, { status });
  };
}
beforeEach(() => { chamadas = []; global.fetch = async () => { throw new Error('Rede não configurada no teste'); }; });
require('node:test').after(() => { global.fetch = originalFetch; });

test('listar envia a credencial da sessão (a lista agora depende do usuário)', async () => {
  responder(200, []);
  assert.deepEqual(await service.listarQuizzes(token), []);
  assert.equal(chamadas[0].url, 'http://api.test:8080/quizzes');
  assert.equal(chamadas[0].init.headers.Authorization, `Bearer ${token}`);
});

test('responder envia só as respostas; o usuário é o da sessão e os pontos vêm do servidor', async () => {
  responder(201, { quizId: 9, acertos: 2, totalPerguntas: 2, pontosObtidos: 100 });
  const respostas = [{ perguntaId: 1, alternativaIds: [3] }, { perguntaId: 2, alternativaIds: [5, 6] }];
  const r = await service.responderQuiz(token, 9, respostas);
  assert.equal(r.pontosObtidos, 100);
  assert.equal(chamadas[0].url, 'http://api.test:8080/quizzes/9/respostas');
  assert.equal(chamadas[0].init.method, 'POST');
  assert.equal(chamadas[0].init.headers.Authorization, `Bearer ${token}`);
  assert.deepEqual(JSON.parse(chamadas[0].init.body), { respostas });
});

test('recusas do servidor mantêm status, código e mensagem', async () => {
  responder(403, { code: 'LECTURE_CHECK_IN_REQUIRED', mensagem: 'Faça o check-in na palestra "X" para responder este quiz.' });
  await assert.rejects(service.responderQuiz(token, 9, []),
    (e) => e instanceof service.QuizErro && e.status === 403 && e.code === 'LECTURE_CHECK_IN_REQUIRED'
      && e.message.includes('check-in na palestra'));
  responder(409, { code: 'ALREADY_ANSWERED', mensagem: 'Você já respondeu este quiz.' });
  await assert.rejects(service.responderQuiz(token, 9, []), (e) => e.status === 409 && e.code === 'ALREADY_ANSWERED');
});
