import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarToken() {
      const tokenSalvo = await AsyncStorage.getItem('token');
      const usuarioSalvo = await AsyncStorage.getItem('usuario');
      if (tokenSalvo && usuarioSalvo) {
        setToken(tokenSalvo);
        setUser(JSON.parse(usuarioSalvo));
      }
      setCarregando(false);
    }
    carregarToken();
  }, []);

  async function login(email, senha) {
    const resposta = await api.post('/auth/login', { email, password: senha });
    const { token: novoToken, user: usuario } = resposta.data;
    await AsyncStorage.setItem('token', novoToken);
    await AsyncStorage.setItem('usuario', JSON.stringify(usuario));
    setToken(novoToken);
    setUser(usuario);
  }

  async function registrar(nome, email, senha) {
    const resposta = await api.post('/auth/register', { name: nome, email, password: senha });
    const { token: novoToken, user: usuario } = resposta.data;
    await AsyncStorage.setItem('token', novoToken);
    await AsyncStorage.setItem('usuario', JSON.stringify(usuario));
    setToken(novoToken);
    setUser(usuario);
  }

  async function logout() {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('usuario');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, carregando, login, registrar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
