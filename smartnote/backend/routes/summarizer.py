from fastapi import APIRouter, HTTPException, status
from models import SummarizeRequest, SummarizeResponse
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

router = APIRouter()

# Get Google API key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Configure Gemini
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# ============== SUMMARIZATION ENDPOINTS ==============

@router.post("/summarize", response_model=dict)
async def summarize_text(request: SummarizeRequest):
    """
    Summarize text using Google Gemini 2.5 Flash-Lite
    
    - **text**: Text to summarize (max 50000 characters)
    - **max_length**: Maximum summary length (default: 130)
    - **min_length**: Minimum summary length (default: 30)
    
    Note: Requires GOOGLE_API_KEY in .env file
    """
    try:
        # Check if API key is set
        if not GOOGLE_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GOOGLE_API_KEY not configured. Add it to .env file."
            )
        
        # Validate input
        if not request.text or len(request.text) < 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text must be at least 50 characters long"
            )
        
        if len(request.text) > 50000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text exceeds maximum length of 50000 characters"
            )
        
        # Validate lengths
        if request.min_length >= request.max_length:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="min_length must be less than max_length"
            )
        
        try:
            # Initialize Gemini model
            model = genai.GenerativeModel("gemini-flash-latest")
            
            # Create prompt for summarization
            prompt = f"""Please summarize the following text concisely. 
            
Target summary length:
- Minimum: {request.min_length} words
- Maximum: {request.max_length} words

Text to summarize:
{request.text}

Please provide only the summary without any additional explanation."""
            
            # Generate summary
            response = model.generate_content(prompt)
            summary_text = response.text
            
            # Calculate reduction percentage
            original_length = len(request.text)
            summary_length = len(summary_text)
            reduction = ((original_length - summary_length) / original_length) * 100
            
            return {
                "status": "success",
                "original_text": request.text,
                "summary": summary_text,
                "original_length": original_length,
                "summary_length": summary_length,
                "reduction_percentage": round(reduction, 2),
                "model": "gemini-2.5-flash-lite"
            }
        
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error communicating with Gemini API: {str(e)}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error summarizing text: {str(e)}"
        )

@router.post("/summarize-file")
async def summarize_from_file(note_id: str, text: str):
    """
    Summarize extracted text from an uploaded file
    
    - **note_id**: Note/document ID
    - **text**: Text to summarize
    """
    try:
        if not text or len(text) < 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text must be at least 50 characters long"
            )
        
        # Use default parameters
        request = SummarizeRequest(
            text=text,
            max_length=150,
            min_length=50
        )
        
        # Reuse summarize_text
        return await summarize_text(request)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error summarizing file: {str(e)}"
        )

# ============== BATCH SUMMARIZATION ==============

@router.post("/summarize-batch")
async def summarize_batch(texts: list):
    """
    Summarize multiple texts (batch operation)
    
    - **texts**: List of texts to summarize
    """
    try:
        if not texts or len(texts) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Texts list cannot be empty"
            )
        
        if len(texts) > 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 10 texts per batch"
            )
        
        summaries = []
        
        for idx, text in enumerate(texts):
            try:
                request = SummarizeRequest(text=text)
                result = await summarize_text(request)
                summaries.append({
                    "index": idx,
                    "status": "success",
                    "summary": result.get("summary", "")
                })
            except HTTPException as e:
                summaries.append({
                    "index": idx,
                    "status": "error",
                    "error": e.detail
                })
        
        return {
            "status": "success",
            "total": len(texts),
            "completed": sum(1 for s in summaries if s["status"] == "success"),
            "failed": sum(1 for s in summaries if s["status"] == "error"),
            "summaries": summaries
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in batch summarization: {str(e)}"
        )

# ============== INFO ENDPOINT ==============

@router.get("/info")
async def summarizer_info():
    """
    Get information about the summarization service
    """
    return {
        "status": "active",
        "model": "gemini-flash-latest",
        "provider": "Google Gemini",
        "supports": ["single text", "batch processing", "file extraction"],
        "max_input_length": 50000,
        "default_max_summary": 130,
        "default_min_summary": 30,
        "requires_api_key": True,
        "api_key_env_var": "GOOGLE_API_KEY"
    }
