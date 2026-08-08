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

# Default response structure for fallback
def get_default_response():
    return {
        "language": "unknown",
        "quality": {
            "score": 0,
            "readability": 0,
            "maintainability": 0,
            "performance": 0,
            "reliability": 0
        },
        "cleaner_code": {
            "code": "",  # Will be set to input code if needed
            "summary": "Failed to refactor due to an error in the AI response.",
            "changes": []
        },
        "design_patterns": {
            "applicable": false,
            "patterns": []
        },
        "optimization": {
            "summary": "No optimization suggestions due to an error.",
            "issues": []
        },
        "naming_improvements": {
            "issues": []
        },
        "diagnostics": []
    }

# Root endpoint
@app.get("/")
async def root():
    return {"status": "ok"}

# Refactor endpoint
@app.post("/refactor")
async def refactor_code(request: CodeRequest):
    # System prompt instructing the model to be a code refactoring expert
    system_prompt = """You are a senior software engineer and code refactoring expert. Analyze the provided code and return a structured JSON response with the following fields:

{
    "language": "detected programming language (e.g., python, javascript, java, c, cpp, csharp)",
    "quality": {
        "score": 0-100 overall code quality score,
        "readability": 0-100 readability score,
        "maintainability": 0-100 maintainability score,
        "performance": 0-100 performance score,
        "reliability": 0-100 reliability score
    },
    "cleaner_code": {
        "code": "complete refactored source code as a string (preserving original functionality)",
        "summary": "brief summary of the main improvements made",
        "changes": [
            "specific change 1",
            "specific change 2",
            "..."
        ]
    },
    "design_patterns": {
        "applicable": true/false whether a design pattern is genuinely useful for this code,
        "patterns": [
            {
                "name": "specific applicable pattern name",
                "why": "specific explanation based on the submitted code",
                "where": "specific function, class, or line range where it applies",
                "benefits": [
                    "specific benefit 1",
                    "specific benefit 2"
                ],
                "example": "small practical code example showing how this pattern could be applied"
            }
        ]
    },
    "optimization": {
        "summary": "specific summary of actual optimization opportunities, or state that no meaningful optimization is needed",
        "issues": [
            {
                "line": line number (integer),
                "title": "short specific optimization title",
                "before": "actual code snippet before optimization",
                "after": "actual improved code snippet",
                "reason": "specific explanation of why the change improves the code",
                "complexity_before": "actual time/space complexity before, when meaningful",
                "complexity_after": "actual time/space complexity after, when meaningful"
            }
        ]
    },
    "naming_improvements": {
        "issues": [
            {
                "line": line number (integer),
                "old_name": "original variable/function/class name",
                "new_name": "suggested improved name",
                "reason": "explanation of why the new name is better"
            }
        ]
    },
    "diagnostics": [
        {
            "line": line number (integer),
            "severity": "error|warning|info",
            "message": "description of the issue",
            "suggestion": "suggested fix or improvement"
        }
    ]
}

Important guidelines:

1. Preserve the original functionality - do not change what the code does.
2. If the code is already clean or optimal, say so instead of inventing problems.
3. The cleaner_code.code must always be the COMPLETE refactored source code, directly usable and copy-pasteable.
4. Detect the programming language automatically. If unsure, make a reasonable guess.
5. Quality scores must be based on the actual submitted code, not random values.
6. Be specific and actionable.

DESIGN PATTERNS:
7. Recommend a design pattern ONLY when the actual structure of the submitted code would genuinely benefit from it.
8. NEVER force a design pattern onto simple code.
9. For simple code, set "applicable": false and "patterns": [].
10. If a pattern is applicable, explain exactly why it fits THIS code, where it applies, its practical benefits, and provide a small relevant example.
11. Do not recommend patterns merely because they are common or theoretically possible.
12. Prefer useful patterns such as Strategy, Factory, Observer, Adapter, Builder, Command, State, Template Method, or Facade only when justified by the code.

OPTIMIZATION:
13. Identify REAL optimization opportunities in the submitted code, not generic programming advice.
14. Look for nested loops, repeated searches/calculations, inefficient data structures, redundant work, expensive operations inside loops, unnecessary allocations, duplicate operations, avoidable complexity, and language-specific performance issues.
15. For each real optimization, provide the actual relevant before and after snippets.
16. Give complexity_before and complexity_after when a meaningful complexity comparison can be made. Do not invent complexity improvements.
17. If there is no meaningful optimization, return "issues": [] and clearly state that no meaningful optimization is required.
18. Do not shorten code merely to reduce line count if it makes the code less readable or maintainable.

NAMING AND DIAGNOSTICS:
19. For naming_improvements.issues, report only actual unclear, misleading, inconsistent, or overly abbreviated names.
20. For diagnostics, distinguish real errors from warnings and general improvements.
21. Never call something a syntax error unless the submitted code actually contains a likely syntax error.
22. Use accurate line numbers whenever reasonably possible.

RESPONSE SAFETY:
23. Return ONLY valid JSON. No Markdown fences. No explanation outside the JSON.
24. Keep the EXACT JSON structure above. Do not add, remove, rename, or restructure fields.
25. Always return all top-level fields, even when arrays are empty.
26. All arrays must contain the correct object types.
27. All string fields must be strings. Use empty strings when no text is appropriate.
28. The response must be complete enough to parse as JSON and must not be truncated.

Examples of desired behavior:

For simple code such as:
def add(a,b):
    x=a+b
    return x

Design Patterns should normally be:
"applicable": false,
"patterns": []

Optimization should normally contain no artificial performance claim. It may note the unnecessary temporary variable, but only as a concrete readability/code simplification if appropriate.

For code containing a genuine O(n^2) nested-loop search, Optimization should identify the relevant lines, show the current code, show a realistic O(n) alternative when one exists, and explain why it is better.

For code containing multiple interchangeable algorithms selected through large conditional branches, Design Patterns may recommend Strategy if it genuinely improves extensibility, and should show a small relevant example.

Return ONLY valid JSON. Do not include any additional text outside the JSON."""

    try:
        # Call NVIDIA's model with fallback for reasoning_effort
        try:
            response = client.chat.completions.create(
                model="nvidia/nemotron-3-super-120b-a12b",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": request.code}
                ],
                temperature=0.2,
                max_tokens=8000,
                reasoning_effort="none"
            )
        except Exception as e:
            # If reasoning_effort is not supported, try without it
            if "reasoning_effort" in str(e).lower():
                response = client.chat.completions.create(
                    model="nvidia/nemotron-3-super-120b-a12b",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": request.code}
                    ],
                    temperature=0.2,
                    max_tokens=8000
                )
            else:
                raise e

        # Extract the AI response content
        ai_response = response.choices[0].message.content.strip()

        # Parse the JSON response
        try:
            result = json.loads(ai_response)
            # Validate that all required fields are present and of correct type
            required_fields = {
                "language": str,
                "quality": dict,
                "cleaner_code": dict,
                "design_patterns": dict,
                "optimization": dict,
                "naming_improvements": dict,
                "diagnostics": list
            }
            for field, expected_type in required_fields.items():
                if field not in result:
                    raise ValueError(f"Missing required field: {field}")
                if not isinstance(result[field], expected_type):
                    raise ValueError(f"Field '{field}' must be of type {expected_type.__name__}")

            # Ensure cleaner_code has code field (if missing, use input code as fallback)
            if "code" not in result["cleaner_code"] or not isinstance(result["cleaner_code"]["code"], str):
                result["cleaner_code"]["code"] = request.code

            # Ensure quality subfields exist and are integers
            quality_fields = ["score", "readability", "maintainability", "performance", "reliability"]
            for field in quality_fields:
                if field not in result["quality"] or not isinstance(result["quality"][field], int):
                    result["quality"][field] = 0

            # Ensure cleaner_code has summary and changes
            if "summary" not in result["cleaner_code"] or not isinstance(result["cleaner_code"]["summary"], str):
                result["cleaner_code"]["summary"] = "No summary provided."
            if "changes" not in result["cleaner_code"] or not isinstance(result["cleaner_code"]["changes"], list):
                result["cleaner_code"]["changes"] = []

            # Ensure design_patterns has applicable and patterns
            if "applicable" not in result["design_patterns"] or not isinstance(result["design_patterns"]["applicable"], bool):
                result["design_patterns"]["applicable"] = False
            if "patterns" not in result["design_patterns"] or not isinstance(result["design_patterns"]["patterns"], list):
                result["design_patterns"]["patterns"] = []

            # Ensure optimization has summary and issues
            if "summary" not in result["optimization"] or not isinstance(result["optimization"]["summary"], str):
                result["optimization"]["summary"] = "No optimization summary provided."
            if "issues" not in result["optimization"] or not isinstance(result["optimization"]["issues"], list):
                result["optimization"]["issues"] = []

            # Ensure naming_improvements has issues
            if "issues" not in result["naming_improvements"] or not isinstance(result["naming_improvements"]["issues"], list):
                result["naming_improvements"]["issues"] = []

            # Ensure diagnostics is a list (already checked)
            # Validate each diagnostic item has required fields
            validated_diagnostics = []
            for diag in result["diagnostics"]:
                if not isinstance(diag, dict):
                    continue
                validated_diag = {
                    "line": diag.get("line", 0) if isinstance(diag.get("line"), int) else 0,
                    "severity": diag.get("severity", "info") if diag.get("severity") in ["error", "warning", "info"] else "info",
                    "message": str(diag.get("message", "")),
                    "suggestion": str(diag.get("suggestion", ""))
                }
                validated_diagnostics.append(validated_diag)
            result["diagnostics"] = validated_diagnostics

            return result
        except json.JSONDecodeError as e:
            # Return default response with input code in cleaner_code
            default_resp = get_default_response()
            default_resp["cleaner_code"]["code"] = request.code
            default_resp["cleaner_code"]["summary"] = f"Failed to parse AI response as valid JSON: {str(e)}"
            return default_resp
        except ValueError as e:
            # Return default response with input code in cleaner_code
            default_resp = get_default_response()
            default_resp["cleaner_code"]["code"] = request.code
            default_resp["cleaner_code"]["summary"] = f"Invalid AI response structure: {str(e)}"
            return default_resp

    except Exception as e:
        # Return default response with input code in cleaner_code
        default_resp = get_default_response()
        default_resp["cleaner_code"]["code"] = request.code
        default_resp["cleaner_code"]["summary"] = f"Error calling NVIDIA API: {str(e)}"
        return default_resp
