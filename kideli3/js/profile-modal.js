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
    this.logoutBtn = this.modal.querySelector('#logout-btn');
    if (!this.logoutBtn) {
      console.warn('[ProfileModal] Botão de logout não encontrado');
    }
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
    if (!this.logoutBtn) {
      console.warn('[ProfileModal] Botão de logout não disponível');
      return;
    }

    this.logoutBtn.removeEventListener('click', this.handleLogoutClick);
    this.handleLogoutClick = this.handleLogoutClick.bind(this);
    this.logoutBtn.addEventListener('click', this.handleLogoutClick);
    console.log('[ProfileModal] Botão de logout configurado');
  }

  handleLogoutClick(e) {
    e.preventDefault();
    console.log('[ProfileModal] Botão de logout clicado');
    this.confirmLogout();
  }

  confirmLogout() {
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal';
    modal.style.display = 'none';
    
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
    
    setTimeout(() => {
        modal.style.display = 'flex';
        
        const confirmBtn = document.getElementById('confirmLogout');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                try {
                    if (window.Auth && window.Auth.logout) {
                        window.Auth.logout();
                    } else {
                        sessionStorage.removeItem('auth_token');
                        sessionStorage.removeItem('auth_user');
                        localStorage.removeItem('kideliCart');
                        
                        const authButtons = document.querySelectorAll('.auth-button');
                        authButtons.forEach(btn => {
                            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
                            btn.classList.remove('logged-in');
                        });
                        
                        showNotification('Você foi desconectado', 'info');
                    }
                    
                    this.close();
                    modal.remove();
                    setTimeout(() => window.location.reload(), 300);
                    
                } catch (error) {
                    console.error('Erro durante logout:', error);
                    modal.remove();
                    this.showError('Erro ao sair da conta');
                }
            });
        }
        
        const cancelBtn = document.getElementById('cancelLogout');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.remove();
            });
        }
    }, 50);
  }

  async open() {
    if (this.isOpen) return;
    
    console.log('[ProfileModal] Abrindo modal...');
    this.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    this.isOpen = true;
    
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
    if (window.Auth?.getCurrentUser) {
      return window.Auth.getCurrentUser();
    }
    
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
    const user = window.Auth?.getUser ? window.Auth.getUser() : getLoggedUser();
    
    if (!user) {
        throw new Error('Usuário não autenticado');
    }
    
    const usuarioCompleto = getUsuarioById(user.id);
    
    if (!usuarioCompleto) {
        throw new Error('Dados do usuário não encontrados');
    }
    
    return usuarioCompleto;
  }

  renderUserData() {
    if (!this.currentUser) return;

    this.setTextContent('profile-modal-name', this.currentUser.nome);
    this.setTextContent('profile-modal-email', this.currentUser.email);
    this.setTextContent('profile-phone', this.currentUser.celular);
    this.setTextContent('profile-birthdate', this.formatDate(this.currentUser.dataNascimento));
    this.setTextContent('profile-address', this.formatAddress(this.currentUser.endereco));

    this.renderFidelitySystem();
    this.updateUserBadge();
    this.setupProfileEditing();
  }

  renderFidelitySystem() {
    const { nivelFidelidade, pontos } = this.currentUser;
    
    const levels = {
      BRONZE: { 
        min: 0, 
        next: 'PRATA', 
        nextMin: 1000, 
        discount: 5, 
        color: '#cd7f32',
        icon: 'shield-alt',
        benefits: ['5% de desconto']
      },
      PRATA: { 
        min: 1000, 
        next: 'OURO', 
        nextMin: 5000, 
        discount: 10, 
        color: '#c0c0c0',
        icon: 'shield-alt',
        benefits: ['10% de desconto', 'Frete grátis acima de R$100']
      },
      OURO: { 
        min: 5000, 
        next: 'DIAMANTE', 
        nextMin: 15000, 
        discount: 15, 
        color: '#ffd700',
        icon: 'crown',
        benefits: ['15% de desconto', 'Frete grátis acima de R$50', 'Presente de aniversário']
      },
      DIAMANTE: { 
        min: 15000, 
        next: null, 
        discount: 20, 
        color: '#b9f2ff',
        icon: 'gem',
        benefits: ['20% de desconto', 'Frete grátis ilimitado', 'Presente de aniversário premium', 'Acesso VIP', 'Brinde exclusivo']
      }
    };

    const currentLevel = levels[nivelFidelidade] || levels.BRONZE;

    const badge = document.getElementById('vip-level-badge');
    if (badge) {
      badge.className = `vip-badge ${nivelFidelidade.toLowerCase()}`;
      badge.querySelector('#vip-level').textContent = nivelFidelidade;
      badge.style.backgroundColor = currentLevel.color;
      
      const icon = badge.querySelector('.vip-icon');
      if (icon) {
        icon.className = `fas fa-${currentLevel.icon} vip-icon`;
      } else {
        badge.insertAdjacentHTML('afterbegin', `<i class="fas fa-${currentLevel.icon} vip-icon"></i>`);
      }
    }

    this.renderProgressBar(pontos, currentLevel);

    this.setTextContent('profile-tier', nivelFidelidade);
    this.setTextContent('profile-points', `${pontos.toLocaleString('pt-BR')} pontos`);
    this.setTextContent('current-discount', `Desconto: ${currentLevel.discount}%`);
    
    if (currentLevel.next) {
      const pointsNeeded = currentLevel.nextMin - pontos;
      this.setTextContent('next-level-label', 
        `Próximo nível (${currentLevel.next}): faltam ${pointsNeeded.toLocaleString('pt-BR')} pontos`);
    } else {
      this.setTextContent('next-level-label', '🎉 Você alcançou o nível máximo!');
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

  renderBenefits() {
    const { nivelFidelidade, pontos, dataNascimento } = this.currentUser;
    const container = document.getElementById('benefits-content');
    if (!container) return;

    const isBirthday = this.checkBirthday(dataNascimento);
    const isDiamond = nivelFidelidade === 'DIAMANTE';
    
    container.innerHTML = `
      <div class="benefits-header">
        <h3><i class="fas fa-award"></i> Seus Benefícios Exclusivos</h3>
        <div class="tier-info">
          <span id="current-tier-badge" class="tier-badge ${nivelFidelidade.toLowerCase()}">
            <i class="fas fa-${isDiamond ? 'gem' : 'shield-alt'}"></i>
            ${nivelFidelidade}
          </span>
          <span id="days-to-next-tier">${this.getNextTierMessage(nivelFidelidade, pontos)}</span>
        </div>
      </div>
      
      <div class="benefits-grid">
        ${this.createBenefitCard(
          'gift',
          isDiamond ? 'Presente Diamante' : 'Presente de Aniversário',
          isBirthday ? 
            (isDiamond ? 'Escolha seu presente premium!' : 'Escolha seu presente especial!') : 
            'Disponível no seu aniversário',
          isBirthday,
          isBirthday ? (isDiamond ? 'diamond' : 'gold') : 'upcoming',
          isDiamond
        )}
        
        ${this.createBenefitCard(
          'shipping',
          'Frete Grátis',
          isDiamond ? 'Frete grátis em todos pedidos' : 
          nivelFidelidade === 'OURO' ? 'Frete grátis acima de R$ 50' : 
          nivelFidelidade === 'PRATA' ? 'Frete grátis acima de R$ 100' : 'Disponível em níveis superiores',
          nivelFidelidade === 'DIAMANTE' || nivelFidelidade === 'OURO' || nivelFidelidade === 'PRATA',
          nivelFidelidade === 'DIAMANTE' ? 'diamond' : 
          nivelFidelidade === 'OURO' ? 'gold' : 
          nivelFidelidade === 'PRATA' ? 'silver' : 'upcoming'
        )}
        
        ${this.createBenefitCard(
          'percent',
          'Descontos Exclusivos',
          isDiamond ? '20% de desconto em todos produtos' : 
          nivelFidelidade === 'OURO' ? '15% de desconto' : 
          nivelFidelidade === 'PRATA' ? '10% de desconto' : '5% de desconto',
          true,
          nivelFidelidade.toLowerCase()
        )}
        
        ${this.createBenefitCard(
          'star',
          'Programa VIP',
          isDiamond ? 'Acesso exclusivo a produtos e eventos' : 
          'Desbloqueie com nível Diamante',
          isDiamond,
          isDiamond ? 'diamond' : 'upcoming'
        )}
        
        ${isDiamond ? this.createDiamondExclusiveBenefit() : ''}
        
        ${this.createNextTierBenefit(nivelFidelidade, pontos)}
      </div>
      
      ${isBirthday ? this.createBirthdayBenefitOptions(isDiamond) : ''}
    `;

    if (isBirthday) {
      this.setupBenefitSelection(isDiamond);
    }
  }

  createDiamondExclusiveBenefit() {
    return `
      <div class="benefit-card diamond-benefit active">
        <div class="benefit-icon">
          <i class="fas fa-gem"></i>
        </div>
        <h4>Brinde Diamante</h4>
        <p>Receba um brinde exclusivo a cada 3 meses</p>
        <div class="benefit-status active">Disponível</div>
        <button class="btn-diamond claim-gift">
          <i class="fas fa-gift"></i> Resgatar Brinde
        </button>
      </div>
    `;
  }

  createBenefitCard(icon, title, description, isActive, type, isDiamond = false) {
    return `
      <div class="benefit-card ${type}-benefit ${isActive ? 'active' : ''}">
        <div class="benefit-icon">
          <i class="fas fa-${icon}"></i>
        </div>
        <h4>${title}</h4>
        <p>${description}</p>
        ${isActive ? '<div class="benefit-status active">Disponível</div>' : ''}
        ${isActive && isDiamond ? '<div class="diamond-exclusive"><i class="fas fa-gem"></i> Exclusivo Diamante</div>' : ''}
      </div>
    `;
  }

  createNextTierBenefit(currentLevel, currentPoints) {
    const levels = {
      BRONZE: { 
        next: 'PRATA', 
        min: 1000, 
        benefits: ['10% desconto', 'Frete grátis acima R$100'],
        icon: 'shield-alt'
      },
      PRATA: { 
        next: 'OURO', 
        min: 5000, 
        benefits: ['15% desconto', 'Frete grátis acima R$50', 'Presente de aniversário'],
        icon: 'crown'
      },
      OURO: { 
        next: 'DIAMANTE', 
        min: 15000, 
        benefits: ['20% desconto', 'Frete grátis ilimitado', 'Presente premium', 'Brinde exclusivo'],
        icon: 'gem'
      },
      DIAMANTE: null
    };

    const nextLevel = levels[currentLevel];
    if (!nextLevel) return '';

    const progress = (currentPoints / nextLevel.min) * 100;
    const pointsNeeded = nextLevel.min - currentPoints;

    return `
      <div class="benefit-card upcoming-benefit">
        <div class="benefit-icon">
          <i class="fas fa-${nextLevel.icon}"></i>
        </div>
        <h4>Próximo Nível: ${nextLevel.next}</h4>
        <p>Desbloqueie benefícios exclusivos:</p>
        <ul>
          ${nextLevel.benefits.map(b => `<li><i class="fas fa-check"></i> ${b}</li>`).join('')}
        </ul>
        <div class="progress-container">
          <div class="progress-fill" style="width: ${Math.min(100, progress)}%"></div>
        </div>
        <div class="progress-text">Faltam ${pointsNeeded.toLocaleString('pt-BR')} pontos</div>
      </div>
    `;
  }

  createBirthdayBenefitOptions(isDiamond = false) {
    const diamondOptions = isDiamond ? `
      <div class="benefit-option" data-benefit="diamond-gift">
        <i class="fas fa-gem"></i>
        <h5>Brinde Diamante</h5>
        <p>Produto exclusivo da coleção premium</p>
        <span class="badge-diamond">Exclusivo</span>
      </div>
      
      <div class="benefit-option" data-benefit="personal-shopper">
        <i class="fas fa-concierge-bell"></i>
        <h5>Personal Shopper</h5>
        <p>Atendimento VIP por 1 mês</p>
        <span class="badge-diamond">Exclusivo</span>
      </div>
    ` : '';

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
            <h5>${isDiamond ? '25%' : '20%'} de Desconto</h5>
            <p>No seu próximo pedido</p>
          </div>
          
          <div class="benefit-option" data-benefit="pontos">
            <i class="fas fa-coins"></i>
            <h5>${isDiamond ? '2000' : '1000'} Pontos Extras</h5>
            <p>Adicionados à sua conta</p>
          </div>
          
          ${diamondOptions}
        </div>
        
        <button id="confirm-benefit" class="btn-gold" disabled>
          <i class="fas fa-gift"></i> Confirmar Escolha
        </button>
      </div>
    `;
  }

  setupBenefitSelection(isDiamond = false) {
    const options = document.querySelectorAll('.benefit-option');
    const confirmBtn = document.getElementById('confirm-benefit');
    let selectedBenefit = null;

    options.forEach(option => {
      option.addEventListener('click', () => {
        options.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedBenefit = option.dataset.benefit;
        confirmBtn.disabled = false;
        
        if (isDiamond && (selectedBenefit === 'diamond-gift' || selectedBenefit === 'personal-shopper')) {
          confirmBtn.className = 'btn-diamond';
        } else {
          confirmBtn.className = 'btn-gold';
        }
      });
    });

    confirmBtn?.addEventListener('click', () => {
      if (!selectedBenefit) return;
      
      let message = 'Presente selecionado com sucesso!';
      if (isDiamond && selectedBenefit === 'diamond-gift') {
        message = '🎁 Seu brinde Diamante será enviado em breve!';
      } else if (isDiamond && selectedBenefit === 'personal-shopper') {
        message = '👔 Seu personal shopper entrará em contato em breve!';
      }
      
      this.showConfirmation(message);
      
      // Aqui você pode adicionar a lógica para salvar a escolha do benefício
      setTimeout(() => {
        this.close();
      }, 3000);
    });

    // Configurar o botão de resgate do brinde Diamante
    const claimBtn = document.querySelector('.claim-gift');
    if (claimBtn) {
      claimBtn.addEventListener('click', () => {
        this.showConfirmation('Seu brinde Diamante será enviado em breve! 🚀');
      });
    }
  }

  // ... (mantive os métodos restantes como checkBirthday, getNextTierMessage, 
  // showConfirmation, showError, close, etc. sem alterações)

  close() {
    if (!this.isOpen) return;
    
    console.log('[ProfileModal] Fechando modal...');
    this.modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    this.isOpen = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.profileModal) {
    window.profileModal = new ProfileModal();
    
    document.getElementById('authButton')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.profileModal?.open();
    });
  }
});