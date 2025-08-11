import axios from 'axios'
import VueAxios from 'vue-axios'

// Make sure the baseURL includes /api
const baseURL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api'
console.log('setting base', baseURL)

const axiosInstance = axios.create({
    baseURL: baseURL,
    withCredentials: true,
    timeout: 10000
})

// Add request/response interceptors for debugging
axiosInstance.interceptors.request.use(
    config => {
        console.log('Making request to:', config.baseURL + config.url)
        return config
    },
    error => {
        console.error('Request error:', error)
        return Promise.reject(error)
    }
)

axiosInstance.interceptors.response.use(
    response => {
        console.log('Response received:', response.status, response.data)
        return response
    },
    error => {
        console.error('Response error:', error.response?.status, error.response?.data)
        return Promise.reject(error)
    }
)

export { axiosInstance, VueAxios }