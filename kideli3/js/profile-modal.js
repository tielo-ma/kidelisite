class ProfileModal {
  constructor() {
    this.modal = document.getElementById('profileModal');
    this.isOpen = false;
    this.isInitialized = false;
    this.currentUser = null;
    
    if (!this.modal) {
      console.error('[ProfileModal] Elemento não encontrado');
      return;
    }

    this.initElements();
    this.init();
  }

  initElements() {
    this.closeButton = this.modal.querySelector('.profile-close');
    this.tabs = this.modal.querySelectorAll('.profile-tab');
    this.tabPanes = this.modal.querySelectorAll('.tab-pane');
    this.profileContent = this.modal.querySelector('.profile-modal-content');
    this.loginMessage = this.createLoginMessage();
    this.logoutBtn = document.getElementById('logout-btn');
  }

  createLoginMessage() {
    const existing = this.modal.querySelector('#login-required-message');
    if (existing) return existing;
    
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

  init() {
    if (this.isInitialized) return;
    
    this.setupEventListeners();
    this.isInitialized = true;
    console.log('[ProfileModal] Inicializado com sucesso');
  }

  setupEventListeners() {
    // Fechar modal
    this.closeButton?.addEventListener('click', (e) => {
      e.preventDefault();
      this.close();
    });
    
    // Fechar ao clicar fora
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Botão de login
    document.getElementById('goToLoginBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.close();
      this.showAuthModal();
    });

    // Abas
    this.setupTabs();
    
    // Logout
    this.setupLogoutButton();
  }

  setupTabs() {
    this.tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab(tab.dataset.tab);
      });
    });
  }

  switchTab(tabId) {
    // Ativa/desativa abas
    this.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    // Ativa/desativa conteúdos
    this.tabPanes.forEach(pane => {
      const isActive = pane.id === `${tabId}-content`;
      if (isActive) {
        pane.style.display = 'block';
        setTimeout(() => pane.classList.add('active'), 10);
      } else {
        pane.style.display = 'none';
        pane.classList.remove('active');
      }
    });

    // Atualiza conteúdo específico da aba
    if (tabId === 'orders') {
      this.renderOrders();
    } else if (tabId === 'payments') {
      this.renderPayments();
    } else if (tabId === 'benefits') {
      this.renderBenefits();
    }
  }

  setupLogoutButton() {
    this.logoutBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.confirmLogout();
    });
  }

  confirmLogout() {
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal';
    modal.innerHTML = `
      <div class="confirmation-content">
        <h3><i class="fas fa-sign-out-alt"></i> Sair da Conta</h3>
        <p>Tem certeza que deseja sair da sua conta?</p>
        <div class="confirmation-buttons">
          <button id="cancelLogout" class="btn-outline">Cancelar</button>
          <button id="confirmLogout" class="btn-gold">Sair</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('confirmLogout')?.addEventListener('click', () => {
      this.performLogout();
      modal.remove();
    });

    document.getElementById('cancelLogout')?.addEventListener('click', () => {
      modal.remove();
    });
  }

  performLogout() {
    if (window.Auth?.logout) {
      window.Auth.logout();
    } else {
      // Fallback básico
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_user');
    }
    this.close();
    window.location.reload();
  }

  showAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
      authModal.style.display = 'block';
    }
  }

  async open() {
    if (this.isOpen) return;
    
    console.log('[ProfileModal] Abrindo modal...');
    this.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    this.isOpen = true;
    
    // Verifica autenticação
    const isAuthenticated = await this.checkAuth();
    
    if (isAuthenticated) {
      await this.loadUserData();
      this.showProfileContent();
    } else {
      this.showLoginMessage();
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

  async checkAuth() {
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch (error) {
      console.error('[ProfileModal] Erro ao verificar autenticação:', error);
      return false;
    }
  }

  async getCurrentUser() {
    // Integração com auth.js
    if (window.Auth?.getCurrentUser) {
      return window.Auth.getCurrentUser();
    }
    
    // Fallback básico
    const userData = sessionStorage.getItem('auth_user');
    return userData ? JSON.parse(userData) : null;
  }

  async loadUserData() {
    try {
      const user = await this.fetchUserData();
      if (!user) throw new Error('Usuário não encontrado');
      
      this.currentUser = user;
      console.log('[ProfileModal] Dados do usuário carregados:', user);
      this.renderUserData();
    } catch (error) {
      console.error('[ProfileModal] Erro ao carregar dados:', error);
      this.showError('Erro ao carregar perfil');
    }
  }

  async fetchUserData() {
    // Simulação de API - substitua por sua chamada real
    console.log('[ProfileModal] Buscando dados do usuário...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Dados mockados para exemplo
    return {
      id: 'user123',
      nome: "Maria Silva",
      email: "maria@exemplo.com",
      celular: "(84) 98888-7777",
      dataNascimento: "1992-05-15",
      pontos: 3200,
      nivelFidelidade: "PRATA",
      historicoPedidos: [
        {
          id: "KD20230001",
          data: "2023-06-10",
          status: "ENTREGUE",
          total: 120.00,
          pontosGanhos: 120,
          produtos: [
            { nome: "Torta de Morango", quantidade: 1, preco: 45.00 }
          ]
        }
      ],
      cartoes: [
        {
          id: "card1",
          bandeira: "visa",
          ultimosDigitos: "4242",
          nome: "MARIA SILVA",
          validade: "12/25"
        }
      ],
      endereco: {
        rua: "Rua das Flores, 123",
        bairro: "Centro",
        cidade: "Natal",
        estado: "RN",
        cep: "59000-000"
      }
    };
  }

  renderUserData() {
    if (!this.currentUser) return;

    // Dados básicos
    this.setTextContent('profile-modal-name', this.currentUser.nome);
    this.setTextContent('profile-modal-email', this.currentUser.email);
    this.setTextContent('profile-phone', this.currentUser.celular);
    this.setTextContent('profile-birthdate', this.formatDate(this.currentUser.dataNascimento));
    this.setTextContent('profile-address', this.formatAddress(this.currentUser.endereco));

    // Fidelidade
    this.renderFidelitySystem();
    
    // Atualiza badge do usuário
    this.updateUserBadge();
  }

  setTextContent(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = text || 'Não informado';
  }

  formatDate(dateString) {
    if (!dateString) return '';
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  }

  formatAddress(address) {
    if (!address) return 'Não cadastrado';
    return `${address.rua}, ${address.bairro}, ${address.cidade}-${address.estado}`;
  }

  updateUserBadge() {
    const badge = document.getElementById('client-name-badge');
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

  renderFidelitySystem() {
    const { nivelFidelidade, pontos } = this.currentUser;
    const levels = {
      BRONZE: { min: 0, next: 'PRATA', nextMin: 1000, discount: 5, color: '#cd7f32' },
      PRATA: { min: 1000, next: 'OURO', nextMin: 5000, discount: 10, color: '#c0c0c0' },
      OURO: { min: 5000, next: 'DIAMANTE', nextMin: 15000, discount: 15, color: '#ffd700' },
      DIAMANTE: { min: 15000, next: null, discount: 20, color: '#b9f2ff' }
    };

    const currentLevel = levels[nivelFidelidade] || levels.BRONZE;

    // Atualiza badge
    const badge = document.getElementById('vip-level-badge');
    if (badge) {
      badge.className = `vip-badge ${nivelFidelidade.toLowerCase()}`;
      badge.querySelector('#vip-level').textContent = nivelFidelidade;
      badge.style.backgroundColor = currentLevel.color;
    }

    // Barra de progresso
    this.renderProgressBar(pontos, currentLevel);

    // Atualiza informações de nível
    this.setTextContent('profile-tier', nivelFidelidade);
    this.setTextContent('profile-points', `${pontos} pontos`);
    this.setTextContent('current-discount', `Desconto: ${currentLevel.discount}%`);
    
    // Próximo nível
    if (currentLevel.next) {
      const pointsNeeded = currentLevel.nextMin - pontos;
      this.setTextContent('next-level-label', 
        `Próximo: ${currentLevel.next} (faltam ${pointsNeeded} pontos)`);
    } else {
      this.setTextContent('next-level-label', 'Nível máximo alcançado!');
    }
  }

  renderProgressBar(currentPoints, currentLevel) {
    const progressBar = document.getElementById('loyalty-progress-bar');
    if (!progressBar) return;

    const progress = currentLevel.next 
      ? ((currentPoints - currentLevel.min) / (currentLevel.nextMin - currentLevel.min)) * 100
      : 100;
    
    progressBar.style.width = `${Math.min(100, progress)}%`;
    progressBar.style.backgroundColor = currentLevel.color;
  }

  renderOrders() {
    if (!this.currentUser?.historicoPedidos) return;
    
    const container = document.getElementById('orders-list');
    if (!container) return;

    const orders = this.currentUser.historicoPedidos.map(order => ({
      ...order,
      statusText: this.getOrderStatusText(order.status),
      statusClass: order.status.toLowerCase(),
      formattedDate: this.formatDate(order.data),
      formattedTotal: order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
    const timeFilter = document.getElementById('order-time-filter');
    const statusFilter = document.getElementById('order-status-filter');
    
    if (timeFilter) {
      timeFilter.addEventListener('change', () => this.filterOrders());
    }
    
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.filterOrders());
    }
  }

  filterOrders() {
    // Implemente sua lógica de filtragem aqui
    console.log('Filtrando pedidos...');
  }

  renderPayments() {
    if (!this.currentUser?.cartoes) return;
    
    const container = document.getElementById('payment-methods-list');
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
        <p>Tem certeza que deseja remover este cartão cadastrado?</p>
        <div class="confirmation-buttons">
          <button id="cancelRemove" class="btn-outline">Cancelar</button>
          <button id="confirmRemove" class="btn-gold">Remover</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('confirmRemove')?.addEventListener('click', () => {
      this.removeCard(cardId);
      modal.remove();
    });

    document.getElementById('cancelRemove')?.addEventListener('click', () => {
      modal.remove();
    });
  }

  removeCard(cardId) {
    console.log(`Removendo cartão ${cardId}...`);
    // Implemente sua lógica de remoção aqui
    // Atualize a UI após remoção
    this.renderPayments();
  }

  renderBenefits() {
    const { nivelFidelidade, pontos, dataNascimento } = this.currentUser;
    const container = document.getElementById('benefits-content');
    if (!container) return;

    // Verifica se é aniversário
    const isBirthday = this.checkBirthday(dataNascimento);
    
    container.innerHTML = `
      <div class="benefits-header">
        <h3><i class="fas fa-award"></i> Seus Benefícios</h3>
        <div class="tier-info">
          <span id="current-tier-badge" class="tier-badge ${nivelFidelidade.toLowerCase()}">
            ${nivelFidelidade}
          </span>
          <span id="days-to-next-tier">${this.getNextTierMessage(nivelFidelidade, pontos)}</span>
        </div>
      </div>
      
      <div class="benefits-grid">
        ${this.createBenefitCard(
          'presente',
          'Presente de Aniversário',
          isBirthday ? 'Escolha seu presente especial!' : 'Disponível no seu aniversário',
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
        
        ${this.createNextTierBenefit(nivelFidelidade, pontos)}
      </div>
      
      ${isBirthday ? this.createBirthdayBenefitOptions() : ''}
    `;

    if (isBirthday) {
      this.setupBenefitSelection();
    }
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

  createNextTierBenefit(currentLevel, currentPoints) {
    const levels = {
      BRONZE: { next: 'PRATA', min: 1000, benefits: ['10% desconto', 'Frete grátis acima R$100'] },
      PRATA: { next: 'OURO', min: 5000, benefits: ['15% desconto', 'Presente aniversário'] },
      OURO: { next: 'DIAMANTE', min: 15000, benefits: ['20% desconto', 'Atendimento VIP'] },
      DIAMANTE: null
    };

    const nextLevel = levels[currentLevel];
    if (!nextLevel) return '';

    const progress = (currentPoints / nextLevel.min) * 100;
    const pointsNeeded = nextLevel.min - currentPoints;

    return `
      <div class="benefit-card upcoming-benefit">
        <div class="benefit-icon">
          <i class="fas fa-level-up-alt"></i>
        </div>
        <h4>Próximo Nível: ${nextLevel.next}</h4>
        <p>Desbloqueie:</p>
        <ul>
          ${nextLevel.benefits.map(b => `<li>${b}</li>`).join('')}
        </ul>
        <div class="progress-container">
          <div class="progress-fill" style="width: ${Math.min(100, progress)}%"></div>
        </div>
        <div class="progress-text">Faltam ${pointsNeeded} pontos</div>
      </div>
    `;
  }

  checkBirthday(birthdate) {
    if (!birthdate) return false;
    const now = new Date();
    const birthDate = new Date(birthdate);
    return now.getMonth() === birthDate.getMonth() && 
           now.getDate() === birthDate.getDate();
  }

  createBirthdayBenefitOptions() {
    return `
      <div class="birthday-benefit">
        <h4><i class="fas fa-birthday-cake"></i> Escolha seu Presente de Aniversário!</h4>
        <p>Parabéns! Selecione um dos benefícios abaixo:</p>
        
        <div class="benefit-options">
          <div class="benefit-option" data-benefit="frete">
            <i class="fas fa-truck"></i>
            <h5>Frete Grátis por 30 dias</h5>
            <p>Em todos os pedidos deste mês</p>
          </div>
          
          <div class="benefit-option" data-benefit="desconto">
            <i class="fas fa-percentage"></i>
            <h5>20% de Desconto</h5>
            <p>No seu próximo pedido</p>
          </div>
          
          <div class="benefit-option" data-benefit="pontos">
            <i class="fas fa-star"></i>
            <h5>1000 Pontos Extras</h5>
            <p>Adicionados à sua conta</p>
          </div>
        </div>
        
        <button id="confirm-benefit" class="btn-gold" disabled>
          <i class="fas fa-gift"></i> Confirmar Escolha
        </button>
      </div>
    `;
  }

  setupBenefitSelection() {
    const options = document.querySelectorAll('.benefit-option');
    const confirmBtn = document.getElementById('confirm-benefit');
    let selectedBenefit = null;

    options.forEach(option => {
      option.addEventListener('click', () => {
        options.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedBenefit = option.dataset.benefit;
        confirmBtn.disabled = false;
      });
    });

    confirmBtn?.addEventListener('click', () => {
      if (!selectedBenefit) return;
      
      console.log(`Benefício selecionado: ${selectedBenefit}`);
      // Implemente a lógica para salvar a escolha
      this.showConfirmation('Presente selecionado com sucesso!');
    });
  }

  getNextTierMessage(currentLevel, currentPoints) {
    const levels = {
      BRONZE: { next: 'PRATA', min: 1000 },
      PRATA: { next: 'OURO', min: 5000 },
      OURO: { next: 'DIAMANTE', min: 15000 },
      DIAMANTE: null
    };

    const nextLevel = levels[currentLevel];
    if (!nextLevel) return 'Você alcançou o nível máximo!';

    const pointsNeeded = nextLevel.min - currentPoints;
    return `Faltam ${pointsNeeded} pontos para ${nextLevel.next}`;
  }

  showConfirmation(message) {
    const modal = document.createElement('div');
    modal.className = 'notification-modal';
    modal.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-check-circle"></i>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(modal);

    setTimeout(() => {
      modal.classList.add('fade-out');
      setTimeout(() => modal.remove(), 500);
    }, 3000);
  }

  showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    `;
    this.modal.appendChild(errorEl);

    setTimeout(() => {
      errorEl.remove();
    }, 5000);
  }

  close() {
    if (!this.isOpen) return;
    
    console.log('[ProfileModal] Fechando modal...');
    this.modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    this.isOpen = false;
  }
}

// Inicialização controlada
document.addEventListener('DOMContentLoaded', () => {
  // Garante single instance
  if (!window.profileModal) {
    window.profileModal = new ProfileModal();
    
    // Configura botão de perfil
    document.getElementById('authButton')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.profileModal?.open();
    });
  }
});