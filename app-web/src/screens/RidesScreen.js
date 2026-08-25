import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Surface,
  IconButton,
  ActivityIndicator,
  useTheme,
  SegmentedButtons,
  TextInput,
  Button,
  Portal,
  Modal,
  TouchableRipple,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';
import { showAlert, showConfirm } from '../utils/alert';

const MOTORISTAS = ['Teinha', 'Arnaldo'];
const PERIODOS = [
  { valor: 'manha', label: 'Manhã' },
  { valor: 'tarde', label: 'Tarde' },
];
const DIAS_UTEIS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

const VALORES = {
  manha: { normal: 10, especial: 20, nao_foi: 0 },
  tarde: { normal: 15, especial: 20, nao_foi: 0 },
};

function formatBRL(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateBR(date) {
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
}

// Retorna { start: Date (segunda), end: Date (sexta) } da semana que contém `date`.
function getWeekRange(date) {
  const diaSemana = date.getDay(); // 0=dom ... 6=sáb
  const deltaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() + deltaSegunda);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 4);
  return { start, end };
}

function valorDaCorrida(rides, dia, motorista, periodo) {
  const dataISO = formatDateISO(dia);
  return rides.find(
    (r) => r.date?.slice(0, 10) === dataISO && r.driver === motorista && r.period === periodo
  );
}

export default function RidesScreen({ navigation }) {
  const [semanaRef, setSemanaRef] = useState(new Date());
  const [rides, setRides] = useState([]);
  const [resumo, setResumo] = useState({});
  const [carregando, setCarregando] = useState(true);

  const [modalVisivel, setModalVisivel] = useState(false);
  const [slotAtual, setSlotAtual] = useState(null); // { date, driver, period, ride? }
  const [tipoForm, setTipoForm] = useState('normal');
  const [trajetoForm, setTrajetoForm] = useState('');
  const [salvando, setSalvando] = useState(false);

  const { colors, custom } = useTheme();
  const insets = useSafeAreaInsets();

  const { start, end } = getWeekRange(semanaRef);

  useFocusEffect(
    useCallback(() => {
      carregar();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [semanaRef])
  );

  async function carregar() {
    setCarregando(true);
    const startStr = formatDateISO(start);
    const endStr = formatDateISO(end);
    try {
      const [ridesResp, resumoResp] = await Promise.all([
        api.get('/rides', { params: { start: startStr, end: endStr } }),
        api.get('/rides/week-summary', { params: { start: startStr, end: endStr } }),
      ]);
      setRides(ridesResp.data);
      setResumo(resumoResp.data);
    } catch {
      setRides([]);
      setResumo({});
    } finally {
      setCarregando(false);
    }
  }

  function semanaAnterior() {
    setSemanaRef((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7));
  }
  function proximaSemana() {
    setSemanaRef((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7));
  }

  function abrirModal(dia, motorista, periodo, ride) {
    setSlotAtual({ date: dia, driver: motorista, period: periodo, ride: ride || null });
    setTipoForm(ride?.type || 'normal');
    setTrajetoForm(ride?.route || '');
    setModalVisivel(true);
  }

  function fecharModal() {
    setModalVisivel(false);
    setSlotAtual(null);
  }

  const valorCalculado = slotAtual ? VALORES[slotAtual.period][tipoForm] : 0;

  async function handleSalvar() {
    if (!slotAtual) return;
    setSalvando(true);
    try {
      const payload = {
        date: formatDateISO(slotAtual.date),
        driver: slotAtual.driver,
        period: slotAtual.period,
        type: tipoForm,
        route: tipoForm === 'especial' ? trajetoForm.trim() : undefined,
      };
      if (slotAtual.ride) {
        await api.put(`/rides/${slotAtual.ride.id}`, payload);
      } else {
        await api.post('/rides', payload);
      }
      fecharModal();
      carregar();
    } catch (erro) {
      showAlert('Erro', erro.response?.data?.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  function handleExcluir() {
    if (!slotAtual?.ride) return;
    showConfirm('Excluir corrida', 'Tem certeza?', async () => {
      try {
        await api.delete(`/rides/${slotAtual.ride.id}`);
        fecharModal();
        carregar();
      } catch (erro) {
        showAlert('Erro', erro.response?.data?.message || 'Não foi possível excluir.');
      }
    });
  }

  function renderSlot(dia, motorista, periodo) {
    const ride = valorDaCorrida(rides, dia, motorista, periodo);
    const periodoLabel = PERIODOS.find((p) => p.valor === periodo)?.label;

    if (!ride) {
      return (
        <TouchableRipple
          key={`${motorista}-${periodo}`}
          onPress={() => abrirModal(dia, motorista, periodo, null)}
          rippleColor="rgba(255,255,255,0.08)"
          style={[estilos.slot, { backgroundColor: colors.surface }]}
        >
          <View style={estilos.slotRow}>
            <Text style={[estilos.slotLabel, { color: colors.onSurfaceVariant }]}>
              {motorista} · {periodoLabel}
            </Text>
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color={colors.onSurfaceVariant} />
          </View>
        </TouchableRipple>
      );
    }

    const naoFoi = ride.type === 'nao_foi';

    return (
      <TouchableRipple
        key={`${motorista}-${periodo}`}
        onPress={() => abrirModal(dia, motorista, periodo, ride)}
        rippleColor="rgba(255,255,255,0.08)"
        style={[estilos.slot, { backgroundColor: colors.surface }]}
      >
        <View style={estilos.slotRow}>
          <View style={estilos.slotEsquerda}>
            <MaterialCommunityIcons
              name={naoFoi ? 'close-circle' : 'check-circle'}
              size={20}
              color={naoFoi ? colors.onSurfaceVariant : custom.income}
              style={{ marginRight: 8 }}
            />
            <View>
              <Text style={[estilos.slotLabel, { color: colors.onSurface }]}>
                {motorista} · {periodoLabel}
              </Text>
              {naoFoi ? (
                <Text style={[estilos.slotSub, { color: colors.onSurfaceVariant }]}>Não foi</Text>
              ) : ride.type === 'especial' && ride.route ? (
                <Text style={[estilos.slotSub, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                  {ride.route}
                </Text>
              ) : null}
            </View>
          </View>
          {!naoFoi && (
            <Text style={[estilos.slotValor, { color: custom.income }]}>
              {formatBRL(parseFloat(ride.amount) || VALORES[periodo][ride.type] || 0)}
            </Text>
          )}
        </View>
      </TouchableRipple>
    );
  }

  return (
    <View style={[estilos.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={estilos.header}>
        <IconButton
          icon="arrow-left"
          iconColor={colors.onSurface}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={[estilos.headerTitulo, { color: colors.onSurface }]}>
          Controle de transporte
        </Text>
        <View style={{ width: 48 }} />
      </View>

      {carregando ? (
        <View style={estilos.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ ...estilos.scroll, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header da semana */}
          <View style={estilos.semanaHeader}>
            <IconButton icon="chevron-left" iconColor={colors.onSurface} size={26} onPress={semanaAnterior} />
            <Text style={[estilos.semanaTexto, { color: colors.onSurface }]}>
              {formatDateBR(start)} a {formatDateBR(end)}
            </Text>
            <IconButton icon="chevron-right" iconColor={colors.onSurface} size={26} onPress={proximaSemana} />
          </View>

          {/* Cards de resumo por motorista */}
          <View style={estilos.miniCardsRow}>
            {MOTORISTAS.map((motorista) => (
              <Surface
                key={motorista}
                style={[estilos.miniCard, { backgroundColor: colors.surface }]}
                elevation={0}
              >
                <Text style={[estilos.miniCardLabel, { color: colors.onSurfaceVariant }]}>
                  {motorista}
                </Text>
                <Text style={[estilos.miniCardValor, { color: custom.income }]}>
                  {formatBRL(resumo[motorista]?.total || 0)}
                </Text>
                <Text style={[estilos.miniCardSub, { color: colors.onSurfaceVariant }]}>
                  {resumo[motorista]?.rides || 0} {resumo[motorista]?.rides === 1 ? 'corrida' : 'corridas'}
                </Text>
              </Surface>
            ))}
          </View>

          {/* Lista da semana, dia a dia */}
          {DIAS_UTEIS.map((nomeDia, idx) => {
            const dia = new Date(start.getFullYear(), start.getMonth(), start.getDate() + idx);
            return (
              <View key={nomeDia} style={estilos.secao}>
                <Text style={[estilos.secaoTitulo, { color: colors.onSurfaceVariant }]}>
                  {nomeDia} · {formatDateBR(dia)}
                </Text>
                {MOTORISTAS.map((motorista) =>
                  PERIODOS.map((periodo) => renderSlot(dia, motorista, periodo.valor))
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Modal de lançamento */}
      <Portal>
        <Modal
          visible={modalVisivel}
          onDismiss={fecharModal}
          contentContainerStyle={[estilos.modal, { backgroundColor: colors.surface }]}
        >
          {slotAtual && (
            <>
              <Text style={[estilos.modalTitulo, { color: colors.onSurface }]}>
                {slotAtual.ride ? 'Editar corrida' : 'Nova corrida'}
              </Text>

              <TextInput
                label="Data"
                value={formatDateBR(slotAtual.date)}
                mode="outlined"
                editable={false}
                left={<TextInput.Icon icon="calendar" />}
                style={estilos.campo}
              />

              <TextInput
                label="Motorista"
                value={slotAtual.driver}
                mode="outlined"
                editable={false}
                left={<TextInput.Icon icon="account" />}
                style={estilos.campo}
              />

              <TextInput
                label="Período"
                value={PERIODOS.find((p) => p.valor === slotAtual.period)?.label || ''}
                mode="outlined"
                editable={false}
                left={<TextInput.Icon icon="clock-outline" />}
                style={estilos.campo}
              />

              <Text style={[estilos.labelSecao, { color: colors.onSurfaceVariant }]}>Tipo</Text>
              <SegmentedButtons
                value={tipoForm}
                onValueChange={setTipoForm}
                buttons={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'especial', label: 'Especial' },
                  { value: 'nao_foi', label: 'Não foi' },
                ]}
                style={estilos.segmentado}
              />

              {tipoForm === 'especial' && (
                <TextInput
                  label="Trajeto"
                  value={trajetoForm}
                  onChangeText={setTrajetoForm}
                  mode="outlined"
                  placeholder="Ex: Casa - Josi - Ataíde"
                  left={<TextInput.Icon icon="map-marker-path" />}
                  style={estilos.campo}
                />
              )}

              <View style={[estilos.valorBox, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[estilos.valorBoxLabel, { color: colors.onSurfaceVariant }]}>Valor</Text>
                <Text style={[estilos.valorBoxValor, { color: custom.income }]}>
                  {formatBRL(valorCalculado)}
                </Text>
              </View>

              <Button
                mode="contained"
                onPress={handleSalvar}
                disabled={salvando}
                contentStyle={estilos.botaoConteudo}
                style={estilos.botao}
                labelStyle={estilos.botaoLabel}
              >
                {salvando ? <ActivityIndicator color="#fff" size={20} /> : 'Salvar'}
              </Button>

              {slotAtual.ride && (
                <Button
                  mode="outlined"
                  onPress={handleExcluir}
                  disabled={salvando}
                  textColor={custom.expense}
                  style={[estilos.botaoExcluir, { borderColor: custom.expense }]}
                  contentStyle={estilos.botaoConteudo}
                >
                  Excluir
                </Button>
              )}
            </>
          )}
        </Modal>
      </Portal>
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
  semanaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  semanaTexto: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  miniCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  miniCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
  },
  miniCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  miniCardValor: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  miniCardSub: {
    fontSize: 11,
  },
  secao: {
    marginBottom: 16,
  },
  secaoTitulo: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  slot: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  slotEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  slotLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  slotSub: {
    fontSize: 12,
    marginTop: 2,
  },
  slotValor: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  modal: {
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  campo: {
    marginBottom: 14,
  },
  labelSecao: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    fontWeight: '600',
  },
  segmentado: {
    marginBottom: 14,
  },
  valorBox: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  valorBoxLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  valorBoxValor: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  botao: {
    borderRadius: 8,
  },
  botaoExcluir: {
    marginTop: 10,
    borderRadius: 8,
  },
  botaoConteudo: {
    paddingVertical: 6,
  },
  botaoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
