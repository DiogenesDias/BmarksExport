import { test } from 'node:test';
import assert from 'node:assert/strict';
import { traduzir } from '../lib/i18n.js';

test('traduzir devolve os rótulos de formato, detalhe e download', () => {
  assert.equal(traduzir('baixar'), 'Download');
  assert.equal(traduzir('subtitulo'), 'JSON, HTML, CSV');
  assert.equal(traduzir('basico'), 'Basic');
  assert.equal(traduzir('completo'), 'Full');
});

test('traduzir devolve texto simples e texto com parâmetro', () => {
  assert.equal(traduzir('titulo'), 'Export Bookmarks');
  assert.equal(traduzir('arquivoSalvo', { nome: 'a.json' }), 'File a.json Saved to the Downloads Folder.');
});
