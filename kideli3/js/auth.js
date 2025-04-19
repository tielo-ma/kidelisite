class ProfileModal {
  constructor() {
    this.modal = document.getElementById('profileModal');
    this.tabs = document.querySelectorAll('.profile-tab');
    this.tabPanes = document.querySelectorAll('.tab-pane');
    if (!this.modal) {
      console.error('Modal não encontrado - verifique o ID no HTML');
      return;
    }

    this.closeButton = this.modal.querySelector('.profile-close');
    this.profileContent = this.modal.querySelector('.profile-modal-content');
    
    console.log('Elementos do modal:', {
      modal: this.modal,
      closeButton: this.closeButton,
      profileContent: this.profileContent
    });

    this.init();
  }

  initTabs() {
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove classe ativa de todas as abas
        this.tabs.forEach(t => t.classList.remove('active'));
        // Adiciona classe ativa apenas na aba clicada
        tab.classList.add('active');
        
        // Esconde todos os conteúdos
        this.tabPanes.forEach(pane => {
          pane.classList.remove('active');
          pane.style.display = 'none';
        });
        
        // Mostra apenas o conteúdo correspondente
        const targetPane = document.getElementById(tab.dataset.tab + '-content');
        if (targetPane) {
          targetPane.style.display = 'block';
          setTimeout(() => {
            targetPane.classList.add('active');
          }, 10);
        }
      });
    });
  }


  init() {
    this.closeButton?.addEventListener('click', () => this.close());
    
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });
    this.setupLogoutButton();
    this.setupLoginMessage();
    this.setupTabs();
  }

  setupLoginMessage() {
    if (!this.modal.querySelector('#login-required-message')) {
      const loginHTML = `
        <div id="login-required-message" class="login-message">
          <h3>Login necessário</h3>
          <p>Por favor, faça login para acessar seu perfil</p>
          <button id="goToLoginBtn" class="btn">Ir para Login</button>
        </div>
      `;
      this.modal.insertAdjacentHTML('afterbegin', loginHTML);
      
      document.getElementById('goToLoginBtn')?.addEventListener('click', () => {
        this.close();
        document.getElementById('authModal').style.display = 'block';
      });
    }
  }

  updateClientBadge() {
    const user = JSON.parse(sessionStorage.getItem('auth_user') || '{}');
    const badge = document.getElementById('client-name-badge');
    if (badge && user.nome) {
        // Pega as iniciais do nome (2 primeiras letras)
        const initials = user.nome.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        badge.textContent = initials + '+'; // Formato AA+
    }
  }

  setupLogoutButton() {
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
          logoutBtn.addEventListener('click', (e) => {
              e.preventDefault();
              if (confirm('Deseja realmente sair da sua conta?')) {
                  // Chama a função de logout do auth.js
                  if (window.Auth && window.Auth.logout) {
                      window.Auth.logout();
                  }
                  this.close();
                  // Redireciona para a página inicial ou recarrega
                  window.location.reload();
              }
          });
      }
  }
  setupTabs() {
    try {
      const tabs = this.modal.querySelectorAll('.profile-tab');
      const tabContents = this.modal.querySelectorAll('.profile-tab-content');
      
      tabs.forEach(tab => {
        tab?.addEventListener('click', (e) => {
          e.preventDefault();
          tabs.forEach(t => t?.classList?.remove('active'));
          tab.classList.add('active');
          
          const contentId = tab.getAttribute('data-tab');
          if (contentId) {
            tabContents.forEach(content => {
              content?.classList?.remove('active');
              if (content.id === contentId) {
                content.classList.add('active');
              }
            });
          }
        });
      });

      // Ativa primeira aba se nenhuma estiver ativa
      if (tabs.length > 0 && !this.modal.querySelector('.profile-tab.active')) {
        tabs[0].classList.add('active');
        const firstContentId = tabs[0].getAttribute('data-tab');
        if (firstContentId) {
          this.modal.querySelector(`#${firstContentId}`)?.classList.add('active');
        }
      }
    } catch (error) {
      console.error('Erro ao configurar abas:', error);
    }
  }

  async loadUserData() {
    try {
      const userId = sessionStorage.getItem('userId');
      const token = sessionStorage.getItem('token');
      
      if (!userId || !token) {
        console.warn('Usuário não autenticado');
        return;
      }
      
      // Simulação de API - substitua por sua chamada real
      console.log('Simulando chamada API...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Dados mockados para exemplo
      this.currentUser = {
        id: userId,
        nome: "João Silva",
        email: "joao@exemplo.com",
        celular: "(84) 99999-9999",
        dataNascimento: "1990-01-15",
        pontos: 1250,
        nivelFidelidade: "PRATA",
        historicoPedidos: [
          {
            id: "KD20230001",
            data: "2023-06-10",
            status: "ENTREGUE",
            total: 120.00,
            pontosGanhos: 1200,
            produtos: [
              { nome: "Torta de Morango", quantidade: 1, imagem: "./assets/image/red.jpeg" }
            ]
          }
        ],
        cartoes: [
          {
            id: "card1",
            bandeira: "visa",
            ultimosDigitos: "4242",
            nome: "JOÃO SILVA",
            validade: "12/25"
          }
        ]
      };

      this.renderUserData();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      this.showErrorMessage('Erro ao carregar perfil');
    }
  }

  renderUserData() {
    if (!this.currentUser) return;

    const safeSetContent = (id, content) => {
      const el = document.getElementById(id);
      if (el) el.textContent = content || 'Não informado';
    };
    this.updateClientBadge();
    // Dados básicos
    safeSetContent('profile-modal-name', this.currentUser.nome);
    safeSetContent('profile-modal-email', this.currentUser.email);
    safeSetContent('profile-phone', this.currentUser.celular);
    safeSetContent('profile-birthdate', this.formatDate(this.currentUser.dataNascimento));

    // Fidelidade
    safeSetContent('profile-tier', this.currentUser.nivelFidelidade);
    safeSetContent('profile-points', `${this.currentUser.pontos} pontos`);

    this.renderFidelityProgress(this.currentUser.nivelFidelidade, this.currentUser.pontos);
    this.renderOrderHistory(this.currentUser.historicoPedidos);
    this.renderPaymentMethods(this.currentUser.cartoes);
    this.renderBenefits(this.currentUser.nivelFidelidade, this.currentUser.pontos);

    // Informações básicas
    this.setContent('profile-modal-name', this.currentUser.nome);
    this.setContent('profile-modal-email', this.currentUser.email);
    this.setContent('profile-phone', this.currentUser.celular);
    this.setContent('profile-birthdate', this.formatDate(this.currentUser.dataNascimento));
    this.setContent('profile-address', this.formatAddress(this.currentUser.endereco));

    // Sistema de fidelidade
    this.renderFidelitySystem();
    
    // Abas específicas
    this.renderOrders();
    this.renderPayments();
    this.renderBenefits();
  }

  renderFidelitySystem() {
    const { nivelFidelidade, pontos } = this.currentUser;
    const levels = {
      BRONZE: { min: 0, next: 'PRATA', nextMin: 1000, discount: 0 },
      PRATA: { min: 1000, next: 'OURO', nextMin: 5000, discount: 5 },
      OURO: { min: 5000, next: 'DIAMANTE', nextMin: 15000, discount: 10 },
      DIAMANTE: { min: 15000, next: null, discount: 15 }
    };

    const currentLevel = levels[nivelFidelidade] || levels.BRONZE;

    // Atualiza badge
    const badge = document.getElementById('vip-level-badge');
    if (badge) {
      badge.className = `vip-badge ${nivelFidelidade.toLowerCase()}`;
      badge.querySelector('#vip-level').textContent = nivelFidelidade;
    }

    // Barra de progresso
    const progressBar = document.getElementById('loyalty-progress-bar');
    if (progressBar) {
      const progress = currentLevel.next 
        ? ((pontos - currentLevel.min) / (currentLevel.nextMin - currentLevel.min)) * 100
        : 100;
      progressBar.style.width = `${Math.min(100, progress)}%`;
    }

    // Labels
    this.setContent('current-level', nivelFidelidade);
    this.setContent('current-discount', `${currentLevel.discount}% de desconto`);
    
    if (currentLevel.next) {
      this.setContent('next-level-label', 
        `Próximo nível: ${currentLevel.next} (faltam ${currentLevel.nextMin - pontos} pontos)`);
    } else {
      this.setContent('next-level-label', 'Nível máximo alcançado!');
    }
  }

  renderOrders() {
    const container = document.getElementById('orders-list');
    if (!container || !this.currentUser.historicoPedidos) return;

    const orders = this.currentUser.historicoPedidos.map(order => ({
      ...order,
      statusText: this.getOrderStatusText(order.status),
      statusClass: order.status.toLowerCase()
    }));

    container.innerHTML = orders.length ? orders.map(order => `
      <div class="order-card ${order.statusClass}">
        <div class="order-header">
          <span>Pedido #${order.id}</span>
          <span class="order-status">${order.statusText}</span>
        </div>
        <div class="order-date">${this.formatDate(order.data)}</div>
        <div class="order-products">
          ${order.produtos.slice(0, 3).map(p => `
            <div class="product">
              <img src="${p.imagem || './assets/image/default-product.png'}" alt="${p.nome}">
              <span>${p.nome} (${p.quantidade}x)</span>
            </div>
          `).join('')}
        </div>
        <div class="order-footer">
          <span class="order-total">R$ ${order.total.toFixed(2)}</span>
          ${order.pontosGanhos ? `<span class="order-points">+${order.pontosGanhos} pts</span>` : ''}
        </div>
      </div>
    `).join('') : '<div class="empty-orders">Nenhum pedido encontrado</div>';

    // Configura filtros
    this.setupOrderFilters();
  }

  renderPayments() {
    const container = document.getElementById('payment-methods-list');
    if (!container) return;

    // Cartões cadastrados
    container.innerHTML = this.currentUser.cartoes?.length ? this.currentUser.cartoes.map(card => `
      <div class="payment-card">
        <i class="fab fa-cc-${card.bandeira.toLowerCase()}"></i>
        <div class="card-info">
          <div class="card-number">•••• •••• •••• ${card.ultimosDigitos}</div>
          <div class="card-details">
            <span class="card-name">${card.nome}</span>
            <span class="card-expiry">Expira ${card.validade}</span>
          </div>
        </div>
        <button class="remove-card" data-id="${card.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `).join('') : '<div class="empty-message">Nenhum cartão cadastrado</div>';

    // Histórico de pagamentos
    this.renderPaymentHistory();
  }

  renderPaymentHistory() {
    const container = document.getElementById('payment-history');
    if (!container) return;

    const payments = this.currentUser.historicoPagamentos || [];
    
    container.innerHTML = payments.length ? payments.map(payment => `
      <div class="payment-item">
        <div class="payment-date">${this.formatDate(payment.data)}</div>
        <div class="payment-info">
          <span class="payment-method">${this.getPaymentMethodIcon(payment.metodo)} ${payment.metodo}</span>
          <span class="payment-amount">R$ ${payment.valor.toFixed(2)}</span>
        </div>
        <div class="payment-order">Pedido #${payment.pedidoId}</div>
        <div class="payment-status ${payment.status.toLowerCase()}">${payment.status}</div>
      </div>
    `).join('') : '<div class="empty-message">Nenhum pagamento registrado</div>';
  }

  renderBenefits() {
    const { nivelFidelidade, pontos, dataNascimento } = this.currentUser;
    const levels = ['BRONZE', 'PRATA', 'OURO', 'DIAMANTE'];
    const currentIndex = levels.indexOf(nivelFidelidade);
    const nextLevel = levels[currentIndex + 1];

    // Badge do nível
    const badge = document.getElementById('current-tier-badge');
    if (badge) {
      badge.textContent = nivelFidelidade;
      badge.className = `tier-badge ${nivelFidelidade.toLowerCase()}`;
    }

    // Progresso
    const progressBar = document.getElementById('tier-progress-bar');
    if (progressBar) {
      const progress = nextLevel 
        ? (pontos / (nextLevel === 'PRATA' ? 1000 : nextLevel === 'OURO' ? 5000 : 15000)) * 100
        : 100;
      progressBar.style.width = `${Math.min(100, progress)}%`;
    }

    // Benefícios do próximo nível
    const nextBenefits = document.getElementById('next-tier-benefits');
    if (nextBenefits) {
      nextBenefits.innerHTML = nextLevel ? `
        <strong>${nextLevel}</strong> desbloqueia:
        <ul>
          <li>${nextLevel === 'PRATA' ? '5%' : '10%'} de desconto</li>
          <li>${nextLevel === 'PRATA' ? 'Frete grátis acima de R$100' : 'Presentes exclusivos'}</li>
        </ul>
      ` : 'Você alcançou o nível máximo!';
    }

    // Bônus de aniversário
    this.checkBirthdayBonus(dataNascimento);
  
  }

  renderFidelityProgress(currentLevel, currentPoints) {
    const levels = {
      BRONZE: { min: 0, next: 'PRATA', nextMin: 1000 },
      PRATA: { min: 1000, next: 'OURO', nextMin: 5000 },
      OURO: { min: 5000, next: 'DIAMANTE', nextMin: 15000 },
      DIAMANTE: { min: 15000, next: null }
    };

    const levelConfig = levels[currentLevel] || levels.BRONZE;
    const progressBar = document.getElementById('loyalty-progress-bar');
    const nextLabel = document.getElementById('next-level-label');

    if (progressBar && nextLabel) {
      if (levelConfig.next) {
        const progress = ((currentPoints - levelConfig.min) / (levelConfig.nextMin - levelConfig.min)) * 100;
        progressBar.style.width = `${Math.min(100, progress)}%`;
        nextLabel.textContent = `Próximo: ${levelConfig.next} (faltam ${levelConfig.nextMin - currentPoints} pontos)`;
      } else {
        progressBar.style.width = '100%';
        nextLabel.textContent = 'Nível máximo alcançado!';
      }
    }
  }

  renderOrderHistory(orders) {
    const container = document.getElementById('orders-list');
    if (!container) return;

    if (!orders?.length) {
      container.innerHTML = '<div class="empty-state">Nenhum pedido encontrado</div>';
      return;
    }

    container.innerHTML = orders.map(order => `
      <div class="order-card">
        <div class="order-header">
          <span>Pedido #${order.id}</span>
          <span class="status ${order.status.toLowerCase()}">${order.status}</span>
        </div>
        <div class="order-date">${this.formatDate(order.data)}</div>
        <div class="order-products">
          ${order.produtos.slice(0, 3).map(p => `
            <div class="product">
              <img src="${p.imagem || './assets/image/red.jpeg'}" alt="${p.nome}">
              <span>${p.nome} (${p.quantidade}x)</span>
            </div>
          `).join('')}
        </div>
        <div class="order-total">
          <span>Total: R$ ${order.total.toFixed(2)}</span>
          ${order.pontosGanhos ? `<span class="points">+${order.pontosGanhos} pts</span>` : ''}
        </div>
      </div>
    `).join('');
  }

  renderPaymentMethods(cards) {
    const container = document.getElementById('payment-methods-list');
    if (!container) return;

    container.innerHTML = cards?.length ? cards.map(card => `
      <div class="payment-card">
        <i class="fab fa-cc-${card.bandeira.toLowerCase()}"></i>
        <div class="card-info">
          <div>•••• •••• •••• ${card.ultimosDigitos}</div>
          <small>${card.nome} • Expira ${card.validade}</small>
        </div>
        <button class="remove-card" data-id="${card.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `).join('') : '<div class="empty-state">Nenhum cartão cadastrado</div>';
  }

  renderBenefits(currentLevel, currentPoints) {
    const tierBadge = document.getElementById('current-tier-badge');
    if (tierBadge) {
      tierBadge.textContent = currentLevel;
      tierBadge.className = `badge ${currentLevel.toLowerCase()}`;
    }
  }

  open() {
    if (!this.modal) return;

    console.log('Abrindo modal de perfil...');
    this.modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    const isLoggedIn = sessionStorage.getItem('auth_token') !== null;
    const loginMsg = this.modal.querySelector('#login-required-message');
    const profileContent = this.modal.querySelector('.profile-modal-content');

    if (loginMsg) loginMsg.style.display = isLoggedIn ? 'none' : 'block';
    if (profileContent) profileContent.style.display = isLoggedIn ? 'block' : 'none';

    if (isLoggedIn) {
      this.loadUserData();
    }
  }

  close() {
    if (this.modal) {
      this.modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }

  showErrorMessage(message) {
    console.error(message);
    // Implemente sua lógica de exibição de erros
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  window.profileModal = new ProfileModal();
  
  document.getElementById('authButton')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (sessionStorage.getItem('auth_token')) {
      window.profileModal?.open();
    } else {
      document.getElementById('authModal').style.display = 'block';
    }
  });
});