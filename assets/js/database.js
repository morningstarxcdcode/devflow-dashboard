/**
 * DevFlow Database Module
 * Client-side database using IndexedDB for persistent storage
 */

class DevFlowDatabase {
  constructor() {
    this.dbName = 'DevFlowDB';
    this.version = 1;
    this.db = null;
    this.stores = {
      users: 'users',
      repositories: 'repositories', 
      contributions: 'contributions',
      bookmarks: 'bookmarks',
      settings: 'settings',
      cache: 'cache'
    };
  }

  /**
   * Initialize database
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ Database initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains(this.stores.users)) {
          const userStore = db.createObjectStore(this.stores.users, { keyPath: 'id' });
          userStore.createIndex('login', 'login', { unique: true });
          userStore.createIndex('email', 'email', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.stores.repositories)) {
          const repoStore = db.createObjectStore(this.stores.repositories, { keyPath: 'id' });
          repoStore.createIndex('full_name', 'full_name', { unique: true });
          repoStore.createIndex('language', 'language', { unique: false });
          repoStore.createIndex('stars', 'stargazers_count', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.stores.contributions)) {
          const contribStore = db.createObjectStore(this.stores.contributions, { keyPath: 'id' });
          contribStore.createIndex('user_id', 'user_id', { unique: false });
          contribStore.createIndex('repository', 'repository', { unique: false });
          contribStore.createIndex('date', 'created_at', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.stores.bookmarks)) {
          const bookmarkStore = db.createObjectStore(this.stores.bookmarks, { keyPath: 'id' });
          bookmarkStore.createIndex('user_id', 'user_id', { unique: false });
          bookmarkStore.createIndex('type', 'type', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.stores.settings)) {
          const settingsStore = db.createObjectStore(this.stores.settings, { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains(this.stores.cache)) {
          const cacheStore = db.createObjectStore(this.stores.cache, { keyPath: 'key' });
          cacheStore.createIndex('expires', 'expires', { unique: false });
        }

        console.log('🔧 Database schema updated');
      };
    });
  }

  /**
   * Generic method to add data to any store
   */
  async add(storeName, data) {
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return store.add(data);
  }

  /**
   * Generic method to get data from any store
   */
  async get(storeName, key) {
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to update data in any store
   */
  async update(storeName, data) {
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return store.put(data);
  }

  /**
   * Generic method to delete data from any store
   */
  async delete(storeName, key) {
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return store.delete(key);
  }

  /**
   * Generic method to get all data from a store
   */
  async getAll(storeName, indexName = null, indexValue = null) {
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    if (indexName && indexValue) {
      const index = store.index(indexName);
      return new Promise((resolve, reject) => {
        const request = index.getAll(indexValue);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } else {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * User-specific methods
   */
  async saveUser(userData) {
    const user = {
      id: userData.id,
      login: userData.login,
      name: userData.name,
      email: userData.email,
      avatar_url: userData.avatar_url,
      company: userData.company,
      location: userData.location,
      bio: userData.bio,
      public_repos: userData.public_repos,
      followers: userData.followers,
      following: userData.following,
      created_at: userData.created_at,
      updated_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      preferences: {
        theme: 'dark',
        notifications: true,
        privacy: 'public'
      }
    };

    return await this.update(this.stores.users, user);
  }

  async getUser(userId) {
    return await this.get(this.stores.users, userId);
  }

  async getUserByLogin(login) {
    const transaction = this.db.transaction([this.stores.users], 'readonly');
    const store = transaction.objectStore(this.stores.users);
    const index = store.index('login');

    return new Promise((resolve, reject) => {
      const request = index.get(login);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Repository-specific methods
   */
  async saveRepository(repoData) {
    const repository = {
      id: repoData.id,
      full_name: repoData.full_name,
      name: repoData.name,
      description: repoData.description,
      html_url: repoData.html_url,
      stargazers_count: repoData.stargazers_count,
      forks_count: repoData.forks_count,
      open_issues_count: repoData.open_issues_count,
      language: repoData.language,
      topics: repoData.topics || [],
      created_at: repoData.created_at,
      updated_at: repoData.updated_at,
      last_cached: new Date().toISOString(),
      ai_score: repoData.ai_score || 0,
      difficulty: repoData.difficulty || 'intermediate',
      good_first_issues: repoData.good_first_issues || 0
    };

    return await this.update(this.stores.repositories, repository);
  }

  async getRepositoriesByLanguage(language) {
    return await this.getAll(this.stores.repositories, 'language', language);
  }

  async getTopRepositories(limit = 10) {
    const allRepos = await this.getAll(this.stores.repositories);
    return allRepos
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, limit);
  }

  /**
   * Contribution tracking methods
   */
  async saveContribution(contribution) {
    const contrib = {
      id: `${contribution.user_id}_${contribution.repository}_${Date.now()}`,
      user_id: contribution.user_id,
      repository: contribution.repository,
      type: contribution.type, // 'commit', 'pr', 'issue', 'review'
      title: contribution.title,
      url: contribution.url,
      created_at: contribution.created_at || new Date().toISOString(),
      impact_score: contribution.impact_score || 1
    };

    return await this.add(this.stores.contributions, contrib);
  }

  async getUserContributions(userId, limit = 100) {
    const contributions = await this.getAll(this.stores.contributions, 'user_id', userId);
    return contributions
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  }

  /**
   * Bookmark methods
   */
  async saveBookmark(userId, item, type) {
    const bookmark = {
      id: `${userId}_${type}_${Date.now()}`,
      user_id: userId,
      type: type, // 'repository', 'issue', 'developer'
      item_id: item.id,
      item_data: item,
      created_at: new Date().toISOString()
    };

    return await this.add(this.stores.bookmarks, bookmark);
  }

  async getUserBookmarks(userId, type = null) {
    const bookmarks = await this.getAll(this.stores.bookmarks, 'user_id', userId);
    return type ? bookmarks.filter(b => b.type === type) : bookmarks;
  }

  /**
   * Settings methods
   */
  async saveSetting(key, value) {
    const setting = { key, value, updated_at: new Date().toISOString() };
    return await this.update(this.stores.settings, setting);
  }

  async getSetting(key) {
    const setting = await this.get(this.stores.settings, key);
    return setting ? setting.value : null;
  }

  /**
   * Cache methods with expiration
   */
  async setCache(key, data, ttlMinutes = 60) {
    const expires = new Date(Date.now() + ttlMinutes * 60 * 1000).getTime();
    const cacheItem = {
      key,
      data,
      expires,
      created_at: new Date().toISOString()
    };

    return await this.update(this.stores.cache, cacheItem);
  }

  async getCache(key) {
    const cacheItem = await this.get(this.stores.cache, key);

    if (!cacheItem) return null;

    if (Date.now() > cacheItem.expires) {
      await this.delete(this.stores.cache, key);
      return null;
    }

    return cacheItem.data;
  }

  /**
   * Clear expired cache items
   */
  async clearExpiredCache() {
    const transaction = this.db.transaction([this.stores.cache], 'readwrite');
    const store = transaction.objectStore(this.stores.cache);
    const index = store.index('expires');

    const range = IDBKeyRange.upperBound(Date.now());
    const request = index.openCursor(range);

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }

  /**
   * Export user data
   */
  async exportUserData(userId) {
    const user = await this.getUser(userId);
    const contributions = await this.getUserContributions(userId);
    const bookmarks = await this.getUserBookmarks(userId);

    return {
      user,
      contributions,
      bookmarks,
      exported_at: new Date().toISOString()
    };
  }

  /**
   * Clear all user data (for privacy)
   */
  async clearUserData(userId) {
    // Delete user
    await this.delete(this.stores.users, userId);

    // Delete contributions
    const contributions = await this.getUserContributions(userId);
    for (const contrib of contributions) {
      await this.delete(this.stores.contributions, contrib.id);
    }

    // Delete bookmarks
    const bookmarks = await this.getUserBookmarks(userId);
    for (const bookmark of bookmarks) {
      await this.delete(this.stores.bookmarks, bookmark.id);
    }

    console.log('🗑️ User data cleared');
  }
}

// Create global database instance
window.devFlowDB = new DevFlowDatabase();

// Initialize database when script loads
devFlowDB.init().then(() => {
  console.log('🗄️ DevFlow Database ready');

  // Clear expired cache on startup
  devFlowDB.clearExpiredCache();
}).catch(error => {
  console.error('❌ Database initialization failed:', error);
});

export default DevFlowDatabase;
