from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
import os
from pathlib import Path
from gtts import gTTS
from models import TTSRequest, TTSResponse
import tempfile

router = APIRouter()

# Create temp directory for audio files
AUDIO_DIR = Path("temp_audio")
AUDIO_DIR.mkdir(exist_ok=True)

# ============== TEXT-TO-SPEECH ENDPOINTS ==============

@router.post("/tts", response_model=dict)
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using Google Text-to-Speech
    
    - **text**: Text to convert (up to 5000 characters)
    - **language**: Language code (default: en)
    - **speed**: Speech speed (0.5-2.0, default: 1.0)
    """
    try:
        # Validate input
        if not request.text or len(request.text) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text cannot be empty"
            )
        
        if len(request.text) > 5000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text exceeds maximum length of 5000 characters"
            )
        
        # Validate speed
        if request.speed < 0.5 or request.speed > 2.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Speed must be between 0.5 and 2.0"
            )
        
        # Generate audio filename
        audio_filename = f"tts_{hash(request.text) % 10**8}.mp3"
        audio_path = AUDIO_DIR / audio_filename
        
        # Convert text to speech
        try:
            tts = gTTS(
                text=request.text,
                lang=request.language,
                slow=request.speed < 1.0
            )
            tts.save(str(audio_path))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate speech: {str(e)}"
            )
        
        # Calculate duration (rough estimate: ~150 words per minute)
        word_count = len(request.text.split())
        duration_seconds = (word_count / 150) * 60
        
        return {
            "status": "success",
            "message": "Speech generated successfully",
            "audio_filename": audio_filename,
            "audio_path": f"/api/speech/audio/{audio_filename}",
            "duration": round(duration_seconds, 2),
            "language": request.language,
            "text_length": len(request.text)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating speech: {str(e)}"
        )

@router.get("/audio/{filename}")
async def get_audio(filename: str):
    """
    Download generated audio file
    
    - **filename**: Audio filename
    """
    try:
        file_path = AUDIO_DIR / filename
        
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audio file not found"
            )
        
        return FileResponse(
            path=file_path,
            media_type="audio/mpeg",
            filename=filename
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving audio: {str(e)}"
        )

# ============== SPEECH-TO-TEXT ==============

@router.post("/stt")
async def speech_to_text(request):
    """
    Convert speech/audio to text using Web Speech API results
    
    Frontend sends audio blob via Web Speech API and backend can process it
    For now, we'll support text transcription via the frontend's Web Speech API
    """
    try:
        # This endpoint is mainly for future expansion
        # Frontend uses Web Speech API directly for STT
        return {
            "status": "info",
            "message": "Use Web Speech API on frontend for real-time STT",
            "supported": True,
            "method": "Web Speech API (Browser Native)",
            "features": [
                "Real-time speech recognition",
                "No API key needed",
                "Works offline in some browsers",
                "Cross-browser support"
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error: {str(e)}"
        )

# ============== CLEANUP ==============

@router.delete("/cleanup-audio")
async def cleanup_audio():
    """
    Clean up temporary audio files
    """
    try:
        if AUDIO_DIR.exists():
            for file in AUDIO_DIR.glob("*.mp3"):
                file.unlink()
            return {
                "status": "success",
                "message": "Audio files cleaned up"
            }
        return {
            "status": "success",
            "message": "No audio files to clean"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cleaning up audio: {str(e)}"
        )
