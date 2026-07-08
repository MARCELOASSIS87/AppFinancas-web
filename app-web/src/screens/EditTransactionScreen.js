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
} from 'react-native-paper';
import { DatePickerInput, registerTranslation, pt } from 'react-native-paper-dates';
import api from '../services/api';
import { showAlert, showConfirm } from '../utils/alert';

registerTranslation('pt', pt);

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

export default function EditTransactionScreen({ navigation, route }) {
  // ─── PRÉ-PREENCHIMENTO ────────────────────────────────────────────────────
  const transaction = route.params.transaction ?? route.params.transacao;
  const tipoInicial = transaction.category?.type ?? 'despesa';
  const valorInicial = String(transaction.amount ?? '').replace('.', ',');

  const [tipo, setTipo] = useState(tipoInicial);
  const [valor, setValor] = useState(valorInicial);
  const [descricao, setDescricao] = useState(transaction.description ?? '');
  const [categoria, setCategoria] = useState(null);   // resolvido após carregar lista
  const [data, setData] = useState(new Date(transaction.date));
  const [recorrente, setRecorrente] = useState(transaction.recorrente ?? 'variavel');
  const [status, setStatus] = useState(transaction.status ?? 'pago');
  const [categorias, setCategorias] = useState([]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const { colors, custom } = useTheme();
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function carregarCategorias() {
      try {
        const resposta = await api.get('/categories');
        const lista = resposta.data;
        setCategorias(lista);
        // resolve o objeto completo da categoria da transação
        const catInicial = lista.find((c) => c.id === transaction.category?.id) ?? null;
        setCategoria(catInicial);
      } catch {
        showAlert('Erro', 'Não foi possível carregar as categorias.');
      }
    }
    carregarCategorias();
  }, []);

  const categoriasFiltradas = categorias.filter((c) => c.type === tipo);
  // O tipo é fixo na edição (definido pela transação original); por isso não há
  // handleChangeTipo nem toggle — trocar o tipo mudaria a categoria e geraria
  // inconsistência. Para mudar o tipo, exclua e crie uma nova.

  // ─── PUT /transactions/:id ────────────────────────────────────────────────
  async function handleSalvar() {
    const valorNum = parseValor(valor);
    if (!valor || isNaN(valorNum) || valorNum <= 0 || !descricao.trim() || !categoria) {
      showAlert('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }
    setCarregando(true);
    try {
      await api.put(`/transactions/${transaction.id}`, {
        date: data.toISOString(),
        description: descricao.trim(),
        amount: valorNum,
        categoryId: categoria.id,
        // Receita não tem fixo/variável nem situação: sempre "variavel" e "pago".
        recorrente: tipo === 'receita' ? 'variavel' : recorrente,
        status: tipo === 'receita' ? 'pago' : status,
      });
      navigation.goBack();
    } catch (erro) {
      showAlert('Erro', erro.response?.data?.message || 'Não foi possível salvar as alterações.');
    } finally {
      setCarregando(false);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const ehRecorrente = !!transaction.recurringId;

  // ─── DELETE /transactions/:id (só esta ocorrência) ────────────────────────
  function handleExcluir() {
    showConfirm('Excluir transação', 'Tem certeza?', async () => {
      setCarregando(true);
      try {
        await api.delete(`/transactions/${transaction.id}`);
        navigation.goBack();
      } catch {
        showAlert('Erro', 'Não foi possível excluir a transação.');
      } finally {
        setCarregando(false);
      }
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ─── DELETE /recurring/:id (esta + todas as futuras pendentes) ────────────
  function handleExcluirRecorrencia() {
    showConfirm(
      'Excluir recorrência',
      'Isso vai remover esta transação e todas as futuras pendentes. Tem certeza?',
      async () => {
        setCarregando(true);
        try {
          await api.delete(`/recurring/${transaction.recurringId}`);
          navigation.goBack();
        } catch {
          showAlert('Erro', 'Não foi possível excluir a recorrência.');
        } finally {
          setCarregando(false);
        }
      }
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={[estilos.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={estilos.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Sem toggle de tipo: o tipo é fixo na edição (mantém o da transação). */}

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

            {/* Status */}
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

        {/* Botão Salvar */}
        <Button
          mode="contained"
          onPress={handleSalvar}
          disabled={carregando}
          contentStyle={estilos.botaoConteudo}
          style={estilos.botao}
          labelStyle={estilos.botaoLabel}
        >
          {carregando ? <ActivityIndicator color="#fff" size={20} /> : 'Salvar alterações'}
        </Button>

        {/* Exclusão — recorrente mostra as duas opções; avulsa, só uma. */}
        {ehRecorrente ? (
          <>
            <Button
              mode="outlined"
              onPress={handleExcluir}
              disabled={carregando}
              contentStyle={estilos.botaoConteudo}
              style={[estilos.botaoExcluir, { borderColor: custom.expense }]}
              labelStyle={[estilos.botaoLabel, { color: custom.expense }]}
            >
              Excluir só esta
            </Button>

            <Button
              mode="contained"
              onPress={handleExcluirRecorrencia}
              disabled={carregando}
              contentStyle={estilos.botaoConteudo}
              style={[estilos.botaoExcluirFuturas, { backgroundColor: custom.expense }]}
              labelStyle={[estilos.botaoLabel, { color: '#fff' }]}
            >
              Excluir esta e futuras
            </Button>
          </>
        ) : (
          <Button
            mode="outlined"
            onPress={handleExcluir}
            disabled={carregando}
            contentStyle={estilos.botaoConteudo}
            style={[estilos.botaoExcluir, { borderColor: custom.expense }]}
            labelStyle={[estilos.botaoLabel, { color: custom.expense }]}
          >
            Excluir transação
          </Button>
        )}

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
                  rippleColor="rgba(255,255,255,0.08)"
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
  botao: {
    marginTop: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  botaoExcluir: {
    borderRadius: 8,
    borderWidth: 1.5,
  },
  botaoExcluirFuturas: {
    borderRadius: 8,
    marginTop: 12,
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
