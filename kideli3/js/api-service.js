const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

// Cache para requisições em andamento
const tokenRefreshQueue = new Map();

export const ApiService = {
  /**
   * Realiza login do usuário
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{user: object, tokens: {access: string, refresh: string}}>}
   */
  async login(email, password) {
    try {
      const response = await this._fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Credenciais inválidas');
      }

      const data = await response.json();
      this.storeTokens(data.tokens);
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
    }
  },

  /**
   * Realiza logout do usuário
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      const token = sessionStorage.getItem('access_token');
      if (token) {
        await this._fetchWithTimeout(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
      tokenRefreshQueue.clear(); 
    }
  },

  /**
   * Obtém o perfil do usuário
   * @returns {Promise<object>}
   */
  async getUserProfile() {
    return this.authenticatedRequest(`${API_BASE_URL}/me`, 'GET');
  },

  /**
   * Atualiza o perfil do usuário
   * @param {object} profileData 
   * @returns {Promise<object>}
   */
  async updateProfile(profileData) {
    return this.authenticatedRequest(
      `${API_BASE_URL}/profile`,
      'PUT',
      profileData
    );
  },

  /**
   * Solicita reset de senha
   * @param {string} email 
   * @returns {Promise<{message: string}>}
   */
  async requestPasswordReset(email) {
    const response = await this._fetchWithTimeout(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Falha ao solicitar recuperação de senha');
    }

    return response.json();
  },

  /**
   * Redefine a senha do usuário
   * @param {string} token 
   * @param {string} newPassword 
   * @returns {Promise<{message: string}>}
   */
  async resetPassword(token, newPassword) {
    const response = await this._fetchWithTimeout(`${API_BASE_URL}/auth/reset-password/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Falha ao redefinir senha');
    }

    return response.json();
  },

  /**
   * Cria um pedido de pagamento no PagBank
   * @param {Array<object>} items 
   * @param {string} paymentMethod 
   * @param {object|null} cardData 
   * @returns {Promise<{id: string, url_pagamento: string}>}
   */
  async createPagBankPayment(items, paymentMethod, cardData = null) {
    try {
      const response = await this.authenticatedRequest(
        `${API_BASE_URL}/pagamentos/criar-pedido`,
        'POST',
        { 
          itens: items,
          metodoPagamento: paymentMethod,
          cartao: cardData
        }
      );

      if (response.url_pagamento) {
        // Armazena o ID do pedido localmente
        localStorage.setItem('last_payment_id', response.id);
        return response;
      }

      throw new Error('URL de pagamento não recebida');
    } catch (error) {
      console.error('Erro ao criar pagamento:', error);
      throw new Error('Falha ao processar pagamento. Tente novamente.');
    }
  },

  /**
   * Verifica status de pagamento
   * @param {string} paymentId 
   * @returns {Promise<{status: string}>}
   */
  async checkPaymentStatus(paymentId) {
    return this.authenticatedRequest(
      `${API_BASE_URL}/pagamentos/status/${paymentId}`,
      'GET'
    );
  },

  // ========== MÉTODOS AUXILIARES ========== //
  async authenticatedRequest(url, method, body = null) {
    let accessToken = sessionStorage.getItem('access_token');
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      try {
        const options = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        };

        if (body) options.body = JSON.stringify(body);

        const response = await this._fetchWithTimeout(url, options);

        if (response.ok) return response.json();

        if (response.status === 401 && attempt === 0) {
          const errorData = await response.json();
          if (errorData.code === 'TOKEN_EXPIRED') {
            const tokens = await this._queueTokenRefresh();
            accessToken = tokens.access;
            attempt++;
            continue;
          }
          throw new Error(errorData.message || 'Acesso não autorizado');
        }

        const error = await response.json();
        throw new Error(error.message || 'Requisição falhou');
      } catch (error) {
        if (attempt > 0) {
          this.clearTokens();
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        throw error;
      }
    }
  },

  storeTokens(tokens) {
    if (tokens?.access) sessionStorage.setItem('access_token', tokens.access);
    if (tokens?.refresh) localStorage.setItem('refresh_token', tokens.refresh);
  },

  clearTokens() {
    sessionStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  isAuthenticated() {
    return !!sessionStorage.getItem('access_token');
  },

  // ========== MÉTODOS PRIVADOS ========== //
  async _queueTokenRefresh() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('Sessão expirada');

    if (tokenRefreshQueue.has(refreshToken)) {
      return tokenRefreshQueue.get(refreshToken);
    }

    try {
      const refreshPromise = this._doRefreshToken(refreshToken);
      tokenRefreshQueue.set(refreshToken, refreshPromise);

      const tokens = await refreshPromise;
      this.storeTokens(tokens);
      return tokens;
    } finally {
      tokenRefreshQueue.delete(refreshToken);
    }
  },

  async _doRefreshToken(refreshToken) {
    const response = await this._fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${refreshToken}` },
    });

    if (!response.ok) {
      this.clearTokens();
      const error = await response.json();
      throw new Error(error.message || 'Falha ao renovar sessão');
    }

    return response.json();
  },

  async _fetchWithTimeout(resource, options = {}, timeout = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
        throw new Error('Tempo de conexão esgotado. Verifique sua internet.');
      }
      throw error;
    }
  }
};