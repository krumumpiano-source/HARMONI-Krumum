// HARMONI — API Wrapper (fetch + auth token + offline queue)

const API = {
  token: localStorage.getItem('harmoni_token'),
  _dbReady: null,
  _db: null,

  // IndexedDB for offline queue
  openDB() {
    if (this._dbReady) return this._dbReady;
    this._dbReady = new Promise((resolve, reject) => {
      const req = indexedDB.open('harmoni_offline', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'url' });
        }
      };
      req.onsuccess = () => { this._db = req.result; resolve(req.result); };
      req.onerror = () => reject(req.error);
    });
    return this._dbReady;
  },

  async addToQueue(path, options) {
    const db = await this.openDB();
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').add({
      path, method: options.method, body: options.body,
      timestamp: Date.now(), token: this.token
    });
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
  },

  async getQueue() {
    const db = await this.openDB();
    const tx = db.transaction('queue', 'readonly');
    const req = tx.objectStore('queue').getAll();
    return new Promise((res) => { req.onsuccess = () => res(req.result || []); req.onerror = () => res([]); });
  },

  async clearQueue() {
    const db = await this.openDB();
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').clear();
    return new Promise((res) => { tx.oncomplete = res; tx.onerror = res; });
  },

  async cacheResponse(url, data) {
    try {
      const db = await this.openDB();
      const tx = db.transaction('cache', 'readwrite');
      tx.objectStore('cache').put({ url, data, timestamp: Date.now() });
    } catch (e) { /* ignore cache errors */ }
  },

  async getCached(url) {
    try {
      const db = await this.openDB();
      const tx = db.transaction('cache', 'readonly');
      const req = tx.objectStore('cache').get(url);
      return new Promise((res) => { req.onsuccess = () => res(req.result?.data); req.onerror = () => res(null); });
    } catch (e) { return null; }
  },

  async syncOfflineQueue() {
    const queue = await this.getQueue();
    if (!queue.length) return 0;
    let synced = 0;
    for (const item of queue) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (item.token) headers['Authorization'] = `Bearer ${item.token}`;
        const config = { method: item.method, headers };
        if (item.body) config.body = JSON.stringify(item.body);
        const resp = await fetch(item.path, config);
        if (resp.ok) synced++;
      } catch (e) { break; }
    }
    if (synced > 0) {
      await this.clearQueue();
      if (window.App) App.toast(`ซิงค์ข้อมูลออฟไลน์ ${synced} รายการสำเร็จ`);
    }
    return synced;
  },

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

      // Cache successful GET responses in IndexedDB
      if (options.method === 'GET' && data.success) {
        this.cacheResponse(path, data);
      }

      return data;
    } catch (err) {
      console.error('API Error:', err);

      // Offline: queue write operations, return cached data for reads
      if (!navigator.onLine) {
        if (options.method && options.method !== 'GET') {
          await this.addToQueue(path, options);
          return { success: true, offline: true, message: 'บันทึกไว้ในคิวออฟไลน์ — จะซิงค์เมื่อออนไลน์' };
        }
        // Try to return cached GET data
        const cached = await this.getCached(path);
        if (cached) return cached;
      }

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

// Auto-sync when coming back online
window.addEventListener('online', () => {
  API.syncOfflineQueue();
  if (window.App) App.toast('กลับมาออนไลน์แล้ว — กำลังซิงค์ข้อมูล...', 'info');
});

// Listen for SW sync messages
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SYNC_OFFLINE') {
      API.syncOfflineQueue();
    }
  });
}
