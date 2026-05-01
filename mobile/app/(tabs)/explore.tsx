import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { api } from '@/services/api';
import { useAuth } from '@/context/auth';

type Session = {
  id: number;
  gym_name: string;
  start_time: string;
  end_time: string | null;
  climb_count: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SessionsScreen() {
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Reload every time this tab comes into focus (e.g. after returning from a session)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      api.getSessions().then((data) => {
        if (Array.isArray(data)) setSessions(data);
        setLoading(false);
      });
    }, [])
  );

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#c9a0dc" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.list}>
    <FlatList
      style={styles.list}
      data={sessions}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.headerRow}>
          <Text style={styles.header}>My Sessions</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.newButton} onPress={() => router.push('/session/new')}>
              <Text style={styles.newButtonText}>+ New</Text>
            </Pressable>
            <Pressable onPress={logout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No sessions yet.</Text>
          <Pressable style={styles.newButtonLarge} onPress={() => router.push('/session/new')}>
            <Text style={styles.newButtonText}>Start your first session</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => router.push(`/session/${item.id}`)}>
          <View style={styles.cardTop}>
            <Text style={styles.gym}>{item.gym_name}</Text>
            {!item.end_time && (
              <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>
            )}
          </View>
          <Text style={styles.climbCount}>
            {item.climb_count} {item.climb_count === 1 ? 'climb' : 'climbs'}
          </Text>
          <Text style={styles.date}>{formatDate(item.start_time)}</Text>
        </Pressable>
      )}
    />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#19181f' },
  center: { flex: 1, backgroundColor: '#19181f', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#c9a0dc' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newButton: { backgroundColor: '#7b3f8c', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  newButtonLarge: { backgroundColor: '#7b3f8c', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8, marginTop: 16 },
  newButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  logoutButton: { paddingHorizontal: 8, paddingVertical: 8 },
  logoutText: { color: '#666', fontSize: 13 },
  card: {
    backgroundColor: '#252330', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#3a3845',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  gym: { fontSize: 16, fontWeight: '600', color: '#e0e0e0' },
  activeBadge: { backgroundColor: '#2d5a2d', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  activeBadgeText: { color: '#5dba5d', fontSize: 12, fontWeight: '600' },
  climbCount: { fontSize: 14, color: '#a0a0a0', marginBottom: 4 },
  date: { fontSize: 12, color: '#555' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  empty: { color: '#666', fontSize: 16 },
});
