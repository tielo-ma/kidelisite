// Sistema de Autenticação e Fidelidade
console.log('[Auth] Inicializando sistema de autenticação e fidelidade...');

// Constantes melhoradas
const FIDELIDADE = {
  niveis: {
    BRONZE: { minPontos: 0,maxPontos:999, desconto: 0, multiplicador: 1, next:'PRATA' },
    PRATA: { minPontos: 1000,maxPontos:4999, desconto: 5, multiplicador: 1.2, next:'OURO' },
    OURO: { minPontos: 5000,maxPontos:9999, desconto: 10, multiplicador: 1.5, next:'DIAMANTE' },
    DIAMANTE: { minPontos: 15000,maxPontos:Infinity, desconto: 15, multiplicador: 2 }
  },
  BONUS_ANIVERSARIO: 1000,
  PONTOS_POR_REAL: 10,

  calculateProgress(points) {
    const currentLevel = this.getCurrentLevel(points);
    const nextLevel = this.levels[currentLevel].next;
    
    if (!nextLevel) return 100; // Máximo nível
    
    const progress = ((points - this.levels[currentLevel].minPontos) / 
                     (this.levels[nextLevel].minPontos - this.levels[currentLevel].minPontos)) * 100;
    return Math.minPontos(100, Math.maxPontos(0, progress));
  },

  getCurrentLevel(points) {
    for (const [level, config] of Object.entries(this.levels)) {
      if (points >= config.minPontos && points <= config.maxPontos) {
        return level;
      }
    }
    return 'bronze';
  }
}

const USER_STORAGE_KEY = 'app_users';
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

const CONFIG = {
  CEP_API: 'https://viacep.com.br/ws/{cep}/json/',
  CIDADE_PADRAO: 'Natal',
  UF_PADRAO: 'RN',
  SENHA_MIN_LENGTH: 6
};

/* ========== FUNÇÕES UTILITÁRIAS ========== */
function getElement(selector, required = false) {
  const element = document.querySelector(selector);
  if (!element && required) {
    console.error(`Elemento não encontrado: ${selector}`);
    throw new Error(`Elemento ${selector} não encontrado`);
  }
  return element;
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getFormValue(form, selector) {
  const element = form.querySelector(selector);
  return element ? element.value.trim() : null;
}

function setFormValue(selector, value) {
  const element = getElement(selector);
  if (element) element.value = value;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

/* ========== FUNÇÕES DE FIDELIDADE ========== */
function calcularNivelFidelidade(pontos) {
  const niveis = Object.entries(FIDELIDADE.niveis).reverse();
  for (const [nivel, config] of niveis) {
    if (pontos >= config.minPontos) {
      return nivel;
    }
  }
  return 'BRONZE';
}

function verificarBonusAniversario(usuario) {
  if (!usuario.dataNascimento) return false;
  
  const hoje = new Date();
  const nascimento = new Date(usuario.dataNascimento);
  
  if (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() === nascimento.getDate()) {
    const bonus = FIDELIDADE.BONUS_ANIVERSARIO;
    usuario.pontos += bonus;
    usuario.nivelFidelidade = calcularNivelFidelidade(usuario.pontos);
    salvarUsuario(usuario);
    return { concedido: true, bonus };
  }
  return { concedido: false };
}

function adicionarPontos(usuarioId, valorCompra) {
  const usuario = getUsuarioById(usuarioId);
  if (!usuario) return;
  
  const pontosGanhos = Math.floor(valorCompra * FIDELIDADE.PONTOS_POR_REAL);
  usuario.pontos += pontosGanhos;
  usuario.nivelFidelidade = calcularNivelFidelidade(usuario.pontos);
  salvarUsuario(usuario);
  
  return pontosGanhos;
}

/* ========== GERENCIAMENTO DE USUÁRIOS ========== */
function getUsuarios() {
  const usuariosJSON = localStorage.getItem(USER_STORAGE_KEY);
  return usuariosJSON ? JSON.parse(usuariosJSON) : [];
}

function getUsuarioById(id) {
  return getUsuarios().find(u => u.id === id);
}

function getUsuarioByEmail(email) {
  return getUsuarios().find(u => u.email === email);
}

function salvarUsuario(usuarioAtualizado) {
  const usuarios = getUsuarios();
  const index = usuarios.findIndex(u => u.id === usuarioAtualizado.id);
  
  if (index >= 0) {
    usuarios[index] = usuarioAtualizado;
  } else {
    usuarios.push(usuarioAtualizado);
  }
  
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(usuarios));
}

/* ========== AUTENTICAÇÃO ========== */
function loginUser(usuario) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, usuario.id);
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(usuario));
    setupAuthButton();
  
    // Garante que o profileModal existe antes de abrir
    if (!window.profileModal) {
      window.profileModal = new ProfileModal();
    }
    
    // Pequeno delay para garantir que o modal está pronto
    setTimeout(() => {
      window.profileModal.open();
    }, 100);
}

function logoutUser() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem('kideliCart');
  setupAuthButton();
  showNotification('Você foi desconectado', 'info');
}

function getLoggedUser() {
  const userJson = sessionStorage.getItem(AUTH_USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
}

function isLoggedIn() {
  return sessionStorage.getItem(AUTH_TOKEN_KEY) !== null;
}

/* ========== CONFIGURAÇÃO DE UI ========== */
function setupAuthButton() {
  const authButton = document.querySelector('#authButton');
  if (!authButton) {
    console.error('Botão de autenticação não encontrado!');
    return;
  }

  // Atualiza o estado do botão
  updateAuthButtonState(authButton);

  authButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (isLoggedIn()) {
      // Garante que o profileModal existe
      if (!window.profileModal) {
        window.profileModal = new ProfileModal();
      }
      console.log('Abrindo modal de perfil...'); // Debug
      window.profileModal.open();
    } else {
      openAuthModal('login');
    }
  });
}

// Atualizar barra de progresso
function updateLoyaltyProgress(points) {
  const loyaltySystem = new LoyaltySystem();
  const progress = loyaltySystem.calculateProgress(points);
  const currentLevel = loyaltySystem.getCurrentLevel(points);
  const nextLevel = loyaltySystem.levels[currentLevel]?.next;
  
  document.getElementById('loyalty-progress-bar').style.width = `${progress}%`;
  document.getElementById('current-level').textContent = currentLevel.toUpperCase();
  
  if (nextLevel) {
    document.getElementById('next-level-label').textContent = 
      `Próximo nível: ${nextLevel.toUpperCase()} (${loyaltySystem.levels[nextLevel].min} pts)`;
  } else {
    document.getElementById('next-level-label').textContent = 'Nível máximo alcançado!';
  }
}

function updateAuthButtonState(button) {
  if (isLoggedIn()) {
    button.innerHTML = '<i class="fas fa-user"></i> Meu Perfil';
    button.classList.add('logged-in');
  } else {
    button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
    button.classList.remove('logged-in');
  }
}

function setupCloseButton() {
  const closeButton = getElement('.auth-close');
  if (closeButton) {
    closeButton.addEventListener('click', closeAuthModal);
  }
}

function setupTabs() {
  const tabs = document.querySelectorAll('.auth-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });
}

function setupPhoneMask(form) {
  const phoneField = form.querySelector('input[type="tel"]');
  if (phoneField) {
    phoneField.addEventListener('input', (e) => {
      e.target.value = e.target.value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .substring(0, 15);
    });
  }
}

function setupCEPMask(form) {
  const cepField = form.querySelector('#cep');
  if (cepField) {
    cepField.addEventListener('input', (e) => {
      e.target.value = e.target.value
        .replace(/\D/g, '')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .substring(0, 9);
    });
  }
}

function setupLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) {
      console.error('Formulário de login não encontrado!');
      return;
    }
  
    // Remove listeners antigos
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
  
    // Adiciona novo listener
    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleLogin(newForm);
    });
  
    console.log('Formulário de login configurado com sucesso');
}

function setupRegisterForm() {
  const form = getElement('#registerForm');
  if (!form) return;

  setupPhoneMask(form);
  setupCEPMask(form);

  const cepButton = getElement('#buscarCep');
  if (cepButton) {
    cepButton.addEventListener('click', handleCEP);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleRegistration(form);
  });
}

/* ========== HANDLERS ========== */
async function handleLogin(form) {
    // Obter elementos de forma segura
    const emailInput = form.querySelector('input[type="email"]');
    const passwordInput = form.querySelector('input[type="password"]');
    
    // Verificação crítica dos elementos
    if (!emailInput || !passwordInput) {
      console.error('Elementos do formulário não encontrados!');
      showNotification('Erro no sistema. Por favor, recarregue a página.', 'error');
      return false;
    }
  
    const email = emailInput.value.trim();
    const password = passwordInput.value;
  
    try {
      // Validação básica
      if (!email || !password) {
        throw new Error('Por favor, preencha todos os campos');
      }
  
      if (!isValidEmail(email)) {
        emailInput.focus();
        throw new Error('Por favor, insira um email válido');
      }
  
      // Busca usuário
      const usuarios = getUsuarios();
      const usuario = usuarios.find(u => u.email === email);
      
      if (!usuario) {
        emailInput.focus();
        throw new Error('Email não cadastrado');
      }
  
      if (usuario.password !== password) {
        passwordInput.value = '';
        passwordInput.focus();
        throw new Error('Senha incorreta');
      }
  
      // Login bem-sucedido
      loginUser(usuario);
      showNotification('Login realizado com sucesso!', 'success');
      closeAuthModal();
  
      // Abre o perfil
      if (!window.profileModal) {
        window.profileModal = new ProfileModal();
      }
      window.profileModal.open();
      
      return true;
  
    } catch (error) {
      console.error('Erro no login:', {
        error: error.message,
        email: email,
        time: new Date().toISOString()
      });
      showNotification(error.message, 'error');
      return false;
    }
}

async function handleRegistration(form) {
  try {
    const formData = {
      id: Date.now().toString(),
      name: getFormValue(form, 'input[placeholder="Nome completo*"]'),
      email: getFormValue(form, 'input[type="email"]'),
      password: getFormValue(form, 'input[type="password"]'),
      phone: getFormValue(form, 'input[type="tel"]'),
      dataNascimento: getFormValue(form, 'input[type="date"]'),
      cep: getFormValue(form, '#cep'),
      street: getFormValue(form, '#rua'),
      number: getFormValue(form, 'input[placeholder="Número*"]'),
      complement: getFormValue(form, 'input[placeholder="Complemento"]'),
      neighborhood: getFormValue(form, '#bairro'),
      reference: getFormValue(form, 'input[placeholder="Ponto de referência"]'),
      pontos: 0,
      nivelFidelidade: 'BRONZE',
      historicoPedidos: [],
      cartoes: []
    };

    // Validação
    if (!formData.name || !formData.email || !formData.password || !formData.number) {
      throw new Error('Por favor, preencha todos os campos obrigatórios');
    }

    if (!isValidEmail(formData.email)) {
      throw new Error('Por favor, insira um email válido');
    }

    if (formData.password.length < CONFIG.SENHA_MIN_LENGTH) {
      throw new Error(`A senha deve ter pelo menos ${CONFIG.SENHA_MIN_LENGTH} caracteres`);
    }

    if (getUsuarioByEmail(formData.email)) {
      throw new Error('Este email já está cadastrado');
    }

    salvarUsuario(formData);
    loginUser(formData);
    
    showNotification('Cadastro realizado com sucesso!', 'success');
    switchTab('login');
    form.reset();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function handleCEP() {
  try {
    const cepField = getElement('#cep', true);
    const cep = cepField.value.replace(/\D/g, '');

    if (cep.length !== 8) {
      throw new Error('CEP inválido. Deve conter 8 dígitos.');
    }

    const response = await fetch(CONFIG.CEP_API.replace('{cep}', cep));
    const data = await response.json();
    
    if (data.erro) throw new Error('CEP não encontrado');

    setFormValue('#rua', data.logradouro || '');
    setFormValue('#bairro', data.bairro || '');
    setFormValue('#cidade', data.localidade || CONFIG.CIDADE_PADRAO);
    setFormValue('#uf', data.uf || CONFIG.UF_PADRAO);
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

/* ========== GERENCIAMENTO DE MODAL ========== */
function openAuthModal(tab = 'login') {
  const modal = getElement('#authModal', true);
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
  switchTab(tab);
}

function closeAuthModal() {
  const modal = getElement('#authModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    modal.querySelectorAll('form').forEach(form => form.reset());
  }
}

function switchTab(tabName) {
  const validTabs = ['login', 'register'];
  if (!validTabs.includes(tabName)) return;

  // Atualizar abas
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Atualizar formulários
  document.querySelectorAll('.auth-form').forEach(form => {
    form.classList.toggle('active', form.id === `${tabName}Form`);
  });

  // Focar no primeiro campo
  setTimeout(() => {
    const firstInput = document.querySelector(`#${tabName}Form input`);
    if (firstInput) firstInput.focus();
  }, 100);
}

/* ========== INICIALIZAÇÃO ========== */
function initializeAuth() {
  try {
    setupAuthButton();
    setupCloseButton();
    setupTabs();
    setupLoginForm();
    setupRegisterForm();
  } catch (error) {
    console.error('Falha na inicialização:', error);
    showNotification('Erro ao carregar o sistema de autenticação', 'error');
  }
}

// Inicialização quando o DOM estiver pronto
if (document.readyState === 'complete') {
  initializeAuth();
} else {
  document.addEventListener('DOMContentLoaded', initializeAuth);
}

/* ========== INTERFACE PÚBLICA ========== */
window.Auth = {
  open: openAuthModal,
  close: closeAuthModal,
  switchTab: switchTab,
  logout: logoutUser,
  getUser: getLoggedUser,
  isLoggedIn: isLoggedIn,
  adicionarPontos: adicionarPontos,
  verificarBonusAniversario: verificarBonusAniversario
};