import { adicionarPergunta, listarPalestras, Palestra } from '@/services/palestraService';
import { erro, sucesso } from '@/utils/notify';
import { useEffect, useState } from 'react';
import {
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function CadastroPerguntas() {
    const [pergunta, setPergunta] = useState('');
    const [alternativas, setAlternativas] = useState(['', '', '', '']);
    const [corretas, setCorretas] = useState<number[]>([]);
    const [salvando, setSalvando] = useState(false);

    const [palestras, setPalestras] = useState<Palestra[]>([]);
    const [palestraSelecionada, setPalestraSelecionada] =
        useState<Palestra | null>(null);

    const [modalPalestras, setModalPalestras] = useState(false);
    const [carregandoPalestras, setCarregandoPalestras] = useState(true);

    useEffect(() => {
        carregarPalestras();
    }, []);

    const carregarPalestras = async () => {
        try {
            setCarregandoPalestras(true);

            const lista = await listarPalestras();

            setPalestras(lista);
        } catch (error) {
            erro('Erro', 'Não foi possível carregar as palestras.');
        } finally {
            setCarregandoPalestras(false);
        }
    };

    const atualizarAlternativa = (texto: string, index: number) => {
        const novasAlternativas = [...alternativas];
        novasAlternativas[index] = texto;
        setAlternativas(novasAlternativas);
    };

    const limparFormulario = () => {
        setPergunta('');
        setAlternativas(['', '', '', '']);
        setCorretas([]);
    };

    const alternarCorreta = (index: number) => {
    setCorretas((atuais) => {
        if (atuais.includes(index)) {
            return atuais.filter((i) => i !== index);
        }

        return [...atuais, index];
    });
};

    const cadastrarPergunta = async () => {
        if (!palestraSelecionada || palestraSelecionada.id === undefined) {
            erro('Atenção', 'Selecione uma palestra válida.');
            return;
        }
        
        if (!pergunta.trim()) {
            erro('Atenção', 'Digite o enunciado da pergunta.');
            return;
        }

        if (alternativas.some((alternativa) => !alternativa.trim())) {
            erro('Atenção', 'Preencha as quatro alternativas.');
            return;
        }

        if (corretas.length === 0) {
            erro('Atenção', 'Selecione pelo menos uma alternativa correta.');
            return;
        }

        try {
            setSalvando(true);
            const perguntaSalva = await adicionarPergunta(palestraSelecionada.id, {
                enunciado: pergunta.trim(),
                    ativo: true,
                    palestra: {
                        id: palestraSelecionada.id,
                    },
                    alternativas: alternativas.map((texto, index) => ({
                        texto: texto.trim(),
                        correta: corretas.includes(index),
                    })),
            });

            if (!perguntaSalva.id) {
                throw new Error(
                    'A API não retornou o ID da pergunta criada.'
                );
            }

            sucesso(
                'Pergunta cadastrada!',
                'A pergunta foi adicionada com sucesso.'
            );
        } finally {
            setSalvando(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.conteudo}>

                {/* Logo */}
                <View style={styles.logo}>
                    <View style={styles.logoIcon}>
                        <Text style={styles.logoTexto}>✦</Text>
                    </View>

                    <Text style={styles.titulo}>
                        Cadastro de perguntas
                    </Text>
                </View>

                {/* Card */}
                <View style={styles.card}>

                    <View style={styles.seletorContainer}>
                        <Text style={styles.label}>
                            Selecionar palestra
                        </Text>

                        <TouchableOpacity
                            style={styles.seletor}
                            onPress={() => setModalPalestras(true)}
                            disabled={carregandoPalestras || salvando}
                        >
                            <Text style={styles.textoSeletor}>
                                {carregandoPalestras
                                    ? 'Carregando palestras...'
                                    : palestraSelecionada
                                        ? palestraSelecionada.nome
                                        : 'Selecione uma palestra'}
                            </Text>

                            <Text style={styles.seta}>
                                ▼
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitulo}>
                        Nova pergunta
                    </Text>

                    {/* Enunciado */}
                    <View style={styles.campo}>
                        <Text style={styles.label}>
                            Enunciado da pergunta
                        </Text>

                        <TextInput
                            style={styles.textarea}
                            placeholder="Digite o enunciado da pergunta..."
                            placeholderTextColor="#8B949E"
                            value={pergunta}
                            onChangeText={setPergunta}
                            multiline
                            editable={!salvando}
                        />
                    </View>

                    {/* Alternativas */}
                    <View style={styles.alternativasContainer}>

                        <Text style={styles.label}>
                            Alternativas
                        </Text>

                        {alternativas.map((alternativa, index) => (
                            <View style={styles.alternativa} key={index}>

                                <TextInput
                                    style={styles.inputAlternativa}
                                    placeholder={`Digite a ${
                                        index === 0
                                            ? 'primeira'
                                            : index === 1
                                                ? 'segunda'
                                                : index === 2
                                                    ? 'terceira'
                                                    : 'quarta'
                                    } alternativa...`}
                                    placeholderTextColor="#8B949E"
                                    value={alternativa}
                                    onChangeText={(texto) =>
                                        atualizarAlternativa(texto, index)
                                    }
                                    editable={!salvando}
                                />


                                <TouchableOpacity
                                    style={styles.corretamente}
                                    onPress={() => alternarCorreta(index)}
                                    disabled={salvando}
                                >
                                    <View
                                        style={[
                                            styles.checkbox,
                                            corretas.includes(index) && styles.checkboxSelecionado,
                                        ]}
                                    >
                                        {corretas.includes(index) && (
                                            <Text style={styles.check}>✓</Text>
                                        )}
                                    </View>

                                    <Text style={styles.textoCorreta}>
                                        Correta
                                    </Text>
                                </TouchableOpacity>

                            </View>
                        ))}

                        <Text style={styles.hint}>
                            Selecione apenas uma ou mais alternativas como correta.
                        </Text>

                    </View>

                    {/* Botão */}
                    <TouchableOpacity
                        style={[
                            styles.botao,
                            salvando && styles.botaoDesabilitado,
                        ]}
                        onPress={cadastrarPergunta}
                        disabled={salvando}
                    >
                        <Text style={styles.textoBotao}>
                            {salvando
                                ? 'Cadastrando...'
                                : 'Adicionar pergunta'}
                        </Text>
                    </TouchableOpacity>

                </View>

                {/* Rodapé */}
                <Text style={styles.footer}>
                    Cadastre uma nova pergunta para o seu quiz
                </Text>

            </View>
            <Modal
                visible={modalPalestras}
                transparent
                animationType="fade"
                onRequestClose={() => setModalPalestras(false)}
            >
                <View style={styles.modalFundo}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitulo}>
                            Selecionar palestra
                        </Text>

                        {palestras.map((palestra) => (
                            <TouchableOpacity
                                key={palestra.id}
                                style={styles.opcaoPalestra}
                                onPress={() => {
                                    setPalestraSelecionada(palestra);
                                    setModalPalestras(false);
                                }}
                            >
                                <Text style={styles.textoOpcao}>
                                    {palestra.nome}
                                </Text>
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity
                            style={styles.botaoCancelar}
                            onPress={() => setModalPalestras(false)}
                        >
                            <Text style={styles.textoCancelar}>
                                Cancelar
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D1117',
    },

    conteudo: {
        flex: 1,
        width: '100%',
        maxWidth: 650,
        alignSelf: 'center',
        padding: 24,
        justifyContent: 'center',
    },

    /* Logo */

    logo: {
        alignItems: 'center',
        marginBottom: 24,
    },

    logoIcon: {
        width: 48,
        height: 48,
        marginBottom: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7B1B38',
        borderRadius: 24,
    },

    logoTexto: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },

    titulo: {
        fontSize: 24,
        fontWeight: '400',
        color: '#E6EDF3',
    },

    /* Card */

    card: {
        padding: 24,
        backgroundColor: '#0D1117',
        borderWidth: 1,
        borderColor: '#7B1B38',
        borderRadius: 8,

        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.35,
        shadowRadius: 24,

        elevation: 8,
    },

    subtitulo: {
        marginBottom: 20,
        fontSize: 20,
        fontWeight: '400',
        color: '#E6EDF3',
    },

    /* Campos */

    campo: {
        marginBottom: 18,
    },

    label: {
        marginBottom: 6,
        fontSize: 14,
        fontWeight: '600',
        color: '#E6EDF3',
    },

    textarea: {
        width: '100%',
        minHeight: 90,
        paddingHorizontal: 12,
        paddingVertical: 10,

        backgroundColor: '#0D1117',
        color: '#E6EDF3',

        borderWidth: 1,
        borderColor: '#7B1B38',
        borderRadius: 6,

        fontSize: 14,
        textAlignVertical: 'top',
    },

    /* Alternativas */

    alternativasContainer: {
        marginTop: 4,
    },

    alternativa: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },

    inputAlternativa: {
        flex: 1,
        height: 40,
        paddingHorizontal: 12,

        backgroundColor: '#0D1117',
        color: '#E6EDF3',

        borderWidth: 1,
        borderColor: '#7B1B38',
        borderRadius: 6,

        fontSize: 14,
    },

    corretamente: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10,
    },

    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#7B1B38',
        alignItems: 'center',
        justifyContent: 'center',
    },

    checkboxSelecionado: {
        backgroundColor: '#A52A4F',
        borderColor: '#A52A4F',
    },

    check: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },

    textoCorreta: {
        marginLeft: 6,
        fontSize: 13,
        fontWeight: '400',
        color: '#8B949E',
    },

    hint: {
        marginTop: 5,
        fontSize: 12,
        color: '#8B949E',
    },

    /* Botão */

    botao: {
        width: '100%',
        height: 40,
        marginTop: 8,

        alignItems: 'center',
        justifyContent: 'center',

        backgroundColor: '#7B1B38',
        borderRadius: 6,
    },

    botaoDesabilitado: {
        opacity: 0.6,
    },

    textoBotao: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },

    /* Footer */

    footer: {
        marginTop: 24,
        textAlign: 'center',
        fontSize: 12,
        color: '#8B949E',
    },

    seletorContainer: {
        marginBottom: 20,
    },

    seletor: {
        height: 40,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',

        backgroundColor: '#0D1117',
        borderWidth: 1,
        borderColor: '#7B1B38',
        borderRadius: 6,
    },

    textoSeletor: {
        color: '#E6EDF3',
        fontSize: 14,
    },

    seta: {
        color: '#8B949E',
        fontSize: 12,
    },

    modalFundo: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },

    modal: {
        width: '100%',
        maxWidth: 500,
        backgroundColor: '#0D1117',
        borderWidth: 1,
        borderColor: '#7B1B38',
        borderRadius: 8,
        padding: 20,
    },

    modalTitulo: {
        fontSize: 20,
        color: '#E6EDF3',
        marginBottom: 16,
        fontWeight: '600',
    },

    opcaoPalestra: {
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#30363D',
    },

    textoOpcao: {
        color: '#E6EDF3',
        fontSize: 14,
    },

    botaoCancelar: {
        marginTop: 16,
        paddingVertical: 12,
        alignItems: 'center',
    },

    textoCancelar: {
        color: '#A52A4F',
        fontSize: 14,
        fontWeight: '600',
    },
});
