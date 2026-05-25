"""
SnapSolve Backend - FastAPI server for AI-powered repair analysis.
Accepts two base64-encoded images and uses Google Gemini
to generate a safe temporary repair guide using only available materials.
"""

import json
import os
import time
from typing import Optional

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import (
    RegisterRequest, LoginRequest, AuthResponse,
    register_user, login_user, verify_token,
    save_user_history, get_user_history,
)

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="SnapSolve API",
    description="AI-powered temporary repair guide generator",
    version="1.0.0"
)

# Configure CORS to allow React Native/Expo frontend to communicate during development
# In production, restrict origins to your actual frontend domain
app.add_middleware(
    CORSMiddleware,
    # NOTE: In production, use specific origins: ["http://localhost:8081", "https://yourdomain.com"]
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Google Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not set in .env file")

genai.configure(api_key=GEMINI_API_KEY)


# Pydantic model for request validation
class AnalyzeRepairRequest(BaseModel):
    """Request payload containing two base64-encoded images."""
    image_problem: str  # Base64 string of broken object
    image_inventory: str  # Base64 string of available materials
    preferred_model: Optional[str] = None  # Optional model override from frontend


# Pydantic model for response validation
class RepairAnalysis(BaseModel):
    """Response payload containing repair guide as structured JSON."""
    problem_identified: str
    difficulty: str  # "Easy", "Medium", or "Hard"
    estimated_time: str  # e.g. "~10 minutes", "~1 hour"
    safety_warning: str
    selected_materials: list[str]
    steps: list[str]


# Hardcoded system prompt for the LLM
SYSTEM_PROMPT = """You are an expert frugal mechanical engineer. You will receive two images. Image 1 is a broken physical object. Image 2 is a collection of random available materials. 
Calculate the physical properties of the break and the mechanical properties of the available materials. Generate a temporary repair guide using ONLY the materials in Image 2. 
You MUST return your response entirely in valid JSON format without markdown code blocks. Use this exact schema:
{
  "problem_identified": "Short description of the structural failure.",
  "difficulty": "Easy" or "Medium" or "Hard",
  "estimated_time": "Estimated time to complete the repair, e.g. ~5 minutes, ~30 minutes, ~1 hour",
  "safety_warning": "One crucial safety rule or limitation regarding this specific temporary fix.",
  "selected_materials": ["item 1", "item 2"],
  "steps": [
    "Step 1 instructions",
    "Step 2 instructions"
  ]
}"""


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "SnapSolve API is running"}


# ── Auth Endpoints ───────────────────────────────────────────────────

@app.post("/api/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """Register a new user account."""
    return register_user(request)


@app.post("/api/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Log in and receive a JWT token."""
    return login_user(request)


@app.get("/api/profile")
async def profile(user: dict = Depends(verify_token)):
    """Get the current user's profile (requires auth)."""
    return {"user_id": user["user_id"], "username": user["username"]}


@app.get("/api/history")
async def get_history(user: dict = Depends(verify_token)):
    """Get the current user's repair history."""
    try:
        history = get_user_history(user["user_id"])
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/history")
async def save_history(history_item: dict, user: dict = Depends(verify_token)):
    """Save a repair analysis to the user's history."""
    try:
        save_user_history(user["user_id"], history_item)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze-repair", response_model=RepairAnalysis)
async def analyze_repair(request: AnalyzeRepairRequest) -> RepairAnalysis:
    """
    Analyze a broken object and available materials, then generate a temporary repair guide.

    Args:
        request: Contains image_problem and image_inventory as base64 strings.

    Returns:
        RepairAnalysis: Structured JSON with repair guide.

    Raises:
        HTTPException: If API call fails or response is invalid JSON.
    """
    # Models to try in order — if one is rate-limited, fall back to the next.
    DEFAULT_MODELS = [
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",
    ]

    # If client sent a preferred model, put it first in the queue
    if request.preferred_model:
        MODELS = [request.preferred_model] + [m for m in DEFAULT_MODELS if m != request.preferred_model]
    else:
        MODELS = DEFAULT_MODELS

    # Prepare the prompt with both images
    content = [
        SYSTEM_PROMPT,
        {
            "mime_type": "image/jpeg",
            "data": request.image_problem,
        },
        {
            "mime_type": "image/jpeg",
            "data": request.image_inventory,
        },
    ]

    last_error = None

    for model_name in MODELS:
        try:
            model = genai.GenerativeModel(model_name=model_name)

            # Retry up to 2 times for transient 429 rate-limit errors
            for attempt in range(3):
                try:
                    response = model.generate_content(content)
                    break  # Success — exit retry loop
                except Exception as retry_err:
                    if "429" in str(retry_err) and attempt < 2:
                        wait = (attempt + 1) * 10  # 10s, 20s backoff
                        print(f"[SnapSolve] 429 on {model_name}, retrying in {wait}s (attempt {attempt+1}/3)")
                        time.sleep(wait)
                        continue
                    raise  # Not a 429, or final attempt — propagate

            # Extract and clean the response text
            response_text = response.text.strip()

            # Remove markdown code blocks if present (defensive parsing)
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

            response_text = response_text.strip()

            # Parse the JSON response
            try:
                parsed_response = json.loads(response_text)
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to parse LLM response as JSON: {str(e)}"
                )

            # Normalize difficulty
            raw_diff = parsed_response.get("difficulty", "Medium")
            if raw_diff not in ("Easy", "Medium", "Hard"):
                raw_diff = "Medium"

            analysis = RepairAnalysis(
                problem_identified=parsed_response.get("problem_identified", ""),
                difficulty=raw_diff,
                estimated_time=parsed_response.get("estimated_time", "~15 minutes"),
                safety_warning=parsed_response.get("safety_warning", ""),
                selected_materials=parsed_response.get("selected_materials", []),
                steps=parsed_response.get("steps", []),
            )

            print(f"[SnapSolve] Success with model: {model_name}")
            return analysis

        except HTTPException:
            raise
        except Exception as e:
            last_error = e
            error_str = str(e)
            # If it's a quota / rate-limit error, try the next model
            if "429" in error_str or "quota" in error_str.lower():
                print(f"[SnapSolve] Quota exhausted on {model_name}, trying next model...")
                continue
            # For any other error, fail immediately
            raise HTTPException(
                status_code=500,
                detail=f"Error analyzing repair: {error_str}"
            )

    # All models exhausted
    raise HTTPException(
        status_code=429,
        detail=f"All AI models are rate-limited. Please wait a minute and try again. Last error: {str(last_error)}"
    )


# Run the server: uvicorn main:app --reload


# ── Feature 4: Text-only mode ───────────────────────────────────────

class AnalyzeRepairTextRequest(BaseModel):
    """Request with text description instead of problem image."""
    text_description: str  # User's text description of the problem
    image_inventory: str   # Base64 string of available materials
    preferred_model: Optional[str] = None

TEXT_SYSTEM_PROMPT = """You are an expert frugal mechanical engineer. The user will describe a broken object in text, and you will also receive an image of available materials.
Generate a temporary repair guide using ONLY the materials visible in the image.
You MUST return your response entirely in valid JSON format without markdown code blocks. Use this exact schema:
{
  "problem_identified": "Short description of the structural failure based on the user's description.",
  "difficulty": "Easy" or "Medium" or "Hard",
  "estimated_time": "Estimated time to complete the repair, e.g. ~5 minutes, ~30 minutes, ~1 hour",
  "safety_warning": "One crucial safety rule or limitation regarding this specific temporary fix.",
  "selected_materials": ["item 1", "item 2"],
  "steps": [
    "Step 1 instructions",
    "Step 2 instructions"
  ]
}"""


@app.post("/api/analyze-repair-text", response_model=RepairAnalysis)
async def analyze_repair_text(request: AnalyzeRepairTextRequest) -> RepairAnalysis:
    """Analyze a text-described problem and material photo to generate a repair guide."""
    DEFAULT_MODELS = [
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",
    ]

    if request.preferred_model:
        MODELS = [request.preferred_model] + [m for m in DEFAULT_MODELS if m != request.preferred_model]
    else:
        MODELS = DEFAULT_MODELS

    content = [
        TEXT_SYSTEM_PROMPT,
        f"The user describes the broken object as: {request.text_description}",
        {
            "mime_type": "image/jpeg",
            "data": request.image_inventory,
        },
    ]

    last_error = None

    for model_name in MODELS:
        try:
            model = genai.GenerativeModel(model_name=model_name)
            for attempt in range(3):
                try:
                    response = model.generate_content(content)
                    break
                except Exception as retry_err:
                    if "429" in str(retry_err) and attempt < 2:
                        wait = (attempt + 1) * 10
                        print(f"[SnapSolve] 429 on {model_name}, retrying in {wait}s (attempt {attempt+1}/3)")
                        time.sleep(wait)
                        continue
                    raise

            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            try:
                parsed_response = json.loads(response_text)
            except json.JSONDecodeError as e:
                raise HTTPException(status_code=500, detail=f"Failed to parse LLM response as JSON: {str(e)}")

            raw_diff = parsed_response.get("difficulty", "Medium")
            if raw_diff not in ("Easy", "Medium", "Hard"):
                raw_diff = "Medium"

            analysis = RepairAnalysis(
                problem_identified=parsed_response.get("problem_identified", ""),
                difficulty=raw_diff,
                estimated_time=parsed_response.get("estimated_time", "~15 minutes"),
                safety_warning=parsed_response.get("safety_warning", ""),
                selected_materials=parsed_response.get("selected_materials", []),
                steps=parsed_response.get("steps", []),
            )
            print(f"[SnapSolve] Text mode success with model: {model_name}")
            return analysis

        except HTTPException:
            raise
        except Exception as e:
            last_error = e
            error_str = str(e)
            if "429" in error_str or "quota" in error_str.lower():
                print(f"[SnapSolve] Quota exhausted on {model_name}, trying next model...")
                continue
            raise HTTPException(status_code=500, detail=f"Error analyzing repair: {error_str}")

    raise HTTPException(
        status_code=429,
        detail=f"All AI models are rate-limited. Please wait a minute and try again. Last error: {str(last_error)}"
    )
