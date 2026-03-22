/**
 * API Configuration - PHASE 10: Backend Integration
 * Central location for API endpoints, JWT token management, and authentication
 */

// Backend API Base URL
const API_BASE_URL = 'http://localhost:8080/api';

// JWT Token Storage Keys
const JWT_TOKEN_KEY = 'jwt_token';
const JWT_REFRESH_TOKEN_KEY = 'jwt_refresh_token';
const USER_DATA_KEY = 'user_data';

// API Endpoints - AUTHENTICATION
const API_ENDPOINTS = {
    // Authentication endpoints
    AUTH_REGISTER: `${API_BASE_URL}/auth/register`,
    AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
    AUTH_VERIFY_EMAIL: `${API_BASE_URL}/auth/verify-email`,
    AUTH_FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
    AUTH_VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
    AUTH_RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
    AUTH_LOGOUT: `${API_BASE_URL}/auth/logout`,
    AUTH_REFRESH: `${API_BASE_URL}/auth/refresh-token`,
    
    // User endpoints
    USER_ME: `${API_BASE_URL}/users/me`,
    USER_PROFILE: `${API_BASE_URL}/users`,
    USER_CHANGE_PASSWORD: `${API_BASE_URL}/users/me/password`,
    
    // Campaign endpoints
    CAMPAIGN_LIST: `${API_BASE_URL}/campaigns`,
    CAMPAIGN_CREATE: `${API_BASE_URL}/campaigns`,
    CAMPAIGN_GET: (id) => `${API_BASE_URL}/campaigns/${id}`,
    CAMPAIGN_UPDATE: (id) => `${API_BASE_URL}/campaigns/${id}`,
    CAMPAIGN_DELETE: (id) => `${API_BASE_URL}/campaigns/${id}`,
    CAMPAIGN_START: (id) => `${API_BASE_URL}/campaigns/${id}/start`,
    CAMPAIGN_PAUSE: (id) => `${API_BASE_URL}/campaigns/${id}/pause`,
    CAMPAIGN_RESUME: (id) => `${API_BASE_URL}/campaigns/${id}/resume`,
    CAMPAIGN_STATS: (id) => `${API_BASE_URL}/campaigns/${id}/stats`,
    CAMPAIGN_LOGS: (id) => `${API_BASE_URL}/campaigns/${id}/logs`,
    
    // Email provider endpoints
    EMAIL_PROVIDER_LIST: `${API_BASE_URL}/email-providers`,
    EMAIL_PROVIDER_CREATE: `${API_BASE_URL}/email-providers`,
    EMAIL_PROVIDER_GET: (id) => `${API_BASE_URL}/email-providers/${id}`,
    EMAIL_PROVIDER_UPDATE: (id) => `${API_BASE_URL}/email-providers/${id}`,
    EMAIL_PROVIDER_DELETE: (id) => `${API_BASE_URL}/email-providers/${id}`,
    EMAIL_PROVIDER_VERIFY: (id) => `${API_BASE_URL}/email-providers/${id}/verify`,
    
    // CSV upload endpoints
    CSV_UPLOAD: `${API_BASE_URL}/csv/upload`,
    CSV_LIST: `${API_BASE_URL}/csv/uploads`,
    CSV_GET: (id) => `${API_BASE_URL}/csv/uploads/${id}`,
    CSV_PREVIEW: (id) => `${API_BASE_URL}/csv/uploads/${id}/preview`,
};

/**
 * ============================================================================
 * JWT TOKEN MANAGEMENT
 * ============================================================================
 */

/**
 * Get JWT token from localStorage
 * @returns {string|null} - JWT token or null if not found
 */
function getJwtToken() {
    return localStorage.getItem(JWT_TOKEN_KEY);
}

/**
 * Get refresh token from localStorage
 * @returns {string|null} - Refresh token or null if not found
 */
function getRefreshToken() {
    return localStorage.getItem(JWT_REFRESH_TOKEN_KEY);
}

/**
 * Store JWT tokens in localStorage
 * @param {string} token - JWT access token
 * @param {string} refreshToken - JWT refresh token
 */
function storeJwtTokens(token, refreshToken) {
    localStorage.setItem(JWT_TOKEN_KEY, token);
    localStorage.setItem(JWT_REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Store user data for easy access
 * @param {object} userData - User data object {id, email, fullName, ...}
 */
function storeUserData(userData) {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
}

/**
 * Get stored user data
 * @returns {object|null} - User data object or null
 */
function getUserData() {
    const data = localStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
}

/**
 * Check if user is authenticated
 * @returns {boolean} - True if valid JWT token exists
 */
function isAuthenticated() {
    const token = getJwtToken();
    return token !== null && token !== undefined && token.length > 0;
}

/**
 * Clear all authentication data (logout)
 */
function clearAuthData() {
    localStorage.removeItem(JWT_TOKEN_KEY);
    localStorage.removeItem(JWT_REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
}

/**
 * ============================================================================
 * API CALL FUNCTION WITH JWT AUTHENTICATION
 * ============================================================================
 */

/**
 * Make API call with automatic JWT token attachment and error handling
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise} - Response JSON or error
 */
async function apiCall(url, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Attach JWT token to Authorization header if authenticated
    const token = getJwtToken();
    if (token && isAuthenticated()) {
        finalOptions.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, finalOptions);

        // Handle 401 Unauthorized - Try to refresh token
        if (response.status === 401) {
            console.warn('Token expired or invalid, attempting refresh...');
            
            // Try to refresh the token
            const refreshed = await refreshJwtToken();
            if (refreshed) {
                // Retry the original request with new token
                return apiCall(url, options);
            } else {
                // Refresh failed, clear auth and redirect to login
                clearAuthData();
                window.location.href = 'auth.html';
                throw new Error('Session expired. Please login again.');
            }
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP Error: ${response.status}`);
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return { success: true };
        }

        return await response.json();
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

/**
 * ============================================================================
 * JWT TOKEN REFRESH
 * ============================================================================
 */

/**
 * Refresh JWT access token using refresh token
 * @returns {Promise<boolean>} - True if refresh successful
 */
async function refreshJwtToken() {
    try {
        const refreshToken = getRefreshToken();
        
        if (!refreshToken) {
            console.warn('No refresh token available');
            return false;
        }

        const response = await fetch(API_ENDPOINTS.AUTH_REFRESH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refreshToken: refreshToken
            })
        });

        if (!response.ok) {
            console.warn('Token refresh failed');
            return false;
        }

        const data = await response.json();
        
        if (data.token && data.refreshToken) {
            storeJwtTokens(data.token, data.refreshToken);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Token refresh error:', error);
        return false;
    }
}

/**
 * Check backend health/connectivity
 * @returns {Promise<boolean>} - True if backend is available
 */
async function checkBackendHealth() {
    try {
        const response = await fetch(API_ENDPOINTS.EMAIL_HEALTH);
        return response.ok;
    } catch (error) {
        console.warn('Backend health check failed:', error);
        return false;
    }
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} - Formatted string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Show notification/alert
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in ms (0 = persistent)
 */
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${getNotificationColor(type)};
        color: white;
        border-radius: 6px;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;

    document.body.appendChild(notification);

    if (duration > 0) {
        setTimeout(() => {
            notification.remove();
        }, duration);
    }

    return notification;
}

/**
 * Get notification background color
 * @param {string} type - Notification type
 * @returns {string} - Color value
 */
function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
    };
    return colors[type] || colors.info;
}

/**
 * Format date to readable format
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - Formatted date string
 */
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Parse CSV string to array of objects
 * @param {string} csvContent - CSV file content
 * @returns {Array} - Array of objects with headers as keys
 */
function parseCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;

        const values = lines[i].split(',').map(v => v.trim());
        const obj = {};

        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });

        result.push(obj);
    }

    return result;
}
