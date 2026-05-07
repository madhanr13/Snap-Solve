import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * API utility for communicating with the SnapSolve backend.
 *
 * IMPORTANT: Set USE_MOCK to true ONLY for offline development/testing.
 * When false, all API errors are surfaced to the user (no silent fallbacks).
 */

const USE_MOCK = false;

interface RepairAnalysis {
  problem_identified: string;
  viability_score: number;
  safety_warning: string;
  selected_materials: string[];
  steps: string[];
}

interface AnalyzeRepairRequest {
  image_problem: string;
  image_inventory: string;
  preferred_model?: string;
}

// ── History management ──────────────────────────────────────────────

export interface HistoryItem {
  id: string;
  timestamp: number;
  problem: string;
  score: number;
  analysis: RepairAnalysis;
}

const HISTORY_KEY = '@snapsolve_history';
const MAX_HISTORY = 20;

export async function saveToHistory(analysis: RepairAnalysis): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const history: HistoryItem[] = raw ? JSON.parse(raw) : [];
    history.unshift({
      id: Date.now().toString(),
      timestamp: Date.now(),
      problem: analysis.problem_identified,
      score: analysis.viability_score,
      analysis,
    });
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch (e) {
    console.error('[History] Failed to save:', e);
  }
}

export async function getHistory(): Promise<HistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

// ── Model preference ────────────────────────────────────────────────

const MODEL_KEY = '@snapsolve_model';

export async function getPreferredModel(): Promise<string | null> {
  return AsyncStorage.getItem(MODEL_KEY);
}

export async function setPreferredModel(model: string): Promise<void> {
  await AsyncStorage.setItem(MODEL_KEY, model);
}

// Available models the user can choose from
export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', tag: 'Fastest' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', tag: '' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tag: '' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tag: 'Recommended' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tag: 'Best quality' },
];

// ── API Client ──────────────────────────────────────────────────────

class SnapSolveAPI {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://127.0.0.1:8000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 90000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async analyzeRepair(
    imageProblem: string,
    imageInventory: string
  ): Promise<RepairAnalysis> {
    if (USE_MOCK) {
      console.log('[API] Mock mode — returning test data');
      return MOCK_RESPONSE;
    }

    try {
      // Read preferred model from storage
      const preferredModel = await getPreferredModel();

      const payload: AnalyzeRepairRequest = {
        image_problem: imageProblem,
        image_inventory: imageInventory,
        ...(preferredModel && { preferred_model: preferredModel }),
      };

      console.log(`[API] Sending to ${this.baseURL}/api/analyze-repair (model: ${preferredModel || 'auto'})`);

      const response = await this.client.post<RepairAnalysis>('/api/analyze-repair', payload);
      console.log('[API] Success');
      return response.data;
    } catch (error) {
      const isNetworkError =
        error instanceof Error &&
        (error.message.includes('Network Error') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('timeout'));

      if (isNetworkError) {
        throw new Error('Can\'t reach the server. Check that the backend is running.');
      }

      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 'unknown';
        const detail = error.response?.data?.detail || error.message;
        throw new Error(`Server error (${status}): ${detail}`);
      }

      throw error;
    }
  }
}

export const api = new SnapSolveAPI('http://172.25.37.124:8000');

const MOCK_RESPONSE: RepairAnalysis = {
  problem_identified: 'Broken ceramic mug with clean fracture at the handle',
  viability_score: 72,
  safety_warning: 'Avoid using this repair for hot liquids.',
  selected_materials: ['Two-part epoxy adhesive', 'Masking tape', 'Sandpaper'],
  steps: [
    'Clean both fractured surfaces with dry cloth',
    'Apply two-part epoxy according to package instructions',
    'Align the handle carefully and hold for 30 seconds',
    'Use masking tape to stabilize if needed',
    'Let cure for 24 hours before using',
    'Sand smooth any excess epoxy with fine sandpaper',
  ],
};

export type { RepairAnalysis, AnalyzeRepairRequest };
