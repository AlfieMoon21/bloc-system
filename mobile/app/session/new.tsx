import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/services/api';

export default function NewSessionScreen() {
  const [gymName, setGymName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!gymName.trim()) { setError('Gym name is required'); return; }
    setError('');
    setLoading(true);
    const result = await api.startSession(gymName.trim());
    setLoading(false);

    if (result.error) {
      // Server returns sessionId when user already has an active session
      if (result.sessionId) router.replace(`/session/${result.sessionId}`);
      else setError(result.error);
    } else {
      router.replace(`/session/${result.sessionId}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Start a Session</Text>
      <Text style={styles.subtitle}>Where are you climbing today?</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Gym name"
        placeholderTextColor="#888"
        value={gymName}
        onChangeText={setGymName}
        autoCapitalize="words"
        autoFocus
      />

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleStart} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Start Session</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#19181f', padding: 24, paddingTop: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#c9a0dc', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#a0a0a0', marginBottom: 32 },
  error: { color: '#ff6b6b', marginBottom: 16 },
  input: {
    width: '100%', backgroundColor: '#252330', borderRadius: 8, padding: 16,
    fontSize: 16, color: '#e0e0e0', marginBottom: 16, borderWidth: 1, borderColor: '#3a3845',
  },
  button: { width: '100%', backgroundColor: '#7b3f8c', paddingVertical: 16, borderRadius: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
});
