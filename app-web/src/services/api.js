import axios from 'axios';

const api = axios.create({
  baseURL: 'https://apifinancas.locapocos.com.br/api',
});

api.interceptors.request.use(async (config) => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const token = await AsyncStorage.getItem('token');
  console.log('API Request:', config.method?.toUpperCase(), config.url);
  console.log('Token:', token ? 'presente' : 'ausente');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API Error:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
