import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api/',
});

// INTERCEPTOR: Automatically attach the JWT token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// RESPONSE INTERCEPTOR: Handle expired tokens
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // If the backend returns 401 (Unauthorized), the token is likely expired or invalid
        if (error.response && error.response.status === 401) {
            console.warn("Unauthorized! Redirecting to login...");
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            // Force a redirect to the login page
            if (window.location.pathname.startsWith('/operator')) {
                window.location.href = '/admin/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;