/**
 * Settings Screen — Model selection, dark mode, data management.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sun,
  Moon,
  Trash2,
  Info,
  Check,
  Cpu,
  Zap,
  Award,
  LogOut,
  User,
  Package,
} from 'lucide-react-native';
import { useTheme } from '../../utils/ThemeContext';
import { useAuth } from '../../utils/AuthContext';
import {
  AVAILABLE_MODELS,
  getPreferredModel,
  setPreferredModel,
  clearHistory,
  getToolbox,
  clearToolbox,
} from '../../utils/api';
import { ThemedText } from '../../components/ThemedText';

export default function SettingsScreen() {
  const { colors, isDark, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-lite');
  const [hasToolbox, setHasToolbox] = useState(false);

  useEffect(() => {
    getPreferredModel().then((m) => {
      if (m) setSelectedModel(m);
    });
    getToolbox().then((t) => setHasToolbox(!!t));
  }, []);

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    await setPreferredModel(modelId);
  };

  const handleClearHistory = () => {
    Alert.alert('Clear all history?', 'This can\'t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          Alert.alert('Done', 'History cleared.');
        },
      },
    ]);
  };

  const handleClearToolbox = () => {
    Alert.alert('Remove saved toolbox?', 'You\'ll need to take a new materials photo each time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await clearToolbox();
          setHasToolbox(false);
          Alert.alert('Done', 'Toolbox removed.');
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sign out?', 'You\'ll need to log in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const getModelIcon = (tag: string) => {
    if (tag === 'Fastest') return <Zap size={14} color="#D97706" strokeWidth={2.5} />;
    if (tag === 'Recommended') return <Award size={14} color={colors.accent} strokeWidth={2.5} />;
    if (tag === 'Best quality') return <Award size={14} color="#8B5CF6" strokeWidth={2.5} />;
    return null;
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── AI Model ── */}
        <ThemedText weight="bold" variant="muted" style={s.sectionLabel}>AI MODEL</ThemedText>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: isDark ? '#000' : '#475569' }]}>
          {AVAILABLE_MODELS.map((m, idx) => {
            const isSelected = selectedModel === m.id;
            const isLast = idx === AVAILABLE_MODELS.length - 1;
            return (
              <TouchableOpacity
                key={m.id}
                style={[
                  s.modelRow,
                  !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                ]}
                onPress={() => handleModelChange(m.id)}
                activeOpacity={0.7}
              >
                <View style={s.modelLeft}>
                  <View style={[s.radio, { borderColor: isSelected ? colors.accent : colors.textMuted }]}>
                    {isSelected && <View style={[s.radioInner, { backgroundColor: colors.accent }]} />}
                  </View>
                  <View>
                    <ThemedText weight="bold" style={[s.modelName, { color: colors.text }]}>{m.name}</ThemedText>
                    {m.tag ? (
                      <View style={s.tagRow}>
                        {getModelIcon(m.tag)}
                        <ThemedText weight="bold" style={[s.modelTag, {
                          color: m.tag === 'Fastest' ? '#D97706'
                            : m.tag === 'Best quality' ? '#8B5CF6'
                            : colors.accent,
                        }]}>
                          {m.tag}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                </View>
                {isSelected && <Check size={18} color={colors.accent} strokeWidth={2.5} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Appearance ── */}
        <ThemedText weight="bold" variant="muted" style={s.sectionLabel}>APPEARANCE</ThemedText>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: isDark ? '#000' : '#475569' }]}>
          <View style={s.row}>
            <View style={s.rowLeft}>
              {isDark ? (
                <Moon size={18} color={colors.accent} strokeWidth={2.5} />
              ) : (
                <Sun size={18} color="#D97706" strokeWidth={2.5} />
              )}
              <ThemedText weight="bold" style={[s.rowText, { color: colors.text }]}>Dark Mode</ThemedText>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggle}
              trackColor={{ false: '#D1D5DB', true: colors.accent }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── Data ── */}
        <ThemedText weight="bold" variant="muted" style={s.sectionLabel}>DATA</ThemedText>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: isDark ? '#000' : '#475569' }]}>
          <TouchableOpacity style={s.row} onPress={handleClearHistory} activeOpacity={0.7}>
            <View style={s.rowLeft}>
              <Trash2 size={18} color={colors.danger} strokeWidth={2} />
              <ThemedText weight="bold" style={[s.rowText, { color: colors.danger }]}>Clear History</ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── My Toolbox ── */}
        <ThemedText weight="bold" variant="muted" style={s.sectionLabel}>MY TOOLBOX</ThemedText>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: isDark ? '#000' : '#475569' }]}>
          <View style={[s.row, { borderBottomWidth: hasToolbox ? 1 : 0, borderBottomColor: colors.borderLight }]}>
            <View style={s.rowLeft}>
              <Package size={18} color={colors.accent} strokeWidth={2} />
              <View>
                <ThemedText weight="bold" style={[s.rowText, { color: colors.text }]}>Saved Materials</ThemedText>
                <ThemedText style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {hasToolbox ? 'Toolbox photo saved ✓' : 'No toolbox saved yet'}
                </ThemedText>
              </View>
            </View>
            {hasToolbox && (
              <View style={[s.toolboxBadge, { backgroundColor: colors.successSoft, borderColor: colors.success + '20' }]}>
                <ThemedText weight="bold" style={{ fontSize: 11, color: colors.success }}>SAVED</ThemedText>
              </View>
            )}
          </View>
          {hasToolbox && (
            <TouchableOpacity style={s.row} onPress={handleClearToolbox} activeOpacity={0.7}>
              <View style={s.rowLeft}>
                <Trash2 size={18} color={colors.danger} strokeWidth={2} />
                <ThemedText weight="bold" style={[s.rowText, { color: colors.danger }]}>Remove Toolbox</ThemedText>
              </View>
            </TouchableOpacity>
          )}
          {!hasToolbox && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
              <ThemedText variant="secondary" style={{ fontSize: 12, lineHeight: 18 }}>
                Take a materials photo during your next scan — you'll be asked to save it as your toolbox.
              </ThemedText>
            </View>
          )}
        </View>

        {/* ── About ── */}
        <ThemedText weight="bold" variant="muted" style={s.sectionLabel}>ABOUT</ThemedText>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: isDark ? '#000' : '#475569' }]}>
          <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <View style={s.rowLeft}>
              <Info size={18} color={colors.textSecondary} strokeWidth={2} />
              <ThemedText weight="bold" style={[s.rowText, { color: colors.text }]}>Version</ThemedText>
            </View>
            <ThemedText variant="secondary" style={s.rowValue}>1.0.0</ThemedText>
          </View>
          <View style={s.row}>
            <View style={s.rowLeft}>
              <Cpu size={18} color={colors.textSecondary} strokeWidth={2} />
              <ThemedText weight="bold" style={[s.rowText, { color: colors.text }]}>Engine</ThemedText>
            </View>
            <ThemedText variant="secondary" style={s.rowValue}>Google Gemini</ThemedText>
          </View>
        </View>

        {/* ── Tips ── */}
        <ThemedText weight="bold" variant="muted" style={s.sectionLabel}>TIPS FOR BETTER RESULTS</ThemedText>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: isDark ? '#000' : '#475569' }]}>
          <ThemedText variant="secondary" style={[s.tipsText, { color: colors.textSecondary }]}>
            {`• Use natural lighting — avoid harsh shadows\n`}
            {`• Capture the full damaged area, don't crop tight\n`}
            {`• Lay all materials flat on a clean surface\n`}
            {`• Keep the camera steady to avoid blur\n`}
            {`• Pro models give more detailed instructions`}
          </ThemedText>
        </View>

        {/* ── Account ── */}
        <ThemedText weight="bold" variant="muted" style={s.sectionLabel}>ACCOUNT</ThemedText>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: isDark ? '#000' : '#475569' }]}>
          <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <View style={s.rowLeft}>
              <User size={18} color={colors.accent} strokeWidth={2} />
              <ThemedText weight="bold" style={[s.rowText, { color: colors.text }]}>Signed in as</ThemedText>
            </View>
            <ThemedText weight="bold" style={[s.rowValue, { color: colors.accent }]}>
              {user?.display_name || user?.username || 'Unknown'}
            </ThemedText>
          </View>
          <TouchableOpacity style={s.row} onPress={handleLogout} activeOpacity={0.7}>
            <View style={s.rowLeft}>
              <LogOut size={18} color={colors.danger} strokeWidth={2} />
              <ThemedText weight="bold" style={[s.rowText, { color: colors.danger }]}>Sign Out</ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 8 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.2, marginBottom: 10, marginTop: 18 },
  card: { 
    borderRadius: 16, borderWidth: 1, marginBottom: 4, overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 15,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowText: { fontSize: 15 },
  rowValue: { fontSize: 14 },

  // Model rows
  modelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 15,
  },
  modelLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  modelName: { fontSize: 15 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  modelTag: { fontSize: 11 },

  tipsText: { fontSize: 13, lineHeight: 22, padding: 18 },

  // Toolbox
  toolboxBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
});
