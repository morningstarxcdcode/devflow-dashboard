/**
 * DevFlow Authentication Module
 * Handles GitHub OAuth and user session management
 */

class DevFlowAuth {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.githubToken = localStorage.getItem('devflow_github_token');
    this.sessionToken = localStorage.getItem('devflow_session_token');

    // GitHub OAuth configuration
    this.githubConfig = {
      clientId: 'your_github_client_id', // Set this in production
      redirectUri: window.location.origin + '/auth/callback',
      scope: 'read:user,public_repo,read:org'
    };

    this.init();
  }

  /**
   * Initialize authentication system
   */
  async init() {
    // Check for existing session
    if (this.sessionToken) {
      await this.validateSession();
    }

    // Handle OAuth callback
    this.handleOAuthCallback();

    console.log('🔐 Auth system initialized');
  }

  /**
   * Start GitHub OAuth flow
   */
  initiateGitHubAuth() {
    const state = this.generateState();
    localStorage.setItem('oauth_state', state);

    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', this.githubConfig.clientId);
    authUrl.searchParams.set('redirect_uri', this.githubConfig.redirectUri);
    authUrl.searchParams.set('scope', this.githubConfig.scope);
    authUrl.searchParams.set('state', state);

    window.location.href = authUrl.toString();
  }

  /**
   * Handle OAuth callback
   */
  handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('oauth_state');

    if (code && state && state === storedState) {
      this.exchangeCodeForToken(code);
      localStorage.removeItem('oauth_state');

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code) {
    try {
      // In a real app, this would go through your backend
      // For demo purposes, we'll use the token directly
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.githubConfig.clientId,
          client_secret: 'your_github_client_secret', // This should be on your backend
          code: code
        })
      });

      const data = await response.json();

      if (data.access_token) {
        await this.authenticateWithToken(data.access_token);
      }
    } catch (error) {
      console.error('OAuth token exchange failed:', error);
      this.showAuthError('Authentication failed. Please try again.');
    }
  }

  /**
   * Authenticate with GitHub token (manual entry or OAuth)
   */
  async authenticateWithToken(token) {
    try {
      // Validate token with GitHub API
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      const userData = await response.json();

      // Store token and create session
      this.githubToken = token;
      localStorage.setItem('devflow_github_token', token);

      // Create local session
      await this.createUserSession(userData);

      console.log('✅ Authentication successful');
      return userData;

    } catch (error) {
      console.error('Authentication failed:', error);
      this.showAuthError('Invalid GitHub token. Please check and try again.');
      throw error;
    }
  }

  /**
   * Create user session and store in database
   */
  async createUserSession(userData) {
    // Generate session token
    this.sessionToken = this.generateSessionToken();
    localStorage.setItem('devflow_session_token', this.sessionToken);

    // Save user data to database
    await window.devFlowDB.saveUser(userData);

    // Set current user
    this.currentUser = userData;
    this.isAuthenticated = true;

    // Save session info
    await window.devFlowDB.saveSetting('current_session', {
      user_id: userData.id,
      session_token: this.sessionToken,
      login_time: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });

    // Track login event
    this.trackAuthEvent('login', userData.id);

    // Trigger auth state change event
    this.dispatchAuthEvent('authenticated', userData);
  }

  /**
   * Validate existing session
   */
  async validateSession() {
    try {
      const sessionData = await window.devFlowDB.getSetting('current_session');

      if (!sessionData) {
        this.clearSession();
        return false;
      }

      // Check if session expired
      if (new Date() > new Date(sessionData.expires_at)) {
        this.clearSession();
        return false;
      }

      // Get user data
      const userData = await window.devFlowDB.getUser(sessionData.user_id);
      if (!userData) {
        this.clearSession();
        return false;
      }

      // Restore session
      this.currentUser = userData;
      this.isAuthenticated = true;

      // Extend session
      sessionData.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await window.devFlowDB.saveSetting('current_session', sessionData);

      this.dispatchAuthEvent('session_restored', userData);
      return true;

    } catch (error) {
      console.error('Session validation failed:', error);
      this.clearSession();
      return false;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    if (this.currentUser) {
      this.trackAuthEvent('logout', this.currentUser.id);
    }

    // Clear local storage
    localStorage.removeItem('devflow_github_token');
    localStorage.removeItem('devflow_session_token');

    // Clear session from database
    await window.devFlowDB.saveSetting('current_session', null);

    // Reset state
    this.currentUser = null;
    this.isAuthenticated = false;
    this.githubToken = null;
    this.sessionToken = null;

    // Trigger auth state change event
    this.dispatchAuthEvent('logged_out');

    console.log('👋 User logged out');
  }

  /**
   * Clear session data
   */
  clearSession() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.sessionToken = null;

    localStorage.removeItem('devflow_session_token');
  }

  /**
   * Get current user data
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  /**
   * Get GitHub token for API calls
   */
  getGitHubToken() {
    return this.githubToken;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updates) {
    if (!this.isAuthenticated) {
      throw new Error('User not authenticated');
    }

    const updatedUser = { ...this.currentUser, ...updates };
    await window.devFlowDB.saveUser(updatedUser);
    this.currentUser = updatedUser;

    this.dispatchAuthEvent('profile_updated', updatedUser);
  }

  /**
   * Generate secure random state for OAuth
   */
  generateState() {
    const array = new Uint32Array(8);
    crypto.getRandomValues(array);
    return Array.from(array, x => x.toString(36)).join('');
  }

  /**
   * Generate session token
   */
  generateSessionToken() {
    const array = new Uint32Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, x => x.toString(36)).join('');
  }

  /**
   * Track authentication events
   */
  async trackAuthEvent(event, userId = null) {
    const eventData = {
      event,
      user_id: userId,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      ip_address: 'client_side' // Would be set by backend
    };

    // Store in database for analytics
    await window.devFlowDB.add('auth_events', {
      id: `${event}_${Date.now()}`,
      ...eventData
    });
  }

  /**
   * Dispatch authentication events
   */
  dispatchAuthEvent(type, data = null) {
    const event = new CustomEvent('devflow-auth', {
      detail: { type, data, timestamp: new Date().toISOString() }
    });

    window.dispatchEvent(event);
  }

  /**
   * Show authentication error
   */
  showAuthError(message) {
    // This would integrate with your notification system
    if (window.devFlow && window.devFlow.showNotification) {
      window.devFlow.showNotification(`🔐 ${message}`, 'error');
    } else {
      alert(message);
    }
  }

  /**
   * Request specific GitHub scopes
   */
  async requestAdditionalScopes(scopes) {
    const currentScopes = this.githubConfig.scope.split(',');
    const newScopes = [...new Set([...currentScopes, ...scopes])];

    this.githubConfig.scope = newScopes.join(',');
    this.initiateGitHubAuth();
  }

  /**
   * Refresh GitHub token (if needed)
   */
  async refreshGitHubToken() {
    // GitHub tokens don't expire, but this could be used for other providers
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${this.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Get user permissions for specific repositories
   */
  async getUserPermissions(owner, repo) {
    if (!this.githubToken) return null;

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/collaborators/${this.currentUser.login}/permission`, {
        headers: {
          'Authorization': `token ${this.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.permission;
      }
    } catch (error) {
      console.error('Failed to get permissions:', error);
    }

    return null;
  }
}

// Create global auth instance
window.devFlowAuth = new DevFlowAuth();

// Listen for auth events
window.addEventListener('devflow-auth', (event) => {
  const { type, data } = event.detail;
  console.log(`🔐 Auth event: ${type}`, data);

  // Update UI based on auth state
  if (window.devFlow && window.devFlow.updateAuthUI) {
    window.devFlow.updateAuthUI();
  }
});

export default DevFlowAuth;
