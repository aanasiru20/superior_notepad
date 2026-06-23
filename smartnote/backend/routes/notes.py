from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from models import Note, NoteCreate, NoteUpdate, SuccessResponse, ErrorResponse
from database import (
    create_note, get_note, get_user_notes, 
    update_note, delete_note, get_db, get_user
)

router = APIRouter()

# ============== CRUD ENDPOINTS ==============

@router.get("/", response_model=List[Note])
async def list_user_notes(user_id: str):
    """
    Get all notes for a user
    
    - **user_id**: User ID (query parameter)
    """
    try:
        notes = await get_user_notes(user_id)
        if not notes:
            return []
        return notes
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching notes: {str(e)}"
        )

@router.get("/{note_id}", response_model=Note)
async def read_note(note_id: str):
    """
    Get a specific note by ID
    
    - **note_id**: Note ID (path parameter)
    """
    try:
        note = await get_note(note_id)
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found"
            )
        return note
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching note: {str(e)}"
        )

@router.post("/", response_model=Note, status_code=status.HTTP_201_CREATED)
async def create_new_note(user_id: str, note: NoteCreate):
    """
    Create a new note
    
    - **user_id**: User ID (query parameter)
    - **note**: Note data (request body)
    """
    try:
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user_id is required"
            )
        
        print(f"📝 Creating note for user {user_id}: title='{note.title}'")
        created = await create_note(
            user_id=user_id,
            title=note.title,
            content=note.content,
            file_url=note.file_url if hasattr(note, 'file_url') else None
        )
        
        if not created:
            print(f"❌ Failed to create note")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create note - database error"
            )
        
        print(f"✅ Returning created note: {created}")
        return created
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating note: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating note: {str(e)}"
        )

@router.put("/{note_id}", response_model=Note)
async def update_existing_note(note_id: str, note_update: NoteUpdate):
    """
    Update an existing note
    
    - **note_id**: Note ID (path parameter)
    - **note_update**: Updated note data (request body)
    """
    try:
        # Check if note exists
        existing_note = await get_note(note_id)
        if not existing_note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found"
            )
        
        # Update only provided fields
        updated = await update_note(
            note_id=note_id,
            title=note_update.title,
            content=note_update.content
        )
        
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update note"
            )
        
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating note: {str(e)}"
        )

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_note(note_id: str):
    """
    Delete a note
    
    - **note_id**: Note ID (path parameter)
    """
    try:
        # Check if note exists
        existing_note = await get_note(note_id)
        if not existing_note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found"
            )
        
        # Delete the note
        deleted = await delete_note(note_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete note"
            )
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting note: {str(e)}"
        )


# ============== SEARCH/FILTER ENDPOINTS ==============

@router.get("/search/by-title")
async def search_by_title(user_id: str, title: str):
    """
    Search notes by title
    
    - **user_id**: User ID (query parameter)
    - **title**: Search term (query parameter)
    """
    try:
        notes = await get_user_notes(user_id)
        if not notes:
            return []
        
        filtered = [n for n in notes if title.lower() in n.get("title", "").lower()]
        return filtered
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching notes: {str(e)}"
        )
