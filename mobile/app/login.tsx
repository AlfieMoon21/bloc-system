import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/auth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Email and password are required'); return; }
    setError('');
    setLoading(true);
    const err = await login(email, password);
    setLoading(false);
    if (err) setError(err);
    // on success, RootNavigator's useEffect redirects to /(tabs)
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Bloc</Text>
      <Text style={styles.subtitle}>Login to continue</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </Pressable>

      <Pressable style={styles.linkButton} onPress={() => router.push('/register')}>
        <Text style={styles.linkText}>Don't have an account? Register</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#19181f', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 48, fontWeight: 'bold', color: '#c9a0dc' },
  subtitle: { fontSize: 18, color: '#e0e0e0', marginTop: 10, marginBottom: 40 },
  error: { color: '#ff6b6b', marginBottom: 16, textAlign: 'center' },
  input: {
    width: '100%', backgroundColor: '#252330', borderRadius: 8, padding: 16,
    fontSize: 16, color: '#e0e0e0', marginBottom: 16, borderWidth: 1, borderColor: '#3a3845',
  },
  button: { width: '100%', backgroundColor: '#7b3f8c', paddingVertical: 16, borderRadius: 8, marginTop: 10 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  linkButton: { marginTop: 20 },
  linkText: { color: '#c9a0dc', fontSize: 14 },
});
