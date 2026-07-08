import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const { login } = useAuth();
  const { colors, custom } = useTheme();

  async function handleLogin() {
    setErro('');
    if (!email.trim() || !senha.trim()) {
      setErro('Preencha todos os campos.');
      return;
    }
    setCarregando(true);
    try {
      await login(email.trim(), senha);
    } catch {
      setErro('E-mail ou senha incorretos.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[estilos.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={estilos.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={estilos.topo}>
          <Text style={[estilos.titulo, { color: custom.textPrimary }]}>AppFinanças</Text>
          <Text style={[estilos.subtitulo, { color: custom.textSecondary }]}>
            Controle financeiro da família
          </Text>
        </View>

        <View style={estilos.formulario}>
          <TextInput
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            left={<TextInput.Icon icon="email-outline" />}
            style={estilos.campo}
          />

          <TextInput
            label="Senha"
            value={senha}
            onChangeText={setSenha}
            mode="outlined"
            secureTextEntry={!senhaVisivel}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={senhaVisivel ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setSenhaVisivel((v) => !v)}
              />
            }
            style={estilos.campo}
          />

          {erro ? (
            <Text style={[estilos.erro, { color: custom.expense }]}>{erro}</Text>
          ) : null}

          <Button
            mode="contained"
            onPress={handleLogin}
            disabled={carregando}
            contentStyle={estilos.botaoConteudo}
            style={estilos.botao}
            labelStyle={estilos.botaoLabel}
          >
            {carregando ? <ActivityIndicator color="#fff" size={20} /> : 'Entrar'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  topo: {
    alignItems: 'center',
    marginBottom: 48,
  },
  titulo: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 15,
  },
  formulario: {
    gap: 16,
  },
  campo: {
    borderRadius: 8,
  },
  erro: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: -8,
  },
  botao: {
    marginTop: 8,
    borderRadius: 8,
  },
  botaoConteudo: {
    paddingVertical: 6,
  },
  botaoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
