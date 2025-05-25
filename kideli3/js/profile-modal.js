class ProfileModal {
  constructor() {
    this.state = {
      isOpen: false,
      isEditing: false,
      isLoading: false,
      currentTab: 'profile',
      avatarChanged: false
    };

    this.statusMap = {
      'delivered': { class: 'delivered', text: 'Entregue' },
      'processing': { class: 'processing', text: 'Processando' },
      'canceled': { class: 'canceled', text: 'Cancelado' }
    };

    this.currentUser = null;
    this.elements = {};
    this.avatarFile = null;

    // Mapeamento de elementos essenciais
    this.requiredElements = {
      modal: 'profileModal',
      closeBtn: 'profile-close',
      tabs: 'profile-tabs',
      tabContents: 'profile-tab-content',
      loader: 'profile-loader',
      loginMessage: 'login-required-message',
      editBtn: 'edit-profile-btn',
      saveBtn: 'save-profile-btn',
      logoutBtn: 'logout-btn',
      loginBtn: 'goToLoginBtn',
      avatarInput: 'avatar-input',
      avatarPreview: 'avatar-preview',
      // Elementos de dados
      name: 'profile-name',
      email: 'profile-email',
      phone: 'profile-phone',
      birthday: 'profile-birthday',
      cpf: 'profile-cpf',
      street: 'profile-rua',
      number: 'profile-numero',
      complement: 'profile-complemento',
      neighborhood: 'profile-bairro',
      city: 'profile-cidade',
      state: 'profile-uf',
      ordersContent: 'orders-content',
      addressesContent: 'addresses-content',
      fidelityContent: 'fidelity-content',
      preferencesContent: 'preferences-content'
    };

    try {
      this._initialize();
      console.log('[ProfileModal] Initialized successfully');
    } catch (error) {
      console.error('[ProfileModal] Initialization error:', error);
      this._showError('Failed to load profile');
    }
  }

  /* ========== PRIVATE METHODS ========== */

  _initialize() {
    this._loadElements();
    this._setupEventListeners();
    this.passwordRecovery = new PasswordRecovery('passwordRecoveryModal');
    
    // Adicione um link/trigger em algum lugar apropriado
    this.elements.loginMessage?.querySelector('.auth-links')?.insertAdjacentHTML('beforeend', `
      <a href="#" id="forgot-password-link">Esqueceu sua senha?</a>
    `);
    
    document.getElementById('forgot-password-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.passwordRecovery.open();
    });
  }

  _loadElements() {
    // Load all required elements
    for (const [key, id] of Object.entries(this.requiredElements)) {
      const element = document.getElementById(id);
      if (!element) {
        console.error(`[ProfileModal] Element ${id} not found`);
        continue;
      }
      this.elements[key] = element;
    }

    // Check critical elements
    if (!this.elements.modal) {
      throw new Error('Main modal element not found');
    }
  }

  _setupEventListeners() {
    // Close modal
    if (this.elements.closeBtn) {
      this.elements.closeBtn.addEventListener('click', () => this.close());
    }

    // Close when clicking outside
    if (this.elements.modal) {
      this.elements.modal.addEventListener('click', (e) => {
        if (e.target === this.elements.modal) this.close();
      });
    }

    // Close with ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state.isOpen) {
        this.close();
      }
    });

    // Login button
    if (this.elements.loginBtn) {
      this.elements.loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
        this.showAuthModal('login');
      });
    }

    // Logout button
    if (this.elements.logoutBtn) {
      this.elements.logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._handleLogout();
      });
    }

    // Edit buttons
    if (this.elements.editBtn) {
      this.elements.editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleEditMode();
      });
    }

    if (this.elements.saveBtn) {
      this.elements.saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.saveChanges();
      });
    }

    // Tab switching
    if (this.elements.tabs) {
      this.elements.tabs.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab-button');
        if (tabBtn) {
          e.preventDefault();
          const tabId = tabBtn.dataset.tab;
          this.switchTab(tabId);
        }
      });
    }

    // Avatar upload
    if (this.elements.avatarInput) {
      this.elements.avatarInput.addEventListener('change', (e) => {
        this._handleAvatarUpload(e);
      });
    }

    // Setup fidelity actions
    this.setupFidelityActions();
  }

  /**
   * Configura os eventos dos botões de fidelidade
   */
  setupFidelityActions() {
    // Configura botões de resgate
    document.querySelectorAll('.btn-resgatar').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const benefit = btn.dataset.benefit;
        await this.resgatarBeneficio(benefit);
      });
    });

    // Configura botão "Como ganhar pontos"
    const pontosBtn = document.getElementById('btn-como-ganhar-pontos');
    if (pontosBtn) {
      pontosBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showComoGanharPontosModal();
      });
    }

    // Configura botões de benefícios
    document.querySelectorAll('.btn-beneficio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const benefit = btn.dataset.benefit;
        this.mostrarDetalhesBeneficio(benefit);
      });
    });
  }

  /**
   * Resgata um benefício do programa de fidelidade
   */
  async resgatarBeneficio(benefit) {
    try {
      this._showLoading();
      
      // Verifica se o usuário tem pontos suficientes
      const custo = this._getBenefitCost(benefit);
      if (this.currentUser.points < custo) {
        throw new Error(`Você precisa de ${custo} pontos para resgatar este benefício`);
      }
      
      // Simular chamada à API (substitua por chamada real)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Atualizar pontos do usuário
      this.currentUser.points -= custo;
      
      // Adicionar benefício à lista de benefícios resgatados
      if (!this.currentUser.benefits) {
        this.currentUser.benefits = [];
      }
      
      this.currentUser.benefits.push({
        id: benefit,
        name: this._getBenefitName(benefit),
        date: new Date().toISOString(),
        used: false
      });
      
      // Atualizar storage
      sessionStorage.setItem('auth_user', JSON.stringify(this.currentUser));
      localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
      
      this.showNotification(`Benefício "${this._getBenefitName(benefit)}" resgatado com sucesso!`, 'success');
      this.loadFidelityData();
    } catch (error) {
      console.error('Erro ao resgatar benefício:', error);
      this.showNotification(error.message || 'Erro ao resgatar benefício', 'error');
    } finally {
      this._hideLoading();
    }
  }

  /**
   * Mostra detalhes de um benefício específico
   */
  mostrarDetalhesBeneficio(benefit) {
    const benefitInfo = this._getBenefitDetails(benefit);
    const modalContent = `
      <div class="benefit-details">
        <div class="benefit-header ${benefit}">
          <i class="${benefitInfo.icon}"></i>
          <h3>${benefitInfo.name}</h3>
        </div>
        
        <div class="benefit-body">
          <p>${benefitInfo.description}</p>
          
          <div class="benefit-meta">
            <div class="meta-item">
              <i class="fas fa-coins"></i>
              <span>${benefitInfo.cost} pontos</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-calendar-alt"></i>
              <span>${benefitInfo.validity}</span>
            </div>
          </div>
          
          ${this.currentUser.points >= benefitInfo.cost ? 
            `<button class="btn-gold btn-resgatar" data-benefit="${benefit}">
              Resgatar Agora
            </button>` : 
            `<div class="points-required">
              Você precisa de mais ${benefitInfo.cost - this.currentUser.points} pontos
            </div>`
          }
        </div>
      </div>
    `;
    
    this.showCustomModal(benefitInfo.name, modalContent);
  }

  /**
   * Mostra o modal com dicas para ganhar mais pontos
   */
  showComoGanharPontosModal() {
    const userId = this.currentUser?.id || '12345'; // ID do usuário ou padrão
    const modalContent = `
      <div class="pontos-modal">
        <h3><i class="fas fa-coins"></i> Como Ganhar Mais Pontos</h3>
        
        <div class="pontos-tip">
          <div class="pontos-icon"><i class="fas fa-shopping-bag"></i></div>
          <div class="pontos-content">
            <h4>Compras</h4>
            <p>Ganhe 1 ponto para cada R$1 gasto em compras.</p>
            <p class="highlight">Nível atual: ${this._getMultiplierForTier()}</p>
          </div>
        </div>
        
        <div class="pontos-tip">
          <div class="pontos-icon"><i class="fas fa-user-plus"></i></div>
          <div class="pontos-content">
            <h4>Indique Amigos</h4>
            <p>Ganhe 100 pontos por cada amigo que fizer o primeiro pedido usando seu código.</p>
            <div class="referral-code">
              <input type="text" value="KIDELI-${userId}" readonly>
              <button class="btn-copiar-codigo">Copiar</button>
            </div>
            <small>Compartilhe seu código com amigos e ganhe pontos quando eles fizerem o primeiro pedido</small>
          </div>
        </div>
        
        <div class="pontos-tip">
          <div class="pontos-icon"><i class="fas fa-calendar-check"></i></div>
          <div class="pontos-content">
            <h4>Fidelidade Semanal</h4>
            <p>Faça pedidos 3 semanas consecutivas e ganhe 150 pontos bônus.</p>
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress-fill" style="width: 66%"></div>
              </div>
              <span>2/3 semanas completas</span>
            </div>
          </div>
        </div>
        
        <div class="pontos-tip">
          <div class="pontos-icon"><i class="fas fa-birthday-cake"></i></div>
          <div class="pontos-content">
            <h4>Aniversário</h4>
            <p>Ganhe 200 pontos no seu aniversário!</p>
            <small>Disponível no mês do seu aniversário</small>
          </div>
        </div>
        
        <div class="pontos-tip">
          <div class="pontos-icon"><i class="fas fa-star"></i></div>
          <div class="pontos-content">
            <h4>Avaliações</h4>
            <p>Ganhe 10 pontos por cada avaliação de produto.</p>
            <small>Máximo de 50 pontos por mês</small>
          </div>
        </div>
      </div>
    `;
    
    this.showCustomModal('Como Ganhar Pontos', modalContent);
    
    // Configura evento do botão copiar
    document.querySelector('.btn-copiar-codigo')?.addEventListener('click', () => {
      const codeInput = document.querySelector('.referral-code input');
      codeInput.select();
      document.execCommand('copy');
      this.showNotification('Código copiado! Compartilhe com seus amigos.', 'success');
    });
  }

  /**
   * Mostra um modal customizado
   */
  showCustomModal(title, content) {
    const modalId = 'custom-modal';
    let modal = document.getElementById(modalId);
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'custom-modal';
      modal.innerHTML = `
        <div class="custom-modal-content">
          <span class="custom-modal-close">&times;</span>
          <h2>${title}</h2>
          <div class="custom-modal-body"></div>
        </div>
      `;
      document.body.appendChild(modal);
      
      modal.querySelector('.custom-modal-close').addEventListener('click', () => {
        modal.style.display = 'none';
      });
      
      // Fechar ao clicar fora
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }
    
    modal.querySelector('.custom-modal-body').innerHTML = content;
    modal.style.display = 'block';
    
    // Configurar eventos dos botões dentro do modal
    this.setupFidelityActions();
  }

  /**
   * Funções auxiliares para o sistema de fidelidade
   */
  _getBenefitCost(benefit) {
    const costs = {
      'frete_gratis': 200,
      'desconto_10': 150,
      'brinde': 100,
      'cupom_15': 300,
      'upgrade_tier': 500
    };
    return costs[benefit] || 0;
  }

  _getBenefitName(benefit) {
    const names = {
      'frete_gratis': 'Frete Grátis',
      'desconto_10': '10% de Desconto',
      'brinde': 'Brinde Especial',
      'cupom_15': 'Cupom de 15%',
      'upgrade_tier': 'Upgrade de Tier'
    };
    return names[benefit] || benefit;
  }

  _getBenefitDetails(benefit) {
    const benefits = {
      'frete_gratis': {
        name: 'Frete Grátis',
        description: 'Frete grátis em qualquer compra, independente do valor. Válido por 30 dias após o resgate.',
        cost: 200,
        validity: 'Válido por 30 dias',
        icon: 'fas fa-truck'
      },
      'desconto_10': {
        name: '10% de Desconto',
        description: 'Cupom de desconto de 10% em qualquer compra. Pode ser usado uma única vez.',
        cost: 150,
        validity: 'Válido por 15 dias',
        icon: 'fas fa-percentage'
      },
      'brinde': {
        name: 'Brinde Especial',
        description: 'Brinde exclusivo em seu próximo pedido. Escolha entre várias opções na finalização da compra.',
        cost: 100,
        validity: 'Válido por 60 dias',
        icon: 'fas fa-gift'
      },
      'cupom_15': {
        name: 'Cupom de 15%',
        description: 'Cupom de desconto de 15% em compras acima de R$ 200,00. Apenas para nível Ouro ou superior.',
        cost: 300,
        validity: 'Válido por 7 dias',
        icon: 'fas fa-tag'
      },
      'upgrade_tier': {
        name: 'Upgrade de Tier',
        description: 'Upgrade temporário para o próximo nível por 30 dias. Desbloqueie benefícios exclusivos!',
        cost: 500,
        validity: 'Válido por 30 dias',
        icon: 'fas fa-level-up-alt'
      }
    };
    
    return benefits[benefit] || {
      name: this._getBenefitName(benefit),
      description: 'Benefício do programa de fidelidade',
      cost: this._getBenefitCost(benefit),
      validity: 'Válido por 30 dias',
      icon: 'fas fa-star'
    };
  }

  _handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match('image.*')) {
      this._showError('Por favor, selecione uma imagem válida');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this._showError('A imagem deve ter menos de 2MB');
      return;
    }

    this.avatarFile = file;
    this.state.avatarChanged = true;

    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
      if (this.elements.avatarPreview) {
        this.elements.avatarPreview.innerHTML = '';
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '50%';
        this.elements.avatarPreview.appendChild(img);
      }
    };
    reader.readAsDataURL(file);
  }

  _showLoading() {
    if (this.state.isLoading || !this.elements.loader) return;
    this.state.isLoading = true;
    this.elements.loader.style.display = 'flex';
  }

  _hideLoading() {
    if (!this.state.isLoading || !this.elements.loader) return;
    this.state.isLoading = false;
    this.elements.loader.style.display = 'none';
  }

  _showProfileContent() {
    if (this.elements.tabContents) this.elements.tabContents.style.display = 'block';
    if (this.elements.loginMessage) this.elements.loginMessage.style.display = 'none';
  }

  _showLoginMessage() {
    if (this.elements.tabContents) this.elements.tabContents.style.display = 'none';
    if (this.elements.loginMessage) this.elements.loginMessage.style.display = 'flex';
  }

  _handleLogout() {
    if (window.confirm('Tem certeza que deseja sair da sua conta?')) {
      this.performLogout();
    }
  }

  _validateField(input) {
    const fieldName = input.dataset.field;
    const value = input.value.trim();
    let isValid = true;
    let errorMessage = '';

    switch (fieldName) {
      case 'email':
        isValid = this._validateEmail(value);
        errorMessage = 'Por favor, insira um e-mail válido';
        break;
      case 'phone':
        isValid = value.replace(/\D/g, '').length >= 11;
        errorMessage = 'Telefone deve ter pelo menos 11 dígitos';
        break;
      case 'birthday':
        isValid = !value || this._validateDate(value);
        errorMessage = 'Data de nascimento inválida';
        break;
      case 'name':
        isValid = value.length >= 3;
        errorMessage = 'Nome deve ter pelo menos 3 caracteres';
        break;
      case 'cpf':
        isValid = this._validateCPF(value);
        errorMessage = 'CPF inválido';
        break;
    }

    if (!isValid) {
      input.classList.add('invalid');
      input.title = errorMessage;
    } else {
      input.classList.remove('invalid');
      input.title = '';
    }

    return isValid;
  }

  _validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  _validateDate(dateString) {
    if (!dateString) return true;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  _validateCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    
    // Validate CPF algorithm
    let sum = 0;
    let remainder;
    
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i-1, i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    
    if ((remainder === 10) || (remainder === 11)) {
      remainder = 0;
    }
    
    if (remainder !== parseInt(cpf.substring(9, 10))) {
      return false;
    }
    
    sum = 0;
    
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i-1, i)) * (12 - i);
    }
    
    remainder = (sum * 10) % 11;
    
    if ((remainder === 10) || (remainder === 11)) {
      remainder = 0;
    }
    
    if (remainder !== parseInt(cpf.substring(10, 11))) {
      return false;
    }
    
    return true;
  }

  _collectFormData() {
    const formData = {
      name: this.elements.name?.querySelector('input')?.value || this.currentUser?.name,
      email: this.elements.email?.querySelector('input')?.value || this.currentUser?.email,
      phone: this.elements.phone?.querySelector('input')?.value || this.currentUser?.phone,
      birthday: this.elements.birthday?.querySelector('input')?.value || this.currentUser?.birthday,
      cpf: this.elements.cpf?.querySelector('input')?.value || this.currentUser?.cpf,
      address: {
        street: this.elements.street?.querySelector('input')?.value || this.currentUser?.address?.street,
        number: this.elements.number?.querySelector('input')?.value || this.currentUser?.address?.number,
        complement: this.elements.complement?.querySelector('input')?.value || this.currentUser?.address?.complement,
        neighborhood: this.elements.neighborhood?.querySelector('input')?.value || this.currentUser?.address?.neighborhood,
        city: this.elements.city?.querySelector('input')?.value || this.currentUser?.address?.city,
        state: this.elements.state?.querySelector('input')?.value || this.currentUser?.address?.state
      },
      avatarChanged: this.state.avatarChanged,
      avatarFile: this.avatarFile
    };

    // Additional validation
    if (!formData.name || formData.name.length < 3) {
      throw new Error('Nome deve ter pelo menos 3 caracteres');
    }

    if (!formData.email || !this._validateEmail(formData.email)) {
      throw new Error('Por favor, insira um e-mail válido');
    }

    if (!formData.phone || formData.phone.replace(/\D/g, '').length < 11) {
      throw new Error('Telefone deve ter pelo menos 11 dígitos');
    }

    if (formData.cpf && !this._validateCPF(formData.cpf)) {
      throw new Error('Por favor, insira um CPF válido');
    }

    return formData;
  }

  _normalizeUserData(user) {
    if (!user) return null;
    
    // Pega os dados do localStorage para manter o endereço
    const localUser = JSON.parse(localStorage.getItem('auth_user') || {});
  
    // Corrige a data de nascimento para evitar problemas de fuso horário
    let birthday = user.birthday || user.dataNascimento || user.nascimento || localUser.birthday || '';
    if (birthday) {
      try {
        // Adiciona meio-dia UTC para evitar problemas de fuso horário
        const date = new Date(birthday.includes('T') ? birthday : `${birthday}T12:00:00Z`);
        if (!isNaN(date.getTime())) {
          // Formata como YYYY-MM-DD para armazenamento consistente
          birthday = date.toISOString().split('T')[0];
        }
      } catch (e) {
        console.error('Error normalizing birth date:', e);
        // Mantém o valor original se houver erro na conversão
        birthday = user.birthday || user.dataNascimento || user.nascimento || localUser.birthday || '';
      }
    }
  
    return {
      id: user.id || localUser.id || '',
      name: user.name || user.nome || localUser.name || 'Não informado',
      email: user.email || localUser.email || 'Não informado',
      phone: user.phone || user.telefone || user.celular || localUser.phone || '',
      birthday: birthday, // Usa a data corrigida
      cpf: user.cpf || localUser.cpf || '',
      avatar: user.avatar || localUser.avatar || null,
      address: {
        street: user.address?.street || user.endereco?.rua || user.logradouro || localUser.address?.street || '',
        number: user.address?.number || user.endereco?.numero || localUser.address?.number || '',
        complement: user.address?.complement || user.endereco?.complemento || localUser.address?.complement || '',
        neighborhood: user.address?.neighborhood || user.endereco?.bairro || user.bairro || localUser.address?.neighborhood || '',
        city: user.address?.city || user.endereco?.cidade || user.cidade || localUser.address?.city || '',
        state: user.address?.state || user.endereco?.uf || user.uf || localUser.address?.state || ''
      },
      tier: user.tier || localUser.tier || 'bronze',
      points: user.points || localUser.points || 0,
      benefits: user.benefits || localUser.benefits || []
    };
  }
  _renderUserData() {
    if (!this.currentUser) return;

    // Personal data
    if (this.elements.name) {
      this.elements.name.textContent = this.currentUser.name || 'Não informado';
    }
    if (this.elements.email) {
      this.elements.email.textContent = this.currentUser.email || 'Não informado';
    }
    if (this.elements.phone) {
      this.elements.phone.textContent = this._formatPhone(this.currentUser.phone);
    }
    if (this.elements.birthday) {
      this.elements.birthday.textContent = this._formatDate(this.currentUser.birthday);
    }
    if (this.elements.cpf) {
      this.elements.cpf.textContent = this._formatCPF(this.currentUser.cpf);
    }

    // Address
    if (this.currentUser.address) {
      if (this.elements.street) {
        this.elements.street.textContent = this.currentUser.address.street || 'Não informado';
      }
      if (this.elements.number) {
        this.elements.number.textContent = this.currentUser.address.number || '';
      }
      if (this.elements.complement) {
        this.elements.complement.textContent = this.currentUser.address.complement || '';
      }
      if (this.elements.neighborhood) {
        this.elements.neighborhood.textContent = this.currentUser.address.neighborhood || '';
      }
      if (this.elements.city) {
        this.elements.city.textContent = this.currentUser.address.city || '';
      }
      if (this.elements.state) {
        this.elements.state.textContent = this.currentUser.address.state || '';
      }
    }
    
    //Endereço
    if (this.elements.birthday) {
      // Formata a data corrigindo o fuso horário
      const date = new Date(this.currentUser.birthday + 'T12:00:00Z');
      this.elements.birthday.textContent = isNaN(date.getTime()) ? 
        'Não informado' : 
        date.toLocaleDateString('pt-BR');
    }
  
    // Avatar
    if (this.currentUser.avatar && this.elements.avatarPreview) {
      this.elements.avatarPreview.innerHTML = '';
      const img = document.createElement('img');
      img.src = this.currentUser.avatar;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '50%';
      this.elements.avatarPreview.appendChild(img);
    } else if (this.elements.avatarPreview) {
      const initials = this._getUserInitials();
      this.elements.avatarPreview.innerHTML = `<span>${initials}</span>`;
    }

    // VIP badge
    if (this.currentUser.tier && document.getElementById('vip-level-badge')) {
      const badge = document.getElementById('vip-level-badge');
      badge.className = `vip-badge ${this.currentUser.tier}`;
      document.getElementById('vip-level').textContent = this.currentUser.tier.toUpperCase();
    }
  }

  _getUserInitials() {
    if (!this.currentUser?.name) return 'US';
    const names = this.currentUser.name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
  }

  _formatPhone(phone) {
    if (!phone) return 'Não informado';
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{4,5})(\d{4})$/);
    return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phone;
  }

  _formatDate(dateString) {
    if (!dateString) return 'Não informado';
    try {
      // Corrige o problema do fuso horário criando a data no formato UTC
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      // Ajusta para o fuso horário local
      const adjustedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
      
      return adjustedDate.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  }

  _formatCPF(cpf) {
    if (!cpf) return 'Não informado';
    const cleaned = cpf.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
    return match ? `${match[1]}.${match[2]}.${match[3]}-${match[4]}` : cpf;
  }

  _formatDateForInput(dateString) {
    if (!dateString) return '';
    
    // Se já estiver no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      // Cria a data no UTC para evitar problemas de fuso horário
      const date = new Date(dateString + 'T12:00:00Z');
      return date.toISOString().split('T')[0];
    }
    
    try {
      if (dateString.includes('/')) {
        const [day, month, year] = dateString.split('/');
        // Cria a data no UTC
        const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00Z`);
        return date.toISOString().split('T')[0];
      }
      
      const date = new Date(dateString + 'T12:00:00Z');
      return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  _formatCPFForInput(cpf) {
    if (!cpf) return '';
    return cpf.replace(/\D/g, '');
  }

  _showError(message) {
    this.showNotification(message, 'error');
  }

  /* ========== PUBLIC METHODS ========== */

  async open(tab = 'profile') {
    if (this.state.isOpen || !this.elements.modal) return;
    
    console.log('[ProfileModal] Opening modal...');
    this.elements.modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    this.state.isOpen = true;
    
    try {
      this._showLoading();
      
      const isAuthenticated = await this.checkAuth();
      
      if (isAuthenticated) {
        await this.loadUserData();
        this._showProfileContent();
        this.switchTab(tab);
      } else {
        this._showLoginMessage();
      }
    } catch (error) {
      console.error('[ProfileModal] Error opening modal:', error);
      this._showError('Error loading profile');
      this.close();
    } finally {
      this._hideLoading();
    }
  }

  close() {
    if (!this.state.isOpen || !this.elements.modal) return;
    
    console.log('[ProfileModal] Closing modal...');
    this.elements.modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    this.state.isOpen = false;
    this.state.isEditing = false;
    this.state.avatarChanged = false;
    this.avatarFile = null;
    
    if (this.elements.modal.classList.contains('edit-mode')) {
      this.elements.modal.classList.remove('edit-mode');
    }
  }

  async switchTab(tabId) {
    if (!tabId || this.state.currentTab === tabId || !this.elements.tabs) return;
    
    this.state.currentTab = tabId;
    
    // Update active tabs
    const tabButtons = this.elements.tabs.querySelectorAll('.tab-button');
    tabButtons.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    // Update visible contents
    const tabPanels = this.elements.tabContents.querySelectorAll('.tab-content');
    tabPanels.forEach(content => {
      content.style.display = content.id === `${tabId}-content` ? 'block' : 'none';
    });
    
    // Load tab-specific data if needed
    try {
      this._showLoading();
      
      switch(tabId) {
        case 'orders':
          await this.loadOrders();
          break;
        case 'addresses':
          await this.loadAddresses();
          break;
        case 'fidelity':
          await this.loadFidelityData();
          break;
        case 'preferences':
          await this.loadPreferences();
          break;
      }
    } catch (error) {
      console.error(`[ProfileModal] Error loading ${tabId} tab:`, error);
      this._showError(`Error loading ${tabId}`);
    } finally {
      this._hideLoading();
    }
  }

  getShippingAddress() {
    if (!this.currentUser) {
      throw new Error('Usuário não autenticado');
    }

    const requiredFields = ['street', 'number', 'neighborhood', 'city', 'state'];
    const missingFields = requiredFields.filter(field => !this.currentUser.address?.[field]);

    if (missingFields.length > 0) {
      throw new Error(`Endereço incompleto. Faltam: ${missingFields.join(', ')}`);
    }

    return {
      ...this.currentUser.address,
      recipient: this.currentUser.name,
      phone: this.currentUser.phone
    };
  }

  toggleEditMode() {
    if (!this.state.isEditing) {
      // Entering edit mode
      this.state.isEditing = true;
      this.elements.modal.classList.add('edit-mode');
      this.showEditFields();
    } else {
      // Exiting edit mode without saving
      this.state.isEditing = false;
      this.elements.modal.classList.remove('edit-mode');
      this._renderUserData(); // Restore original values
      this.state.avatarChanged = false;
      this.avatarFile = null;
    }
  }

  showEditFields() {
    if (!this.currentUser) return;

    const fields = [
      { id: 'profile-name', type: 'text', value: this.currentUser.name },
      { id: 'profile-phone', type: 'tel', value: this.currentUser.phone?.replace(/\D/g, '') },
      { id: 'profile-birthday', type: 'date', value: this._formatDateForInput(this.currentUser.birthday) },
      { id: 'profile-cpf', type: 'text', value: this._formatCPFForInput(this.currentUser.cpf) },
      { id: 'profile-rua', type: 'text', value: this.currentUser.address?.street },
      { id: 'profile-numero', type: 'text', value: this.currentUser.address?.number },
      { id: 'profile-complemento', type: 'text', value: this.currentUser.address?.complement },
      { id: 'profile-bairro', type: 'text', value: this.currentUser.address?.neighborhood },
      { id: 'profile-cidade', type: 'text', value: this.currentUser.address?.city },
      { id: 'profile-uf', type: 'text', value: this.currentUser.address?.state }
    ];

    fields.forEach(field => {
      const element = document.getElementById(field.id);
      if (!element) return;

      this._createEditField(element, field.type, field.value || '');
    });
  }

  _createEditField(element, type, value) {
    if (!element.dataset.originalContent) {
      element.dataset.originalContent = element.innerHTML;
    }

    const input = document.createElement('input');
    input.type = type;
    input.value = value;
    input.className = 'form-control';
    input.dataset.field = element.id.replace('profile-', '');

    element.innerHTML = '';
    element.appendChild(input);

    // Special formatting for phone
    if (type === 'tel') {
      input.maxLength = 15;
      input.addEventListener('input', (e) => {
        e.target.value = this._formatPhoneInput(e.target.value);
      });
    }

    // CPF formatting
    if (type === 'text' && input.dataset.field === 'cpf') {
      input.maxLength = 14;
      input.addEventListener('input', (e) => {
        e.target.value = this._formatCPFInput(e.target.value);
      });
    }

    setTimeout(() => input.focus(), 50);
  }

  _formatPhoneInput(value) {
    const numbers = value.replace(/\D/g, '');
    let formatted = '';
    
    if (numbers.length > 0) formatted = `(${numbers.substring(0, 2)}`;
    if (numbers.length > 2) formatted += `) ${numbers.substring(2, 7)}`;
    if (numbers.length > 7) formatted += `-${numbers.substring(7, 11)}`;
    
    return formatted;
  }

  _formatCPFInput(value) {
    const numbers = value.replace(/\D/g, '');
    let formatted = '';
    
    if (numbers.length > 0) formatted = `${numbers.substring(0, 3)}`;
    if (numbers.length > 3) formatted += `.${numbers.substring(3, 6)}`;
    if (numbers.length > 6) formatted += `.${numbers.substring(6, 9)}`;
    if (numbers.length > 9) formatted += `-${numbers.substring(9, 11)}`;
    
    return formatted;
  }

  async saveChanges() {
    if (!this.state.isEditing) return;

    try {
      const updates = this._collectFormData();
      
      // Validate all fields before submitting
      const inputs = this.elements.modal.querySelectorAll('input[data-field]');
      let isValid = true;
      
      inputs.forEach(input => {
        if (!this._validateField(input)) {
          isValid = false;
        }
      });
      
      if (!isValid) {
        throw new Error('Por favor, corrija os campos destacados');
      }

      this._showLoading();
      
      // Simulate API call - replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update user data
      this.currentUser = this._normalizeUserData({
        ...this.currentUser,
        ...updates
      });

      // Handle avatar upload if changed
      if (this.state.avatarChanged && this.avatarFile) {
        // Simulate avatar upload - replace with real upload
        await new Promise(resolve => setTimeout(resolve, 800));
        this.currentUser.avatar = URL.createObjectURL(this.avatarFile);
      }
      
      // Update local/session storage
      if (window.Auth?.updateUser) {
        await window.Auth.updateUser(this.currentUser);
      } else {
        sessionStorage.setItem('auth_user', JSON.stringify(this.currentUser));
        localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
      }
      
      // Exit edit mode
      this.toggleEditMode(false);
      
      this.showNotification('Perfil atualizado com sucesso!', 'success');
    } catch (error) {
      console.error('Error saving:', error);
      this.showNotification(error.message || 'Erro ao salvar alterações', 'error');
    } finally {
      this._hideLoading();
    }
  }

  async checkAuth() {
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch (error) {
      console.error('[ProfileModal] Error checking auth:', error);
      return false;
    }
  }

  async getCurrentUser() {
    if (window.Auth?.getCurrentUser) {
      return window.Auth.getCurrentUser();
    }
    
    try {
      const userData = sessionStorage.getItem('auth_user') || localStorage.getItem('auth_user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing userData:', error);
      return null;
    }
  }

  async loadUserData() {
    try {
      const user = await this.fetchUserData();
      if (!user) throw new Error('Usuário não encontrado');
      
      // Mescla com os dados locais existentes
      const localUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
      this.currentUser = this._normalizeUserData({ ...localUser, ...user });
      
      // Atualiza o localStorage com os dados mesclados
      localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
      sessionStorage.setItem('auth_user', JSON.stringify(this.currentUser));
      
      this._renderUserData();
    } catch (error) {
      console.error('[ProfileModal] Error loading data:', error);
      throw error;
    }
  }

  async fetchUserData() {
    try {
      if (window.Auth?.getUser) {
        const user = await window.Auth.getUser();
        // Mescla com os dados salvos localmente
        const localUser = JSON.parse(localStorage.getItem('auth_user') || {});
        return { ...user, ...localUser };
      }
      
      // Se não estiver usando Auth.getUser, pega apenas do localStorage
      const userData = localStorage.getItem('auth_user');
      if (!userData) throw new Error('Usuário não autenticado');
      
      return JSON.parse(userData);
    } catch (error) {
      console.error('[ProfileModal] Error fetching user data:', error);
      throw error;
    }
  }

  async loadOrders() {
    try {
      if (!this.elements.ordersContent) return;
      
      this._showLoading();
      
      // Simulate API call - replace with real API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Sample data - replace with real API response
      const orders = [
        {
          id: 'ORD-12345',
          date: new Date(),
          status: 'delivered',
          total: 199.90,
          items: [
            { 
              name: 'Torta de Morango Premium', 
              quantity: 1, 
              price: 99.90,
              image: './assets/image/bl.jpeg'
            },
            { 
              name: 'Caixa de Bombons', 
              quantity: 2, 
              price: 50.00,
              image: './assets/image/bl.jpeg'
            }
          ]
        },
        {
          id: 'ORD-67890',
          date: new Date(Date.now() - 86400000),
          status: 'processing',
          total: 349.90,
          items: [
            { 
              name: 'Torta de Chocolate Belga', 
              quantity: 1, 
              price: 349.90,
              image: './assets/image/bl.jpeg'
            }
          ]
        }
      ];
      
      this.elements.ordersContent.innerHTML = `
        <div class="orders-list">
          ${orders.map(order => this._renderOrder(order)).join('')}
        </div>
      `;
      
      // Adicionar event listeners para os botões de detalhes
      document.querySelectorAll('.order-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const orderId = btn.dataset.order;
          const order = orders.find(o => o.id === orderId);
          if (order) {
            this.showOrderDetails(order); // Passa o objeto completo
          } else {
            console.error('Pedido não encontrado:', orderId);
            this.showNotification('Pedido não encontrado', 'error');
          }
        });
      });
      
    } catch (error) {
      console.error('Error loading orders:', error);
      this._showError('Erro ao carregar histórico de pedidos');
    } finally {
      this._hideLoading();
    }
  }

  _renderOrder(order) {
    const status = this.statusMap[order.status] || { class: 'processing', text: order.status };
    const formattedDate = this._formatDate(order.date);
    
    return `
      <div class="order-card">
        <div class="order-header">
          <span class="order-id">Pedido #${order.id}</span>
          <span class="order-date">${formattedDate}</span>
          <span class="order-status ${status.class}">${status.text}</span>
        </div>
        <div class="order-body">
          <div class="order-total">Total: R$ ${order.total.toFixed(2)}</div>
          <button class="order-details-btn" data-order="${order.id}">
            <i class="fas fa-search"></i> Detalhes
          </button>
        </div>
      </div>
    `;
  }

  async showOrderDetails(order) {
    try {
      if (!order) {
        throw new Error('Objeto de pedido inválido');
      }
  
      this._showLoading();
      
      const status = this.statusMap[order.status] || { class: 'processing', text: 'Status desconhecido' };
  
      // Verificação segura para valores numéricos
      const safeTotal = typeof order.total === 'number' ? order.total.toFixed(2) : '0.00';
      const safeDate = order.date ? this._formatDate(order.date) : 'Data não disponível';
  
      const modalContent = `
        <div class="order-details-modal">
          <div class="order-details-header">
            <h3>Detalhes do Pedido #${order.id || 'N/A'}</h3>
            <span class="order-status ${status.class}">${status.text}</span>
          </div>
          
          <div class="order-details-body">
            <div class="order-info-section">
              <div class="info-item">
                <i class="fas fa-calendar-alt"></i>
                <span>Data: ${safeDate}</span>
              </div>
              <div class="info-item">
                <i class="fas fa-money-bill-wave"></i>
                <span>Total: R$ ${safeTotal}</span>
              </div>
            </div>
            
            <div class="order-items-section">
              <h4>Itens do Pedido</h4>
              ${(order.items || []).map(item => `
                <div class="order-item">
                  <div class="item-image">
                    <img src="${item.image || this.placeholderImage}" alt="${item.name || 'Produto'}">
                  </div>
                  <div class="item-info">
                    <h5>${item.name || 'Produto sem nome'}</h5>
                    <p>Quantidade: ${item.quantity || 0}</p>
                    <p>Preço unitário: R$ ${(item.price || 0).toFixed(2)}</p>
                    <p>Subtotal: R$ ${((item.quantity || 0) * (item.price || 0)).toFixed(2)}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="order-details-actions">
            <button class="btn-outline btn-close-details">Fechar</button>
          </div>
        </div>
      `;
      
      this.showCustomModal(`Pedido #${order.id || ''}`, modalContent);
      
      document.querySelector('.btn-close-details')?.addEventListener('click', () => {
        document.getElementById('custom-modal').style.display = 'none';
      });
      
    } catch (error) {
      console.error('Error showing order details:', error);
      this.showNotification(error.message || 'Erro ao mostrar detalhes do pedido', 'error');
    } finally {
      this._hideLoading();
    }
  }

  _rateOrder(orderId) {
    this.showCustomModal('Avaliar Pedido', `
      <div class="rate-order-modal">
        <h4>Avalie seu pedido #${orderId}</h4>
        <div class="rating-stars">
          ${[1, 2, 3, 4, 5].map(i => `
            <i class="far fa-star" data-rating="${i}"></i>
          `).join('')}
        </div>
        <textarea placeholder="Deixe seu comentário (opcional)"></textarea>
        <div class="rate-actions">
          <button class="btn-outline btn-cancel-rate">Cancelar</button>
          <button class="btn-primary btn-submit-rate">Enviar Avaliação</button>
        </div>
      </div>
    `);
  
    // Adicionar interação das estrelas
    const stars = document.querySelectorAll('.rating-stars .fa-star');
    stars.forEach(star => {
      star.addEventListener('mouseover', (e) => {
        const rating = parseInt(e.target.dataset.rating);
        stars.forEach((s, i) => {
          s.classList.toggle('fas', i < rating);
          s.classList.toggle('far', i >= rating);
        });
      });
      
      star.addEventListener('click', (e) => {
        const rating = parseInt(e.target.dataset.rating);
        document.querySelector('.rating-stars').dataset.selected = rating;
      });
    });
  
    // Eventos dos botões
    document.querySelector('.btn-cancel-rate')?.addEventListener('click', () => {
      document.getElementById('custom-modal').style.display = 'none';
    });
  
    document.querySelector('.btn-submit-rate')?.addEventListener('click', () => {
      const rating = document.querySelector('.rating-stars')?.dataset.selected || 0;
      const comment = document.querySelector('.rate-order-modal textarea').value;
      
      if (rating < 1) {
        this.showNotification('Por favor, selecione uma avaliação', 'error');
        return;
      }
      
      // Simular envio da avaliação
      this.showNotification('Avaliação enviada com sucesso!', 'success');
      document.getElementById('custom-modal').style.display = 'none';
    });
  }

  async loadAddresses() {
    try {
      if (!this.elements.addressesContent) return;
      
      this._showLoading();
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Get user address data
      const address = this.currentUser.address || {};
      
      // Create address card HTML
      this.elements.addressesContent.innerHTML = `
        <div class="addresses-grid">
          <div class="address-card ${!address.street ? 'empty' : 'primary'}">
            <div class="address-header">
              <h3>${address.street ? 'Endereço Principal' : 'Nenhum endereço cadastrado'}</h3>
              <div class="address-actions">
                <button class="btn-icon btn-edit-address"><i class="fas fa-edit"></i></button>
                ${address.street ? '<button class="btn-icon btn-remove-address"><i class="fas fa-trash"></i></button>' : ''}
              </div>
            </div>
            ${address.street ? `
              <div class="address-body">
                <p><strong>Logradouro:</strong> ${address.street}, ${address.number || 'S/N'}</p>
                ${address.complement ? `<p><strong>Complemento:</strong> ${address.complement}</p>` : ''}
                <p><strong>Bairro:</strong> ${address.neighborhood || 'Não informado'}</p>
                <p><strong>Cidade/UF:</strong> ${address.city || 'Não informado'} - ${address.state || 'Não informado'}</p>
              </div>
            ` : `
              <div class="address-empty">
                <i class="fas fa-map-marker-alt"></i>
                <p>Você ainda não cadastrou um endereço</p>
                <button class="btn-primary btn-add-address">
                  <i class="fas fa-plus"></i> Adicionar Endereço
                </button>
              </div>
            `}
          </div>
        </div>
      `;
      
      // Setup event listeners for address actions
      this._setupAddressEvents();
      
    } catch (error) {
      console.error('Error loading addresses:', error);
      this._showError('Erro ao carregar endereços');
    } finally {
      this._hideLoading();
    }
  }

  _setupAddressEvents() {
    // Edit address button
    const editBtn = this.elements.addressesContent.querySelector('.btn-edit-address');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._editAddress();
      });
    }
    
    // Remove address button
    const removeBtn = this.elements.addressesContent.querySelector('.btn-remove-address');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._removeAddress();
      });
    }
    
    // Add address button
    const addBtn = this.elements.addressesContent.querySelector('.btn-add-address');
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._addAddress();
      });
    }
  }

  _editAddress() {
    const address = this.currentUser.address || {};
    
    const modalContent = `
      <div class="address-form">
        <div class="form-group">
          <label>Logradouro</label>
          <input type="text" id="edit-street" value="${address.street || ''}" placeholder="Rua, Avenida, etc.">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Número</label>
            <input type="text" id="edit-number" value="${address.number || ''}" placeholder="Número">
          </div>
          <div class="form-group">
            <label>Complemento</label>
            <input type="text" id="edit-complement" value="${address.complement || ''}" placeholder="Apto, Bloco, etc.">
          </div>
        </div>
        <div class="form-group">
          <label>Bairro</label>
          <input type="text" id="edit-neighborhood" value="${address.neighborhood || ''}" placeholder="Bairro">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Cidade</label>
            <input type="text" id="edit-city" value="${address.city || ''}" placeholder="Cidade">
          </div>
          <div class="form-group">
            <label>Estado</label>
            <select id="edit-state">
              <option value="">Selecione</option>
              ${this._getStatesOptions(address.state)}
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn-outline btn-cancel-edit">Cancelar</button>
          <button class="btn-primary btn-save-address">Salvar Endereço</button>
        </div>
      </div>
    `;
    
    this.showCustomModal('Editar Endereço', modalContent);
    
    // Setup save button
    document.querySelector('.btn-save-address')?.addEventListener('click', () => this._saveAddress());
    document.querySelector('.btn-cancel-edit')?.addEventListener('click', () => document.getElementById('custom-modal').style.display = 'none');
  }

  _addAddress() {
    this._editAddress(); // Reuse the edit form for new addresses
  }

  async _saveAddress() {
    try {
      this._showLoading();
      
      // Get form values
      const street = document.getElementById('edit-street').value.trim();
      const number = document.getElementById('edit-number').value.trim();
      const complement = document.getElementById('edit-complement').value.trim();
      const neighborhood = document.getElementById('edit-neighborhood').value.trim();
      const city = document.getElementById('edit-city').value.trim();
      const state = document.getElementById('edit-state').value;
      
      // Validate required fields
      if (!street) throw new Error('Logradouro é obrigatório');
      if (!neighborhood) throw new Error('Bairro é obrigatório');
      if (!city) throw new Error('Cidade é obrigatória');
      if (!state) throw new Error('Estado é obrigatório');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Atualiza o usuário atual
      this.currentUser.address = {
        street,
        number,
        complement,
        neighborhood,
        city,
        state
      };
      
      // Atualiza o localStorage completamente
      const userData = {
        ...this.currentUser,
        address: this.currentUser.address
      };
      
      localStorage.setItem('auth_user', JSON.stringify(userData));
      sessionStorage.setItem('auth_user', JSON.stringify(userData));
      
      // Se estiver usando um sistema de autenticação externo, atualize lá também
      if (window.Auth?.updateUser) {
        await window.Auth.updateUser(userData);
      }
      
      // Close modal and refresh
      document.getElementById('custom-modal').style.display = 'none';
      this.loadAddresses();
      
      this.showNotification('Endereço salvo com sucesso!', 'success');
    } catch (error) {
      console.error('Error saving address:', error);
      this.showNotification(error.message || 'Erro ao salvar endereço', 'error');
    } finally {
      this._hideLoading();
    }
  }

  async _removeAddress() {
    if (!window.confirm('Tem certeza que deseja remover este endereço?')) return;
    
    try {
      this._showLoading();
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Remove address
      this.currentUser.address = {};
      
      // Update both storages
      sessionStorage.setItem('auth_user', JSON.stringify(this.currentUser));
      localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
      
      // Refresh
      this.loadAddresses();
      
      this.showNotification('Endereço removido com sucesso', 'info');
    } catch (error) {
      console.error('Error removing address:', error);
      this.showNotification('Erro ao remover endereço', 'error');
    } finally {
      this._hideLoading();
    }
  }

  _getStatesOptions(selectedState = '') {
    const states = [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
      'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
      'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];
    
    return states.map(state => 
      `<option value="${state}" ${state === selectedState ? 'selected' : ''}>${state}</option>`
    ).join('');
  }

  async loadFidelityData() {
    try {
      if (!this.elements.fidelityContent) return;
      
      this._showLoading();
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Sample data
      this.elements.fidelityContent.innerHTML = `
        <section class="profile-section">
          <h2><i class="fas fa-gem"></i> Programa de Fidelidade Exclusive</h2>
          <div class="fidelity-card">
            <div class="fidelity-header">
              <div class="fidelity-level">
                <span id="profile-tier" class="level-badge ${this.currentUser.tier || 'bronze'}">
                  ${this.currentUser.tier ? this.currentUser.tier.toUpperCase() : 'BRONZE'}
                </span>
                <div class="level-progress">
                  <div class="progress-bar">
                    <div id="loyalty-progress-bar" class="progress-fill" style="width: ${this._calculateProgress()}%"></div>
                  </div>
                  <span id="next-level-label">${this._getNextLevelText()}</span>
                </div>
              </div>
              <div class="fidelity-points">
                <span id="profile-points">${this.currentUser.points ? this.currentUser.points.toLocaleString('pt-BR') : '0'} pontos</span>
              </div>
            </div>
            
            <div class="fidelity-benefits">
              <div class="benefit">
                <i class="fas fa-tag"></i>
                <span id="current-discount">${this._getDiscountForTier()}</span>
              </div>
              <div class="benefit">
                <i class="fas fa-bolt"></i>
                <span id="current-multiplier">${this._getMultiplierForTier()}</span>
              </div>
              ${this._getAdditionalBenefits()}
            </div>
            
            <div class="fidelity-actions">
              <button class="btn-gold btn-beneficio" data-benefit="frete_gratis">
                <i class="fas fa-truck"></i> Frete Grátis
              </button>
              <button class="btn-gold btn-beneficio" data-benefit="desconto_10">
                <i class="fas fa-percentage"></i> 10% de Desconto
              </button>
              <button class="btn-gold btn-beneficio" data-benefit="brinde">
                <i class="fas fa-gift"></i> Brinde Especial
              </button>
              <button id="btn-como-ganhar-pontos" class="btn-outline">
                <i class="fas fa-info-circle"></i> Como Ganhar Mais Pontos
              </button>
            </div>
          </div>

          <div class="benefits-section">
            <h3><i class="fas fa-star"></i> Seus Próximos Benefícios</h3>
            <div class="benefits-grid">
              ${this._getUpcomingBenefits()}
            </div>
          </div>

          ${this.currentUser.benefits?.length > 0 ? `
            <div class="benefits-section">
              <h3><i class="fas fa-check-circle"></i> Seus Benefícios Resgatados</h3>
              <div class="benefits-grid">
                ${this._getRedeemedBenefits()}
              </div>
            </div>
          ` : ''}
        </section>
      `;

      // Configura os eventos dos botões de fidelidade
      this.setupFidelityActions();
    } catch (error) {
      console.error('Error loading fidelity data:', error);
      this._showError('Erro ao carregar programa de fidelidade');
    } finally {
      this._hideLoading();
    }
  }

  _getRedeemedBenefits() {
    if (!this.currentUser.benefits || this.currentUser.benefits.length === 0) {
      return '<p class="no-benefits">Você ainda não resgatou nenhum benefício</p>';
    }
    
    return this.currentUser.benefits.map(benefit => {
      const details = this._getBenefitDetails(benefit.id);
      return `
        <div class="benefit-card ${benefit.used ? 'used' : 'active'}">
          <div class="benefit-icon">
            <i class="${details.icon}"></i>
          </div>
          <h4>${benefit.name}</h4>
          <p>Resgatado em: ${this._formatDate(benefit.date)}</p>
          <span class="benefit-status">
            ${benefit.used ? 'Utilizado' : 'Disponível'}
          </span>
        </div>
      `;
    }).join('');
  }

  _calculateProgress() {
    const points = this.currentUser.points || 0;
    const tier = this.currentUser.tier || 'bronze';
    
    if (tier === 'bronze') {
      return Math.min(100, (points / 1000) * 100);
    } else if (tier === 'silver') {
      return Math.min(100, ((points - 1000) / 1500) * 100);
    } else if (tier === 'gold') {
      return Math.min(100, ((points - 2500) / 2000) * 100);
    } else {
      return 100;
    }
  }

  _getNextLevelText() {
    const tier = this.currentUser.tier || 'bronze';
    const points = this.currentUser.points || 0;
    
    if (tier === 'bronze') {
      const remaining = 1000 - points;
      return remaining > 0 ? `Faltam ${remaining} pontos para PRATA` : 'Você alcançou o nível PRATA!';
    } else if (tier === 'silver') {
      const remaining = 2500 - points;
      return remaining > 0 ? `Faltam ${remaining} pontos para OURO` : 'Você alcançou o nível OURO!';
    } else if (tier === 'gold') {
      const remaining = 4500 - points;
      return remaining > 0 ? `Faltam ${remaining} pontos para PLATINA` : 'Você alcançou o nível PLATINA!';
    } else {
      return 'Você atingiu o nível máximo!';
    }
  }

  _getDiscountForTier() {
    const tier = this.currentUser.tier || 'bronze';
    switch(tier) {
      case 'bronze': return 'Desconto: 5% em todas as compras';
      case 'silver': return 'Desconto: 10% em todas as compras';
      case 'gold': return 'Desconto: 15% em todas as compras';
      case 'platinum': return 'Desconto: 20% em todas as compras';
      default: return 'Desconto: 5% em todas as compras';
    }
  }

  _getMultiplierForTier() {
    const tier = this.currentUser.tier || 'bronze';
    switch(tier) {
      case 'bronze': return 'Multiplicador: 1x pontos';
      case 'silver': return 'Multiplicador: 1.5x pontos';
      case 'gold': return 'Multiplicador: 2x pontos';
      case 'platinum': return 'Multiplicador: 2.5x pontos';
      default: return 'Multiplicador: 1x pontos';
    }
  }

  _getAdditionalBenefits() {
    const tier = this.currentUser.tier || 'bronze';
    if (tier === 'gold' || tier === 'platinum') {
      return `
        <div class="benefit">
          <i class="fas fa-gift"></i>
          <span>Presente de aniversário</span>
        </div>
        <div class="benefit">
          <i class="fas fa-concierge-bell"></i>
          <span>Atendimento prioritário 24/7</span>
        </div>
      `;
    }
    return '';
  }

  _getUpcomingBenefits() {
    const tier = this.currentUser.tier || 'bronze';
    if (tier === 'bronze') {
      return `
        <div class="benefit-card upcoming">
          <div class="benefit-icon">
            <i class="fas fa-tag"></i>
          </div>
          <h4>Nível Prata</h4>
          <p>Desconto de 10% em todas as compras</p>
          <div class="progress-container">
            <div class="progress-fill-benefit" style="width: ${this._calculateProgress()}%"></div>
          </div>
          <span class="benefit-status">Disponível em ${1000 - (this.currentUser.points || 0)} pontos</span>
        </div>
        
        <div class="benefit-card upcoming">
          <div class="benefit-icon">
            <i class="fas fa-truck"></i>
          </div>
          <h4>Frete Grátis</h4>
          <p>Frete grátis em compras acima de R$ 100</p>
          <span class="benefit-status">Disponível em 500 pontos</span>
        </div>
      `;
    } else if (tier === 'silver') {
      return `
        <div class="benefit-card upcoming">
          <div class="benefit-icon">
            <i class="fas fa-plane"></i>
          </div>
          <h4>Nível Ouro</h4>
          <p>Frete grátis em todas as compras</p>
          <div class="progress-container">
            <div class="progress-fill-benefit" style="width: ${this._calculateProgress()}%"></div>
          </div>
          <span class="benefit-status">Disponível em ${2500 - (this.currentUser.points || 0)} pontos</span>
        </div>
        
        <div class="benefit-card upcoming">
          <div class="benefit-icon">
            <i class="fas fa-gift"></i>
          </div>
          <h4>Brinde Exclusivo</h4>
          <p>Brinde exclusivo a cada 3 compras</p>
          <span class="benefit-status">Disponível em 2000 pontos</span>
        </div>
      `;
    } else if (tier === 'gold') {
      return `
        <div class="benefit-card upcoming">
          <div class="benefit-icon">
            <i class="fas fa-gem"></i>
          </div>
          <h4>Nível Platina</h4>
          <p>Acesso a produtos exclusivos e eventos VIP</p>
          <div class="progress-container">
            <div class="progress-fill-benefit" style="width: ${this._calculateProgress()}%"></div>
          </div>
          <span class="benefit-status">Disponível em ${4500 - (this.currentUser.points || 0)} pontos</span>
        </div>
        
        <div class="benefit-card upcoming">
          <div class="benefit-icon">
            <i class="fas fa-star"></i>
          </div>
          <h4>Atendimento VIP</h4>
          <p>Atendimento personalizado e prioridade</p>
          <span class="benefit-status">Disponível em 4000 pontos</span>
        </div>
      `;
    }
    return '';
  }

  async loadPreferences() {
    try {
      if (!this.elements.preferencesContent) return;
      
      this._showLoading();
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Sample data
      this.elements.preferencesContent.innerHTML = `
        <section class="profile-section">
          <h2><i class="fas fa-sliders-h"></i> Minhas Preferências</h2>
          <div class="preferences-grid">
            <div class="preference-card">
              <h3><i class="fas fa-envelope"></i> Comunicação</h3>
              <div class="preference-option">
                <label class="switch">
                  <input type="checkbox" checked>
                  <span class="slider round"></span>
                </label>
                <span>Receber newsletters</span>
              </div>
              <div class="preference-option">
                <label class="switch">
                  <input type="checkbox" checked>
                  <span class="slider round"></span>
                </label>
                <span>Ofertas exclusivas</span>
              </div>
            </div>
            
            <div class="preference-card">
              <h3><i class="fas fa-bell"></i> Notificações</h3>
              <div class="preference-option">
                <label class="switch">
                  <input type="checkbox" checked>
                  <span class="slider round"></span>
                </label>
                <span>Status de pedidos</span>
              </div>
              <div class="preference-option">
                <label class="switch">
                  <input type="checkbox">
                  <span class="slider round"></span>
                </label>
                <span>Lembretes de pagamento</span>
              </div>
            </div>
          </div>
        </section>
      `;
    } catch (error) {
      console.error('Error loading preferences:', error);
      this._showError('Erro ao carregar preferências');
    } finally {
      this._hideLoading();
    }
  }

  performLogout() {
    try {
      // Remove apenas os itens de autenticação
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      
      // Mantém os dados do usuário no localStorage exceto informações sensíveis
      const userData = JSON.parse(localStorage.getItem('auth_user') || '{}');
      const { id, name, email, address, tier, points, benefits } = userData;
      
      localStorage.setItem('auth_user', JSON.stringify({
        id,
        name,
        email,
        address,
        tier,
        points,
        benefits
      }));
      
      // Remove o carrinho
      localStorage.removeItem('kideliCart');
      
      // Atualiza os botões de login
      document.querySelectorAll('.auth-button').forEach(btn => {
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
        btn.classList.remove('logged-in');
      });
      
      this.close();
      setTimeout(() => window.location.reload(), 300);
      
      this.showNotification('Você foi desconectado', 'info');
    } catch (error) {
      console.error('Error during logout:', error);
      this.showNotification('Erro ao sair da conta', 'error');
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <i class="fas ${
        type === 'info' ? 'fa-info-circle' : 
        type === 'error' ? 'fa-exclamation-circle' : 
        'fa-check-circle'
      }"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }, 10);
  }

  showAuthModal(mode = 'login') {
    if (window.Auth?.open) {
      window.Auth.open(mode);
    } else {
      console.error('Authentication system not available');
      this._showError('Sistema de login indisponível');
    }
  }
}

// No profile-modal.js, adicione como uma classe interna
class PasswordRecovery {
  constructor(modalId) {
    this.modal = document.getElementById(modalId);
    this.form = this.modal?.querySelector('#recovery-form');
    this.successMessage = this.modal?.querySelector('#recovery-success');
    
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }
    
    this.modal?.querySelector('.close-modal').addEventListener('click', () => {
      this.close();
    });
  }

  async handleSubmit() {
    const email = this.form.querySelector('input').value;
    const button = this.form.querySelector('button');
    
    try {
      button.disabled = true;
      await ApiService.requestPasswordReset(email);
      
      this.form.style.display = 'none';
      this.successMessage.style.display = 'block';
      
      setTimeout(() => this.close(), 3000);
    } catch (error) {
      alert(error.message);
    } finally {
      button.disabled = false;
    }
  }

  open() {
    this.modal.style.display = 'block';
    this.form.style.display = 'block';
    this.successMessage.style.display = 'none';
    this.form.querySelector('input').focus();
  }

  close() {
    this.modal.style.display = 'none';
  }
}

// Safe initialization
document.addEventListener('DOMContentLoaded', () => {
  try {
    if (!window.profileModal) {
      window.profileModal = new ProfileModal();
      
      // Global handler to open modal
      document.addEventListener('click', (e) => {
        const profileBtn = e.target.closest('[data-action="open-profile"]');
        if (profileBtn && window.profileModal?.open) {
          e.preventDefault();
          const tab = profileBtn.dataset.tab || 'profile';
          window.profileModal.open(tab);
        }
      });
    }
  } catch (error) {
    console.error('Error initializing ProfileModal:', error);
  }
});