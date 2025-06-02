// Sistema de Autenticação e Fidelidade
console.log('[Auth] Inicializando sistema...');

import bcrypt from 'bcryptjs';

// Constantes
const FIDELIDADE = {
  niveis: {
    BRONZE: { minPontos: 0, maxPontos: 999, desconto: 0, multiplicador: 1, next: 'PRATA' },
    PRATA: { minPontos: 1000, maxPontos: 4999, desconto: 5, multiplicador: 1.2, next: 'OURO' },
    OURO: { minPontos: 5000, maxPontos: 9999, desconto: 10, multiplicador: 1.5, next: 'DIAMANTE' },
    DIAMANTE: { minPontos: 15000, maxPontos: Infinity, desconto: 15, multiplicador: 2 }
  },
  BONUS_ANIVERSARIO: 1000,
  PONTOS_POR_REAL: 10
};

const STORAGE_KEYS = {
  USERS: 'app_users',
  TOKEN: 'auth_token',
  USER: 'auth_user'
};

const CONFIG = {
  CEP_API: 'https://viacep.com.br/ws/{cep}/json/',
  CIDADE_PADRAO: 'Natal',
  UF_PADRAO: 'RN',
  SENHA_MIN_LENGTH: 6
};

// Utilitários
const DOM = {
  get(selector, required = false) {
    const element = document.querySelector(selector);
    if (!element && required) {
      console.error(`Elemento não encontrado: ${selector}`);
      throw new Error(`Elemento ${selector} não encontrado`);
    }
    return element;
  },
  
  setValue(selector, value) {
    const element = this.get(selector);
    if (element) element.value = value;
  },
  
  getFormValue(form, selector) {
    const element = form.querySelector(selector);
    return element ? element.value.trim() : null;
  }
};

const UI = {
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  },
  
  formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  }
};

const Validators = {
  email(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  
  password(password) {
    return password.length >= CONFIG.SENHA_MIN_LENGTH;
  }
};

// Gerenciamento de Usuários
const UserService = {
  async getUsers() {
    try {
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
      return users;
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }
  },
  
  async getUserById(id) {
    try {
      const users = await this.getUsers();
      return users.find(user => user.id === id) || null;
    } catch (error) {
      console.error(`Erro ao buscar usuário ${id}:`, error);
      return null;
    }
  },
  
  async getUserByEmail(email) {
    try {
      const users = await this.getUsers();
      return users.find(user => user.email === email) || null;
    } catch (error) {
      console.error(`Erro ao buscar usuário por email ${email}:`, error);
      return null;
    }
  },
  
  async saveUser(user) {
    try {
      const users = await this.getUsers();
      if (user.id) {
        // Atualização
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
          users[index] = user;
        }
      } else {
        // Novo usuário
        user.id = Date.now().toString();
        users.push(user);
      }
      
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      return user;
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      throw error;
    }
  },
  
  calculateLevel(points) {
    const levels = Object.entries(FIDELIDADE.niveis).reverse();
    for (const [level, config] of levels) {
      if (points >= config.minPontos) return level;
    }
    return 'BRONZE';
  }
};

// Autenticação
const AuthService = {
  async login({ user }) {
    try {
      sessionStorage.setItem(STORAGE_KEYS.TOKEN, user.id);
      sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      this.updateAuthUI();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  },
  
  logout() {
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    this.updateAuthUI();
    UI.showNotification('Você foi desconectado', 'info');
  },
  
  getLoggedUser() {
    const userJson = sessionStorage.getItem(STORAGE_KEYS.USER);
    return userJson ? JSON.parse(userJson) : null;
  },
  
  isLoggedIn() {
    return sessionStorage.getItem(STORAGE_KEYS.TOKEN) !== null;
  },
  
  updateAuthUI() {
    const authButton = DOM.get('#authButton');
    if (!authButton) return;
    
    if (this.isLoggedIn()) {
      authButton.innerHTML = '<i class="fas fa-user"></i> Meu Perfil';
      authButton.classList.add('logged-in');
    } else {
      authButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
      authButton.classList.remove('logged-in');
    }
  }
};

// Formulários
const FormHandlers = {
  setupLoginForm() {
    const form = DOM.get('#loginForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin(form);
    });
  },
  
  async handleLogin(form) {
    try {
      const email = DOM.getFormValue(form, 'input[type="email"]');
      const password = DOM.getFormValue(form, 'input[type="password"]');
      
      if (!email || !password) throw new Error('Preencha todos os campos');
      if (!Validators.email(email)) throw new Error('Email inválido');
      
      const user = await UserService.getUserByEmail(email);
      if (!user) throw new Error('Usuário não encontrado');
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) throw new Error('Senha incorreta');
      
      const success = await AuthService.login({ user });
      
      if (success) {
        UI.showNotification('Login realizado!', 'success');
        ModalService.closeAuthModal();
      }
    } catch (error) {
      UI.showNotification(error.message, 'error');
    }
  },
  
  setupRegisterForm() {
    const form = DOM.get('#registerForm');
    if (!form) return;
    
    this.setupPhoneMask(form);
    this.setupCEPMask(form);
    
    DOM.get('#buscarCep')?.addEventListener('click', this.handleCEP);
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleRegistration(form);
    });
  },
  
  async handleRegistration(form) {
    try {
      const formData = {
        nome: DOM.getFormValue(form, 'input[placeholder="Nome completo*"]'),
        email: DOM.getFormValue(form, 'input[type="email"]'),
        password: DOM.getFormValue(form, 'input[type="password"]'),
        celular: DOM.getFormValue(form, 'input[type="tel"]'),
        dataNascimento: DOM.getFormValue(form, 'input[type="date"]'),
        cep: DOM.getFormValue(form, '#cep'),
        rua: DOM.getFormValue(form, '#rua'),
        numero: DOM.getFormValue(form, 'input[placeholder="Número*"]'),
        complemento: DOM.getFormValue(form, 'input[placeholder="Complemento"]'),
        bairro: DOM.getFormValue(form, '#bairro'),
        referencia: DOM.getFormValue(form, 'input[placeholder="Ponto de referência"]'),
        pontos: 0,
        nivelFidelidade: 'BRONZE'
      };
      
      // Validação
      if (!formData.nome || !formData.email || !formData.password || !formData.numero) {
        throw new Error('Preencha todos os campos obrigatórios');
      }
      
      if (!Validators.email(formData.email)) throw new Error('Email inválido');
      if (!Validators.password(formData.password)) {
        throw new Error(`A senha deve ter pelo menos ${CONFIG.SENHA_MIN_LENGTH} caracteres`);
      }
      
      const existingUser = await UserService.getUserByEmail(formData.email);
      if (existingUser) {
        throw new Error('Email já cadastrado');
      }
      
      // Hash da senha antes de salvar
      const hashedPassword = await bcrypt.hash(formData.password, 10);
      formData.password = hashedPassword;
      
      // Primeiro usuário vira admin
      const users = await UserService.getUsers();
      if (users.length === 0) {
        formData.isAdmin = true;
      }
      
      const newUser = await UserService.saveUser(formData);
      
      if (newUser) {
        await AuthService.login({ user: newUser });
        UI.showNotification('Cadastro realizado!', 'success');
        ModalService.switchTab('login');
        form.reset();
      } else {
        throw new Error('Erro ao cadastrar usuário');
      }
    } catch (error) {
      UI.showNotification(error.message, 'error');
    }
  },
  
  async handleCEP() {
    try {
      const cepField = DOM.get('#cep', true);
      const cep = cepField.value.replace(/\D/g, '');
      
      if (cep.length !== 8) throw new Error('CEP inválido (8 dígitos)');
      
      const response = await fetch(CONFIG.CEP_API.replace('{cep}', cep));
      const data = await response.json();
      
      if (data.erro) throw new Error('CEP não encontrado');
      
      DOM.setValue('#rua', data.logradouro || '');
      DOM.setValue('#bairro', data.bairro || '');
      DOM.setValue('#cidade', data.localidade || CONFIG.CIDADE_PADRAO);
      DOM.setValue('#uf', data.uf || CONFIG.UF_PADRAO);
      
    } catch (error) {
      UI.showNotification(error.message, 'error');
    }
  },
  
  setupPhoneMask(form) {
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
  },
  
  setupCEPMask(form) {
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
};

// Modais
const ModalService = {
  openAuthModal(tab = 'login') {
    const modal = DOM.get('#authModal', true);
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    this.switchTab(tab);
  },
  
  closeAuthModal() {
    const modal = DOM.get('#authModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      modal.querySelectorAll('form').forEach(form => form.reset());
    }
  },
  
  switchTab(tabName) {
    const validTabs = ['login', 'register'];
    if (!validTabs.includes(tabName)) return;
    
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.auth-form').forEach(form => {
      form.classList.toggle('active', form.id === `${tabName}Form`);
    });
    
    setTimeout(() => {
      const firstInput = document.querySelector(`#${tabName}Form input`);
      if (firstInput) firstInput.focus();
    }, 100);
  },
  
  setupTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
  },
  
  setupCloseButton() {
    DOM.get('.auth-close')?.addEventListener('click', this.closeAuthModal);
  }
};

// Fidelidade
const LoyaltyService = {
  async addPoints(userId, purchaseValue) {
    try {
      const user = await UserService.getUserById(userId);
      if (!user) return 0;
      
      const pointsEarned = Math.floor(purchaseValue * FIDELIDADE.PONTOS_POR_REAL);
      user.pontos += pointsEarned;
      user.nivelFidelidade = UserService.calculateLevel(user.pontos);
      
      await UserService.saveUser(user);
      return pointsEarned;
    } catch (error) {
      console.error('Erro ao adicionar pontos:', error);
      return 0;
    }
  },
  
  async checkBirthdayBonus(user) {
    if (!user.dataNascimento) return { granted: false };
    
    try {
      const today = new Date();
      const birthDate = new Date(user.dataNascimento);
      
      if (today.getMonth() === birthDate.getMonth() && today.getDate() === birthDate.getDate()) {
        const bonus = FIDELIDADE.BONUS_ANIVERSARIO;
        user.pontos += bonus;
        user.nivelFidelidade = UserService.calculateLevel(user.pontos);
        await UserService.saveUser(user);
        return { granted: true, bonus };
      }
      return { granted: false };
    } catch (error) {
      console.error('Erro ao verificar aniversário:', error);
      return { granted: false };
    }
  }
};

// Inicialização
function initializeAuth() {
  try {
    // Configura botão de autenticação
    const authButton = DOM.get('#authButton');
    if (authButton) {
      authButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (AuthService.isLoggedIn()) {
          if (!window.profileModal) window.profileModal = new ProfileModal();
          window.profileModal.open();
        } else {
          ModalService.openAuthModal('login');
        }
      });
    }
    
    AuthService.updateAuthUI();
    ModalService.setupCloseButton();
    ModalService.setupTabs();
    FormHandlers.setupLoginForm();
    FormHandlers.setupRegisterForm();
    
  } catch (error) {
    console.error('Falha na inicialização:', error);
    UI.showNotification('Erro ao carregar autenticação', 'error');
  }
}

// Interface Pública
window.Auth = {
  open: ModalService.openAuthModal,
  close: ModalService.closeAuthModal,
  switchTab: ModalService.switchTab,
  logout: AuthService.logout,
  getUser: AuthService.getLoggedUser,
  isLoggedIn: AuthService.isLoggedIn,
  addPoints: LoyaltyService.addPoints,
  checkBirthdayBonus: LoyaltyService.checkBirthdayBonus
};

// Inicialização
if (document.readyState === 'complete') {
  initializeAuth();
} else {
  document.addEventListener('DOMContentLoaded', initializeAuth);
}