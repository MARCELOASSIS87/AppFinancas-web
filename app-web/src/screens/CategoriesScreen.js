import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Surface,
  IconButton,
  ActivityIndicator,
  ProgressBar,
  useTheme,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

function formatBRL(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CategoriesScreen({ navigation }) {
  const [dados, setDados] = useState([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const { colors, custom } = useTheme();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [])
  );

  async function carregar() {
    setCarregando(true);
    try {
      const resposta = await api.get('/transactions');
      const agora = new Date();
      const mesAtual = agora.getMonth();
      const anoAtual = agora.getFullYear();

      const filtradas = resposta.data.filter((t) => {
        const d = new Date(t.date);
        return (
          t.status === 'pago' &&
          t.category?.type === 'despesa' &&
          d.getMonth() === mesAtual &&
          d.getFullYear() === anoAtual
        );
      });

      // agrupa por categoria somando amount
      const mapa = {};
      for (const t of filtradas) {
        const id = t.category.id;
        if (!mapa[id]) {
          mapa[id] = { id, name: t.category.name, soma: 0 };
        }
        mapa[id].soma += parseFloat(t.amount) || 0;
      }

      const totalGeral = Object.values(mapa).reduce((acc, c) => acc + c.soma, 0);

      const lista = Object.values(mapa)
        .map((c) => ({ ...c, percentual: totalGeral > 0 ? c.soma / totalGeral : 0 }))
        .sort((a, b) => b.soma - a.soma);

      setDados(lista);
      setTotal(totalGeral);
    } catch {
      setDados([]);
      setTotal(0);
    } finally {
      setCarregando(false);
    }
  }

  const nomeMes = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <View style={[estilos.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header customizado */}
      <View style={estilos.header}>
        <IconButton
          icon="arrow-left"
          iconColor={colors.onSurface}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={[estilos.headerTitulo, { color: colors.onSurface }]}>
          Gastos por categoria
        </Text>
        <View style={{ width: 48 }} />
      </View>

      {carregando ? (
        <View style={estilos.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[estilos.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Card total do mês */}
          <Surface style={[estilos.cardTotal, { backgroundColor: colors.surface }]} elevation={0}>
            <Text style={[estilos.cardTotalLabel, { color: colors.onSurfaceVariant }]}>
              Total gasto em {nomeMes}
            </Text>
            <Text style={[estilos.cardTotalValor, { color: custom.expense }]}>
              {formatBRL(total)}
            </Text>
          </Surface>

          {/* Lista de categorias */}
          {dados.length === 0 ? (
            <Text style={[estilos.vazio, { color: colors.onSurfaceVariant }]}>
              Nenhum gasto registrado neste mês.
            </Text>
          ) : (
            dados.map((cat) => (
              <Surface
                key={cat.id}
                style={[estilos.itemCard, { backgroundColor: colors.surface }]}
                elevation={0}
              >
                <View style={estilos.itemLinha}>
                  <Text style={[estilos.itemNome, { color: colors.onSurface }]}>
                    {cat.name}
                  </Text>
                  <Text style={[estilos.itemValor, { color: custom.expense }]}>
                    {formatBRL(cat.soma)}
                  </Text>
                </View>
                <View style={estilos.barraRow}>
                  <ProgressBar
                    progress={cat.percentual}
                    color={colors.primary}
                    style={[estilos.barra, { backgroundColor: colors.outline }]}
                  />
                  <Text style={[estilos.percentualTexto, { color: colors.onSurfaceVariant }]}>
                    {Math.round(cat.percentual * 100)}%
                  </Text>
                </View>
              </Surface>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingBottom: 4,
  },
  headerTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: 16,
  },
  cardTotal: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  cardTotalLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardTotalValor: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  itemCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  itemLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemNome: {
    fontSize: 15,
    fontWeight: '500',
  },
  itemValor: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  barraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barra: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  percentualTexto: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 34,
    textAlign: 'right',
  },
  vazio: {
    textAlign: 'center',
    marginTop: 48,
    fontSize: 15,
    lineHeight: 24,
  },
});
