import { adicionarPergunta } from '@/services/palestraService';
import { erro, sucesso } from '@/utils/notify';
import { useState } from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const PALESTRA_ID = 1;

export default function CadastroPerguntas() {
    const [pergunta, setPergunta] = useState('');
    const [alternativas, setAlternativas] = useState(['', '', '', '']);
    const [correta, setCorreta] = useState<number | null>(null);
    const [salvando, setSalvando] = useState(false);

    const atualizarAlternativa = (texto: string, index: number) => {
        const novasAlternativas = [...alternativas];
        novasAlternativas[index] = texto;
        setAlternativas(novasAlternativas);
    };

    const limparFormulario = () => {
        setPergunta('');
        setAlternativas(['', '', '', '']);
        setCorreta(null);
    };

    const cadastrarPergunta = async () => {
        if (!pergunta.trim()) {
            erro('Atenção', 'Digite o enunciado da pergunta.');
            return;
        }

        if (alternativas.some((alternativa) => !alternativa.trim())) {
            erro('Atenção', 'Preencha as quatro alternativas.');
            return;
        }

        if (correta === null) {
            erro('Atenção', 'Selecione qual alternativa é a correta.');
            return;
        }

        try {
            setSalvando(true);
            const perguntaSalva = await adicionarPergunta(PALESTRA_ID, {
                enunciado: pergunta.trim(),
                    ativo: true,
                    palestra: {
                        id: PALESTRA_ID,
                    },
                    alternativas: alternativas.map((texto, index) => ({
                        texto: texto.trim(),
                        correta: index === correta,
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

                                {/* Radio */}
                                <TouchableOpacity
                                    style={styles.corretamente}
                                    onPress={() => setCorreta(index)}
                                    disabled={salvando}
                                >
                                    <View
                                        style={[
                                            styles.radio,
                                            correta === index &&
                                                styles.radioSelecionado,
                                        ]}
                                    >
                                        {correta === index && (
                                            <View style={styles.radioInterno} />
                                        )}
                                    </View>

                                    <Text style={styles.textoCorreta}>
                                        Correta
                                    </Text>
                                </TouchableOpacity>

                            </View>
                        ))}

                        <Text style={styles.hint}>
                            Selecione apenas uma alternativa como correta.
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

    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#7B1B38',

        alignItems: 'center',
        justifyContent: 'center',
    },

    radioSelecionado: {
        borderColor: '#A52A4F',
    },

    radioInterno: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#A52A4F',
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
});
