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
  difficulty: string;
  estimated_time: string;
  safety_warning: string;
  selected_materials: string[];
  steps: string[];
}

interface AnalyzeRepairRequest {
  image_problem?: string;
  image_inventory?: string;
  text_description?: string;
  preferred_model?: string;
}

// ── History management ──────────────────────────────────────────────

export interface HistoryItem {
  id: string;
  timestamp: number;
  problem: string;
  difficulty?: string;
  analysis: RepairAnalysis;
}

const HISTORY_KEY = '@snapsolve_history';
const MAX_HISTORY = 20;

export async function saveToHistory(analysis: RepairAnalysis): Promise<void> {
  try {
    const item: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      problem: analysis.problem_identified,
      difficulty: analysis.difficulty,
      analysis,
    };

    const token = await AsyncStorage.getItem('@snapsolve_auth_token');
    if (token) {
      // Save to backend
      await axios.post(`${API_BASE_URL}/api/history`, item, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    // Always keep local cache as well
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const history: HistoryItem[] = raw ? JSON.parse(raw) : [];
    history.unshift(item);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch (e) {
    console.error('[History] Failed to save:', e);
  }
}

export async function getHistory(): Promise<HistoryItem[]> {
  try {
    const token = await AsyncStorage.getItem('@snapsolve_auth_token');
    if (token) {
      // Fetch from backend
      const res = await axios.get(`${API_BASE_URL}/api/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const remoteHistory = res.data;
      // Sync local cache
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(remoteHistory));
      return remoteHistory;
    }
    
    // Fallback to local
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[History] Failed to get:', e);
    // On error, fallback to local
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export async function clearHistory(): Promise<void> {
  // Clear local. (Backend clearing would require a new endpoint, omitted for now).
  await AsyncStorage.removeItem(HISTORY_KEY);
}

// ── Repair Stats ────────────────────────────────────────────────────

export interface RepairStats {
  total: number;
  thisWeek: number;
  streak: number; // consecutive days with at least one fix
}

export async function getRepairStats(): Promise<RepairStats> {
  const history = await getHistory();
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = history.filter((h) => h.timestamp > weekAgo).length;

  // Calculate streak (consecutive days from today going backwards)
  let streak = 0;
  if (history.length > 0) {
    const daySet = new Set(
      history.map((h) => new Date(h.timestamp).toDateString())
    );
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (daySet.has(d.toDateString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
  }

  return { total: history.length, thisWeek, streak };
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
      this.handleError(error);
      throw error; // unreachable but keeps TS happy
    }
  }

  /** Feature 4: Text-only mode — describe the problem instead of using a photo */
  async analyzeRepairText(
    textDescription: string,
    imageInventory: string
  ): Promise<RepairAnalysis> {
    if (USE_MOCK) {
      console.log('[API] Mock mode — returning test data');
      return MOCK_RESPONSE;
    }

    try {
      const preferredModel = await getPreferredModel();
      const payload: AnalyzeRepairRequest = {
        text_description: textDescription,
        image_inventory: imageInventory,
        ...(preferredModel && { preferred_model: preferredModel }),
      };
      console.log(`[API] Text mode → ${this.baseURL}/api/analyze-repair-text (model: ${preferredModel || 'auto'})`);
      const response = await this.client.post<RepairAnalysis>('/api/analyze-repair-text', payload);
      console.log('[API] Success');
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private handleError(error: unknown): never {
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

    throw error as Error;
  }
}

export const API_BASE_URL = 'http://172.20.10.2:8000';
export const api = new SnapSolveAPI(API_BASE_URL);

const MOCK_RESPONSE: RepairAnalysis = {
  problem_identified: 'Broken ceramic mug with clean fracture at the handle',
  difficulty: 'Medium',
  estimated_time: '~20 minutes',
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
