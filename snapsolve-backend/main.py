"""
SnapSolve Backend - FastAPI server for AI-powered repair analysis.
Accepts two base64-encoded images and uses Google Gemini 1.5 Flash 
to generate a safe temporary repair guide using only available materials.
"""

import json
import os
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
    try:
        # Initialize the Gemini model (gemini-pro is universally available)
        model = genai.GenerativeModel(model_name="gemini-pro")

        # Prepare the prompt with both images
        # Gemini expects base64 images with a data: URI prefix and media type
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

        # Call the Gemini API
        response = model.generate_content(content)

        # Extract the response text
        response_text = response.text.strip()

        # Remove markdown code blocks if they exist (defensive parsing)
        if response_text.startswith("```json"):
            response_text = response_text[7:]  # Remove ```json prefix
        if response_text.startswith("```"):
            response_text = response_text[3:]  # Remove ``` prefix
        if response_text.endswith("```"):
            response_text = response_text[:-3]  # Remove ``` suffix

        # Parse the JSON response
        try:
            parsed_response = json.loads(response_text)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to parse LLM response as JSON: {str(e)}"
            )

        # Validate and construct the RepairAnalysis object
        # Ensure viability_score is an integer between 0-100
        viability_score = int(parsed_response.get("viability_score", 50))
        viability_score = max(0, min(100, viability_score))

        analysis = RepairAnalysis(
            problem_identified=parsed_response.get("problem_identified", ""),
            viability_score=viability_score,
            safety_warning=parsed_response.get("safety_warning", ""),
            selected_materials=parsed_response.get("selected_materials", []),
            steps=parsed_response.get("steps", []),
        )

        return analysis

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Catch any other errors and return a 500 response
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing repair: {str(e)}"
        )


# Run the server: uvicorn main:app --reload
