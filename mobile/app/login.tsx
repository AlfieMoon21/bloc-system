import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { api } from '../services/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    console.log('Login attempt:', email, password);
    const result = await api.login(email, password);

    if (result.error) {
      alert(result.error);
    } else {
      alert('Welcome ' + result.user.username);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bloc</Text>
      <Text style={styles.subtitle}>Login to continue</Text>

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

      <Pressable style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </Pressable>

      <Pressable
        style={styles.linkButton}
        onPress={() => router.push('/register')}
      >
        <Text style={styles.linkText}>Don't have an account? Register</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#19181f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#c9a0dc',
  },
  subtitle: {
    fontSize: 18,
    color: '#e0e0e0',
    marginTop: 10,
    marginBottom: 40,
  },
  input: {
    width: '100%',
    backgroundColor: '#252330',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#e0e0e0',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3a3845',
  },
  button: {
    width: '100%',
    backgroundColor: '#7b3f8c',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  linkButton: {
    marginTop: 20,
  },
  linkText: {
    color: '#c9a0dc',
    fontSize: 14,
  },
});
