import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: '', // Since we use a Vite proxy
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the bearer token automatically
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle global errors (like 401 Unauthorized)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;
    const shouldResetSession =
      status === 401 ||
      (status === 403 &&
        typeof message === 'string' &&
        (message.toLowerCase().includes('session') ||
          message.toLowerCase().includes('abonnement a expire') ||
          message.toLowerCase().includes("n'est plus enregistree") ||
          message.toLowerCase().includes('acces a cette salle est suspendu')));

    if (shouldResetSession) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
