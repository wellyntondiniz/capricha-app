import {
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from 'react-native';

export default function Perfil() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <View style={styles.logo}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>✦</Text>
          </View>

          <Text style={styles.logoTitle}>
            Eventos
          </Text>
        </View>

        <View style={styles.card}>

          <View style={styles.emptyEvents}>

          <Text style={styles.emptyIcon}>
            ✦
          </Text>

          <Text style={styles.emptyTitle}>
            Não há eventos no momento
          </Text>

          <Text style={styles.emptyText}>
            No momento, não existem eventos disponíveis.
            Volte mais tarde para conferir as novidades.
          </Text>

        </View>


        </View>

        <Text style={styles.footer}>
          © 2026 · Capricha
        </Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D1117',
  },

  container: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    padding: 24,
    justifyContent: 'center',
  },

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

  logoIconText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },

  logoTitle: {
    color: '#E6EDF3',
    fontSize: 24,
    fontWeight: '400',
  },

  card: {
    padding: 24,
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#7B1B38',
    borderRadius: 8,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.35,
    shadowRadius: 24,

    elevation: 8,
  },

  cardTitle: {
    marginBottom: 20,
    color: '#E6EDF3',
    fontSize: 20,
    fontWeight: '400',
  },

  field: {
    marginBottom: 16,
  },

  label: {
    marginBottom: 6,
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '600',
  },

  input: {
    width: '100%',
    height: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,

    backgroundColor: '#0D1117',
    color: '#E6EDF3',

    borderWidth: 1,
    borderColor: '#7B1B38',
    borderRadius: 6,

    fontSize: 14,
  },

  hint: {
    marginTop: 5,
    color: '#8B949E',
    fontSize: 12,
  },

  terms: {
    marginVertical: 18,
    color: '#8B949E',
    fontSize: 12,
    lineHeight: 18,
  },

  termsHighlight: {
    color: '#A52A4F',
  },

  button: {
    width: '100%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7B1B38',
    borderRadius: 6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  login: {
    marginTop: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7B1B38',
    borderRadius: 6,
  },

  loginText: {
    color: '#E6EDF3',
    fontSize: 14,
  },

  loginHighlight: {
    color: '#A52A4F',
  },

  footer: {
    marginTop: 24,
    textAlign: 'center',
    color: '#8B949E',
    fontSize: 12,
  },

    emptyEvents: {
    alignItems: 'center',

    paddingVertical: 40,
    paddingHorizontal: 20,
  },

  emptyIcon: {
    marginBottom: 15,

    fontSize: 36,

    color: '#7B1B38',
  },

  emptyTitle: {
    marginBottom: 10,

    fontSize: 16,
    fontWeight: '600',

    textAlign: 'center',

    color: '#E6EDF3',
  },

  emptyText: {
    fontSize: 14,

    lineHeight: 21,

    textAlign: 'center',

    color: '#8B949E',
  },
});