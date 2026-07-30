# SnapSolve Architecture Overview

## System Design

```
┌─────────────────────────────────────────────────────────────┐
│                   React Native App (Expo)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Screen 1: Camera (Problem) / Text Description        │  │
│  │ Screen 2: Camera (Inventory) → Materials Captured    │  │
│  │           ↓                                          │  │
│  │   ImageCompressor.ts (800x800, 70% quality JPEG)     │  │
│  │           ↓                                          │  │
│  │   Base64 Encoding & AsyncStorage Cache               │  │
│  │           ↓                                          │  │
│  │   api.ts → XMLHttpRequest POST /api/*-stream         │  │
│  │           ↓                                          │  │
│  │   LoadingSpinner: Live Token Stream Preview (▌)      │  │
│  │           ↓                                          │  │
│  │   Screen 3: Results (Repair Guide + Alt Options)     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Storage: AsyncStorage + Local Cache                        │
│  Styling: Vanilla CSS Design System + Native Theme Tokens    │
│  Navigation: Expo Router (file-based)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    CORS Middleware
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend Server                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Endpoints:                                           │  │
│  │   ├─ POST /api/analyze-repair-stream (Camera)       │  │
│  │   ├─ POST /api/analyze-repair-text-stream (Text)    │  │
│  │   ├─ POST /api/analyze-repair-alternative-stream   │  │
│  │   ├─ Auth: /api/register, /api/login, /api/profile  │  │
│  │   └─ Data: /api/history, /api/toolbox              │  │
│  │                                                      │  │
│  │ Processing:                                          │  │
│  │   ├─ Validate payload (Pydantic schema)              │  │
│  │   ├─ Load prompt template (Engineering constraints)  │  │
│  │   ├─ Invoke Ollama Client (keep_alive=-1, stream)   │  │
│  │   └─ Yield Server-Sent Events (data: <token>\n\n)    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Framework: FastAPI (async, type-safe)                     │
│  Server: Uvicorn ASGI                                      │
│  Auth: JWT Tokens + Passlib/Bcrypt                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
                 OLLAMA_BASE_URL (Local / HTTP)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            Local Ollama Instance (Qwen 2.5 VL)              │
│  ├─ Model: qwen2.5vl:3b                                     │
│  ├─ Memory: Loaded persistently in VRAM/RAM (keep_alive=-1) │
│  ├─ Vision Analysis: Structural break & material identification│
│  ├─ Streaming Generation: Real-time token output            │
│  └─ Schema Enforcement: Strict JSON repair guide format     │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow & User Journey

### 1. Photo / Text Capture
- **Camera Mode**: User captures a broken physical object and an inventory of available repair materials.
- **Text Mode**: User types a description of the failure and captures a materials photo.

### 2. Image Compression (Frontend)
```
Original Image (4K: ~4MB)
     ↓
expo-image-manipulator
     ↓
Resize: 800x800 (aspect ratio preserved) | Quality: 70% JPEG
     ↓
Base64 String (~200KB) stored transiently in AsyncStorage
```

### 3. Real-Time SSE Streaming Request (Frontend to Backend)
```
XMLHttpRequest POST /api/analyze-repair-stream
Payload: { "image_problem": "base64...", "image_inventory": "base64..." }
Header: Content-Type: application/json
```
- React Native uses `XMLHttpRequest` with `onprogress` / `onreadystatechange` to consume the raw chunked text response incrementally.

### 4. Backend Processing & LLM Execution
- FastAPI validates the payload with Pydantic (`AnalyzeRepairRequest`).
- Formats prompt with strict JSON output instructions.
- Invokes `ollama_client.chat(model='qwen2.5vl:3b', messages=[...], stream=True, keep_alive=-1)`.
- Returns a `StreamingResponse(media_type="text/event-stream")` yielding SSE tokens (`data: <token>\n\n`).

### 5. Two-Phase UI Loading & Live Preview
- **Phase 1 (Streaming)**: As raw JSON tokens arrive, `api.ts` triggers `onToken(token)`. `<LoadingSpinner>` renders the growing token text inside a scrollable monospace preview box with a blinking `▌` cursor (~0.3s response onset).
- **Phase 2 (Completion)**: On `data: [DONE]`, `api.ts` cleans markdown fences (`_cleanAndParseJSON`) and validates the full JSON object.

### 6. Results Rendering & History Persistence
- App navigates to `ResultsContent` displaying:
  - Failure identification & difficulty tag
  - Safety warning callout
  - Selected materials & step-by-step instructions
  - Alternative repair options (Quick vs. Heavy Duty)
- Analysis automatically saves to device local storage (`AsyncStorage`) and syncs to backend history (`POST /api/history`) if authenticated.

---

## Key Design Decisions

### 1. Local AI Inference with Ollama (`qwen2.5vl:3b`)
- **Why**: Zero cloud API fees, complete privacy for user photos, and full offline/on-premise capability.
- **Model**: `qwen2.5vl:3b` balances vision-language reasoning accuracy with low latency on local hardware.

### 2. Persistent Model In-Memory Loading (`keep_alive: "-1"`)
- **Why**: Prevents Ollama from unloading the model weights from GPU/system RAM between requests.
- **Benefit**: Eliminates the 5–10 second model reload penalty on subsequent scans.

### 3. Server-Sent Events (SSE) via `XMLHttpRequest`
- **Why**: React Native's standard `fetch()` implementation does not support `ReadableStream` (`response.body.getReader()`).
- **Solution**: `XMLHttpRequest` with `onprogress` chunk slicing parses SSE lines reliably across iOS, Android, and Web platforms.

### 4. Hardcoded Engineering System Prompts
- **Why**: Enforces safe, realistic mechanical repair constraints and guarantees exact JSON keys (`problem_identified`, `difficulty`, `safety_warning`, `selected_materials`, `steps`).

### 5. Saved Toolbox Optimization
- Users can take a photo of their primary workbench/toolbox once (`POST /api/toolbox`).
- Future repairs automatically reuse the saved toolbox photo, skipping the inventory capture step.

---

## Type Safety & Schemas

### Backend (Pydantic Models)
```python
class AnalyzeRepairRequest(BaseModel):
    image_problem: str
    image_inventory: str
    preferred_model: Optional[str] = None

class AnalyzeRepairTextRequest(BaseModel):
    text_description: str
    image_inventory: str
    preferred_model: Optional[str] = None

class RepairAnalysis(BaseModel):
    problem_identified: str
    difficulty: str  # "Easy", "Medium", or "Hard"
    estimated_time: str
    safety_warning: str
    selected_materials: list[str]
    steps: list[str]
    substitutions: Optional[list[dict]] = None
    durability_estimate: Optional[str] = None
    warning_signs: Optional[list[str]] = None
    permanent_fix_advice: Optional[str] = None
```

### Frontend (TypeScript Interfaces)
```typescript
export interface RepairAnalysis {
  problem_identified: string;
  difficulty: string;
  estimated_time: string;
  safety_warning: string;
  selected_materials: string[];
  steps: string[];
  substitutions?: Array<{ original: string; substitute: string; notes: string }>;
  durability_estimate?: string;
  warning_signs?: string[];
  permanent_fix_advice?: string;
}
```

---

## Security & Resilience

1. **Authentication**: JWT bearer token authentication for profile, history sync, and toolbox management.
2. **Graceful Connection Failures**: If local Ollama is offline, backend returns a clear error message: *"Ollama service is not running or unreachable. Please ensure Ollama is running at http://localhost:11434."*
3. **CORS Configuration**: Configured via FastAPI `CORSMiddleware`.
4. **Defensive JSON Parsing**: Backend and frontend strip markdown wrappers (````json ... ````) before parsing.

---

**Architecture Version**: 2.0 (Local AI & Real-time Streaming)  
**Last Updated**: July 2026  
**Status**: Active Production  
