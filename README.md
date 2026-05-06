# SnapSolve - AI-Powered Frugal Engineering & Repair Application

## Overview

SnapSolve is an MVP application that uses AI (Google Gemini 1.5 Flash) to generate temporary repair guides. Users capture two photos: one of a broken object and one of available materials. The AI analyzes both images and returns a safe, step-by-step repair guide using **only** the materials shown in the second photo.

## Project Structure

```
snapsolve-backend/              # FastAPI backend server
  ├── main.py                   # API endpoint and Gemini integration
  ├── requirements.txt           # Python dependencies
  ├── .env.example              # Environment variables template
  └── .gitignore

snapsolve-mobile/               # React Native/Expo frontend
  ├── app/                      # Expo Router screens
  │   ├── _layout.tsx           # Root navigation layout
  │   └── (tabs)/
  │       ├── _layout.tsx       # Tab navigation
  │       ├── index.tsx         # Screen 1: Capture broken object
  │       ├── inventory.tsx     # Screen 2: Capture available materials
  │       └── results.tsx       # Screen 3: Display repair guide
  ├── components/
  │   ├── LoadingSpinner.tsx    # Loading indicator component
  │   └── ResultsContent.tsx    # Results display component
  ├── utils/
  │   ├── api.ts                # Backend API client
  │   └── ImageCompressor.ts    # Image compression utility
  ├── app.json                  # Expo configuration
  ├── package.json              # Dependencies
  ├── tsconfig.json             # TypeScript configuration
  └── .gitignore
```

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Server**: Uvicorn
- **AI Model**: Google Gemini 1.5 Flash (via google-generativeai)
- **Environment**: python-dotenv

### Frontend
- **Framework**: React Native with Expo (Managed Workflow)
- **Navigation**: Expo Router (File-based routing)
- **Camera**: expo-camera
- **Image Processing**: expo-image-manipulator
- **Styling**: Tailwind CSS (via NativeWind)
- **Icons**: lucide-react-native
- **Storage**: AsyncStorage (@react-native-async-storage)
- **HTTP Client**: Axios

## Quick Start

### 1. Backend Setup

#### Prerequisites
- Python 3.9+
- pip or poetry
- Google Gemini API Key ([Get it here](https://aistudio.google.com/app/apikeys))

#### Installation

```bash
cd snapsolve-backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from template
cp .env.example .env

# Add your Gemini API key to .env
# GEMINI_API_KEY=your_actual_api_key_here
```

#### Run Backend Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

**API Endpoint:**
- **POST** `/api/analyze-repair`
  - **Request**: JSON with `image_problem` and `image_inventory` (base64 strings)
  - **Response**: `RepairAnalysis` object with repair guide

**Health Check:**
- **GET** `/` → Returns `{"status": "SnapSolve API is running"}`

### 2. Frontend Setup

#### Prerequisites
- Node.js 16+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`

#### Installation

```bash
cd snapsolve-mobile

# Install dependencies
npm install
# or
yarn install
```

#### Configuration

Update the backend URL in [utils/api.ts](utils/api.ts#L35) if using a different server:

```typescript
const baseURL = 'http://localhost:8000'; // Change if needed
```

#### Run Frontend

```bash
# Start Expo development server
npm start
# or
expo start

# Press 'a' for Android or 'i' for iOS
# Or scan QR code with Expo Go app on your phone
```

## API Specification

### POST /api/analyze-repair

**Request Body:**
```json
{
  "image_problem": "base64_encoded_image_string",
  "image_inventory": "base64_encoded_image_string"
}
```

**Response (200 OK):**
```json
{
  "problem_identified": "Broken ceramic handle with sharp edges",
  "viability_score": 78,
  "safety_warning": "Avoid touching edges until wrapped; wear gloves during repair",
  "selected_materials": ["Duct tape", "Electrical tape", "Cloth wrap"],
  "steps": [
    "Clean the broken edges and remove any loose pieces",
    "Wrap the broken area tightly with duct tape...",
    "Apply electrical tape for additional reinforcement...",
    "Test grip strength and comfort before use"
  ]
}
```

**Error (500):**
```json
{
  "detail": "Error analyzing repair: [error message]"
}
```

## Design Philosophy

### Industrial Minimalist Aesthetic
- Clean monochrome palette (whites, light grays, dark slate)
- Subtle shadows and rounded corners for depth
- No gradients, neon colors, or decorative "AI sparkles"
- Semantic colors strictly for data:
  - **Green** (bg-green-50): Viability score ≥70%
  - **Yellow** (bg-yellow-50): Viability score 40-70%
  - **Red** (bg-red-50): Viability score <40%
  - Safety warnings use soft red (`bg-red-50`) with bold borders

### UX Flow
1. **Screen 1**: Capture broken object
   - Supports up to 3840x2160 (4K) native resolution
   - Images compressed to 800x800 at 70% JPEG quality before transmission
   
2. **Screen 2**: Capture available materials
   - Shows loading spinner with "Analyzing mechanical properties..."
   - Sends both compressed images to backend
   
3. **Screen 3**: Display repair guide
   - Problem description
   - Viability score with color coding
   - Safety warning prominently displayed
   - Materials checklist
   - Step-by-step instructions with numbered steps

## Code Quality

### Key Principles
- **Readable**: Early returns in React, clear variable names
- **Maintainable**: Inline comments explaining *why*, not just *what*
- **Type-Safe**: Full TypeScript with Pydantic schemas
- **Compressed**: Images reduced to 800x800 before API transmission
- **Responsive**: Mobile-first design using Tailwind utilities

### Image Processing
Images are automatically:
1. Resized to max 800x800 pixels (maintains aspect ratio)
2. Compressed to 70% JPEG quality
3. Converted to base64 strings
4. Sent as JSON payload (not multipart)

This reduces API latency and token consumption.

## Troubleshooting

### Backend Issues

**"GEMINI_API_KEY not set"**
- Ensure `.env` file exists in `snapsolve-backend/`
- Check that `GEMINI_API_KEY` is set correctly: `GEMINI_API_KEY=sk-...`

**CORS errors**
- Backend already configured with CORS enabled
- Update `allow_origins` in [main.py](main.py#L32) for production

**API timeout**
- Increase timeout in [api.ts](utils/api.ts#L25) if needed
- Ensure image compression is working (should be <2MB per image)

### Frontend Issues

**Camera permission denied**
- On iOS: Settings → SnapSolve → Camera/Photos → Allow
- On Android: Permissions → Grant Camera Access

**Images not sending to backend**
- Verify backend is running: `curl http://localhost:8000/`
- Check backend URL in [api.ts](utils/api.ts#L35)
- Ensure both images are captured before sending

**AsyncStorage errors**
- Clear app cache/data and restart
- On web, uses localStorage as fallback

## Development

### Adding New Features

1. **New Camera Filter**: Edit camera overlay in [index.tsx](app/%28tabs%29/index.tsx)
2. **Custom Viability Colors**: Update `getViabilityColor()` in [ResultsContent.tsx](components/ResultsContent.tsx#L21)
3. **Backend Endpoint**: Add routes to [main.py](snapsolve-backend/main.py)
4. **New Screens**: Create `.tsx` files in `app/` or `app/(tabs)/`

### Running Tests

Backend:
```bash
pytest snapsolve-backend/
```

Frontend:
```bash
npm test
```

## Deployment

### Backend (Production)
```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

### Frontend (Production)
```bash
eas build --platform all
eas submit --platform all
```

See [Expo Documentation](https://docs.expo.dev/distribution/publishing/) for details.

## API System Prompt

The backend uses this hardcoded prompt to control AI behavior:

> You are an expert frugal mechanical engineer. You will receive two images. Image 1 is a broken physical object. Image 2 is a collection of random available materials. Calculate the physical properties of the break and the mechanical properties of the available materials. Generate a temporary repair guide using ONLY the materials in Image 2. You MUST return your response entirely in valid JSON format without markdown code blocks.

The response schema is strictly enforced in the backend and frontend.

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review inline code comments
3. Check FastAPI docs: `http://localhost:8000/docs`
4. Check Expo logs: `expo start --verbose`

---

**Built with ❤️ for frugal engineers everywhere**
