import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/**
 * API utility for communicating with the SnapSolve backend.
 *
 * IMPORTANT: Set USE_MOCK to true ONLY for offline development/testing.
 * When false, all API errors are surfaced to the user (no silent fallbacks).
 *
 * The API_BASE_URL is auto-detected from the Expo dev server's debuggerHost,
 * so you no longer need to manually update the IP when switching networks.
 */

const USE_MOCK = false;

/**
 * Auto-detect the dev machine's IP from Expo's debuggerHost.
 * debuggerHost looks like "192.168.1.5:8081" — we extract just the IP
 * and point to port 8000 (our FastAPI backend).
 * Falls back to localhost for production or when detection fails.
 */
function getApiBaseUrl(): string {
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:8000`;
  }
  // Fallback for production builds or when host can't be detected
  return 'http://localhost:8000';
}

export const API_BASE_URL = getApiBaseUrl();

interface RepairAnalysis {
  problem_identified: string;
  difficulty: string;
  estimated_time: string;
  safety_warning: string;
  selected_materials: string[];
  steps: string[];
  // V2 features
  substitutions?: Array<{ original: string; substitute: string; notes: string }>;
  durability_estimate?: string;
  warning_signs?: string[];
  permanent_fix_advice?: string;
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

// ── User Session Cleanup ──────────────────────────────────────────────

export async function clearUserSessionData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      '@snapsolve_toolbox',
      '@snapsolve_history',
      'repairAnalysis',
      'inventoryImageBase64',
      'problemImageBase64',
      'problemImageUri',
      'problemTextDescription',
    ]);
  } catch (e) {
    console.error('[Session] Failed to clear user session data:', e);
  }
}

// ── Saved Toolbox ───────────────────────────────────────────────────

const TOOLBOX_KEY = '@snapsolve_toolbox';

export async function saveToolbox(base64Image: string): Promise<void> {
  await AsyncStorage.setItem(TOOLBOX_KEY, base64Image);
  // Sync to backend if authenticated
  const token = await AsyncStorage.getItem('@snapsolve_auth_token');
  if (token) {
    try {
      await axios.post(`${API_BASE_URL}/api/toolbox`, { image: base64Image }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.error('[Toolbox] Failed to sync to backend:', e);
    }
  }
}

export async function getToolbox(): Promise<string | null> {
  // If user is logged in, fetch user's specific toolbox from backend
  const token = await AsyncStorage.getItem('@snapsolve_auth_token');
  if (token) {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/toolbox`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data && res.data.image) {
        await AsyncStorage.setItem(TOOLBOX_KEY, res.data.image);
        return res.data.image;
      } else {
        // User has no saved toolbox on backend — clear local cache for this session
        await AsyncStorage.removeItem(TOOLBOX_KEY);
        return null;
      }
    } catch (e) {
      console.error('[Toolbox] Failed to fetch user toolbox from backend:', e);
    }
  }
  return AsyncStorage.getItem(TOOLBOX_KEY);
}

export async function clearToolbox(): Promise<void> {
  await AsyncStorage.removeItem(TOOLBOX_KEY);
  const token = await AsyncStorage.getItem('@snapsolve_auth_token');
  if (token) {
    try {
      await axios.post(`${API_BASE_URL}/api/toolbox`, { image: null }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.error('[Toolbox] Failed to clear backend toolbox:', e);
    }
  }
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
  { id: 'qwen2.5vl:3b', name: 'Qwen 2.5 VL', tag: 'Local' },
];

// ── API Client ──────────────────────────────────────────────────────

/**
 * Parse accumulated SSE text into a RepairAnalysis object.
 * Handles markdown code fences and leading/trailing whitespace.
 */
function _cleanAndParseJSON(raw: string): RepairAnalysis {
  let text = raw.trim();
  if (text.startsWith('```json')) text = text.slice(7);
  if (text.startsWith('```')) text = text.slice(3);
  if (text.endsWith('```')) text = text.slice(0, -3);
  text = text.trim();
  return JSON.parse(text) as RepairAnalysis;
}

class SnapSolveAPI {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 90000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Non-streaming methods (preserved for backward compat) ──────────

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

  /** V2 Feature 3: Alternative repair method (non-streaming) */
  async analyzeRepairAlternative(
    imageProblem: string,
    imageInventory: string,
    originalSteps: string[],
    repairStyle: 'quick' | 'heavy_duty' = 'quick'
  ): Promise<RepairAnalysis> {
    try {
      const preferredModel = await getPreferredModel();
      const payload = {
        image_problem: imageProblem,
        image_inventory: imageInventory,
        original_steps: originalSteps,
        repair_style: repairStyle,
        ...(preferredModel && { preferred_model: preferredModel }),
      };
      console.log(`[API] Alternative repair → ${this.baseURL}/api/analyze-repair-alternative`);
      const response = await this.client.post<RepairAnalysis>('/api/analyze-repair-alternative', payload);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  // ── SSE Streaming methods ─────────────────────────────────────────
  //
  // React Native's fetch implementation does not support response.body.getReader()
  // or ReadableStream. We use XMLHttpRequest with incremental responseText reading
  // for reliable SSE streaming on mobile (iOS/Android) and Web.

  /**
   * Internal: consume an SSE stream using XMLHttpRequest for React Native compatibility.
   */
  private _postSSE(
    url: string,
    payload: object,
    onToken: (token: string) => void,
    onDone: (analysis: RepairAnalysis) => void,
    onError: (message: string) => void
  ): void {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');

    let processedLength = 0;
    let accumulated = '';
    let lineBuffer = '';
    let isFinished = false;

    const processChunk = () => {
      const newText = xhr.responseText.slice(processedLength);
      if (!newText) return;
      processedLength = xhr.responseText.length;

      lineBuffer += newText;

      // Extract complete lines separated by \n
      const lines = lineBuffer.split('\n');
      // Keep incomplete last line in the buffer
      lineBuffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const payloadText = trimmed.slice(6); // strip 'data: '

        if (payloadText === '[DONE]') {
          if (!isFinished) {
            isFinished = true;
            try {
              const analysis = _cleanAndParseJSON(accumulated);
              onDone(analysis);
            } catch (parseErr) {
              onError(
                `Failed to parse AI response as JSON: ${parseErr instanceof Error ? parseErr.message : 'Unknown error'}`
              );
            }
          }
          return;
        }

        if (payloadText.startsWith('[ERROR]')) {
          if (!isFinished) {
            isFinished = true;
            const errorMsg = payloadText.slice(8).trim();
            if (
              errorMsg.toLowerCase().includes('ollama') ||
              errorMsg.toLowerCase().includes('unreachable')
            ) {
              onError(
                'Unable to reach the local model service. Please ensure Ollama is running on your server.'
              );
            } else {
              onError(errorMsg || 'Unknown streaming error');
            }
          }
          return;
        }

        // Accumulate raw token text and fire callback
        accumulated += payloadText;
        onToken(payloadText);
      }
    };

    xhr.onprogress = () => {
      processChunk();
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3 || xhr.readyState === 4) {
        processChunk();
      }

      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (!isFinished) {
            // Process any remaining data in lineBuffer
            if (lineBuffer.trim().startsWith('data: ')) {
              const payloadText = lineBuffer.trim().slice(6);
              if (payloadText === '[DONE]') {
                isFinished = true;
                try {
                  onDone(_cleanAndParseJSON(accumulated));
                } catch (parseErr) {
                  onError(`Failed to parse AI response as JSON: ${parseErr instanceof Error ? parseErr.message : 'Unknown error'}`);
                }
                return;
              } else if (!payloadText.startsWith('[ERROR]')) {
                accumulated += payloadText;
                onToken(payloadText);
              }
            }

            isFinished = true;
            if (accumulated.trim()) {
              try {
                const analysis = _cleanAndParseJSON(accumulated);
                onDone(analysis);
              } catch (parseErr) {
                onError(
                  `Failed to parse AI response as JSON: ${parseErr instanceof Error ? parseErr.message : 'Unknown error'}`
                );
              }
            } else {
              onError('Stream ended unexpectedly without a complete response.');
            }
          }
        } else if (!isFinished) {
          isFinished = true;
          let detail = `Server error (${xhr.status})`;
          try {
            const body = JSON.parse(xhr.responseText);
            detail = body.detail || detail;
          } catch { /* ignore */ }
          if (
            typeof detail === 'string' &&
            (detail.toLowerCase().includes('ollama') || detail.toLowerCase().includes('unreachable'))
          ) {
            onError(
              'Unable to reach the local model service. Please ensure Ollama is running on your server.'
            );
          } else {
            onError(detail);
          }
        }
      }
    };

    xhr.onerror = () => {
      if (!isFinished) {
        isFinished = true;
        onError('Can\'t reach the server. Check that the backend is running.');
      }
    };

    xhr.ontimeout = () => {
      if (!isFinished) {
        isFinished = true;
        onError('Request timed out while waiting for server response.');
      }
    };

    xhr.timeout = 90000;
    xhr.send(JSON.stringify(payload));
  }

  /** Stream repair analysis (camera mode) with real-time token callbacks. */
  async analyzeRepairStream(
    imageProblem: string,
    imageInventory: string,
    onToken: (token: string) => void,
    onDone: (analysis: RepairAnalysis) => void,
    onError: (message: string) => void
  ): Promise<void> {
    if (USE_MOCK) {
      onDone(MOCK_RESPONSE);
      return;
    }

    const preferredModel = await getPreferredModel();
    const payload: AnalyzeRepairRequest = {
      image_problem: imageProblem,
      image_inventory: imageInventory,
      ...(preferredModel && { preferred_model: preferredModel }),
    };
    console.log(`[API] Streaming → ${this.baseURL}/api/analyze-repair-stream`);
    this._postSSE(
      `${this.baseURL}/api/analyze-repair-stream`,
      payload,
      onToken,
      onDone,
      onError
    );
  }

  /** Stream repair analysis (text mode) with real-time token callbacks. */
  async analyzeRepairTextStream(
    textDescription: string,
    imageInventory: string,
    onToken: (token: string) => void,
    onDone: (analysis: RepairAnalysis) => void,
    onError: (message: string) => void
  ): Promise<void> {
    if (USE_MOCK) {
      onDone(MOCK_RESPONSE);
      return;
    }

    const preferredModel = await getPreferredModel();
    const payload: AnalyzeRepairRequest = {
      text_description: textDescription,
      image_inventory: imageInventory,
      ...(preferredModel && { preferred_model: preferredModel }),
    };
    console.log(`[API] Text stream → ${this.baseURL}/api/analyze-repair-text-stream`);
    this._postSSE(
      `${this.baseURL}/api/analyze-repair-text-stream`,
      payload,
      onToken,
      onDone,
      onError
    );
  }

  /** Stream alternative repair analysis with real-time token callbacks. */
  async analyzeRepairAlternativeStream(
    imageProblem: string,
    imageInventory: string,
    originalSteps: string[],
    repairStyle: 'quick' | 'heavy_duty' = 'quick',
    onToken: (token: string) => void,
    onDone: (analysis: RepairAnalysis) => void,
    onError: (message: string) => void
  ): Promise<void> {
    const preferredModel = await getPreferredModel();
    const payload = {
      image_problem: imageProblem,
      image_inventory: imageInventory,
      original_steps: originalSteps,
      repair_style: repairStyle,
      ...(preferredModel && { preferred_model: preferredModel }),
    };
    console.log(`[API] Alt stream → ${this.baseURL}/api/analyze-repair-alternative-stream`);
    this._postSSE(
      `${this.baseURL}/api/analyze-repair-alternative-stream`,
      payload,
      onToken,
      onDone,
      onError
    );
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

      if (
        status === 500 &&
        typeof detail === 'string' &&
        (detail.toLowerCase().includes('ollama') || detail.toLowerCase().includes('unreachable'))
      ) {
        throw new Error(
          'Unable to reach the local model service. Please ensure Ollama is running on your server.'
        );
      }

      throw new Error(`Server error (${status}): ${detail}`);
    }

    throw error as Error;
  }
}

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

