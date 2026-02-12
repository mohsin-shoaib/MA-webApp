import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor (attach token)
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Response interceptor (handle 401 and other errors)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth data and redirect to login
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')

      // Only redirect if we're not already on a public route
      const publicRoutes = [
        '/login',
        '/register',
        '/forgot-password',
        '/reset-password',
      ]
      const currentPath = globalThis.location.pathname

      if (!publicRoutes.includes(currentPath)) {
        globalThis.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
