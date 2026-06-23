from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# ============== USER MODELS ==============

class UserBase(BaseModel):
    """Base user model"""
    email: str = Field(..., description="User email address")
    name: Optional[str] = Field(None, description="User full name")

class UserCreate(UserBase):
    """User creation model"""
    password: str = Field(..., description="User password")

class User(UserBase):
    """User response model"""
    id: str = Field(..., description="User ID")
    created_at: Optional[datetime] = Field(None, description="Account creation date")
    updated_at: Optional[datetime] = Field(None, description="Last update date")

    class Config:
        from_attributes = True


# ============== NOTE MODELS ==============

class NoteBase(BaseModel):
    """Base note model"""
    title: str = Field(..., description="Note title", max_length=255)
    content: str = Field(..., description="Note content")

class NoteCreate(NoteBase):
    """Note creation model"""
    file_url: Optional[str] = Field(None, description="Uploaded file URL")

class NoteUpdate(BaseModel):
    """Note update model"""
    title: Optional[str] = Field(None, description="Updated title")
    content: Optional[str] = Field(None, description="Updated content")

class Note(NoteBase):
    """Note response model"""
    id: str = Field(..., description="Note ID")
    user_id: str = Field(..., description="Owner user ID")
    file_url: Optional[str] = Field(None, description="Uploaded file URL")
    created_at: Optional[datetime] = Field(None, description="Note creation date")
    updated_at: Optional[datetime] = Field(None, description="Last update date")

    class Config:
        from_attributes = True


# ============== FILE MODELS ==============

class FileUpload(BaseModel):
    """File upload model"""
    filename: str = Field(..., description="Original filename")
    file_size: int = Field(..., description="File size in bytes")
    file_type: str = Field(..., description="MIME type (e.g., application/pdf)")

class FileExtraction(BaseModel):
    """Extracted file data"""
    filename: str = Field(..., description="Original filename")
    extracted_text: str = Field(..., description="Extracted text content")
    page_count: Optional[int] = Field(None, description="Number of pages")

class FileResponse(BaseModel):
    """File response model"""
    id: str = Field(..., description="File ID")
    note_id: str = Field(..., description="Associated note ID")
    filename: str = Field(..., description="Original filename")
    file_url: str = Field(..., description="File storage URL")
    file_type: str = Field(..., description="MIME type")
    created_at: Optional[datetime] = Field(None, description="Upload date")

    class Config:
        from_attributes = True


# ============== SPEECH/TTS/STT MODELS ==============

class TTSRequest(BaseModel):
    """Text-to-speech request"""
    text: str = Field(..., description="Text to convert to speech")
    language: Optional[str] = Field("en", description="Language code (default: en)")
    speed: Optional[float] = Field(1.0, description="Speech speed (0.5-2.0)")

class TTSResponse(BaseModel):
    """Text-to-speech response"""
    audio_url: str = Field(..., description="URL to audio file")
    duration: float = Field(..., description="Audio duration in seconds")

class STTRequest(BaseModel):
    """Speech-to-text request"""
    audio_url: str = Field(..., description="URL to audio file")
    language: Optional[str] = Field("en", description="Language code (default: en)")

class STTResponse(BaseModel):
    """Speech-to-text response"""
    text: str = Field(..., description="Transcribed text")
    confidence: Optional[float] = Field(None, description="Confidence score (0-1)")


# ============== SUMMARIZATION MODELS ==============

class SummarizeRequest(BaseModel):
    """Summarization request"""
    text: str = Field(..., description="Text to summarize", max_length=50000)
    max_length: Optional[int] = Field(130, description="Max summary length")
    min_length: Optional[int] = Field(30, description="Min summary length")

class SummarizeResponse(BaseModel):
    """Summarization response"""
    original_text: str = Field(..., description="Original text")
    summary: str = Field(..., description="Summarized text")
    reduction_percentage: float = Field(..., description="Reduction percentage")


# ============== RESPONSE MODELS ==============

class SuccessResponse(BaseModel):
    """Generic success response"""
    status: str = Field("success", description="Status indicator")
    message: str = Field(..., description="Response message")
    data: Optional[dict] = Field(None, description="Response data")

class ErrorResponse(BaseModel):
    """Generic error response"""
    status: str = Field("error", description="Status indicator")
    message: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Error details")

class PaginatedResponse(BaseModel):
    """Paginated response"""
    status: str = Field("success", description="Status indicator")
    data: list = Field(..., description="List of items")
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Items per page")
