// frontend/js/api-service.js
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
      // Limpar qualquer fila de refresh
      tokenRefreshQueue.clear(); 
    }
  },

  /**
   * Obtém o perfil do usuário
   * @returns {Promise<object>}
   */
  async getUserProfile() {
    return this.authenticatedRequest(`${API_BASE_URL}/profile`, 'GET');
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
   * Cria preferência de pagamento no Mercado Pago
   * @param {Array<object>} items 
   * @returns {Promise<{id: string, init_point: string}>}
   */
  async createPaymentPreference(items) {
    return this.authenticatedRequest(
      `${API_BASE_URL}/payments/create-preference`,
      'POST',
      { items }
    );
  },

  // ========== MÉTODOS AUXILIARES ========== //

  /**
   * Realiza requisições autenticadas com tratamento automático de token expirado
   */
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

        if (body) {
          options.body = JSON.stringify(body);
        }

        const response = await this._fetchWithTimeout(url, options);

        if (response.ok) {
          return response.json();
        }

        // Tratamento específico para token expirado
        if (response.status === 401 && attempt === 0) {
          const errorData = await response.json();
          if (errorData.code === 'TOKEN_EXPIRED') {
            const tokens = await this._queueTokenRefresh();
            accessToken = tokens.access;
            attempt++;
            continue;
          }
          
          // Outros erros 401 (não autorizado)
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

  /**
   * Armazena os tokens de acesso e refresh
   * @param {{access: string, refresh: string}} tokens 
   */
  storeTokens(tokens) {
    if (tokens?.access) {
      sessionStorage.setItem('access_token', tokens.access);
    }
    if (tokens?.refresh) {
      localStorage.setItem('refresh_token', tokens.refresh);
    }
  },

  /**
   * Remove os tokens armazenados
   */
  clearTokens() {
    sessionStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  /**
   * Verifica se o usuário está autenticado
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!sessionStorage.getItem('access_token');
  },

  // ========== MÉTODOS PRIVADOS ========== //

  /**
   * Realiza refresh do token com sistema de fila para evitar chamadas duplicadas
   * @private
   */
  async _queueTokenRefresh() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('Sessão expirada');
    }

    // Verifica se já existe uma requisição de refresh em andamento
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

  /**
   * Executa a chamada para renovar o token
   * @private
   */
  async _doRefreshToken(refreshToken) {
    const response = await this._fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refreshToken}`,
      },
    });

    if (!response.ok) {
      this.clearTokens();
      const error = await response.json();
      throw new Error(error.message || 'Falha ao renovar sessão');
    }

    return response.json();
  },

  /**
   * Fetch com timeout e tratamento de erros
   * @private
   */
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