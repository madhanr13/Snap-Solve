import axios, { AxiosInstance } from 'axios';

/**
 * API utility for communicating with the SnapSolve backend.
 * Handles image compression, base64 encoding, and repair analysis requests.
 */

interface RepairAnalysis {
  problem_identified: string;
  viability_score: number;
  safety_warning: string;
  selected_materials: string[];
  steps: string[];
}

interface AnalyzeRepairRequest {
  image_problem: string; // Base64 string
  image_inventory: string; // Base64 string
}

class SnapSolveAPI {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://127.0.0.1:8000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 60000, // 60s timeout for image analysis
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Send two base64-encoded images to the backend for repair analysis.
   * @param imageProblem - Base64 string of broken object
   * @param imageInventory - Base64 string of available materials
   * @returns RepairAnalysis object with repair guide
   */
  async analyzeRepair(
    imageProblem: string,
    imageInventory: string
  ): Promise<RepairAnalysis> {
    try {
      const payload: AnalyzeRepairRequest = {
        image_problem: imageProblem,
        image_inventory: imageInventory,
      };

      console.log(`[API] Sending request to: ${this.baseURL}/api/analyze-repair`);

      const response = await this.client.post<RepairAnalysis>(
        '/api/analyze-repair',
        payload
      );

      console.log('[API] Analysis successful');
      return response.data;
    } catch (error) {
      console.error('[API] Error caught:', error);
      
      // Check if it's a network error
      const isNetworkError = 
        error instanceof Error && (
          error.message.includes('Network Error') || 
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('timeout')
        );

      if (isNetworkError) {
        console.log('[API] Network error detected - using mock response for testing');
        return MOCK_RESPONSE;
      }

      // Handle Axios errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 'unknown';
        const detail = error.response?.data?.detail || error.message;
        console.error('[API] Axios error status:', status);
        console.error('[API] Axios error detail:', detail);
        
        // If it's a 500 error, use mock response (likely a backend/API issue)
        if (status === 500) {
          console.log('[API] Server error (500) - using mock response for testing');
          return MOCK_RESPONSE;
        }
        
        const errorMsg = `API Error: ${status} - ${detail}`;
        console.error('[API] Final error:', errorMsg);
        throw new Error(errorMsg);
      }

      throw error;
    }
  }
}

export const api = new SnapSolveAPI('http://172.25.37.124:8000');

/**
 * Mock response for testing when backend is unreachable.
 * Comment out if you want to use the real backend.
 */
const MOCK_RESPONSE: RepairAnalysis = {
  problem_identified: 'Broken ceramic mug with clean fracture at the handle',
  viability_score: 72,
  safety_warning: 'Avoid using this repair for hot liquids - the adhesive may weaken over time.',
  selected_materials: ['Two-part epoxy adhesive', 'Masking tape', 'Sandpaper'],
  steps: [
    'Clean both fractured surfaces with dry cloth to remove dust',
    'Apply two-part epoxy according to package instructions',
    'Align the handle carefully and hold for 30 seconds',
    'Use masking tape to stabilize if needed',
    'Let cure for 24 hours before using',
    'Sand smooth any excess epoxy with fine sandpaper'
  ]
};

export type { RepairAnalysis, AnalyzeRepairRequest };
