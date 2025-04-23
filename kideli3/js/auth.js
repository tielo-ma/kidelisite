// Sistema de Autenticação e Fidelidade
console.log('[Auth] Inicializando sistema...');

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
  getUsers() {
    const usersJSON = localStorage.getItem(STORAGE_KEYS.USERS);
    return usersJSON ? JSON.parse(usersJSON) : [];
  },
  
  getUserById(id) {
    return this.getUsers().find(u => u.id === id);
  },
  
  getUserByEmail(email) {
    return this.getUsers().find(u => u.email === email);
  },
  
  saveUser(user) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
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
  login(user) {
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, user.id);
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    this.updateAuthUI();
    
    if (window.profileModal) {
      window.profileModal.open();
    } else {
      window.profileModal = new ProfileModal();
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
      
      const user = UserService.getUserByEmail(email);
      if (!user) throw new Error('Email não cadastrado');
      if (user.password !== password) throw new Error('Senha incorreta');
      
      AuthService.login(user);
      UI.showNotification('Login realizado!', 'success');
      ModalService.closeAuthModal();
      
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
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRegistration(form);
    });
  },
  
  handleRegistration(form) {
    try {
      const formData = {
        id: Date.now().toString(),
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
        nivelFidelidade: 'BRONZE',
        historicoPedidos: [],
        cartoes: []
      };
      
      // Validação
      if (!formData.nome || !formData.email || !formData.password || !formData.numero) {
        throw new Error('Preencha todos os campos obrigatórios');
      }
      
      if (!Validators.email(formData.email)) throw new Error('Email inválido');
      if (!Validators.password(formData.password)) {
        throw new Error(`A senha deve ter pelo menos ${CONFIG.SENHA_MIN_LENGTH} caracteres`);
      }
      
      if (UserService.getUserByEmail(formData.email)) {
        throw new Error('Email já cadastrado');
      }
      
      UserService.saveUser(formData);
      AuthService.login(formData);
      UI.showNotification('Cadastro realizado!', 'success');
      ModalService.switchTab('login');
      form.reset();
      
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
  addPoints(userId, purchaseValue) {
    const user = UserService.getUserById(userId);
    if (!user) return 0;
    
    const pointsEarned = Math.floor(purchaseValue * FIDELIDADE.PONTOS_POR_REAL);
    user.pontos += pointsEarned;
    user.nivelFidelidade = UserService.calculateLevel(user.pontos);
    UserService.saveUser(user);
    
    return pointsEarned;
  },
  
  checkBirthdayBonus(user) {
    if (!user.dataNascimento) return false;
    
    const today = new Date();
    const birthDate = new Date(user.dataNascimento);
    
    if (today.getMonth() === birthDate.getMonth() && today.getDate() === birthDate.getDate()) {
      const bonus = FIDELIDADE.BONUS_ANIVERSARIO;
      user.pontos += bonus;
      user.nivelFidelidade = UserService.calculateLevel(user.pontos);
      UserService.saveUser(user);
      return { granted: true, bonus };
    }
    return { granted: false };
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

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'complete') {
  initializeAuth();
} else {
  document.addEventListener('DOMContentLoaded', initializeAuth);
}

// ProfileModal (versão simplificada)
class ProfileModal {
  constructor() {
    this.modal = DOM.get('#profileModal');
    this.isOpen = false;
    this.currentUser = null;
    
    if (!this.modal) {
      console.error('[ProfileModal] Elemento não encontrado');
      return;
    }

    this.initElements();
    this.setupEventListeners();
  }

  initElements() {
    this.closeButton = this.modal.querySelector('.profile-close');
    this.tabs = this.modal.querySelectorAll('.profile-tab');
    this.tabPanes = this.modal.querySelectorAll('.tab-pane');
    this.profileContent = this.modal.querySelector('.profile-modal-content');
    this.loginMessage = this.createLoginMessage();
  }

  createLoginMessage() {
    const message = document.createElement('div');
    message.id = 'login-required-message';
    message.className = 'login-message';
    message.innerHTML = `
            <div class="login-message-content">
        <i class="fas fa-lock"></i>
        <h3>Acesso Restrito</h3>
        <p>Para visualizar seu perfil, faça login ou cadastre-se</p>
        <button id="goToLoginBtn" class="btn-gold">
          <i class="fas fa-sign-in-alt"></i> Ir para Login
        </button>
      </div>
    `;
    this.modal.appendChild(message);
    return message;
  }

  setupEventListeners() {
    this.closeButton?.addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    DOM.get('#goToLoginBtn')?.addEventListener('click', () => {
      this.close();
      window.Auth.open('login');
    });

    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
  }

  async open() {
    if (this.isOpen) return;
    
    this.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    this.isOpen = true;
    
    if (AuthService.isLoggedIn()) {
      await this.loadUserData();
      this.showProfileContent();
    } else {
      this.showLoginMessage();
    }
  }

  async loadUserData() {
    try {
      this.currentUser = AuthService.getLoggedUser();
      if (!this.currentUser) throw new Error('Usuário não encontrado');
      
      this.renderUserData();
    } catch (error) {
      console.error('[ProfileModal] Erro ao carregar dados:', error);
      UI.showNotification('Erro ao carregar perfil', 'error');
    }
  }

  renderUserData() {
    if (!this.currentUser) return;

    // Dados básicos
    this.setTextContent('profile-modal-name', this.currentUser.nome);
    this.setTextContent('profile-modal-email', this.currentUser.email);
    this.setTextContent('profile-phone', this.currentUser.celular);
    this.setTextContent('profile-birthdate', UI.formatDate(this.currentUser.dataNascimento));
    
    // Endereço
    const endereco = this.currentUser.rua ? 
      `${this.currentUser.rua}, ${this.currentUser.numero || 'S/N'}, ${this.currentUser.bairro}, ${this.currentUser.cidade || CONFIG.CIDADE_PADRAO}-${this.currentUser.uf || CONFIG.UF_PADRAO}` : 
      'Não cadastrado';
    this.setTextContent('profile-address', endereco);

    // Fidelidade
    this.renderFidelitySystem();
    
    // Atualiza badge do usuário
    this.updateUserBadge();
  }

  setTextContent(elementId, text) {
    const element = DOM.get(elementId);
    if (element) element.textContent = text || 'Não informado';
  }

  renderFidelitySystem() {
    const { nivelFidelidade, pontos } = this.currentUser;
    const currentLevel = FIDELIDADE.niveis[nivelFidelidade] || FIDELIDADE.niveis.BRONZE;

    // Atualiza badge
    const badge = DOM.get('#vip-level-badge');
    if (badge) {
      badge.className = `vip-badge ${nivelFidelidade.toLowerCase()}`;
      badge.querySelector('#vip-level').textContent = nivelFidelidade;
    }

    // Barra de progresso
    const progressBar = DOM.get('#loyalty-progress-bar');
    if (progressBar) {
      const progress = currentLevel.next 
        ? ((pontos - currentLevel.minPontos) / 
           (FIDELIDADE.niveis[currentLevel.next].minPontos - currentLevel.minPontos)) * 100
        : 100;
      
      progressBar.style.width = `${Math.min(100, progress)}%`;
    }

    // Informações de nível
    this.setTextContent('profile-tier', nivelFidelidade);
    this.setTextContent('profile-points', `${pontos} pontos`);
    this.setTextContent('current-discount', `Desconto: ${currentLevel.desconto}%`);
    
    if (currentLevel.next) {
      const pointsNeeded = FIDELIDADE.niveis[currentLevel.next].minPontos - pontos;
      this.setTextContent('next-level-label', 
        `Próximo: ${currentLevel.next} (faltam ${pointsNeeded} pontos)`);
    } else {
      this.setTextContent('next-level-label', 'Nível máximo alcançado!');
    }
  }

  updateUserBadge() {
    const badge = DOM.get('#client-name-badge');
    if (badge && this.currentUser.nome) {
      const initials = this.currentUser.nome
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
      badge.textContent = initials;
    }
  }

  showProfileContent() {
    this.profileContent.style.display = 'block';
    this.loginMessage.style.display = 'none';
    this.switchTab('overview');
  }

  showLoginMessage() {
    this.profileContent.style.display = 'none';
    this.loginMessage.style.display = 'flex';
  }

  switchTab(tabId) {
    this.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    this.tabPanes.forEach(pane => {
      const isActive = pane.id === `${tabId}-content`;
      pane.style.display = isActive ? 'block' : 'none';
      if (isActive) setTimeout(() => pane.classList.add('active'), 10);
      else pane.classList.remove('active');
    });

    // Atualiza conteúdo específico da aba
    if (tabId === 'orders') this.renderOrders();
    else if (tabId === 'payments') this.renderPayments();
    else if (tabId === 'benefits') this.renderBenefits();
  }

  renderOrders() {
    if (!this.currentUser?.historicoPedidos) return;
    
    const container = DOM.get('#orders-list');
    if (!container) return;

    const orders = this.currentUser.historicoPedidos.map(order => ({
      ...order,
      statusText: this.getOrderStatusText(order.status),
      statusClass: order.status.toLowerCase(),
      formattedDate: UI.formatDate(order.data),
      formattedTotal: order.total.toLocaleString('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      })
    }));

    container.innerHTML = orders.length ? 
      orders.map(order => this.createOrderCard(order)).join('') : 
      '<div class="empty-state">Nenhum pedido encontrado</div>';

    this.setupOrderFilters();
  }

  createOrderCard(order) {
    return `
      <div class="order-card ${order.statusClass}">
        <div class="order-header">
          <span>Pedido #${order.id}</span>
          <span class="order-status">${order.statusText}</span>
        </div>
        <div class="order-date">${order.formattedDate}</div>
        <div class="order-products">
          ${order.produtos.slice(0, 3).map(p => `
            <div class="product">
              <img src="./assets/image/red.jpeg" alt="${p.nome}">
              <span>${p.nome} (${p.quantidade}x)</span>
            </div>
          `).join('')}
        </div>
        <div class="order-footer">
          <span class="order-total">${order.formattedTotal}</span>
          ${order.pontosGanhos ? `
            <span class="order-points">
              <i class="fas fa-coins"></i> +${order.pontosGanhos} pts
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }

  getOrderStatusText(status) {
    const statusMap = {
      'ENTREGUE': 'Entregue',
      'PROCESSANDO': 'Em processamento',
      'CANCELADO': 'Cancelado',
      'ENVIADO': 'Enviado'
    };
    return statusMap[status] || status;
  }

  setupOrderFilters() {
    const timeFilter = DOM.get('#order-time-filter');
    const statusFilter = DOM.get('#order-status-filter');
    
    timeFilter?.addEventListener('change', () => this.filterOrders());
    statusFilter?.addEventListener('change', () => this.filterOrders());
  }

  filterOrders() {
    console.log('Filtrando pedidos...');
    // Implementação do filtro aqui
  }

  renderPayments() {
    if (!this.currentUser?.cartoes) return;
    
    const container = DOM.get('#payment-methods-list');
    if (!container) return;

    container.innerHTML = this.currentUser.cartoes.length ? 
      this.currentUser.cartoes.map(card => this.createPaymentCard(card)).join('') : 
      '<div class="empty-state">Nenhum cartão cadastrado</div>';

    this.setupPaymentActions();
  }

  createPaymentCard(card) {
    return `
      <div class="payment-card">
        <i class="fab fa-cc-${card.bandeira.toLowerCase()}"></i>
        <div class="card-details">
          <div class="card-number">•••• •••• •••• ${card.ultimosDigitos}</div>
          <div class="card-info">
            <span class="card-name">${card.nome}</span>
            <span class="card-expiry">Validade ${card.validade}</span>
          </div>
        </div>
        <button class="btn-icon remove-card" data-id="${card.id}">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;
  }

  setupPaymentActions() {
    document.querySelectorAll('.remove-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cardId = btn.dataset.id;
        this.confirmRemoveCard(cardId);
      });
    });
  }

  confirmRemoveCard(cardId) {
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal';
    modal.innerHTML = `
      <div class="confirmation-content">
        <h3><i class="fas fa-credit-card"></i> Remover Cartão</h3>
        <p>Tem certeza que deseja remover este cartão?</p>
        <div class="confirmation-buttons">
          <button id="cancelRemove" class="btn-outline">Cancelar</button>
          <button id="confirmRemove" class="btn-gold">Remover</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    DOM.get('#confirmRemove')?.addEventListener('click', () => {
      this.removeCard(cardId);
      modal.remove();
    });

    DOM.get('#cancelRemove')?.addEventListener('click', () => {
      modal.remove();
    });
  }

  removeCard(cardId) {
    this.currentUser.cartoes = this.currentUser.cartoes.filter(card => card.id !== cardId);
    UserService.saveUser(this.currentUser);
    this.renderPayments();
  }

  renderBenefits() {
    const { nivelFidelidade, pontos, dataNascimento } = this.currentUser;
    const container = DOM.get('#benefits-content');
    if (!container) return;

    const isBirthday = this.checkBirthday(dataNascimento);
    
    container.innerHTML = `
      <div class="benefits-header">
        <h3><i class="fas fa-award"></i> Seus Benefícios</h3>
        <div class="tier-info">
          <span class="tier-badge ${nivelFidelidade.toLowerCase()}">
            ${nivelFidelidade}
          </span>
          <span>${this.getNextTierMessage(nivelFidelidade, pontos)}</span>
        </div>
      </div>
      
      <div class="benefits-grid">
        ${this.createBenefitCard(
          'presente',
          'Presente de Aniversário',
          isBirthday ? 'Escolha seu presente!' : 'Disponível no seu aniversário',
          isBirthday,
          isBirthday ? 'gold' : 'upcoming'
        )}
        
        ${this.createBenefitCard(
          'shipping',
          'Frete Grátis',
          nivelFidelidade === 'DIAMANTE' ? 'Frete grátis em todos pedidos' : 
          nivelFidelidade === 'OURO' ? 'Frete grátis acima de R$ 50' : 'Disponível em níveis superiores',
          nivelFidelidade === 'DIAMANTE' || nivelFidelidade === 'OURO',
          nivelFidelidade === 'DIAMANTE' ? 'diamond' : 
          nivelFidelidade === 'OURO' ? 'gold' : 'upcoming'
        )}
        
        ${this.createBenefitCard(
          'discount',
          'Descontos Exclusivos',
          nivelFidelidade === 'DIAMANTE' ? '20% de desconto' : 
          nivelFidelidade === 'OURO' ? '15% de desconto' : 
          nivelFidelidade === 'PRATA' ? '10% de desconto' : '5% de desconto',
          true,
          nivelFidelidade.toLowerCase()
        )}
      </div>
    `;
  }

  createBenefitCard(icon, title, description, isActive, type) {
    return `
      <div class="benefit-card ${type}-benefit ${isActive ? 'active' : ''}">
        <div class="benefit-icon">
          <i class="fas fa-${icon}"></i>
        </div>
        <h4>${title}</h4>
        <p>${description}</p>
        ${isActive ? '<div class="benefit-status active">Disponível</div>' : ''}
      </div>
    `;
  }

  checkBirthday(birthdate) {
    if (!birthdate) return false;
    const today = new Date();
    const birthDate = new Date(birthdate);
    return today.getMonth() === birthDate.getMonth() && 
           today.getDate() === birthDate.getDate();
  }

  getNextTierMessage(currentLevel, currentPoints) {
    const nextLevel = FIDELIDADE.niveis[currentLevel]?.next;
    if (!nextLevel) return 'Você alcançou o nível máximo!';

    const pointsNeeded = FIDELIDADE.niveis[nextLevel].minPontos - currentPoints;
    return `Faltam ${pointsNeeded} pontos para ${nextLevel}`;
  }

  close() {
    if (!this.isOpen) return;
    
    this.modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    this.isOpen = false;
  }
}