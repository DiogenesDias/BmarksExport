import { folderTree, filterFolders, listFolders, buildExport, exportFileName, exportMime, toCsv, toHtml } from './lib/bookmarks.js';
import { traduzir } from './lib/i18n.js';

const botaoTudo = document.getElementById('modo-tudo');
const botaoPasta = document.getElementById('modo-pasta');
const escolhaPasta = document.getElementById('escolha-pasta');
const busca = document.getElementById('busca');
const arvore = document.getElementById('arvore');
const resumo = document.getElementById('resumo');
const grupoFormato = document.getElementById('formato');
const grupoDetalhe = document.getElementById('detalhe');
const botao = document.getElementById('exportar');
const botaoTema = document.getElementById('tema');
const status = document.getElementById('status');
const consultaTema = window.matchMedia('(prefers-color-scheme: dark)');

const FORMATOS = ['json', 'html', 'csv'];
const DETALHES = ['basic', 'full'];

function preferencia(chave, validos, padrao) {
  const valor = localStorage.getItem(chave);
  return validos.includes(valor) ? valor : padrao;
}

let modo = 'tudo';
let formato = preferencia('formato', FORMATOS, 'json');
let detalhe = preferencia('detalhe', DETALHES, 'basic');
// id da pasta escolhida no modo "Uma pasta"; null enquanto nenhuma foi escolhida.
let selecionada = null;
let pastas = [];
let geral = { total: 0, folderCount: 0 };
// Totais e caminho de cada pasta, por id.
const info = new Map();
// Pastas abertas na árvore sem busca; com busca, tudo aparece aberto.
const abertas = new Set();
let carregado = false;

const t = (chave, params) => traduzir(chave, params);

function mostrar(texto, erro = false) {
  status.textContent = texto;
  status.classList.toggle('erro', erro);
}

function elemento(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function registrar(lista) {
  for (const pasta of lista) {
    info.set(pasta.id, { total: pasta.total, folderCount: pasta.folderCount });
    registrar(pasta.children);
  }
}

const SETA = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>';
const PASTA = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.7 4.15c0-.9.73-1.65 1.65-1.65h2.1c.44 0 .86.18 1.16.49l.86.9h5.18c.92 0 1.65.74 1.65 1.65v6.15c0 .91-.73 1.66-1.65 1.66H3.35c-.92 0-1.65-.75-1.65-1.66V4.15z"/></svg>';

function marca(classe, markup) {
  const e = elemento('span', classe);
  e.innerHTML = markup;
  return e;
}

function montarPastas(lista, alvo, buscando) {
  for (const pasta of lista) {
    const no = elemento('div', 'no');
    no.dataset.id = pasta.id;
    no.setAttribute('role', 'treeitem');
    const seta = elemento('span', 'seta');
    no.append(seta, marca('icone', PASTA), elemento('span', 'nome', pasta.title),
      elemento('span', 'contagem', String(pasta.total)));
    no.addEventListener('click', () => escolher(pasta.id));
    alvo.append(no);
    if (pasta.children.length === 0) continue;

    const aberta = buscando || abertas.has(pasta.id);
    seta.innerHTML = SETA;
    no.setAttribute('aria-expanded', String(aberta));
    const filhos = elemento('div', 'filhos');
    filhos.setAttribute('role', 'group');
    filhos.hidden = !aberta;
    seta.addEventListener('click', (evento) => {
      evento.stopPropagation();
      alternar(no, filhos.hidden);
    });
    alvo.append(filhos);
    montarPastas(pasta.children, filhos, buscando);
  }
}

function alternar(no, aberta) {
  const filhos = no.nextElementSibling;
  if (!filhos?.classList.contains('filhos')) return;
  filhos.hidden = !aberta;
  no.setAttribute('aria-expanded', String(aberta));
  if (aberta) abertas.add(no.dataset.id);
  else abertas.delete(no.dataset.id);
}

function desenharArvore() {
  const filtradas = filterFolders(pastas, busca.value);
  arvore.replaceChildren();
  if (filtradas.length === 0) arvore.append(elemento('div', 'vazio', t('nenhumaPasta')));
  else montarPastas(filtradas, arvore, busca.value.trim() !== '');
}

// Atualiza tudo o que depende do modo e da pasta escolhida.
function atualizar() {
  botaoTudo.setAttribute('aria-checked', String(modo === 'tudo'));
  botaoPasta.setAttribute('aria-checked', String(modo === 'pasta'));
  escolhaPasta.hidden = modo === 'tudo';

  for (const no of arvore.querySelectorAll('.no')) {
    const marcada = no.dataset.id === selecionada;
    no.setAttribute('aria-selected', String(marcada));
    no.tabIndex = marcada ? 0 : -1;
  }

  const atual = modo === 'tudo' ? geral : info.get(selecionada);
  if (atual) {
    // Na pasta, conta ela mesma e as subpastas.
    const numPastas = modo === 'tudo' ? atual.folderCount : atual.folderCount + 1;
    preencherResumo(modo === 'tudo' ? t('todosOsFavoritos') : atual.path, numPastas, atual.total);
    botao.disabled = false;
  } else {
    preencherResumo(t('escolhaNaLista'), '—', '—');
    botao.disabled = true;
  }
  mostrar('');
}

function linhaResumo(rotulo, valor) {
  const linha = elemento('div', 'linha');
  linha.append(elemento('dt', '', rotulo), elemento('dd', '', String(valor)));
  return linha;
}

function preencherResumo(escopo, pastasResumo, favoritos) {
  resumo.replaceChildren(
    linhaResumo(t('escopo'), escopo),
    linhaResumo(t('rotuloPastas'), pastasResumo),
    linhaResumo(t('rotuloFavoritos'), favoritos),
  );
}

function marcarSegmento(grupo, valor) {
  for (const opcao of grupo.querySelectorAll('[role="radio"]')) {
    opcao.setAttribute('aria-checked', String(opcao.dataset.valor === valor));
  }
}

// Textos fixos da página vêm dos atributos data-i18n*; os que dependem do estado, de atualizar().
function aplicarTextos() {
  for (const e of document.querySelectorAll('[data-i18n]')) e.textContent = t(e.dataset.i18n);
  for (const e of document.querySelectorAll('[data-i18n-placeholder]')) e.placeholder = t(e.dataset.i18nPlaceholder);
  for (const e of document.querySelectorAll('[data-i18n-aria]')) e.setAttribute('aria-label', t(e.dataset.i18nAria));
  rotuloTema();
  marcarSegmento(grupoFormato, formato);
  marcarSegmento(grupoDetalhe, detalhe);
  if (!carregado) {
    botao.textContent = t('carregando');
    botao.disabled = true;
    preencherResumo(t('carregando'), '—', '—');
    return;
  }
  desenharArvore();
  atualizar();
}

function temaEfetivo() {
  return document.documentElement.dataset.tema || (consultaTema.matches ? 'dark' : 'light');
}

function rotuloTema() {
  botaoTema.setAttribute('aria-label', t(temaEfetivo() === 'dark' ? 'temaClaro' : 'temaEscuro'));
}

botaoTema.addEventListener('click', () => {
  const proximo = temaEfetivo() === 'dark' ? 'light' : 'dark';
  localStorage.setItem('tema', proximo);
  document.documentElement.dataset.tema = proximo;
  rotuloTema();
});

consultaTema.addEventListener('change', () => {
  if (!localStorage.getItem('tema')) rotuloTema();
});

function escolher(id) {
  selecionada = id;
  atualizar();
}

function trocarModo(novo) {
  modo = novo;
  atualizar();
  if (modo === 'pasta') busca.focus();
}

botaoTudo.addEventListener('click', () => trocarModo('tudo'));
botaoPasta.addEventListener('click', () => trocarModo('pasta'));

function ligarSegmento(grupo, aplicar) {
  grupo.addEventListener('click', (evento) => {
    const opcao = evento.target.closest('[role="radio"]');
    if (!opcao) return;
    aplicar(opcao.dataset.valor);
  });
}

ligarSegmento(grupoFormato, (valor) => {
  formato = valor;
  localStorage.setItem('formato', valor);
  marcarSegmento(grupoFormato, valor);
});

ligarSegmento(grupoDetalhe, (valor) => {
  detalhe = valor;
  localStorage.setItem('detalhe', valor);
  marcarSegmento(grupoDetalhe, valor);
});

busca.addEventListener('input', () => {
  desenharArvore();
  atualizar();
});

// Da busca, a seta para baixo entra na árvore.
busca.addEventListener('keydown', (evento) => {
  if (evento.key !== 'ArrowDown') return;
  const primeira = arvore.querySelector('.no');
  if (!primeira) return;
  evento.preventDefault();
  escolher(primeira.dataset.id);
  primeira.focus();
});

// Teclado na árvore: cima e baixo andam pelas linhas visíveis, direita e esquerda abrem e fecham, Enter exporta.
arvore.addEventListener('keydown', (evento) => {
  const atual = evento.target.closest('.no');
  if (!atual) return;
  const visiveis = [...arvore.querySelectorAll('.no')].filter((no) => no.offsetParent !== null);
  const posicao = visiveis.indexOf(atual);
  const focar = (no) => {
    if (!no) return;
    escolher(no.dataset.id);
    no.focus();
  };

  if (evento.key === 'ArrowDown') focar(visiveis[posicao + 1]);
  else if (evento.key === 'ArrowUp') posicao === 0 ? busca.focus() : focar(visiveis[posicao - 1]);
  else if (evento.key === 'ArrowRight') alternar(atual, true);
  else if (evento.key === 'ArrowLeft') alternar(atual, false);
  else if (evento.key === 'Enter') exportar();
  else return;
  evento.preventDefault();
});

function conteudoExportado(exportacao, full) {
  if (formato === 'html') return toHtml(exportacao, full);
  if (formato === 'csv') return toCsv(exportacao, full);
  return JSON.stringify(exportacao, null, 2);
}

function baixar(conteudo, nomeArquivo, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

async function carregar() {
  const dados = await chrome.bookmarks.getTree();
  const arvoreDePastas = folderTree(dados);
  pastas = arvoreDePastas.folders;
  geral = arvoreDePastas;
  registrar(pastas);
  for (const pasta of listFolders(dados)) info.get(pasta.id).path = pasta.path;
  // A primeira pasta de topo (a barra de favoritos) já abre expandida.
  if (pastas[0]) abertas.add(pastas[0].id);

  carregado = true;
  aplicarTextos();
}

async function exportar() {
  if (botao.disabled) return;
  botao.disabled = true;
  try {
    // Lê a árvore de novo para pegar favoritos criados depois que o popup abriu.
    const dados = await chrome.bookmarks.getTree();
    const agora = new Date();
    const idPasta = modo === 'tudo' ? null : selecionada;
    const full = detalhe === 'full';
    const exportacao = buildExport(dados, idPasta, agora, { full });
    const caminho = idPasta ? listFolders(dados).find((pasta) => pasta.id === idPasta).path : null;
    const nome = exportFileName(caminho, agora, formato);
    baixar(conteudoExportado(exportacao, full), nome, exportMime(formato));
    mostrar(t('arquivoSalvo', { nome }));
  } catch (erro) {
    mostrar(t('erroExportar', { mensagem: erro.message }), true);
  } finally {
    botao.disabled = false;
  }
}

botao.addEventListener('click', exportar);
aplicarTextos();
carregar().catch((erro) => mostrar(t('erroLer', { mensagem: erro.message }), true));
