// HARMONI — API Wrapper (fetch + auth token + offline queue)

const API = {
  token: localStorage.getItem('harmoni_token'),

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('harmoni_token', token);
    } else {
      localStorage.removeItem('harmoni_token');
    }
  },

  async request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
    };

    const config = {
      headers,
      ...options
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(path, config);
      const data = await response.json();

      if (response.status === 401) {
        this.setToken(null);
        if (window.App) App.showLogin();
        return data;
      }

      return data;
    } catch (err) {
      console.error('API Error:', err);
      return { success: false, error: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' };
    }
  },

  get(path) {
    return this.request(path, { method: 'GET' });
  },

  post(path, body) {
    return this.request(path, { method: 'POST', body });
  },

  put(path, body) {
    return this.request(path, { method: 'PUT', body });
  },

  del(path) {
    return this.request(path, { method: 'DELETE' });
  }
};
