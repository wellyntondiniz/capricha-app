const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Executa o módulo TS real sem Metro
const arquivo = path.resolve(__dirname, '..', 'src/features/quiz/perguntas-quiz.ts');
const codigo = ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const modulo = { exports: {} };
new Function('module', 'exports', codigo)(modulo, modulo.exports);
const { perguntaValida, resumirPerguntas, agruparPorPalestra, textoPerguntas } = modulo.exports;

const alt = (correta) => ({ correta });
const pergunta = (id, palestraId, alternativas, ativo = true) => ({ id, ativo, alternativas, palestra: { id: palestraId } });

test('pergunta válida precisa de 2+ alternativas e ao menos uma correta', () => {
  assert.equal(perguntaValida(pergunta(1, 1, [alt(true), alt(false)])), true);
  assert.equal(perguntaValida(pergunta(2, 1, [alt(true)])), false);
  assert.equal(perguntaValida(pergunta(3, 1, [alt(false), alt(false)])), false);
  assert.equal(perguntaValida(pergunta(4, 1, [])), false);
  assert.equal(perguntaValida({ id: 5 }), false);
  assert.equal(perguntaValida(pergunta(6, 1, [alt(true), alt(false)], false)), false);
});

test('resumo separa perguntas válidas das incompletas e ignora as excluídas', () => {
  const lista = [
    pergunta(1, 1, [alt(true), alt(false)]),
    pergunta(2, 1, [alt(true), alt(false), alt(false)]),
    pergunta(3, 1, [alt(true)]),
    pergunta(4, 1, [alt(true), alt(false)], false),
  ];
  assert.deepEqual(resumirPerguntas(lista), { total: 3, validas: 2, incompletas: 1 });
  assert.deepEqual(resumirPerguntas([]), { total: 0, validas: 0, incompletas: 0 });
});

test('agrupa as perguntas ativas pela palestra', () => {
  const lista = [
    pergunta(1, 10, [alt(true), alt(false)]),
    pergunta(2, 10, [alt(true), alt(false)]),
    pergunta(3, 20, [alt(true), alt(false)]),
    pergunta(4, 20, [alt(true), alt(false)], false),
    { id: 5, alternativas: [alt(true), alt(false)] },
  ];
  const grupos = agruparPorPalestra(lista);
  assert.equal(grupos.get(10).length, 2);
  assert.equal(grupos.get(20).length, 1);
  assert.equal(grupos.size, 2);
});

test('texto no singular e no plural', () => {
  assert.equal(textoPerguntas(0), '0 perguntas');
  assert.equal(textoPerguntas(1), '1 pergunta');
  assert.equal(textoPerguntas(3), '3 perguntas');
});