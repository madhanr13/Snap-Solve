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
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
    viability_score: int  # 0-100 scale
    safety_warning: str
    selected_materials: list[str]
    steps: list[str]


# Hardcoded system prompt for the LLM
SYSTEM_PROMPT = """You are an expert frugal mechanical engineer. You will receive two images. Image 1 is a broken physical object. Image 2 is a collection of random available materials. 
Calculate the physical properties of the break and the mechanical properties of the available materials. Generate a temporary repair guide using ONLY the materials in Image 2. 
You MUST return your response entirely in valid JSON format without markdown code blocks. Use this exact schema:
{
  "problem_identified": "Short description of the structural failure.",
  "viability_score": [integer 0-100 indicating how safe/likely the fix is to hold],
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

            # Validate and clamp viability_score to 0-100
            viability_score = int(parsed_response.get("viability_score", 50))
            viability_score = max(0, min(100, viability_score))

            analysis = RepairAnalysis(
                problem_identified=parsed_response.get("problem_identified", ""),
                viability_score=viability_score,
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
