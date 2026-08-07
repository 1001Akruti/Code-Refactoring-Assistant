import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Code Refactoring Assistant", version="1.0.0")

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client with NVIDIA's API
client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY")
)

# Pydantic model for request body
class CodeRequest(BaseModel):
    code: str

# Root endpoint
@app.get("/")
async def root():
    return {"status": "ok"}

# Refactor endpoint
@app.post("/refactor")
async def refactor_code(request: CodeRequest):
    # System prompt instructing the model to be a code refactoring assistant
    system_prompt = """You are a code refactoring assistant. Analyze the provided code and suggest improvements.
    Return ONLY valid JSON with exactly these fields:
    {
        "cleaner_code": "...",
        "design_patterns": "...",
        "optimization": "...",
        "naming_improvements": "..."
    }
    Each value should contain a short plain-English suggestion rather than an entire rewritten source file.
    Do not include any additional text or explanation outside the JSON."""

    try:
        # Call NVIDIA's model
        response = client.chat.completions.create(
            model="nvidia/nemotron-3-super-120b-a12b",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.code}
            ],
            temperature=0.2,
            max_tokens=1000
        )
        
        # Extract the AI response content
        ai_response = response.choices[0].message.content.strip()
        
        # Parse the JSON response
        try:
            result = json.loads(ai_response)
            # Validate that all required fields are present
            required_fields = ["cleaner_code", "design_patterns", "optimization", "naming_improvements"]
            for field in required_fields:
                if field not in result:
                    raise ValueError(f"Missing required field: {field}")
            return result
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=500,
                detail="Failed to parse AI response as valid JSON. Please try again."
            )
        except ValueError as e:
            raise HTTPException(
                status_code=500,
                detail=str(e)
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error calling NVIDIA API: {str(e)}"
        )