import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { api } from '@/services/api';

type GradeRow = { grade: string; count: number; topped_count: number };
type Stats = {
  total_sessions: number;
  total_climbs: number;
  topped_count: number;
  avg_attempts: number | null;
  top_gym: string | null;
  grade_distribution: GradeRow[];
};

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      api.getStats().then((data) => {
        if (!data.error) setStats(data);
        setLoading(false);
      });
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#c9a0dc" />
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.empty}>Could not load stats.</Text>
      </SafeAreaView>
    );
  }

  const toppedPct =
    stats.total_climbs > 0
      ? Math.round((stats.topped_count / stats.total_climbs) * 100)
      : 0;

  const maxCount = stats.grade_distribution.length > 0 ? stats.grade_distribution[0].count : 1;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Stats</Text>

        <View style={styles.cardGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_sessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_climbs}</Text>
            <Text style={styles.statLabel}>Climbs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{toppedPct}%</Text>
            <Text style={styles.statLabel}>Topped</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.avg_attempts ?? '—'}</Text>
            <Text style={styles.statLabel}>Avg Attempts</Text>
          </View>
        </View>

        {stats.top_gym ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favourite Gym</Text>
            <Text style={styles.topGym}>{stats.top_gym}</Text>
          </View>
        ) : null}

        {stats.grade_distribution.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Grade Distribution</Text>
            {stats.grade_distribution.map((row) => {
              const barFraction = row.count / maxCount;
              const topped = row.count > 0 ? Math.round((row.topped_count / row.count) * 100) : 0;
              return (
                <View key={row.grade} style={styles.gradeRow}>
                  <Text style={styles.gradeLabel}>{row.grade}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.bar, { width: `${Math.round(barFraction * 100)}%` as any }]} />
                  </View>
                  <Text style={styles.gradeCount}>{row.count}</Text>
                  <Text style={styles.gradeToppedPct}>{topped}%</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.empty}>Log your first session to see stats here.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#19181f' },
  center:    { flex: 1, backgroundColor: '#19181f', alignItems: 'center', justifyContent: 'center' },
  content:   { padding: 16 },

  header: { fontSize: 28, fontWeight: 'bold', color: '#c9a0dc', marginBottom: 20 },
  empty:  { color: '#666', textAlign: 'center', marginTop: 40 },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, minWidth: 80,
    backgroundColor: '#252330', borderRadius: 12,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#3a3845',
  },
  statValue: { fontSize: 26, fontWeight: 'bold', color: '#c9a0dc' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },

  section: {
    backgroundColor: '#252330', borderRadius: 12,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#3a3845',
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#e0e0e0', marginBottom: 14 },
  topGym: { fontSize: 18, color: '#c9a0dc', fontWeight: '500' },

  gradeRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  gradeLabel:    { width: 40, color: '#c9a0dc', fontWeight: '600', fontSize: 13 },
  barTrack:      { flex: 1, height: 14, backgroundColor: '#19181f', borderRadius: 7, overflow: 'hidden' },
  bar:           { height: '100%', backgroundColor: '#7b3f8c', borderRadius: 7, minWidth: 4 },
  gradeCount:    { width: 22, textAlign: 'right', color: '#e0e0e0', fontSize: 13 },
  gradeToppedPct:{ width: 36, textAlign: 'right', color: '#666', fontSize: 11 },
});
