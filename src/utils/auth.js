// Authentication utility for Take 2
// Handles user registration, login, and token management

const API_URL = process.env.NEXT_PUBLIC_MONGO_API_URL || 'http://localhost:3001/api';
const TOKEN_KEY = 'take2-auth-token';
const USER_KEY = 'take2-auth-user';

// Get stored auth token
export const getToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
};

// Get stored user data
export const getUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
};

// Store auth data
const setAuth = (token, user) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to store auth:', e);
  }
};

// Clear auth data
export const clearAuth = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.warn('Failed to clear auth:', e);
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getToken();
};

// API request with auth header
const authRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
};

// Register new user
export const register = async (username, password, displayName = null) => {
  try {
    const data = await authRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName }),
    });

    if (data.success && data.token) {
      setAuth(data.token, data.user);
      return { success: true, user: data.user };
    }

    return { success: false, error: 'Registration failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Login user
export const login = async (username, password) => {
  try {
    const data = await authRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (data.success && data.token) {
      setAuth(data.token, data.user);
      return { success: true, user: data.user };
    }

    return { success: false, error: 'Login failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Logout user
export const logout = () => {
  clearAuth();
  return { success: true };
};

// Get current user profile from server
export const getProfile = async () => {
  try {
    const data = await authRequest('/auth/me');
    if (data.user) {
      // Update stored user data
      const token = getToken();
      if (token) {
        setAuth(token, data.user);
      }
      return { success: true, user: data.user };
    }
    return { success: false, error: 'Failed to get profile' };
  } catch (error) {
    // Only clear auth if it's specifically an authentication error (401)
    // Don't clear on network errors, server errors, etc.
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      clearAuth();
    }
    return { success: false, error: error.message };
  }
};

// Update user profile
export const updateProfile = async (displayName) => {
  try {
    const data = await authRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ displayName }),
    });

    if (data.success && data.user) {
      const token = getToken();
      if (token) {
        setAuth(token, data.user);
      }
      return { success: true, user: data.user };
    }

    return { success: false, error: 'Failed to update profile' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get display name for current user
export const getDisplayName = () => {
  const user = getUser();
  return user?.displayName || user?.username || null;
};

// Get user stats
export const getUserStats = () => {
  const user = getUser();
  return user?.stats || null;
};

// Refresh user data from server (call after game completion)
export const refreshUserData = async () => {
  if (!isAuthenticated()) return null;
  const result = await getProfile();
  return result.success ? result.user : null;
};
