# SnapSolve Setup Guide

## System Requirements
- **Backend**: Python 3.9+, pip/poetry
- **Frontend**: Node.js 16+, npm/yarn
- **Mobile**: iOS 13+ or Android 8+
- **API Key**: Google Gemini API key (free tier available)

## Step-by-Step Backend Setup (Windows)

### 1. Install Python
- Download from [python.org](https://www.python.org/downloads/)
- Ensure "Add Python to PATH" is checked
- Verify: `python --version`

### 2. Navigate to backend folder
```powershell
cd d:\PLACEMENT_finalboss\Product_Design_Development\snapsolve-backend
```

### 3. Create virtual environment
```powershell
python -m venv .venv
```

### 4. Activate virtual environment
```powershell
.\.venv\Scripts\Activate.ps1
```

If you see an execution policy error, run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

### 5. Install dependencies
```powershell
pip install -r requirements.txt
```

### 6. Create .env file
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

Edit `.env` and add your API key:
```
GEMINI_API_KEY=your_actual_key_here
```

### 7. Run the server
```powershell
uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Visit `http://localhost:8000/docs` for interactive API documentation.

## Step-by-Step Frontend Setup (Windows)

### 1. Install Node.js
- Download from [nodejs.org](https://nodejs.org/)
- LTS version recommended
- Verify: `node --version` and `npm --version`

### 2. Install Expo CLI
```powershell
npm install -g expo-cli
```

### 3. Navigate to frontend folder
```powershell
cd d:\PLACEMENT_finalboss\Product_Design_Development\snapsolve-mobile
```

### 4. Install dependencies
```powershell
npm install
```

### 5. Update backend URL (if needed)
Edit `utils/api.ts`:
```typescript
const baseURL = 'http://YOUR_BACKEND_IP:8000';
```

### 6. Start development server
```powershell
npm start
```

Or with verbose logging:
```powershell
expo start --verbose
```

### 7. Run on device
- **Android**: Press `a` → Opens Android emulator
- **iOS**: Press `i` → Opens iOS simulator
- **Phone**: Install Expo Go app → Scan QR code

## Getting Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Click "Create API key"
3. Select "Google Cloud project" → "Create new project"
4. Copy the generated key
5. Paste into `.env` file in backend folder

**Free Tier Limits**:
- 60 requests per minute
- Up to 1500 requests per day
- Sufficient for development and testing

## Troubleshooting

### Backend won't start

**Error: "GEMINI_API_KEY not set"**
```bash
# Check if .env exists in the right location
dir .env

# Verify content
type .env
```

**Error: "Address already in use"**
```bash
# Kill the process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or use a different port
uvicorn main:app --port 8001
```

### Frontend won't connect to backend

**Issue**: Expo on phone can't reach localhost
- Solution: Use your computer's IP address instead
  ```powershell
  ipconfig
  # Use IPv4 Address (e.g., 192.168.x.x)
  # Update in utils/api.ts: baseURL = 'http://192.168.x.x:8000'
  ```

**Issue**: CORS errors in console
- Backend already has CORS enabled
- Verify both services are running on correct ports

### Camera permission issues

**Android**:
1. Settings → App permissions → SnapSolve
2. Grant Camera and Storage permissions

**iOS**:
1. Settings → SnapSolve
2. Enable Camera and Photos

## Testing the Full Flow

### 1. Start Backend
```bash
cd snapsolve-backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

### 2. Start Frontend
```bash
# In another terminal
cd snapsolve-mobile
npm start
```

### 3. Test via API (Optional)
```bash
# Get health status
curl http://localhost:8000/

# View API docs
# Open browser to http://localhost:8000/docs
```

### 4. Use the App
- Capture a broken object photo
- Capture available materials photo
- Wait for analysis (10-20 seconds)
- View repair guide with steps

## Development Tips

### Hot Reloading
- **Backend**: Uvicorn auto-reloads on file changes
- **Frontend**: Expo hot-reloads on save (press `r` in terminal)

### Debug Logging
```typescript
// Frontend
console.log('Debug message:', data);

# Backend
import logging
logging.debug("Debug message")
```

### API Testing
```bash
# Test endpoint without app
curl -X POST http://localhost:8000/api/analyze-repair \
  -H "Content-Type: application/json" \
  -d '{
    "image_problem": "base64string1",
    "image_inventory": "base64string2"
  }'
```

## Performance Optimization

### Image Compression
Images are already optimized:
- Max 800x800 pixels
- 70% JPEG quality
- Result: ~50-200KB per image (vs 4MB+ raw)

### API Response Time
- Cold start: 5-10 seconds
- Warm cache: 2-3 seconds
- Network time: 1-2 seconds

## Next Steps

1. ✅ Setup completed
2. Test with sample photos
3. Customize repair guide format (if needed)
4. Add database for history tracking
5. Deploy to production (Render, Railway, AWS, etc.)

## Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Gemini API Reference](https://ai.google.dev/models/gemini)

---

**Questions?** Check the main README.md or review inline code comments.
