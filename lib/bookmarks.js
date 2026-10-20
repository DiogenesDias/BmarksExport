// Funções puras sobre a árvore de favoritos do Chrome (chrome.bookmarks.getTree).
// Ficam fora do popup para poderem ser testadas com `node --test`.

// Campos do Chrome que o modo Full copia quando existem no nó. Ausentes ficam de fora.
const CAMPOS_COMPLETOS = ['id', 'parentId', 'index', 'dateAdded', 'dateLastUsed', 'dateGroupModified', 'unmodifiable', 'folderType', 'syncing'];

function camposPresentes(node) {
  const extras = {};
  for (const campo of CAMPOS_COMPLETOS) {
    if (node[campo] !== undefined) extras[campo] = node[campo];
  }
  return extras;
}

// Favorito vira { title, url }; pasta vira { type: 'Folder', title, children }.
// Com full, entram também os campos do Chrome que o nó realmente tem.
export function toExportNode(node, full = false) {
  if (node.children) {
    const children = node.children.map((filho) => toExportNode(filho, full));
    return full
      ? { type: 'Folder', title: node.title, ...camposPresentes(node), children }
      : { type: 'Folder', title: node.title, children };
  }
  return full
    ? { title: node.title, url: node.url, ...camposPresentes(node) }
    : { title: node.title, url: node.url };
}

// Pastas para o seletor do popup, em ordem de árvore. A raiz (sem título) não entra.
export function listFolders(tree) {
  const pastas = [];
  const visitar = (node, prefixo) => {
    if (!node.children) return;
    const caminho = prefixo ? `${prefixo}/${node.title}` : node.title;
    pastas.push({ id: node.id, path: caminho });
    node.children.forEach((filho) => visitar(filho, caminho));
  };
  tree[0].children.forEach((filho) => visitar(filho, ''));
  return pastas;
}

function findNode(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node;
    const achado = node.children && findNode(node.children, id);
    if (achado) return achado;
  }
  return null;
}

const doisDigitos = (n) => String(n).padStart(2, '0');

// AAAA-MM-DD no fuso de quem exporta.
function dataLocal(now) {
  return `${now.getFullYear()}-${doisDigitos(now.getMonth() + 1)}-${doisDigitos(now.getDate())}`;
}

// folderId nulo exporta tudo; senão, só a pasta indicada.
// opcoes.full acrescenta as propriedades do Chrome; sem isso o documento continua o Basic.
export function buildExport(tree, folderId, now, opcoes = {}) {
  const full = Boolean(opcoes.full);
  let nodes = tree[0].children;
  if (folderId) {
    const pasta = findNode(tree, folderId);
    if (!pasta) throw new Error(`Folder ${folderId} not found.`);
    nodes = [pasta];
  }
  return {
    exportedAt: dataLocal(now),
    source: 'Google Chrome',
    bookmarks: nodes.map((node) => toExportNode(node, full)),
  };
}

const EXTENSOES = new Set(['json', 'html', 'csv']);

// bookmarks[-<pasta>]-MM-DD.json, com o dia local de quem exporta.
export function exportFileName(folderPath, now, extension = 'json') {
  const ext = EXTENSOES.has(extension) ? extension : 'json';
  const data = `${doisDigitos(now.getMonth() + 1)}-${doisDigitos(now.getDate())}`;
  const pasta = folderPath
    ? folderPath.split('/').pop().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')
    : '';
  return pasta ? `bookmarks-${pasta}-${data}.${ext}` : `bookmarks-${data}.${ext}`;
}

export function exportMime(extension) {
  if (extension === 'html') return 'text/html';
  if (extension === 'csv') return 'text/csv';
  return 'application/json';
}

function celulaCsv(valor) {
  const texto = valor === undefined || valor === null ? '' : String(valor);
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function dataIso(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return '';
  return new Date(valor).toISOString();
}

const COLUNAS_FULL = ['Type', 'Folder', 'Title', 'URL', 'Id', 'ParentId', 'Index', 'DateAdded', 'DateLastUsed', 'DateGroupModified', 'Unmodifiable', 'FolderType'];

function linhaFull(tipo, caminho, node) {
  return [
    tipo, caminho, node.title, node.url ?? '', node.id ?? '', node.parentId ?? '', node.index ?? '',
    dataIso(node.dateAdded), dataIso(node.dateLastUsed), dataIso(node.dateGroupModified),
    node.unmodifiable ?? '', node.folderType ?? '',
  ];
}

function linhasCsv(nodes, caminhoPai, linhas, full) {
  for (const node of nodes) {
    if (node.type === 'Folder') {
      const caminho = caminhoPai ? `${caminhoPai}/${node.title}` : node.title;
      if (full) linhas.push(linhaFull('Folder', caminho, node));
      linhasCsv(node.children, caminho, linhas, full);
    } else if (full) {
      linhas.push(linhaFull('Bookmark', caminhoPai, node));
    } else {
      linhas.push([caminhoPai, node.title, node.url]);
    }
  }
}

// Basic: uma linha por favorito. Full: pastas também, com as colunas extras.
export function toCsv(doc, full = false) {
  const linhas = [];
  linhasCsv(doc.bookmarks, '', linhas, full);
  const cabecalho = full ? COLUNAS_FULL : ['Folder', 'Title', 'URL'];
  const corpo = [cabecalho, ...linhas].map((linha) => linha.map(celulaCsv).join(',')).join('\r\n');
  return `\uFEFF${corpo}`;
}

function escaparHtml(texto) {
  return String(texto ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Só http e https viram link. javascript: e outros esquemas aparecem como texto.
function hrefSeguro(url) {
  try {
    const protocolo = new URL(url).protocol;
    if (protocolo === 'http:' || protocolo === 'https:') return url;
  } catch {
    // URL relativa ou inválida fica como texto.
  }
  return null;
}

const CAMPOS_META = [
  ['id', 'id'],
  ['parentId', 'parentId'],
  ['index', 'index'],
  ['dateAdded', 'dateAdded'],
  ['dateLastUsed', 'dateLastUsed'],
  ['dateGroupModified', 'dateGroupModified'],
  ['unmodifiable', 'unmodifiable'],
  ['folderType', 'folderType'],
  ['syncing', 'syncing'],
];

const CAMPOS_DATA = new Set(['dateAdded', 'dateLastUsed', 'dateGroupModified']);

function htmlMeta(node, full) {
  if (!full) return '';
  const partes = [];
  for (const [campo, rotulo] of CAMPOS_META) {
    if (node[campo] === undefined) continue;
    const valor = CAMPOS_DATA.has(campo) ? dataIso(node[campo]) : node[campo];
    partes.push(`${rotulo}: ${escaparHtml(valor)}`);
  }
  return partes.length ? `<div class="meta">${partes.join(' · ')}</div>` : '';
}

function htmlItem(node, full) {
  if (node.type === 'Folder') {
    return `<li><strong>${escaparHtml(node.title)}</strong>${htmlMeta(node, full)}${htmlLista(node.children, full)}</li>`;
  }
  const href = hrefSeguro(node.url);
  const corpo = href
    ? `<a href="${escaparHtml(href)}">${escaparHtml(node.title)}</a>`
    : `<span>${escaparHtml(node.title)}</span> <span class="url">${escaparHtml(node.url)}</span>`;
  return `<li>${corpo}${htmlMeta(node, full)}</li>`;
}

function htmlLista(nodes, full) {
  if (!nodes?.length) return '';
  return `<ul>${nodes.map((node) => htmlItem(node, full)).join('')}</ul>`;
}

export function toHtml(doc, full = false) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Bookmarks</title>
<style>
body{margin:24px;font:14px system-ui,sans-serif;color:#202124}
a{color:#1a73e8}
.url,.meta{color:#5f6368}
.meta{font-size:12px}
ul{padding-left:1.2em}
</style>
</head>
<body>
<h1>Bookmarks</h1>
<p class="meta">${escaparHtml(doc.exportedAt)} · ${escaparHtml(doc.source)}</p>
${htmlLista(doc.bookmarks, full)}
</body>
</html>
`;
}

// Árvore só de pastas para o popup, com o total de favoritos e de subpastas de cada uma.
export function folderTree(tree) {
  const converter = (node) => {
    const children = [];
    let total = 0;
    let folderCount = 0;
    for (const filho of node.children) {
      if (filho.children) {
        const pasta = converter(filho);
        children.push(pasta);
        total += pasta.total;
        folderCount += 1 + pasta.folderCount;
      } else {
        total += 1;
      }
    }
    return { id: node.id, title: node.title, total, folderCount, children };
  };
  const raiz = converter(tree[0]);
  return { total: raiz.total, folderCount: raiz.folderCount, folders: raiz.children };
}

const normalizar = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Busca do popup: fica a pasta cujo nome contém o termo (com tudo dentro dela) e as pastas acima dela.
export function filterFolders(folders, term) {
  const busca = normalizar(term.trim());
  if (!busca) return folders;
  const filtrar = (pastas) => pastas.flatMap((pasta) => {
    if (normalizar(pasta.title).includes(busca)) return [pasta];
    const children = filtrar(pasta.children);
    return children.length ? [{ ...pasta, children }] : [];
  });
  return filtrar(folders);
}
