// Token store that can be accessed from anywhere, including API interceptors
class TokenStore {
  private token: string | null = null;
  private listeners: Array<() => void> = [];

  getToken(): string | null {
    return this.token;
  }

  getRefreshToken(): string | null {
    if (typeof document === 'undefined') return null;
    
    // Read refresh token from cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'refreshToken') {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  setToken(token: string | null): void {
    this.token = token;
    this.notifyListeners();
  }

  clearAuth(): void {
    this.token = null;
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Create a singleton instance
export const tokenStore = new TokenStore();
