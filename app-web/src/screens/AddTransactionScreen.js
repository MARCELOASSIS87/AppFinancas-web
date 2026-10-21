import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  useTheme,
  ActivityIndicator,
  Portal,
  Modal,
  List,
  TouchableRipple,
  Chip,
} from 'react-native-paper';
import { DatePickerInput, registerTranslation, pt } from 'react-native-paper-dates';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';
import { showAlert } from '../utils/alert';

registerTranslation('pt', pt);

const OPCOES_TIPO = [
  { valor: 'despesa', label: 'Despesa', icon: 'arrow-down-bold-circle-outline' },
  { valor: 'receita', label: 'Receita', icon: 'arrow-up-bold-circle-outline' },
];

function ToggleTipo({ tipo, onChange, colors, custom }) {
  return (
    <View style={estilos.toggleTipoRow}>
      {OPCOES_TIPO.map((opcao) => {
        const selecionado = tipo === opcao.valor;
        const cor = opcao.valor === 'despesa' ? custom.expense : custom.income;
        return (
          <TouchableRipple
            key={opcao.valor}
            onPress={() => onChange(opcao.valor)}
            rippleColor={custom.ripple}
            style={[
              estilos.toggleTipoBtn,
              {
                backgroundColor: selecionado ? `${cor}26` : colors.surfaceVariant,
                borderColor: selecionado ? cor : colors.outline,
              },
            ]}
          >
            <View style={estilos.toggleTipoConteudo}>
              <MaterialCommunityIcons
                name={opcao.icon}
                size={18}
                color={selecionado ? cor : colors.onSurfaceVariant}
                style={estilos.toggleTipoIcone}
              />
              <Text
                style={[
                  estilos.toggleTipoLabel,
                  { color: selecionado ? cor : colors.onSurfaceVariant },
                ]}
              >
                {opcao.label}
              </Text>
            </View>
          </TouchableRipple>
        );
      })}
    </View>
  );
}

// 0=domingo ... 6=sábado (mesma convenção do backend)
const DIAS_SEMANA = [
  { valor: 0, label: 'Dom' },
  { valor: 1, label: 'Seg' },
  { valor: 2, label: 'Ter' },
  { valor: 3, label: 'Qua' },
  { valor: 4, label: 'Qui' },
  { valor: 5, label: 'Sex' },
  { valor: 6, label: 'Sáb' },
];

function parseValor(str) {
  const limpo = str.replace(/[^\d.,]/g, '');
  const ultimaVirgula = limpo.lastIndexOf(',');
  const ultimoPonto = limpo.lastIndexOf('.');
  const posDecimal = Math.max(ultimaVirgula, ultimoPonto);
  if (posDecimal === -1) return parseFloat(limpo) || 0;
  const inteiro = limpo.slice(0, posDecimal).replace(/[.,]/g, '');
  const decimal = limpo.slice(posDecimal + 1);
  return parseFloat(`${inteiro}.${decimal}`) || 0;
}

export default function AddTransactionScreen({ navigation }) {
  const [tipo, setTipo] = useState('despesa');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState(null);
  const [data, setData] = useState(new Date());
  const [recorrente, setRecorrente] = useState('variavel');
  const [status, setStatus] = useState('pago');
  // Recorrência (só usada em despesa fixa)
  const [frequencia, setFrequencia] = useState('mensal');
  const [diaDoMes, setDiaDoMes] = useState('');
  const [diaDaSemana, setDiaDaSemana] = useState(1);
  const [categorias, setCategorias] = useState([]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const { colors, custom } = useTheme();

  useEffect(() => {
    async function carregarCategorias() {
      try {
        const resposta = await api.get('/categories');
        setCategorias(resposta.data);
      } catch {
        showAlert('Erro', 'Não foi possível carregar as categorias.');
      }
    }
    carregarCategorias();
  }, []);

  const categoriasFiltradas = categorias.filter((c) => c.type === tipo);

  function handleChangeTipo(novoTipo) {
    setTipo(novoTipo);
    // Em ambos os sentidos reseta a categoria; ao voltar pra despesa
    // restaura os campos extras nos valores padrão.
    setCategoria(null);
    setRecorrente('variavel');
    setStatus('pago');
  }

  async function handleSalvar() {
    const valorNum = parseValor(valor);
    if (!valor || isNaN(valorNum) || valorNum <= 0 || !descricao.trim() || !categoria) {
      showAlert('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }

    // Despesa fixa = recorrência: vai pro endpoint /recurring.
    const ehDespesaFixa = tipo === 'despesa' && recorrente === 'fixo';

    // Validação extra: recorrência mensal exige um dia do mês válido (1-31).
    // (Na semanal o diaDaSemana já tem default selecionado.)
    if (ehDespesaFixa && frequencia === 'mensal') {
      const dia = Number(diaDoMes);
      if (!diaDoMes || isNaN(dia) || dia < 1 || dia > 31) {
        showAlert('Atenção', 'Informe um dia do mês válido (1 a 31).');
        return;
      }
    }

    setCarregando(true);
    try {
      if (ehDespesaFixa) {
        // ─── POST /recurring (gera 12 meses no backend) ───
        await api.post('/recurring', {
          description: descricao.trim(),
          amount: valorNum,
          categoryId: categoria.id,
          frequency: frequencia,
          dayOfMonth: frequencia === 'mensal' ? Number(diaDoMes) : null,
          dayOfWeek: frequencia === 'semanal' ? diaDaSemana : null,
          startDate: data.toISOString(),
        });
        showAlert('Despesa fixa criada!', 'Foram gerados os próximos 12 meses.');
        navigation.goBack();
      } else {
        // ─── POST /transactions (lançamento único: variável ou receita) ───
        await api.post('/transactions', {
          date: data.toISOString(),
          description: descricao.trim(),
          amount: valorNum,
          categoryId: categoria.id,
          // Receita não tem campos de fixo/variável nem situação:
          // são sempre "variavel" e "pago".
          recorrente: tipo === 'receita' ? 'variavel' : recorrente,
          status: tipo === 'receita' ? 'pago' : status,
        });
        navigation.goBack();
      }
    } catch (erro) {
      showAlert('Erro', erro.response?.data?.message || 'Não foi possível salvar.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={[estilos.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={estilos.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Toggle Despesa / Receita */}
        <ToggleTipo tipo={tipo} onChange={handleChangeTipo} colors={colors} custom={custom} />

        {/* Valor */}
        <TextInput
          label="Valor"
          value={valor}
          onChangeText={setValor}
          mode="outlined"
          keyboardType="decimal-pad"
          left={<TextInput.Affix text="R$" />}
          style={estilos.campoValor}
          contentStyle={estilos.campoValorTexto}
        />

        {/* Descrição */}
        <TextInput
          label="Descrição"
          value={descricao}
          onChangeText={setDescricao}
          mode="outlined"
          left={<TextInput.Icon icon="text" />}
          style={estilos.campo}
        />

        {/* Categoria — abre modal */}
        <Pressable onPress={() => setModalVisivel(true)}>
          <View pointerEvents="none">
            <TextInput
              label="Categoria"
              value={categoria?.name || ''}
              mode="outlined"
              editable={false}
              placeholder="Selecione a categoria"
              left={<TextInput.Icon icon="shape" />}
              right={<TextInput.Icon icon="chevron-down" />}
              style={estilos.campo}
            />
          </View>
        </Pressable>

        {/* Data */}
        <DatePickerInput
          locale="pt"
          label="Data"
          value={data}
          onChange={(d) => d && setData(d)}
          inputMode="start"
          mode="outlined"
          style={estilos.campo}
        />

        {/* Campos exclusivos de DESPESA: Fixo/Variável + Situação.
            Receita não exibe nenhum dos dois. */}
        {tipo === 'despesa' && (
          <>
            {/* Recorrente */}
            <Text style={[estilos.labelSecao, { color: colors.onSurfaceVariant }]}>
              Tipo de gasto
            </Text>
            <SegmentedButtons
              value={recorrente}
              onValueChange={setRecorrente}
              buttons={[
                { value: 'fixo', label: 'Fixo' },
                { value: 'variavel', label: 'Variável' },
              ]}
              style={estilos.segmentado}
            />

            {/* ─── RECORRÊNCIA: só quando despesa + fixo ─── */}
            {recorrente === 'fixo' && (
              <>
                <Text style={[estilos.labelSecao, { color: colors.onSurfaceVariant }]}>
                  Frequência
                </Text>
                <SegmentedButtons
                  value={frequencia}
                  onValueChange={setFrequencia}
                  buttons={[
                    { value: 'mensal', label: 'Mensal' },
                    { value: 'semanal', label: 'Semanal' },
                  ]}
                  style={estilos.segmentado}
                />

                {frequencia === 'mensal' ? (
                  <TextInput
                    label="Dia do mês"
                    value={diaDoMes}
                    onChangeText={(t) => setDiaDoMes(t.replace(/[^\d]/g, ''))}
                    mode="outlined"
                    keyboardType="number-pad"
                    placeholder="Ex: 10"
                    left={<TextInput.Icon icon="calendar-month" />}
                    style={estilos.campo}
                  />
                ) : (
                  <>
                    <Text style={[estilos.labelSecao, { color: colors.onSurfaceVariant }]}>
                      Dia da semana
                    </Text>
                    <View style={estilos.diasSemanaRow}>
                      {DIAS_SEMANA.map((dia) => {
                        const selecionado = diaDaSemana === dia.valor;
                        return (
                          <Chip
                            key={dia.valor}
                            selected={selecionado}
                            showSelectedCheck={false}
                            onPress={() => setDiaDaSemana(dia.valor)}
                            style={[
                              estilos.diaChip,
                              selecionado && { backgroundColor: colors.primaryContainer },
                            ]}
                            textStyle={{
                              color: selecionado ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                            }}
                          >
                            {dia.label}
                          </Chip>
                        );
                      })}
                    </View>
                  </>
                )}
              </>
            )}

            {/* Status — só na despesa variável. Na fixa o backend gera as
                ocorrências como pendentes, então não faz sentido escolher. */}
            {recorrente !== 'fixo' && (
              <>
                <Text style={[estilos.labelSecao, { color: colors.onSurfaceVariant }]}>
                  Situação
                </Text>
                <SegmentedButtons
                  value={status}
                  onValueChange={setStatus}
                  buttons={[
                    { value: 'pago', label: 'Pago' },
                    { value: 'pendente', label: 'Pendente' },
                  ]}
                  style={estilos.segmentado}
                />
              </>
            )}
          </>
        )}

        {/* Botão Salvar */}
        <Button
          mode="contained"
          onPress={handleSalvar}
          disabled={carregando}
          contentStyle={estilos.botaoConteudo}
          style={estilos.botao}
          labelStyle={estilos.botaoLabel}
        >
          {carregando ? <ActivityIndicator color="#fff" size={20} /> : 'Salvar'}
        </Button>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal de categorias */}
      <Portal>
        <Modal
          visible={modalVisivel}
          onDismiss={() => setModalVisivel(false)}
          contentContainerStyle={[estilos.modal, { backgroundColor: colors.surface }]}
        >
          <Text style={[estilos.modalTitulo, { color: colors.onSurface }]}>
            Escolha a categoria
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={estilos.modalLista}>
            {categoriasFiltradas.length === 0 ? (
              <Text style={[estilos.modalVazio, { color: colors.onSurfaceVariant }]}>
                Nenhuma categoria disponível.
              </Text>
            ) : (
              categoriasFiltradas.map((cat) => (
                <TouchableRipple
                  key={cat.id}
                  onPress={() => {
                    setCategoria(cat);
                    setModalVisivel(false);
                  }}
                  rippleColor={custom.ripple}
                >
                  <List.Item
                    title={cat.name}
                    titleStyle={{ color: colors.onSurface }}
                    left={(props) => (
                      <List.Icon
                        {...props}
                        icon="shape"
                        color={
                          categoria?.id === cat.id ? colors.primary : colors.onSurfaceVariant
                        }
                      />
                    )}
                    style={[
                      estilos.modalItem,
                      categoria?.id === cat.id && { backgroundColor: colors.surfaceVariant },
                    ]}
                  />
                </TouchableRipple>
              ))
            )}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
  },
  segmentado: {
    marginBottom: 20,
  },
  toggleTipoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  toggleTipoBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  toggleTipoConteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  toggleTipoIcone: {
    marginRight: 8,
  },
  toggleTipoLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  campoValor: {
    marginBottom: 16,
  },
  campoValorTexto: {
    fontSize: 24,
  },
  campo: {
    marginBottom: 16,
  },
  labelSecao: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    fontWeight: '600',
  },
  diasSemanaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  diaChip: {
    marginBottom: 4,
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
  },
  modal: {
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  modalLista: {
    flexGrow: 0,
  },
  modalItem: {
    borderRadius: 8,
  },
  modalVazio: {
    textAlign: 'center',
    padding: 24,
    fontSize: 14,
  },
});
