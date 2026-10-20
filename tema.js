// Roda antes do popup pintar, para a escolha salva não piscar no tema do sistema.
const temaSalvo = localStorage.getItem('tema');
if (temaSalvo === 'light' || temaSalvo === 'dark') document.documentElement.dataset.tema = temaSalvo;
