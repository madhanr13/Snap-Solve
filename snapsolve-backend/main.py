"""
SnapSolve Backend - FastAPI server for AI-powered repair analysis.
Accepts two base64-encoded images and uses a local Ollama instance
running Qwen 2.5 VL to generate a safe temporary repair guide
using only available materials.
"""

import json
import os
import base64
from typing import Optional

import ollama
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth import (
    RegisterRequest, LoginRequest, AuthResponse,
    register_user, login_user, verify_token,
    save_user_history, get_user_history,
    save_toolbox_image, get_toolbox_image,
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

# Configure Ollama connection
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = "qwen2.5vl:3b"

# Initialize the Ollama client pointing at the configured host
ollama_client = ollama.Client(host=OLLAMA_BASE_URL)


# Pydantic model for request validation
class AnalyzeRepairRequest(BaseModel):
    """Request payload containing two base64-encoded images."""
    image_problem: str  # Base64 string of broken object
    image_inventory: str  # Base64 string of available materials
    preferred_model: Optional[str] = None  # Kept for API compatibility (ignored)


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


def _call_ollama(prompt: str, images: list[str]) -> dict:
    """
    Call the local Ollama instance with prompt text and base64-encoded images.

    Args:
        prompt: The text prompt/instructions for the model.
        images: List of base64-encoded image strings.

    Returns:
        Parsed JSON dict from the model response.

    Raises:
        HTTPException: If Ollama is unreachable or the response is invalid JSON.
    """
    try:
        response = ollama_client.chat(
            model=OLLAMA_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                    "images": images,
                }
            ],
            keep_alive=-1,
        )
    except Exception as e:
        error_str = str(e)
        # Check for connection-related errors indicating Ollama is not running
        if any(keyword in error_str.lower() for keyword in [
            "connect", "refused", "unreachable", "timeout",
            "connection", "httpx", "could not", "failed to"
        ]):
            raise HTTPException(
                status_code=500,
                detail="Ollama service is not running or unreachable. "
                       "Please ensure Ollama is running on your server "
                       f"at {OLLAMA_BASE_URL}."
            )
        raise HTTPException(
            status_code=500,
            detail=f"Error communicating with Ollama: {error_str}"
        )

    # Extract response text
    response_text = response["message"]["content"].strip()

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

    return parsed_response


def _build_analysis(parsed: dict) -> RepairAnalysis:
    """Build a RepairAnalysis from a parsed JSON dict, normalizing fields."""
    raw_diff = parsed.get("difficulty", "Medium")
    if raw_diff not in ("Easy", "Medium", "Hard"):
        raw_diff = "Medium"

    return RepairAnalysis(
        problem_identified=parsed.get("problem_identified", ""),
        difficulty=raw_diff,
        estimated_time=parsed.get("estimated_time", "~15 minutes"),
        safety_warning=parsed.get("safety_warning", ""),
        selected_materials=parsed.get("selected_materials", []),
        steps=parsed.get("steps", []),
        substitutions=parsed.get("substitutions", []),
        durability_estimate=parsed.get("durability_estimate", ""),
        warning_signs=parsed.get("warning_signs", []),
        permanent_fix_advice=parsed.get("permanent_fix_advice", ""),
    )


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
        HTTPException: If Ollama call fails or response is invalid JSON.
    """
    parsed = _call_ollama(
        prompt=SYSTEM_PROMPT,
        images=[request.image_problem, request.image_inventory],
    )

    analysis = _build_analysis(parsed)
    print(f"[SnapSolve] Success with model: {OLLAMA_MODEL}")
    return analysis


# Run the server: uvicorn main:app --reload


# ── Feature 4: Text-only mode ───────────────────────────────────────

class AnalyzeRepairTextRequest(BaseModel):
    """Request with text description instead of problem image."""
    text_description: str  # User's text description of the problem
    image_inventory: str   # Base64 string of available materials
    preferred_model: Optional[str] = None  # Kept for API compatibility (ignored)

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
    prompt = (
        f"{TEXT_SYSTEM_PROMPT}\n\n"
        f"The user describes the broken object as: {request.text_description}"
    )

    parsed = _call_ollama(
        prompt=prompt,
        images=[request.image_inventory],
    )

    analysis = _build_analysis(parsed)
    print(f"[SnapSolve] Text mode success with model: {OLLAMA_MODEL}")
    return analysis


# ── Feature: Alternative Repair Method ──────────────────────────────

class AlternativeRepairRequest(BaseModel):
    """Request for an alternative repair approach."""
    image_problem: str
    image_inventory: str
    original_steps: list[str]
    repair_style: str = "quick"  # "quick" or "heavy_duty"
    preferred_model: Optional[str] = None  # Kept for API compatibility (ignored)


@app.post("/api/analyze-repair-alternative", response_model=RepairAnalysis)
async def analyze_repair_alternative(request: AlternativeRepairRequest) -> RepairAnalysis:
    """Generate an alternative repair approach using a different technique."""
    style_instruction = (
        "Prioritize SPEED over durability — the quickest possible fix."
        if request.repair_style == "quick"
        else "Prioritize DURABILITY over ease — the most long-lasting fix."
    )

    alt_prompt = f"""You are an expert frugal mechanical engineer. You previously gave a repair guide for this broken object.
The user wants a COMPLETELY DIFFERENT approach. Here were the original steps (DO NOT repeat these):
{chr(10).join(f'- {s}' for s in request.original_steps)}

Generate an alternative repair using the same available materials but a DIFFERENT technique.
Style: {style_instruction}

You MUST return your response entirely in valid JSON format without markdown code blocks. Use this exact schema:
{{
  "problem_identified": "Short description of the structural failure.",
  "difficulty": "Easy" or "Medium" or "Hard",
  "estimated_time": "Estimated time to complete the repair",
  "safety_warning": "One crucial safety rule.",
  "selected_materials": ["item 1", "item 2"],
  "steps": ["Step 1", "Step 2"],
  "substitutions": [{{"original": "material", "substitute": "alternative", "notes": "trade-off"}}],
  "durability_estimate": "How long this fix should last",
  "warning_signs": ["Sign to watch"],
  "permanent_fix_advice": "What to do for a permanent fix"
}}"""

    parsed = _call_ollama(
        prompt=alt_prompt,
        images=[request.image_problem, request.image_inventory],
    )

    analysis = _build_analysis(parsed)
    print(f"[SnapSolve] Alternative repair success with model: {OLLAMA_MODEL}")
    return analysis


# ── Feature: Saved Toolbox ──────────────────────────────────────

@app.post("/api/toolbox")
async def save_toolbox(data: dict, user: dict = Depends(verify_token)):
    """Save or clear a toolbox photo for the authenticated user."""
    image = data.get("image")
    save_toolbox_image(user["user_id"], image)
    return {"status": "success"}


@app.get("/api/toolbox")
async def get_toolbox(user: dict = Depends(verify_token)):
    """Get the saved toolbox photo for the authenticated user."""
    image = get_toolbox_image(user["user_id"])
    return {"image": image}


# ── SSE Streaming Endpoints ─────────────────────────────────────────
#
# These endpoints stream tokens as Server-Sent Events in real time.
# Format:  data: <token_text>\n\n
# Final:   data: [DONE]\n\n
# Error:   data: [ERROR] <message>\n\n
#
# The original non-streaming endpoints above are preserved for
# backward compatibility.
# ─────────────────────────────────────────────────────────────────────


def _stream_ollama(prompt: str, images: list[str]):
    """
    Generator that streams tokens from Ollama via SSE format.

    Yields SSE-formatted strings: 'data: <token>\n\n'
    Ends with 'data: [DONE]\n\n' on success.
    Yields 'data: [ERROR] <msg>\n\n' on failure.
    """
    try:
        stream = ollama_client.chat(
            model=OLLAMA_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                    "images": images,
                }
            ],
            stream=True,
            keep_alive=-1,
        )
        for chunk in stream:
            token = chunk["message"]["content"]
            if token:
                yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        error_str = str(e)
        if any(kw in error_str.lower() for kw in [
            "connect", "refused", "unreachable", "timeout",
            "connection", "httpx", "could not", "failed to"
        ]):
            yield (
                f"data: [ERROR] Ollama service is not running or unreachable. "
                f"Please ensure Ollama is running at {OLLAMA_BASE_URL}.\n\n"
            )
        else:
            yield f"data: [ERROR] {error_str}\n\n"


@app.post("/api/analyze-repair-stream")
async def analyze_repair_stream(request: AnalyzeRepairRequest):
    """Stream repair analysis tokens via SSE (real-time)."""
    return StreamingResponse(
        _stream_ollama(
            prompt=SYSTEM_PROMPT,
            images=[request.image_problem, request.image_inventory],
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/analyze-repair-text-stream")
async def analyze_repair_text_stream(request: AnalyzeRepairTextRequest):
    """Stream text-mode repair analysis tokens via SSE (real-time)."""
    prompt = (
        f"{TEXT_SYSTEM_PROMPT}\n\n"
        f"The user describes the broken object as: {request.text_description}"
    )
    return StreamingResponse(
        _stream_ollama(
            prompt=prompt,
            images=[request.image_inventory],
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/analyze-repair-alternative-stream")
async def analyze_repair_alternative_stream(request: AlternativeRepairRequest):
    """Stream alternative repair analysis tokens via SSE (real-time)."""
    style_instruction = (
        "Prioritize SPEED over durability — the quickest possible fix."
        if request.repair_style == "quick"
        else "Prioritize DURABILITY over ease — the most long-lasting fix."
    )

    alt_prompt = f"""You are an expert frugal mechanical engineer. You previously gave a repair guide for this broken object.
The user wants a COMPLETELY DIFFERENT approach. Here were the original steps (DO NOT repeat these):
{chr(10).join(f'- {s}' for s in request.original_steps)}

Generate an alternative repair using the same available materials but a DIFFERENT technique.
Style: {style_instruction}

You MUST return your response entirely in valid JSON format without markdown code blocks. Use this exact schema:
{{
  "problem_identified": "Short description of the structural failure.",
  "difficulty": "Easy" or "Medium" or "Hard",
  "estimated_time": "Estimated time to complete the repair",
  "safety_warning": "One crucial safety rule.",
  "selected_materials": ["item 1", "item 2"],
  "steps": ["Step 1", "Step 2"],
  "substitutions": [{{"original": "material", "substitute": "alternative", "notes": "trade-off"}}],
  "durability_estimate": "How long this fix should last",
  "warning_signs": ["Sign to watch"],
  "permanent_fix_advice": "What to do for a permanent fix"
}}"""

    return StreamingResponse(
        _stream_ollama(
            prompt=alt_prompt,
            images=[request.image_problem, request.image_inventory],
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
