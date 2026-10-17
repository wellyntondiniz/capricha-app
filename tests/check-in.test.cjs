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

const { parseQrCode, validateQrContext } = load('src/features/check-in/parse-qr-code.ts');
const { httpCheckInService: service } = load('src/features/check-in/http-check-in-service.ts');
const { restaurarSessao, mesclarSessao, encerrarSessao } = load('src/services/sessaoService.ts');
const { checkInProgress } = load('src/features/check-in/check-in-progress.ts');
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

const lectureQr = { type: 'LECTURE_CHECKIN', lectureId: 42, token: 'd9732c36-7bdb-4818-a5e5-6c6610843f53' };
const lecture = { id: 42, nome: 'Palestra real', descricao: null, dataInicio: '2026-10-17T12:00:00-04:00',
  dataTermino: null, checkedInAt: null, hasCheckedIn: false, canCheckIn: true, status: 'available', eventoId: 7, palestrante: 'Ana' };

test('scanner distingue evento de palestra e rejeita payload com IDs misturados', () => {
  assert.deepEqual(parseQrCode(JSON.stringify(lectureQr)), lectureQr);
  assert.deepEqual(parseQrCode(JSON.stringify(qr)), qr);
  for (const value of [{ ...lectureQr, eventId: 7 }, { ...qr, lectureId: 42 },
    { ...lectureQr, lectureId: 0 }, { ...lectureQr, lectureId: 1.5 }, { ...lectureQr, token: 'outro' }]) {
    assert.throws(() => parseQrCode(JSON.stringify(value)), { code: 'INVALID_QR' });
  }
});

test('scanner contextual não aceita outra palestra nem um evento de mesmo ID', () => {
  const context = { type: 'LECTURE_CHECKIN', id: 42 };
  assert.doesNotThrow(() => validateQrContext(lectureQr, context));
  assert.throws(() => validateQrContext({ ...lectureQr, lectureId: 43 }, context), { code: 'QR_CONTEXT_MISMATCH' });
  assert.throws(() => validateQrContext({ ...qr, eventId: 42 }, context), { code: 'QR_CONTEXT_MISMATCH' });
});

test('identificação de palestra usa mesmo cliente e credencial, validando tipo e ID no contrato', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'http://api.test:8080/palestras/42/check-in/validar');
    assert.equal(init.headers.get('Authorization'), `Bearer ${token}`);
    assert.deepEqual(JSON.parse(init.body), { type: 'LECTURE_CHECKIN', lectureId: 42, qrToken: lectureQr.token });
    return Response.json(lecture);
  };
  const result = await service.getResourceByQrCode(JSON.stringify(lectureQr), token);
  assert.equal(result.resourceType, 'LECTURE_CHECKIN');
  assert.equal(result.id, 42);
  assert.equal(result.qrToken, lectureQr.token);
});

test('incompatibilidade de contexto é recusada antes de qualquer chamada à API', async () => {
  let chamadas = 0;
  global.fetch = async () => { chamadas++; return Response.json(lecture); };
  await assert.rejects(service.getResourceByQrCode(JSON.stringify(lectureQr), token,
    { type: 'LECTURE_CHECKIN', id: 43 }), { code: 'QR_CONTEXT_MISMATCH' });
  assert.equal(chamadas, 0);
});

test('scanner compartilhado preserva contrato original de eventos', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'http://api.test:8080/evento/7/check-in/validar');
    assert.deepEqual(JSON.parse(init.body), { qrToken: qr.token });
    return Response.json({ ...lecture, id: 7 });
  };
  assert.equal((await service.getResourceByQrCode(JSON.stringify(qr), token)).resourceType, 'EVENT_CHECKIN');
  await assert.rejects(service.getEventByQrCode(JSON.stringify(lectureQr), token), { code: 'INVALID_QR' });
});

test('listagem de palestras restaura presença retornada pelo servidor', async () => {
  global.fetch = async (url) => {
    assert.equal(url, 'http://api.test:8080/palestras/check-in');
    return Response.json([{ ...lecture, hasCheckedIn: true, checkedInAt: new Date().toISOString() }]);
  };
  const result = await service.getLectures(token);
  assert.equal(result[0].hasCheckedIn, true);
  assert.equal(result[0].resourceType, 'LECTURE_CHECKIN');
});

test('confirmação de palestra envia só sua identificação e QR, sem identidade escolhida pelo cliente', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'http://api.test:8080/palestras/42/check-in');
    assert.deepEqual(JSON.parse(init.body), { type: 'LECTURE_CHECKIN', lectureId: 42, qrToken: lectureQr.token });
    return Response.json({ id: 20, lectureId: 42, lectureName: lecture.nome, checkedInAt: new Date().toISOString() }, { status: 201 });
  };
  const result = await service.checkInResource({ ...lecture, resourceType: 'LECTURE_CHECKIN', qrToken: lectureQr.token }, token);
  assert.equal(result.lectureId, 42);
});

test('palestra nunca apresenta sucesso com falha de rede, erro do servidor ou registro incompatível', async () => {
  const selected = { ...lecture, resourceType: 'LECTURE_CHECKIN', qrToken: lectureQr.token };
  await assert.rejects(service.checkInResource(selected, token), { code: 'NETWORK_ERROR' });
  global.fetch = async () => Response.json({ mensagem: 'Falha' }, { status: 500 });
  await assert.rejects(service.checkInResource(selected, token), { code: 'UNKNOWN' });
  global.fetch = async () => Response.json({ id: 20, lectureId: 43, checkedInAt: new Date().toISOString() });
  await assert.rejects(service.checkInResource(selected, token), { code: 'UNKNOWN' });
  await assert.rejects(service.checkInResource({ ...selected, qrToken: undefined }, token), { code: 'INVALID_QR' });
});

test('modal de QR solicita o recurso correto para evento e palestra', async () => {
  const paths = [];
  global.fetch = async (url) => { paths.push(url); return Response.json({ payload: '', imageData: '' }); };
  await service.getResourceQrCode({ ...lecture, resourceType: 'LECTURE_CHECKIN' }, token);
  await service.getResourceQrCode({ ...lecture, id: 7, resourceType: 'EVENT_CHECKIN' }, token);
  assert.deepEqual(paths, ['http://api.test:8080/palestras/42/qr-code', 'http://api.test:8080/evento/7/qr-code']);
});

test('Home calcula conclusão real, separando presenças por evento e palestra', () => {
  const event = { ...lecture, id: 7, hasCheckedIn: false };
  const lectures = [{ ...lecture, id: 42, eventoId: 7, hasCheckedIn: true },
    { ...lecture, id: 43, eventoId: 7, hasCheckedIn: false },
    { ...lecture, id: 44, eventoId: 8, hasCheckedIn: true }];
  const progress = checkInProgress(event, lectures);
  assert.equal(progress.eventStatus.tipo, 'progresso');
  assert.equal(progress.lectureStatus.texto, '1 de 2 palestras');
  assert.equal(checkInProgress({ ...event, hasCheckedIn: true }, lectures).eventStatus.tipo, 'concluido');
  assert.equal(checkInProgress(event, lectures.map(p => ({ ...p, hasCheckedIn: true }))).lectureStatus.tipo, 'concluido');
});

test('Home sem registros não mostra check-in concluído nem inventa total de palestras', () => {
  const progress = checkInProgress(undefined, []);
  assert.equal(progress.eventStatus.tipo, 'progresso');
  assert.equal(progress.lectureStatus.tipo, 'progresso');
  assert.equal(progress.lectureStatus.total, 0);
});
