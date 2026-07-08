import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text,
  Surface,
  IconButton,
  FAB,
  ActivityIndicator,
  useTheme,
  TouchableRipple,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function formatBRL(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(dateStr) {
  const d = new Date(dateStr);
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
}

function InicialCategoria({ inicial, bgColor, textColor }) {
  return (
    <View style={[estilos.inicialContainer, { backgroundColor: bgColor }]}>
      <Text style={{ color: textColor, fontWeight: 'bold', fontSize: 16 }}>
        {inicial?.toUpperCase() || '?'}
      </Text>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const [transacoes, setTransacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mesAtual, setMesAtual] = useState(new Date());
  const { user, logout } = useAuth();
  const { colors, custom } = useTheme();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      carregarTransacoes();
    }, [])
  );

  async function carregarTransacoes() {
    setCarregando(true);
    try {
      const resposta = await api.get('/transactions');
      setTransacoes(resposta.data);
    } catch {
      setTransacoes([]);
    } finally {
      setCarregando(false);
    }
  }

  // ─── NAVEGAÇÃO POR MÊS ────────────────────────────────────────────────────
  function mesAnterior() {
    setMesAtual((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function proximoMes() {
    setMesAtual((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const agora = new Date();
  // É o mês corrente? (não navega pro futuro além dele)
  const ehMesAtual =
    mesAtual.getFullYear() === agora.getFullYear() &&
    mesAtual.getMonth() === agora.getMonth();

  // Rótulo "Junho 2026"
  const nomeMes = mesAtual.toLocaleString('pt-BR', { month: 'long' });
  const labelMes = `${nomeMes.charAt(0).toUpperCase()}${nomeMes.slice(1)} ${mesAtual.getFullYear()}`;
  // ──────────────────────────────────────────────────────────────────────────

  // ─── FILTROS POR MÊS ──────────────────────────────────────────────────────
  const primeiroDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
  const ultimoDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0, 23, 59, 59);

  const transacoesDoMes = transacoes.filter((t) => {
    const d = new Date(t.date);
    return d >= primeiroDia && d <= ultimoDia;
  });

  // PAGAS — sempre só do mês visualizado
  const pagasDoMes = transacoesDoMes.filter((t) => t.status === 'pago');

  // PENDENTES — no mês atual inclui as vencidas de meses anteriores;
  // no histórico mostra só as pendentes daquele mês.
  const pendentesDoMes = transacoesDoMes.filter((t) => t.status === 'pendente');
  const pendentesVencidasAnteriores = transacoes.filter(
    (t) => t.status === 'pendente' && new Date(t.date) < primeiroDia
  );
  const pendentes = ehMesAtual
    ? [...pendentesVencidasAnteriores, ...pendentesDoMes]
    : pendentesDoMes;
  // ──────────────────────────────────────────────────────────────────────────

  // SALDO — acumulado real: todas as pagas até hoje (não muda ao navegar;
  // ignora pagas com data futura).
  const todasPagas = transacoes.filter(
    (t) => t.status === 'pago' && new Date(t.date) <= agora
  );
  const saldoAtual = todasPagas.reduce((acc, t) => {
    const v = parseFloat(t.amount) || 0;
    return acc + (t.category?.type === 'receita' ? v : -v);
  }, 0);

  // A receber / A pagar — sobre os pendentes filtrados (inclui vencidas no mês atual).
  const aReceber = pendentes
    .filter((t) => t.category?.type === 'receita')
    .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

  const aPagar = pendentes
    .filter((t) => t.category?.type === 'despesa')
    .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

  // Receitas / Despesas pagas do mês visualizado (mini-cards de histórico).
  const receitasDoMes = pagasDoMes
    .filter((t) => t.category?.type === 'receita')
    .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

  const despesasDoMes = pagasDoMes
    .filter((t) => t.category?.type === 'despesa')
    .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

  const sortDesc = (arr) => [...arr].sort((a, b) => new Date(b.date) - new Date(a.date));

  const pendentesSorted = [...pendentes].sort((a, b) => new Date(a.date) - new Date(b.date));
  const pagasSorted = sortDesc(pagasDoMes);

  const saldoCor =
    saldoAtual > 0 ? custom.income : saldoAtual < 0 ? custom.expense : colors.onSurface;

  function renderTransacao(item) {
    const isReceita = item.category?.type === 'receita';
    const valorCor = isReceita ? custom.income : custom.expense;
    const sinal = isReceita ? '+ ' : '- ';

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataTransacao = new Date(item.date);
    dataTransacao.setHours(0, 0, 0, 0);
    const vencida = item.status === 'pendente' && dataTransacao < hoje;

    return (
      <TouchableRipple
        key={item._id || item.id}
        onPress={() => navigation.navigate('EditTransaction', { transacao: item })}
        rippleColor="rgba(255,255,255,0.08)"
        style={[estilos.itemWrapper, { backgroundColor: colors.surface }]}
      >
        <View style={estilos.itemRow}>
          <InicialCategoria
            inicial={item.category?.name?.charAt(0)}
            bgColor={colors.surfaceVariant}
            textColor={colors.onSurfaceVariant}
          />
          <View style={estilos.itemTextos}>
            <Text style={[estilos.itemDescricao, { color: colors.onSurface }]} numberOfLines={1}>
              {item.description}
            </Text>
            <View style={estilos.itemSubtituloRow}>
              {vencida && (
                <MaterialCommunityIcons
                  name="clock-alert"
                  size={13}
                  color={custom.expense}
                  style={{ marginRight: 3 }}
                />
              )}
              <Text
                style={[estilos.itemSubtitulo, { color: colors.onSurfaceVariant }]}
                numberOfLines={1}
              >
                <Text style={vencida ? { color: custom.expense, fontWeight: 'bold' } : undefined}>
                  {formatData(item.date)}
                </Text>
                {' · '}{item.category?.name || '—'} · {item.recorrente === 'fixo' ? 'Fixo' : 'Variável'}
              </Text>
            </View>
          </View>
          <Text style={[estilos.itemValor, { color: valorCor }]}>
            {sinal}{formatBRL(parseFloat(item.amount) || 0)}
          </Text>
        </View>
      </TouchableRipple>
    );
  }

  return (
    <View style={[estilos.container, { backgroundColor: colors.background }]}>
      <View style={estilos.header}>
        <Text style={[estilos.headerSaudacao, { color: colors.onSurface }]}>
          Olá, {user?.name?.split(' ')[0] || 'usuário'}
        </Text>
        <IconButton
          icon="logout"
          iconColor={colors.onSurfaceVariant}
          size={22}
          onPress={logout}
        />
      </View>

      {/* ─── HEADER DE MÊS ─── */}
      <View style={estilos.mesHeader}>
        <IconButton
          icon="chevron-left"
          iconColor={colors.onSurface}
          size={26}
          onPress={mesAnterior}
        />
        <Text style={[estilos.mesTexto, { color: colors.onSurface }]}>
          {labelMes}
        </Text>
        <IconButton
          icon="chevron-right"
          iconColor={ehMesAtual ? colors.onSurfaceDisabled : colors.onSurface}
          size={26}
          disabled={ehMesAtual}
          onPress={proximoMes}
        />
      </View>

      {carregando ? (
        <View style={estilos.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ ...estilos.scroll, paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
        >
          <Surface
            style={[estilos.cardPrincipal, { backgroundColor: colors.surface }]}
            elevation={0}
          >
            <Text style={[estilos.cardLabel, { color: colors.onSurfaceVariant }]}>
              Saldo atual
            </Text>
            <Text style={[estilos.cardValor, { color: saldoCor }]}>
              {formatBRL(saldoAtual)}
            </Text>
          </Surface>

          {/* No mês atual: A receber / A pagar (pendentes).
              No histórico: Receitas / Despesas pagas do mês visualizado. */}
          <View style={estilos.miniCardsRow}>
            <Surface
              style={[estilos.miniCard, { backgroundColor: colors.surface }]}
              elevation={0}
            >
              <Text style={[estilos.miniCardLabel, { color: colors.onSurfaceVariant }]}>
                {ehMesAtual ? 'A receber' : 'Receitas'}
              </Text>
              <Text style={[estilos.miniCardValor, { color: custom.income }]}>
                {formatBRL(ehMesAtual ? aReceber : receitasDoMes)}
              </Text>
            </Surface>
            <Surface
              style={[estilos.miniCard, { backgroundColor: colors.surface }]}
              elevation={0}
            >
              <Text style={[estilos.miniCardLabel, { color: colors.onSurfaceVariant }]}>
                {ehMesAtual ? 'A pagar' : 'Despesas'}
              </Text>
              <Text style={[estilos.miniCardValor, { color: custom.expense }]}>
                {formatBRL(ehMesAtual ? aPagar : despesasDoMes)}
              </Text>
            </Surface>
          </View>

          {/* Card — Gastos por categoria */}
          <TouchableRipple
            onPress={() => navigation.navigate('Categories')}
            rippleColor="rgba(255,255,255,0.08)"
            style={[estilos.cardCategoriasWrapper, { backgroundColor: colors.surface }]}
          >
            <View style={estilos.cardCategoriasRow}>
              <View style={estilos.cardCategoriasEsquerda}>
                <MaterialCommunityIcons
                  name="chart-donut"
                  size={22}
                  color={colors.primary}
                  style={{ marginRight: 10 }}
                />
                <Text style={[estilos.cardCategoriasTexto, { color: colors.onSurface }]}>
                  Gastos por categoria
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={colors.onSurfaceVariant}
              />
            </View>
          </TouchableRipple>

          {transacoes.length === 0 ? (
            // Banco vazio: nenhuma transação cadastrada ainda.
            <Text style={[estilos.vazioTexto, { color: colors.onSurfaceVariant }]}>
              Nenhuma transação ainda.{'\n'}Toque no + para começar.
            </Text>
          ) : transacoesDoMes.length === 0 ? (
            // Tem transações, mas nenhuma no mês visualizado.
            <Text style={[estilos.mesVazio, { color: custom.textSecondary }]}>
              Sem transações em {labelMes}
            </Text>
          ) : (
            <>
              {pendentesSorted.length > 0 && (
                <View style={estilos.secao}>
                  <Text style={[estilos.secaoTitulo, { color: colors.onSurfaceVariant }]}>
                    Pendentes
                  </Text>
                  {pendentesSorted.map(renderTransacao)}
                </View>
              )}
              {pagasSorted.length > 0 && (
                <View style={estilos.secao}>
                  <Text style={[estilos.secaoTitulo, { color: colors.onSurfaceVariant }]}>
                    Pagas
                  </Text>
                  {pagasSorted.map(renderTransacao)}
                </View>
              )}
            </>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      <FAB
        icon="plus"
        style={[estilos.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 16 }]}
        color="#fff"
        onPress={() => navigation.navigate('AddTransaction')}
      />
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerSaudacao: {
    fontSize: 20,
    fontWeight: '600',
  },
  mesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  mesTexto: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  mesVazio: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  cardPrincipal: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardValor: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  miniCardsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  miniCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
  },
  miniCardLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  miniCardValor: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  secao: {
    marginBottom: 16,
  },
  secaoTitulo: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  itemWrapper: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  inicialContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTextos: {
    flex: 1,
  },
  itemDescricao: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemSubtituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemSubtitulo: {
    fontSize: 12,
    flexShrink: 1,
  },
  itemValor: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  cardCategoriasWrapper: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardCategoriasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardCategoriasEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardCategoriasTexto: {
    fontSize: 16,
    fontWeight: '500',
  },
  vazioTexto: {
    textAlign: 'center',
    marginTop: 48,
    fontSize: 15,
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
});
