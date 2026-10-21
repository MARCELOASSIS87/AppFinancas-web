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
  TextInput,
  Chip,
  Button,
} from 'react-native-paper';
import { DatePickerInput, registerTranslation, pt } from 'react-native-paper-dates';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

registerTranslation('pt', pt);

function formatBRL(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// DD/MM — usado no modo mês (ano é implícito).
function formatData(dateStr) {
  const d = new Date(dateStr);
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
}

// DD/MM/AA — usado nos resultados de busca (global, cruza anos).
function formatDataAno(dateStr) {
  const d = new Date(dateStr);
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const ano = String(d.getUTCFullYear()).slice(-2);
  return `${dia}/${mes}/${ano}`;
}

// Aceita "50", "50,00", "1.234,56" → número. Retorna NaN se vazio/inválido.
function parseValorBR(str) {
  if (str == null || String(str).trim() === '') return NaN;
  const limpo = String(str)
    .replace(/[^\d.,]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(limpo);
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

function ChipFiltro({ label, selecionado, onPress, colors }) {
  return (
    <Chip
      compact
      selected={selecionado}
      showSelectedCheck={false}
      onPress={onPress}
      style={[
        estilos.chip,
        { backgroundColor: selecionado ? colors.primaryContainer : colors.surfaceVariant },
      ]}
      textStyle={{
        color: selecionado ? colors.onPrimaryContainer : colors.onSurfaceVariant,
        fontSize: 12,
      }}
    >
      {label}
    </Chip>
  );
}

export default function DashboardScreen({ navigation }) {
  const [transacoes, setTransacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mesAtual, setMesAtual] = useState(new Date());

  // ─── ESTADO DOS FILTROS / BUSCA ───────────────────────────────────────────
  const [busca, setBusca] = useState('');
  const [catsSel, setCatsSel] = useState([]);        // ids de categoria
  const [tiposSel, setTiposSel] = useState([]);      // 'receita' | 'despesa'
  const [statusSel, setStatusSel] = useState([]);    // 'pago' | 'pendente' | 'vencida'
  const [recorrSel, setRecorrSel] = useState([]);    // 'fixo' | 'variavel'
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
  const [periodoDe, setPeriodoDe] = useState(null);
  const [periodoAte, setPeriodoAte] = useState(null);
  // ──────────────────────────────────────────────────────────────────────────

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

  const toggle = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  function limparFiltros() {
    setBusca('');
    setCatsSel([]);
    setTiposSel([]);
    setStatusSel([]);
    setRecorrSel([]);
    setValorMin('');
    setValorMax('');
    setPeriodoDe(null);
    setPeriodoAte(null);
  }

  const filtrosAtivos =
    busca.trim() !== '' ||
    catsSel.length > 0 ||
    tiposSel.length > 0 ||
    statusSel.length > 0 ||
    recorrSel.length > 0 ||
    valorMin.trim() !== '' ||
    valorMax.trim() !== '' ||
    !!periodoDe ||
    !!periodoAte;

  // Categorias que aparecem nas transações (para os chips), ordenadas por nome.
  const categoriasDisponiveis = (() => {
    const mapa = new Map();
    transacoes.forEach((t) => {
      if (t.category?.id != null) mapa.set(t.category.id, t.category);
    });
    return [...mapa.values()].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );
  })();

  // ─── APLICA TODOS OS FILTROS A UMA TRANSAÇÃO ──────────────────────────────
  function passaFiltros(t) {
    const q = busca.trim().toLowerCase();
    if (q) {
      const desc = (t.description || '').toLowerCase();
      const cat = (t.category?.name || '').toLowerCase();
      if (!desc.includes(q) && !cat.includes(q)) return false;
    }

    if (catsSel.length && !catsSel.includes(t.category?.id)) return false;

    if (tiposSel.length && !tiposSel.includes(t.category?.type)) return false;

    if (statusSel.length) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dt = new Date(t.date);
      dt.setHours(0, 0, 0, 0);
      const vencida = t.status === 'pendente' && dt < hoje;
      const bate = statusSel.some((s) => (s === 'vencida' ? vencida : s === t.status));
      if (!bate) return false;
    }

    if (recorrSel.length) {
      const rec = t.recorrente === 'fixo' ? 'fixo' : 'variavel';
      if (!recorrSel.includes(rec)) return false;
    }

    const v = parseFloat(t.amount) || 0;
    const min = parseValorBR(valorMin);
    const max = parseValorBR(valorMax);
    if (!isNaN(min) && v < min) return false;
    if (!isNaN(max) && v > max) return false;

    if (periodoDe) {
      const de = new Date(periodoDe);
      de.setHours(0, 0, 0, 0);
      if (new Date(t.date) < de) return false;
    }
    if (periodoAte) {
      const ate = new Date(periodoAte);
      ate.setHours(23, 59, 59, 999);
      if (new Date(t.date) > ate) return false;
    }

    return true;
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Resultados globais (todo o histórico) quando há filtro ativo.
  const resultados = filtrosAtivos ? transacoes.filter(passaFiltros) : [];
  const resultadosSorted = [...resultados].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  const totalReceitasResult = resultados
    .filter((t) => t.category?.type === 'receita')
    .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
  const totalDespesasResult = resultados
    .filter((t) => t.category?.type === 'despesa')
    .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

  // ─── NAVEGAÇÃO POR MÊS ────────────────────────────────────────────────────
  function mesAnterior() {
    setMesAtual((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function proximoMes() {
    setMesAtual((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const agora = new Date();
  const ehMesAtual =
    mesAtual.getFullYear() === agora.getFullYear() &&
    mesAtual.getMonth() === agora.getMonth();

  // Mês posterior ao corrente → mostra PREVISÃO (recorrências pendentes).
  const ehFuturo =
    mesAtual.getFullYear() > agora.getFullYear() ||
    (mesAtual.getFullYear() === agora.getFullYear() &&
      mesAtual.getMonth() > agora.getMonth());

  const nomeMes = mesAtual.toLocaleString('pt-BR', { month: 'long' });
  const labelMes = `${nomeMes.charAt(0).toUpperCase()}${nomeMes.slice(1)} ${mesAtual.getFullYear()}`;
  // ──────────────────────────────────────────────────────────────────────────

  // ─── FILTROS POR MÊS (modo normal, sem busca) ─────────────────────────────
  const primeiroDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
  const ultimoDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0, 23, 59, 59);

  const transacoesDoMes = transacoes.filter((t) => {
    const d = new Date(t.date);
    return d >= primeiroDia && d <= ultimoDia;
  });

  const pagasDoMes = transacoesDoMes.filter((t) => t.status === 'pago');

  const pendentesDoMes = transacoesDoMes.filter((t) => t.status === 'pendente');
  const pendentesVencidasAnteriores = transacoes.filter(
    (t) => t.status === 'pendente' && new Date(t.date) < primeiroDia
  );
  const pendentes = ehMesAtual
    ? [...pendentesVencidasAnteriores, ...pendentesDoMes]
    : pendentesDoMes;
  // ──────────────────────────────────────────────────────────────────────────

  const todasPagas = transacoes.filter(
    (t) => t.status === 'pago'
  );
  const saldoAtual = todasPagas.reduce((acc, t) => {
    const v = parseFloat(t.amount) || 0;
    return acc + (t.category?.type === 'receita' ? v : -v);
  }, 0);

  const aPagar = pendentes
    .filter((t) => t.category?.type === 'despesa')
    .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

  const despesasDoMes = pagasDoMes
    .filter((t) => t.category?.type === 'despesa')
    .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

  // Previsão do mês (futuro): tudo que está lançado naquele mês, pago ou
  // pendente — na prática as recorrências geradas pra frente.
  const previsaoGastos = transacoesDoMes
    .filter((t) => t.category?.type === 'despesa')
    .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

  const sortDesc = (arr) => [...arr].sort((a, b) => new Date(b.date) - new Date(a.date));

  const pendentesSorted = [...pendentes].sort((a, b) => new Date(a.date) - new Date(b.date));
  const pagasSorted = sortDesc(pagasDoMes);

  const saldoCor =
    saldoAtual > 0 ? custom.income : saldoAtual < 0 ? custom.expense : colors.onSurface;

  function renderTransacao(item, comAno = false) {
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
                  {comAno ? formatDataAno(item.date) : formatData(item.date)}
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

      {carregando ? (
        <View style={estilos.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ ...estilos.scroll, paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── BUSCA + FILTROS ─── */}
          <View style={estilos.filtroBloco}>
            <TextInput
              mode="outlined"
              dense
              placeholder="Buscar por descrição ou categoria"
              value={busca}
              onChangeText={setBusca}
              left={<TextInput.Icon icon="magnify" />}
              right={
                busca ? <TextInput.Icon icon="close" onPress={() => setBusca('')} /> : null
              }
              style={estilos.buscaCampo}
            />

            {/* Tipo / Situação / Recorrência */}
            <View style={estilos.chipsWrap}>
              <ChipFiltro label="Receita" colors={colors} selecionado={tiposSel.includes('receita')} onPress={() => toggle(tiposSel, setTiposSel, 'receita')} />
              <ChipFiltro label="Despesa" colors={colors} selecionado={tiposSel.includes('despesa')} onPress={() => toggle(tiposSel, setTiposSel, 'despesa')} />
              <ChipFiltro label="Pago" colors={colors} selecionado={statusSel.includes('pago')} onPress={() => toggle(statusSel, setStatusSel, 'pago')} />
              <ChipFiltro label="Pendente" colors={colors} selecionado={statusSel.includes('pendente')} onPress={() => toggle(statusSel, setStatusSel, 'pendente')} />
              <ChipFiltro label="Vencida" colors={colors} selecionado={statusSel.includes('vencida')} onPress={() => toggle(statusSel, setStatusSel, 'vencida')} />
              <ChipFiltro label="Fixo" colors={colors} selecionado={recorrSel.includes('fixo')} onPress={() => toggle(recorrSel, setRecorrSel, 'fixo')} />
              <ChipFiltro label="Variável" colors={colors} selecionado={recorrSel.includes('variavel')} onPress={() => toggle(recorrSel, setRecorrSel, 'variavel')} />
            </View>

            {/* Categorias */}
            {categoriasDisponiveis.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={estilos.catsRow}
                keyboardShouldPersistTaps="handled"
              >
                {categoriasDisponiveis.map((cat) => (
                  <ChipFiltro
                    key={cat.id}
                    label={cat.name}
                    colors={colors}
                    selecionado={catsSel.includes(cat.id)}
                    onPress={() => toggle(catsSel, setCatsSel, cat.id)}
                  />
                ))}
              </ScrollView>
            )}

            {/* Faixa de valor (exato = mesmo valor nos dois) */}
            <View style={estilos.linhaDupla}>
              <TextInput
                mode="outlined"
                dense
                label="Valor mín"
                keyboardType="decimal-pad"
                value={valorMin}
                onChangeText={setValorMin}
                left={<TextInput.Affix text="R$" />}
                style={estilos.campoMetade}
              />
              <TextInput
                mode="outlined"
                dense
                label="Valor máx"
                keyboardType="decimal-pad"
                value={valorMax}
                onChangeText={setValorMax}
                left={<TextInput.Affix text="R$" />}
                style={estilos.campoMetade}
              />
            </View>

            {/* Período */}
            <View style={estilos.linhaDupla}>
              <View style={estilos.campoMetade}>
                <DatePickerInput
                  locale="pt"
                  label="De"
                  value={periodoDe || undefined}
                  onChange={(d) => setPeriodoDe(d || null)}
                  inputMode="start"
                  mode="outlined"
                  dense
                />
              </View>
              <View style={estilos.campoMetade}>
                <DatePickerInput
                  locale="pt"
                  label="Até"
                  value={periodoAte || undefined}
                  onChange={(d) => setPeriodoAte(d || null)}
                  inputMode="start"
                  mode="outlined"
                  dense
                />
              </View>
            </View>

            {filtrosAtivos && (
              <Button
                mode="text"
                icon="filter-remove-outline"
                onPress={limparFiltros}
                textColor={custom.expense}
                style={estilos.limparBtn}
              >
                Limpar filtros
              </Button>
            )}
          </View>

          {/* ─── SALDO (sempre) ─── */}
          <Surface style={[estilos.cardPrincipal, { backgroundColor: colors.surface }]} elevation={0}>
            <Text style={[estilos.cardLabel, { color: colors.onSurfaceVariant }]}>
              Saldo atual
            </Text>
            <Text style={[estilos.cardValor, { color: saldoCor }]}>
              {formatBRL(saldoAtual)}
            </Text>
          </Surface>

          {filtrosAtivos ? (
            /* ═══ MODO BUSCA: resultados de todo o histórico ═══ */
            <>
              <Surface style={[estilos.resumo, { backgroundColor: colors.surface }]} elevation={0}>
                <Text style={[estilos.resumoContagem, { color: colors.onSurface }]}>
                  {resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'}
                </Text>
                <View style={estilos.resumoValores}>
                  <Text style={[estilos.resumoValor, { color: custom.income }]}>
                    + {formatBRL(totalReceitasResult)}
                  </Text>
                  <Text style={[estilos.resumoValor, { color: custom.expense }]}>
                    - {formatBRL(totalDespesasResult)}
                  </Text>
                </View>
              </Surface>

              {resultados.length === 0 ? (
                <Text style={[estilos.mesVazio, { color: custom.textSecondary }]}>
                  Nenhuma transação encontrada com esses filtros.
                </Text>
              ) : (
                <View style={estilos.secao}>
                  {resultadosSorted.map((item) => renderTransacao(item, true))}
                </View>
              )}
            </>
          ) : (
            /* ═══ MODO NORMAL: dashboard mês a mês ═══ */
            <>
              {/* Header de mês */}
              <View style={estilos.mesHeader}>
                <IconButton icon="chevron-left" iconColor={colors.onSurface} size={26} onPress={mesAnterior} />
                <Text style={[estilos.mesTexto, { color: colors.onSurface }]}>{labelMes}</Text>
                <IconButton
                  icon="chevron-right"
                  iconColor={colors.onSurface}
                  size={26}
                  onPress={proximoMes}
                />
              </View>

              <View style={estilos.miniCardsRow}>
                <Surface style={[estilos.miniCard, { backgroundColor: colors.surface }]} elevation={0}>
                  <Text style={[estilos.miniCardLabel, { color: colors.onSurfaceVariant }]}>
                    {ehMesAtual ? 'A pagar' : ehFuturo ? 'Previsão gastos' : 'Despesas'}
                  </Text>
                  <Text style={[estilos.miniCardValor, { color: custom.expense }]}>
                    {formatBRL(ehMesAtual ? aPagar : ehFuturo ? previsaoGastos : despesasDoMes)}
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
                    <MaterialCommunityIcons name="chart-donut" size={22} color={colors.primary} style={{ marginRight: 10 }} />
                    <Text style={[estilos.cardCategoriasTexto, { color: colors.onSurface }]}>
                      Gastos por categoria
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
                </View>
              </TouchableRipple>

              {/* Card — Controle de transporte */}
              <TouchableRipple
                onPress={() => navigation.navigate('Rides')}
                rippleColor="rgba(255,255,255,0.08)"
                style={[estilos.cardCategoriasWrapper, { backgroundColor: colors.surface }]}
              >
                <View style={estilos.cardCategoriasRow}>
                  <View style={estilos.cardCategoriasEsquerda}>
                    <MaterialCommunityIcons name="bus-school" size={22} color={colors.primary} style={{ marginRight: 10 }} />
                    <Text style={[estilos.cardCategoriasTexto, { color: colors.onSurface }]}>
                      Controle de transporte
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
                </View>
              </TouchableRipple>

              {transacoes.length === 0 ? (
                <Text style={[estilos.vazioTexto, { color: colors.onSurfaceVariant }]}>
                  Nenhuma transação ainda.{'\n'}Toque no + para começar.
                </Text>
              ) : transacoesDoMes.length === 0 ? (
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
                      {pendentesSorted.map((item) => renderTransacao(item))}
                    </View>
                  )}
                  {pagasSorted.length > 0 && (
                    <View style={estilos.secao}>
                      <Text style={[estilos.secaoTitulo, { color: colors.onSurfaceVariant }]}>
                        Pagas
                      </Text>
                      {pagasSorted.map((item) => renderTransacao(item))}
                    </View>
                  )}
                </>
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
  // ─── Filtros ───
  filtroBloco: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  buscaCampo: {
    marginBottom: 10,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  catsRow: {
    gap: 6,
    paddingRight: 8,
    marginBottom: 10,
  },
  chip: {
    marginBottom: 2,
  },
  linhaDupla: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  campoMetade: {
    flex: 1,
  },
  limparBtn: {
    alignSelf: 'flex-start',
    marginTop: -2,
  },
  // ─── Mês ───
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
  // ─── Resumo dos resultados ───
  resumo: {
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resumoContagem: {
    fontSize: 14,
    fontWeight: '700',
  },
  resumoValores: {
    alignItems: 'flex-end',
  },
  resumoValor: {
    fontSize: 13,
    fontWeight: 'bold',
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
