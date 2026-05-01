import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/services/api';

type FeedSession = {
  id: number;
  gym_name: string;
  end_time: string;
  notes: string | null;
  username: string;
  climb_count: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FeedScreen() {
  const [sessions, setSessions] = useState<FeedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const data = await api.getFeed();
    if (Array.isArray(data)) setSessions(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchFeed(); }, []);

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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchFeed(true)} tintColor="#c9a0dc" />
      }
      ListHeaderComponent={<Text style={styles.header}>Feed</Text>}
      ListEmptyComponent={<Text style={styles.empty}>No sessions yet — be the first to climb!</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.gym}>{item.gym_name}</Text>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
          <Text style={styles.climbCount}>
            {item.climb_count} {item.climb_count === 1 ? 'climb' : 'climbs'}
          </Text>
          {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          <Text style={styles.date}>{formatDate(item.end_time)}</Text>
        </View>
      )}
    />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#19181f' },
  center: { flex: 1, backgroundColor: '#19181f', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#c9a0dc', marginBottom: 16 },
  empty: { color: '#666', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#252330', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#3a3845',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  gym: { fontSize: 16, fontWeight: '600', color: '#e0e0e0' },
  username: { fontSize: 13, color: '#c9a0dc' },
  climbCount: { fontSize: 14, color: '#a0a0a0', marginBottom: 4 },
  notes: { fontSize: 14, color: '#c0c0c0', marginTop: 4, fontStyle: 'italic' },
  date: { fontSize: 12, color: '#555', marginTop: 8 },
});
