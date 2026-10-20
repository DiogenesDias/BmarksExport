// Textos do popup, só em inglês. Valor em função recebe os parâmetros de traduzir().
export const TEXTOS = {
  titulo: 'Export Bookmarks',
  subtitulo: 'JSON, HTML, CSV',
  oQueExportar: 'What to Export',
  tudo: 'All',
  umaPasta: 'Folder',
  formato: 'Format',
  detalhe: 'Detail',
  json: 'JSON',
  html: 'HTML',
  csv: 'CSV',
  basico: 'Basic',
  completo: 'Full',
  escopo: 'Folder',
  rotuloPastas: 'Folders',
  rotuloFavoritos: 'Bookmarks',
  buscarPasta: 'Search Folder…',
  pastasDeFavoritos: 'Bookmark Folders',
  carregando: 'Loading…',
  nenhumaPasta: 'No Folder Found',
  todosOsFavoritos: 'All bookmarks',
  escolhaNaLista: 'Choose the Folder in the List Above.',
  baixar: 'Download',
  arquivoSalvo: ({ nome }) => `File ${nome} Saved to the Downloads Folder.`,
  temaEscuro: 'Use dark theme',
  temaClaro: 'Use light theme',
  erroExportar: ({ mensagem }) => `Couldn't Export: ${mensagem}`,
  erroLer: ({ mensagem }) => `Couldn't Read the Bookmarks: ${mensagem}`,
};

export function traduzir(chave, params) {
  const texto = TEXTOS[chave];
  return typeof texto === 'function' ? texto(params) : texto;
}
