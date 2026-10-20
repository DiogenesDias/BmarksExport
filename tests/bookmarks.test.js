import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toExportNode, listFolders, buildExport, exportFileName, exportMime, toCsv, toHtml, folderTree, filterFolders } from '../lib/bookmarks.js';

const DATA = 1705320000000;

test('toExportNode converte favorito só em título e URL', () => {
  const favorito = { id: '10', parentId: '1', index: 0, title: 'MDN', url: 'https://developer.mozilla.org/', dateAdded: DATA };

  assert.deepEqual(toExportNode(favorito), { title: 'MDN', url: 'https://developer.mozilla.org/' });
});

test('toExportNode marca pasta com type Folder e converte os children', () => {
  const pasta = {
    id: '5', title: 'Dev', dateAdded: DATA,
    children: [{ id: '6', title: 'MDN', url: 'https://developer.mozilla.org/', dateAdded: DATA }],
  };

  assert.deepEqual(toExportNode(pasta), {
    type: 'Folder',
    title: 'Dev',
    children: [{ title: 'MDN', url: 'https://developer.mozilla.org/' }],
  });
});

// Formato devolvido por chrome.bookmarks.getTree(): um array com a raiz sem título.
const ARVORE = [{
  id: '0', title: '', dateAdded: DATA,
  children: [
    {
      id: '1', title: 'Barra de favoritos', dateAdded: DATA,
      children: [
        { id: '3', title: 'Google', url: 'https://www.google.com/', dateAdded: DATA },
        {
          id: '4', title: 'Dev', dateAdded: DATA,
          children: [{ id: '5', title: 'MDN', url: 'https://developer.mozilla.org/', dateAdded: DATA }],
        },
      ],
    },
    { id: '2', title: 'Outros favoritos', dateAdded: DATA, children: [] },
  ],
}];

test('listFolders lista só as pastas, com o caminho completo, sem a raiz', () => {
  assert.deepEqual(listFolders(ARVORE), [
    { id: '1', path: 'Barra de favoritos' },
    { id: '4', path: 'Barra de favoritos/Dev' },
    { id: '2', path: 'Outros favoritos' },
  ]);
});

test('buildExport sem pasta exporta todas as pastas de topo', () => {
  const agora = new Date(2024, 1, 1, 10, 30);

  const exportacao = buildExport(ARVORE, null, agora);

  assert.equal(exportacao.exportedAt, '2024-02-01');
  assert.equal('folder' in exportacao, false);
  assert.deepEqual(exportacao.bookmarks.map((n) => n.title), ['Barra de favoritos', 'Outros favoritos']);
  assert.equal(exportacao.bookmarks[0].children[1].children[0].url, 'https://developer.mozilla.org/');
});

test('buildExport com pasta exporta só a pasta escolhida', () => {
  const exportacao = buildExport(ARVORE, '4', new Date(2024, 1, 1, 10, 30));

  assert.equal(exportacao.bookmarks.length, 1);
  assert.equal(exportacao.bookmarks[0].title, 'Dev');
  assert.equal(exportacao.bookmarks[0].children[0].url, 'https://developer.mozilla.org/');
});

test('buildExport com pasta inexistente lança erro', () => {
  assert.throws(() => buildExport(ARVORE, '999', new Date()), /999/);
});

test('exportFileName usa o dia e o mês locais e o nome da pasta sem caracteres inválidos', () => {
  // Construída em horário local, para o teste não depender do fuso da máquina.
  const agora = new Date(2024, 0, 5, 23, 50);

  assert.equal(exportFileName(null, agora), 'bookmarks-01-05.json');
  assert.equal(exportFileName('Bookmarks bar/Dev: <JS>', agora), 'bookmarks-Dev-JS-01-05.json');
  assert.equal(exportFileName(null, agora, 'html'), 'bookmarks-01-05.html');
  assert.equal(exportFileName('Bookmarks bar/Dev', agora, 'csv'), 'bookmarks-Dev-01-05.csv');
  assert.equal(exportFileName(null, agora, 'txt'), 'bookmarks-01-05.json');
});

test('exportMime acompanha a extensão', () => {
  assert.equal(exportMime('json'), 'application/json');
  assert.equal(exportMime('html'), 'text/html');
  assert.equal(exportMime('csv'), 'text/csv');
});

test('buildExport full acrescenta só as propriedades presentes', () => {
  const exportacao = buildExport(ARVORE, '4', new Date(2024, 1, 1), { full: true });
  const pasta = exportacao.bookmarks[0];

  assert.equal(pasta.id, '4');
  assert.equal(pasta.dateAdded, DATA);
  assert.equal('dateLastUsed' in pasta, false);
  assert.equal(pasta.children[0].id, '5');
  assert.equal(pasta.children[0].url, 'https://developer.mozilla.org/');
  assert.equal('id' in buildExport(ARVORE, '4', new Date()).bookmarks[0], false);
});

test('buildExport full copia folderType e syncing quando existem', () => {
  const arvore = [{
    id: '0', title: '', children: [{
      id: '1', title: 'Bar', folderType: 'bookmarks-bar', syncing: false, children: [
        { id: '2', title: 'X', url: 'https://x.test/', parentId: '1', index: 0 },
      ],
    }],
  }];
  const pasta = buildExport(arvore, null, new Date(), { full: true }).bookmarks[0];

  assert.equal(pasta.folderType, 'bookmarks-bar');
  assert.equal(pasta.syncing, false);
  assert.equal('dateAdded' in pasta, false);
  assert.equal(pasta.children[0].parentId, '1');
  assert.equal(pasta.children[0].index, 0);
});

const DOC = {
  exportedAt: '2024-02-01',
  source: 'Google Chrome',
  bookmarks: [
    {
      type: 'Folder', title: 'Bar', id: '1', dateAdded: DATA,
      children: [
        { title: 'Say "hi",\nfriend', url: 'https://example.com/a?b=1&c=2', id: '9', parentId: '1', index: 0, dateAdded: DATA },
        { type: 'Folder', title: 'Empty', id: '8', children: [] },
        { title: '<script>', url: 'javascript:alert(1)', id: '7' },
      ],
    },
  ],
};

test('toCsv basic traz um favorito por linha e escapa vírgula, aspas e quebra', () => {
  const csv = toCsv(DOC);

  assert.equal(csv.startsWith('\uFEFF'), true);
  assert.equal(csv.includes('Empty'), false);
  assert.match(csv, /Folder,Title,URL\r\nBar,"Say ""hi"",\nfriend",https:\/\/example.com\/a\?b=1&c=2\r\n/);
});

test('toCsv full inclui a pasta e deixa vazia a data ausente', () => {
  const csv = toCsv(DOC, true);
  const iso = new Date(DATA).toISOString();

  assert.equal(csv.startsWith('\uFEFFType,Folder,Title,URL,Id,ParentId,Index,DateAdded,DateLastUsed,DateGroupModified,Unmodifiable,FolderType\r\n'), true);
  assert.ok(csv.includes(`Folder,Bar,Bar,,1,,,${iso},,,,`));
  assert.ok(csv.includes('Folder,Bar/Empty,Empty,,8,,,,,,,'));
  assert.ok(csv.includes(`Bookmark,Bar,"Say ""hi"",\nfriend",https://example.com/a?b=1&c=2,9,1,0,${iso},,,,`));
  assert.equal(csv.includes('dateLastUsed'), false);
});

test('toHtml basic escapa o título e não cria link para javascript', () => {
  const html = toHtml(DOC);

  assert.equal(html.includes('<script>'), false);
  assert.match(html, /&lt;script&gt;/);
  assert.equal(html.includes('href="javascript:'), false);
  assert.match(html, /<span class="url">javascript:alert\(1\)<\/span>/);
  assert.match(html, /href="https:\/\/example.com\/a\?b=1&amp;c=2"/);
  assert.equal(html.includes('id: 9'), false);
  assert.match(html, /<strong>Empty<\/strong>/);
});

test('toHtml full mostra os campos extras com data em ISO', () => {
  const html = toHtml(DOC, true);

  assert.match(html, /id: 9/);
  assert.match(html, new RegExp(`dateAdded: ${new Date(DATA).toISOString()}`));
  assert.equal(html.includes('dateLastUsed'), false);
});

test('folderTree devolve só as pastas, com o total de favoritos e de subpastas de cada uma', () => {
  assert.deepEqual(folderTree(ARVORE), {
    total: 2,
    folderCount: 3,
    folders: [
      {
        id: '1', title: 'Barra de favoritos', total: 2, folderCount: 1,
        children: [{ id: '4', title: 'Dev', total: 1, folderCount: 0, children: [] }],
      },
      { id: '2', title: 'Outros favoritos', total: 0, folderCount: 0, children: [] },
    ],
  });
});

test('filterFolders mantém a pasta que bate com a busca e as pastas acima dela', () => {
  const resultado = filterFolders(folderTree(ARVORE).folders, 'dev');

  assert.deepEqual(resultado.map((p) => p.id), ['1']);
  assert.deepEqual(resultado[0].children.map((p) => p.id), ['4']);
});

test('filterFolders mantém a subárvore inteira da pasta que bate', () => {
  const resultado = filterFolders(folderTree(ARVORE).folders, 'barra');

  assert.deepEqual(resultado.map((p) => p.id), ['1']);
  assert.deepEqual(resultado[0].children.map((p) => p.id), ['4']);
});

test('filterFolders ignora maiúsculas e acentos e devolve vazio quando nada bate', () => {
  const pastas = [{ id: '9', title: 'Notícias', total: 0, folderCount: 0, children: [] }];

  assert.deepEqual(filterFolders(pastas, 'NOTICIAS').map((p) => p.id), ['9']);
  assert.deepEqual(filterFolders(pastas, 'esporte'), []);
});

test('filterFolders com busca vazia devolve todas as pastas', () => {
  const pastas = folderTree(ARVORE).folders;

  assert.deepEqual(filterFolders(pastas, '  ').map((p) => p.id), ['1', '2']);
});
