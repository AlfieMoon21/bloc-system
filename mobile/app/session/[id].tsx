import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView,
  StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { api, API_URL } from '@/services/api';

type Climb = {
  id: number;
  grade: string;
  attempts: number;
  topped: number;
  zones: number;
  description: string | null;
  image_path: string | null;
};

type Session = {
  id: number;
  gym_name: string;
  start_time: string;
  end_time: string | null;
  notes: string | null;
};

const V_GRADES = ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'];
const FONT_GRADES = ['4', '5', '5+', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A', '8A+', '8B', '8B+', '8C', '8C+'];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [session, setSession] = useState<Session | null>(null);
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-climb form
  const [showAddForm, setShowAddForm] = useState(false);
  const [grade, setGrade] = useState('');
  const [attempts, setAttempts] = useState('1');
  const [topped, setTopped] = useState(false);
  const [zones, setZones] = useState('0');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Grade picker modal
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [gradeSystem, setGradeSystem] = useState<'V' | 'Font'>('V');

  // End-session form
  const [showEndForm, setShowEndForm] = useState(false);
  const [endNotes, setEndNotes] = useState('');
  const [endLoading, setEndLoading] = useState(false);

  const fetchSession = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const data = await api.getSession(id);
    if (data.session) {
      setSession(data.session);
      setClimbs(data.climbs ?? []);
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { fetchSession(); }, [fetchSession]));

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleAddClimb = async () => {
    if (!grade.trim()) { setAddError('Grade is required'); return; }
    setAddError('');
    setAddLoading(true);
    const result = await api.addClimb(
      id!,
      { grade: grade.trim(), attempts: parseInt(attempts) || 1, topped, zones: parseInt(zones) || 0, description: description.trim() || undefined },
      imageUri ?? undefined
    );
    setAddLoading(false);
    if (result.error) { setAddError(result.error); return; }
    setGrade(''); setAttempts('1'); setTopped(false); setZones('0'); setDescription(''); setImageUri(null);
    setShowAddForm(false);
    fetchSession();
  };

  const handleEndSession = async () => {
    setEndLoading(true);
    const result = await api.endSession(id!, endNotes.trim() || undefined);
    setEndLoading(false);
    if (result.error) { Alert.alert('Error', result.error); return; }
    setShowEndForm(false);
    fetchSession();
  };

  const handleDeleteClimb = (climbId: number) => {
    Alert.alert('Delete climb?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const result = await api.deleteClimb(id!, climbId);
          if (result.error) { Alert.alert('Error', result.error); return; }
          fetchSession();
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#c9a0dc" /></View>;
  }

  if (!session) {
    return <View style={styles.center}><Text style={styles.errorText}>Session not found</Text></View>;
  }

  const isActive = !session.end_time;

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Session info card */}
        <View style={styles.sessionCard}>
          <View style={styles.row}>
            <Text style={styles.gymName}>{session.gym_name}</Text>
            {isActive && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>}
          </View>
          <Text style={styles.meta}>Started {formatDateTime(session.start_time)}</Text>
          {session.end_time && <Text style={styles.meta}>Ended {formatDateTime(session.end_time)}</Text>}
          {session.notes ? <Text style={styles.sessionNotes}>{session.notes}</Text> : null}
          <Text style={styles.climbCount}>{climbs.length} {climbs.length === 1 ? 'climb' : 'climbs'}</Text>
        </View>

        {/* Climb list */}
        {climbs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Climbs</Text>
            {climbs.map((climb) => (
              <View key={climb.id} style={styles.climbCard}>
                <View style={styles.climbCardHeader}>
                  <View style={styles.row}>
                    <Text style={styles.climbGrade}>{climb.grade}</Text>
                    {climb.topped ? (
                      <View style={styles.toppedBadge}><Text style={styles.toppedText}>Topped</Text></View>
                    ) : null}
                  </View>
                  {isActive && (
                    <Pressable onPress={() => handleDeleteClimb(climb.id)} hitSlop={12} style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </Pressable>
                  )}
                </View>
                <Text style={styles.climbMeta}>
                  {climb.attempts} {climb.attempts === 1 ? 'attempt' : 'attempts'}
                  {climb.zones > 0 ? ` · ${climb.zones} ${climb.zones === 1 ? 'zone' : 'zones'}` : ''}
                </Text>
                {climb.description ? <Text style={styles.climbDesc}>{climb.description}</Text> : null}
                {climb.image_path ? (
                  <Image source={{ uri: `${API_URL}${climb.image_path}` }} style={styles.climbImage} resizeMode="cover" />
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Active-only controls */}
        {isActive && (
          <View style={styles.section}>

            {/* Add climb toggle */}
            <Pressable style={styles.addButton} onPress={() => setShowAddForm(!showAddForm)}>
              <Text style={styles.addButtonText}>{showAddForm ? 'Cancel' : '+ Add Climb'}</Text>
            </Pressable>

            {showAddForm && (
              <View style={styles.form}>
                <Text style={styles.formTitle}>Log a Climb</Text>
                {addError ? <Text style={styles.error}>{addError}</Text> : null}

                <Text style={styles.label}>Grade</Text>
                <Pressable style={styles.gradePicker} onPress={() => setShowGradePicker(true)}>
                  <Text style={[styles.gradePickerText, !grade && styles.placeholderText]}>
                    {grade || 'Select grade…'}
                  </Text>
                </Pressable>

                <Text style={styles.label}>Attempts</Text>
                <TextInput style={styles.input} placeholder="1" placeholderTextColor="#888"
                  value={attempts} onChangeText={setAttempts} keyboardType="number-pad" />

                <Text style={styles.label}>Zones</Text>
                <TextInput style={styles.input} placeholder="0" placeholderTextColor="#888"
                  value={zones} onChangeText={setZones} keyboardType="number-pad" />

                <View style={styles.switchRow}>
                  <Text style={styles.label}>Topped</Text>
                  <Switch value={topped} onValueChange={setTopped}
                    trackColor={{ false: '#3a3845', true: '#7b3f8c' }} thumbColor="#fff" />
                </View>

                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="How did it go?"
                  placeholderTextColor="#888" value={description} onChangeText={setDescription} multiline />

                <Text style={styles.label}>Photo (optional)</Text>
                <Pressable style={styles.photoButton} onPress={pickImage}>
                  <Text style={styles.photoButtonText}>{imageUri ? 'Change Photo' : 'Add Photo'}</Text>
                </Pressable>
                {imageUri && (
                  <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
                )}

                <Pressable style={[styles.submitButton, addLoading && styles.disabled]} onPress={handleAddClimb} disabled={addLoading}>
                  {addLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Log Climb</Text>}
                </Pressable>
              </View>
            )}

            {/* End session toggle */}
            <Pressable style={styles.endButton} onPress={() => setShowEndForm(!showEndForm)}>
              <Text style={styles.endButtonText}>{showEndForm ? 'Cancel' : 'End Session'}</Text>
            </Pressable>

            {showEndForm && (
              <View style={styles.form}>
                <Text style={styles.label}>Session notes (optional)</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="How was the session?"
                  placeholderTextColor="#888" value={endNotes} onChangeText={setEndNotes} multiline />
                <Pressable style={[styles.endConfirmButton, endLoading && styles.disabled]} onPress={handleEndSession} disabled={endLoading}>
                  {endLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Confirm End Session</Text>}
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Grade picker modal */}
      <Modal
        visible={showGradePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGradePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowGradePicker(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Grade</Text>

            <View style={styles.systemTabs}>
              <Pressable
                style={[styles.systemTab, gradeSystem === 'V' && styles.systemTabActive]}
                onPress={() => setGradeSystem('V')}
              >
                <Text style={[styles.systemTabText, gradeSystem === 'V' && styles.systemTabTextActive]}>V-Scale</Text>
              </Pressable>
              <Pressable
                style={[styles.systemTab, gradeSystem === 'Font' && styles.systemTabActive]}
                onPress={() => setGradeSystem('Font')}
              >
                <Text style={[styles.systemTabText, gradeSystem === 'Font' && styles.systemTabTextActive]}>Font</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.gradeGrid}>
              {(gradeSystem === 'V' ? V_GRADES : FONT_GRADES).map((g) => (
                <Pressable
                  key={g}
                  style={[styles.gradeChip, grade === g && styles.gradeChipSelected]}
                  onPress={() => { setGrade(g); setShowGradePicker(false); }}
                >
                  <Text style={[styles.gradeChipText, grade === g && styles.gradeChipTextSelected]}>{g}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: '#19181f' },
  center:   { flex: 1, backgroundColor: '#19181f', alignItems: 'center', justifyContent: 'center' },
  content:  { padding: 16 },
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  sessionCard: {
    backgroundColor: '#252330', borderRadius: 12, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: '#3a3845',
  },
  gymName:         { fontSize: 22, fontWeight: 'bold', color: '#e0e0e0' },
  activeBadge:     { backgroundColor: '#2d5a2d', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadgeText: { color: '#5dba5d', fontSize: 12, fontWeight: '600' },
  meta:            { fontSize: 13, color: '#666', marginTop: 4 },
  sessionNotes:    { fontSize: 14, color: '#c0c0c0', marginTop: 10, fontStyle: 'italic' },
  climbCount:      { fontSize: 14, color: '#c9a0dc', marginTop: 10 },

  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#e0e0e0', marginBottom: 12 },

  climbCard: {
    backgroundColor: '#252330', borderRadius: 8, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#3a3845',
  },
  climbCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  climbGrade:      { fontSize: 16, fontWeight: 'bold', color: '#c9a0dc' },
  toppedBadge:     { backgroundColor: '#1e3a5f', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  toppedText:      { color: '#5d9aba', fontSize: 12, fontWeight: '600' },
  climbMeta:       { fontSize: 13, color: '#777', marginTop: 2 },
  climbDesc:       { fontSize: 13, color: '#a0a0a0', marginTop: 6, fontStyle: 'italic' },
  climbImage:      { width: '100%', height: 160, borderRadius: 8, marginTop: 8 },
  deleteBtn:       { padding: 4 },
  deleteBtnText:   { color: '#6b3030', fontSize: 16, fontWeight: '600' },

  addButton:    { backgroundColor: '#7b3f8c', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  addButtonText:{ color: '#fff', fontSize: 16, fontWeight: '600' },
  endButton:    { borderWidth: 1, borderColor: '#6b2f2f', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  endButtonText:{ color: '#d07070', fontSize: 16, fontWeight: '600' },
  endConfirmButton: { backgroundColor: '#7a2e2e', padding: 14, borderRadius: 8, alignItems: 'center' },

  form:      { backgroundColor: '#252330', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#3a3845' },
  formTitle: { fontSize: 18, fontWeight: '600', color: '#e0e0e0', marginBottom: 12 },
  error:     { color: '#ff6b6b', marginBottom: 12 },
  errorText: { color: '#ff6b6b', fontSize: 16 },
  label:     { fontSize: 13, color: '#888', marginBottom: 6 },
  input: {
    backgroundColor: '#19181f', borderRadius: 8, padding: 12,
    fontSize: 16, color: '#e0e0e0', marginBottom: 14, borderWidth: 1, borderColor: '#3a3845',
  },
  textArea:    { minHeight: 80, textAlignVertical: 'top' },
  switchRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  submitButton:{ backgroundColor: '#7b3f8c', padding: 14, borderRadius: 8, alignItems: 'center' },
  submitText:  { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled:    { opacity: 0.6 },
  photoButton: { borderWidth: 1, borderColor: '#3a3845', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 12 },
  photoButtonText: { color: '#c9a0dc', fontSize: 14 },
  preview:     { width: '100%', height: 180, borderRadius: 8, marginBottom: 14 },

  gradePicker: {
    backgroundColor: '#19181f', borderRadius: 8, padding: 12,
    marginBottom: 14, borderWidth: 1, borderColor: '#3a3845',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  gradePickerText: { fontSize: 16, color: '#e0e0e0' },
  placeholderText: { color: '#888' },

  // Grade picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#252330', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#e0e0e0', marginBottom: 16, textAlign: 'center' },

  systemTabs:          { flexDirection: 'row', backgroundColor: '#19181f', borderRadius: 8, marginBottom: 16 },
  systemTab:           { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  systemTabActive:     { backgroundColor: '#7b3f8c' },
  systemTabText:       { color: '#888', fontWeight: '600' },
  systemTabTextActive: { color: '#fff' },

  gradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 20 },
  gradeChip: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1, borderColor: '#3a3845',
    backgroundColor: '#19181f',
  },
  gradeChipSelected:     { backgroundColor: '#7b3f8c', borderColor: '#7b3f8c' },
  gradeChipText:         { color: '#e0e0e0', fontWeight: '600', fontSize: 15 },
  gradeChipTextSelected: { color: '#fff' },
});
