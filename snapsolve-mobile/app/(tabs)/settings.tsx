/**
 * Settings Screen — Model selection, dark mode, data management.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
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
} from 'lucide-react-native';
import { useTheme } from '../../utils/ThemeContext';
import {
  AVAILABLE_MODELS,
  getPreferredModel,
  setPreferredModel,
  clearHistory,
} from '../../utils/api';

export default function SettingsScreen() {
  const { colors, isDark, toggle } = useTheme();
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-lite');

  useEffect(() => {
    getPreferredModel().then((m) => {
      if (m) setSelectedModel(m);
    });
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

  const getModelIcon = (tag: string) => {
    if (tag === 'Fastest') return <Zap size={15} color="#d97706" strokeWidth={2} />;
    if (tag === 'Recommended') return <Award size={15} color={colors.accent} strokeWidth={2} />;
    if (tag === 'Best quality') return <Award size={15} color="#7c3aed" strokeWidth={2} />;
    return null;
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── AI Model ── */}
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>AI MODEL</Text>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                activeOpacity={0.6}
              >
                <View style={s.modelLeft}>
                  <View style={[s.radio, { borderColor: isSelected ? colors.accent : colors.textMuted }]}>
                    {isSelected && <View style={[s.radioInner, { backgroundColor: colors.accent }]} />}
                  </View>
                  <View>
                    <Text style={[s.modelName, { color: colors.text }]}>{m.name}</Text>
                    {m.tag ? (
                      <View style={s.tagRow}>
                        {getModelIcon(m.tag)}
                        <Text style={[s.modelTag, {
                          color: m.tag === 'Fastest' ? '#d97706'
                            : m.tag === 'Best quality' ? '#7c3aed'
                            : colors.accent,
                        }]}>
                          {m.tag}
                        </Text>
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
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>APPEARANCE</Text>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.row}>
            <View style={s.rowLeft}>
              {isDark ? (
                <Moon size={20} color={colors.accent} strokeWidth={2} />
              ) : (
                <Sun size={20} color="#d97706" strokeWidth={2} />
              )}
              <Text style={[s.rowText, { color: colors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggle}
              trackColor={{ false: '#d6d3d1', true: colors.accent }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── Data ── */}
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>DATA</Text>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={s.row} onPress={handleClearHistory} activeOpacity={0.6}>
            <View style={s.rowLeft}>
              <Trash2 size={20} color={colors.danger} strokeWidth={2} />
              <Text style={[s.rowText, { color: colors.danger }]}>Clear History</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── About ── */}
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>ABOUT</Text>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <View style={s.rowLeft}>
              <Info size={20} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[s.rowText, { color: colors.text }]}>Version</Text>
            </View>
            <Text style={[s.rowValue, { color: colors.textMuted }]}>1.0.0</Text>
          </View>
          <View style={s.row}>
            <View style={s.rowLeft}>
              <Cpu size={20} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[s.rowText, { color: colors.text }]}>Engine</Text>
            </View>
            <Text style={[s.rowValue, { color: colors.textMuted }]}>Google Gemini</Text>
          </View>
        </View>

        {/* ── Tips ── */}
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>TIPS FOR BETTER RESULTS</Text>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.tipsText, { color: colors.textSecondary }]}>
            {`• Use natural lighting — avoid harsh shadows\n`}
            {`• Capture the full damaged area, don't crop tight\n`}
            {`• Lay all materials flat on a clean surface\n`}
            {`• Keep the camera steady to avoid blur\n`}
            {`• Pro models give more detailed instructions`}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10, marginTop: 16 },
  card: { borderRadius: 14, borderWidth: 1, marginBottom: 4, overflow: 'hidden' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 15, fontWeight: '500' },
  rowValue: { fontSize: 14 },

  // Model rows
  modelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  modelLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  modelName: { fontSize: 15, fontWeight: '500' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  modelTag: { fontSize: 11, fontWeight: '600' },

  tipsText: { fontSize: 13, lineHeight: 22, padding: 16 },
});
