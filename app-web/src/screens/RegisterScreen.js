import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '../utils/alert';

export default function RegisterScreen({ navigation }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { registrar } = useAuth();

  async function handleRegistrar() {
    if (!nome || !email || !senha) {
      showAlert('Atenção', 'Preencha todos os campos.');
      return;
    }
    setCarregando(true);
    try {
      await registrar(nome, email, senha);
    } catch (erro) {
      showAlert('Erro', erro.response?.data?.message || 'Não foi possível criar a conta.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={estilos.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={estilos.caixa}>
        <Text style={estilos.titulo}>Finanças</Text>
        <Text style={estilos.subtitulo}>Crie sua conta</Text>

        <TextInput
          style={estilos.campo}
          placeholder="Nome"
          placeholderTextColor="#888"
          autoCapitalize="words"
          value={nome}
          onChangeText={setNome}
        />
        <TextInput
          style={estilos.campo}
          placeholder="E-mail"
          placeholderTextColor="#888"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={estilos.campo}
          placeholder="Senha"
          placeholderTextColor="#888"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />

        <TouchableOpacity style={estilos.botao} onPress={handleRegistrar} disabled={carregando}>
          {carregando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={estilos.textoBotao}>Cadastrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={estilos.link}>Já tem conta? Faça login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 24,
  },
  caixa: {
    alignItems: 'center',
  },
  titulo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 16,
    color: '#555',
    marginBottom: 32,
  },
  campo: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#c5cae9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a237e',
    marginBottom: 16,
    backgroundColor: '#f5f6ff',
  },
  botao: {
    width: '100%',
    backgroundColor: '#1a237e',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  textoBotao: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#1a237e',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
