const { test, beforeEach, after } = require('node:test');
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
    if (name === '@/services/api') return { __esModule: true, default: 'http://api.test:8080' };
    if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), `${name}.ts`)));
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}

const { parseVoteQr } = load('src/features/votacao/parse-vote-qr.ts');
const { httpVotacaoService: service } = load('src/features/votacao/http-votacao-service.ts');
const token = 'credencial-principal';
const originalFetch = global.fetch;
beforeEach(() => { global.fetch = async () => { throw new Error('Rede não configurada no teste'); }; });
after(() => { global.fetch = originalFetch; });

const situacao = (extra = {}) => ({ eventoId: 7, hasCheckedIn: true, votesUsed: 1, votesLimit: 3, votesRemaining: 2, votedResumoIds: [4], canVote: true, ...extra });

test('QR do pôster é interpretado; conteúdo malformado e IDs inválidos são recusados', () => {
  assert.deepEqual(parseVoteQr(JSON.stringify({ type: 'RESUMO_VOTE', resumoId: 12 })), { type: 'RESUMO_VOTE', resumoId: 12 });
  for (const value of ['texto', 'null', '[]', '{}', 'x'.repeat(1025),
    JSON.stringify({ type: 'RESUMO_VOTE', resumoId: 0 }), JSON.stringify({ type: 'RESUMO_VOTE', resumoId: -3 }),
    JSON.stringify({ type: 'RESUMO_VOTE', resumoId: 1.5 }), JSON.stringify({ type: 'RESUMO_VOTE', resumoId: '12' }),
    JSON.stringify({ type: 'RESUMO_VOTE', resumoId: 2147483648 }), JSON.stringify({ type: 'OUTRO', resumoId: 1 })]) {
    assert.throws(() => parseVoteQr(value), { code: 'INVALID_QR' });
  }
});

test('QR de check-in lido na tela de votação recebe uma mensagem específica', () => {
  const evento = JSON.stringify({ type: 'EVENT_CHECKIN', eventId: 7, token: 'd9732c36-7bdb-4818-a5e5-6c6610843f53' });
  assert.throws(() => parseVoteQr(evento), (e) => e.code === 'INVALID_QR' && /check-in/.test(e.message));
});

test('situação usa a credencial recebida e valida o formato da resposta', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'http://api.test:8080/evento/7/votacao');
    assert.equal(init.headers.get('Authorization'), `Bearer ${token}`);
    return Response.json(situacao());
  };
  const atual = await service.getSituacao(7, token);
  assert.equal(atual.canVote, true);
  assert.deepEqual(atual.votedResumoIds, [4]);

  for (const corpo of [{}, situacao({ eventoId: 8 }), situacao({ votedResumoIds: [] }), situacao({ votedResumoIds: ['4'] }),
    situacao({ votesRemaining: -1 }), situacao({ votesLimit: 0 }), situacao({ canVote: 'sim' })]) {
    global.fetch = async () => Response.json(corpo);
    await assert.rejects(service.getSituacao(7, token), { code: 'UNKNOWN' });
  }
});

test('voto é um POST sem corpo: a identidade vem só da sessão', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'http://api.test:8080/resumos/12/voto');
    assert.equal(init.method, 'POST');
    assert.equal(init.body, undefined);
    assert.equal(init.headers.get('Authorization'), `Bearer ${token}`);
    return Response.json({ id: 5, resumoId: 12, resumoTitulo: 'T', eventoId: 7, votedAt: new Date().toISOString(), votesUsed: 1, votesRemaining: 2, message: 'ok' }, { status: 201 });
  };
  const registro = await service.votar(12, token);
  assert.equal(registro.id, 5);
  assert.equal(registro.votesRemaining, 2);
});

test('resposta incompleta ou de outro resumo nunca é tratada como voto confirmado', async () => {
  global.fetch = async () => Response.json({});
  await assert.rejects(service.votar(12, token), { code: 'UNKNOWN' });
  global.fetch = async () => Response.json({ id: 5, resumoId: 99, votedAt: new Date().toISOString(), votesUsed: 1, votesRemaining: 2 }, { status: 201 });
  await assert.rejects(service.votar(12, token), { code: 'UNKNOWN' });
  global.fetch = async () => Response.json({ id: 5, resumoId: 12, votedAt: new Date().toISOString() }, { status: 201 });
  await assert.rejects(service.votar(12, token), { code: 'UNKNOWN' });
});

test('erros da API mantêm o código: já votou, sem check-in, sessão expirada e permissão', async () => {
  const falha = (status, body) => { global.fetch = async () => Response.json(body, { status }); };

  falha(409, { code: 'ALREADY_VOTED', mensagem: 'Você já votou neste resumo.' });
  await assert.rejects(service.votar(12, token), { code: 'ALREADY_VOTED', message: 'Você já votou neste resumo.' });

  falha(409, { code: 'VOTE_LIMIT_REACHED', mensagem: 'Você já usou os 3 votos deste evento.' });
  await assert.rejects(service.votar(12, token), { code: 'VOTE_LIMIT_REACHED', status: 409 });

  falha(403, { code: 'NOT_CHECKED_IN', mensagem: 'Faça check-in.' });
  await assert.rejects(service.votar(12, token), { code: 'NOT_CHECKED_IN', status: 403 });

  falha(404, { code: 'RESUMO_NOT_FOUND', mensagem: 'Resumo não encontrado.' });
  await assert.rejects(service.votar(12, token), { code: 'RESUMO_NOT_FOUND' });

  falha(401, { mensagem: 'Sua sessão expirou. Faça login novamente.' });
  await assert.rejects(service.votar(12, token), { code: 'AUTH_REQUIRED' });

  falha(403, { code: 'FORBIDDEN', mensagem: 'Somente administradores podem gerar o QR Code.' });
  await assert.rejects(service.getQrCode(12, token), { code: 'FORBIDDEN' });

  falha(403, { mensagem: 'sem código' });
  await assert.rejects(service.getQrCode(12, token), { code: 'FORBIDDEN' });
});

test('QR do resumo é pedido ao endpoint de administrador', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'http://api.test:8080/resumos/12/qr-code');
    assert.equal(init.headers.get('Authorization'), `Bearer ${token}`);
    return Response.json({ resumoId: 12, resumoTitulo: 'T', payload: '{"type":"RESUMO_VOTE","resumoId":12}', imageData: 'data:image/png;base64,AAAA' });
  };
  const qr = await service.getQrCode(12, token);
  assert.deepEqual(parseVoteQr(qr.payload), { type: 'RESUMO_VOTE', resumoId: 12 });
});