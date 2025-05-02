// frontend/js/api-service.js
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

export const ApiService = {
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Falha no login');
    }

    const data = await response.json();
    
    // Armazena os tokens
    this.storeTokens(data.tokens);
    
    return data;
  },

  async logout() {
    try {
      const token = sessionStorage.getItem('access_token');
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Erro durante logout:', error);
    } finally {
      this.clearTokens();
    }
  },

  async getUserProfile() {
    return this.authenticatedRequest(`${API_BASE_URL}/profile`, 'GET');
  },

  async updateProfile(profileData) {
    return this.authenticatedRequest(
      `${API_BASE_URL}/profile`,
      'PUT',
      profileData
    );
  },

  async requestPasswordReset(email) {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
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

  async resetPassword(token, newPassword) {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password/${token}`, {
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

  async createPaymentPreference(items) {
    return this.authenticatedRequest(
      `${API_BASE_URL}/payments/create-preference`,
      'POST',
      { items }
    );
  },

  // Métodos auxiliares
  async refreshAuthToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('Nenhum refresh token disponível');

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refreshToken}`,
      },
    });

    if (!response.ok) {
      this.clearTokens();
      const error = await response.json();
      throw new Error(error.message || 'Falha ao renovar token');
    }

    const { tokens } = await response.json();
    this.storeTokens(tokens);
    return tokens;
  },

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

        const response = await fetch(url, options);

        if (response.ok) {
          return response.json();
        }

        // Se o token expirou, tenta renovar
        if (response.status === 401 && attempt === 0) {
          const errorData = await response.json();
          if (errorData.code === 'TOKEN_EXPIRED') {
            const tokens = await this.refreshAuthToken();
            accessToken = tokens.access;
            attempt++;
            continue;
          }
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
    if (tokens?.access) {
      sessionStorage.setItem('access_token', tokens.access);
    }
    if (tokens?.refresh) {
      localStorage.setItem('refresh_token', tokens.refresh);
    }
  },

  clearTokens() {
    sessionStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  isAuthenticated() {
    return !!sessionStorage.getItem('access_token');
  }
};