import axios from 'axios';

// Token store that can be accessed from anywhere, including API interceptors
class TokenStore {
  private token: string | null = null;
  private listeners: Array<() => void> = [];

  getToken(): string | null {
    return this.token;
  }

  async getRefreshToken(): Promise<string | null> {
    if (typeof document === 'undefined') return null;
    
    console.log('getRefreshToken: Checking for refresh token cookie...');
    console.log('getRefreshToken: document.cookie =', document.cookie);
    
    // Read refresh token from cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name] = cookie.trim().split('=');
      if (name === 'refreshToken') {
        console.log('getRefreshToken: Found refresh token cookie, attempting refresh...');
        // If we have a refresh token, try to get a new auth token
        try {
          const response = await axios.post('/auth/refresh', {}, {
            baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://multi-tenant-backend-ugnt-80ksha87c-hrithiks-projects-a05d4764.vercel.app/api',
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
            },
          });

          console.log('getRefreshToken: Refresh response:', response.data);
          if (response.data?.accessToken) {
            this.setToken(response.data.accessToken);
            return response.data.accessToken;
          }
          
          // If refresh fails, clear the token
          this.clearAuth();
          return null;
        } catch (error) {
          console.error('Token refresh failed:', error);
          this.clearAuth();
          return null;
        }
      }
    }
    console.log('getRefreshToken: No refresh token cookie found');
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
