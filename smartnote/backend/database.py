from supabase import create_client, Client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Supabase credentials from .env
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Check if credentials are set
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ SUPABASE_URL or SUPABASE_KEY not found in .env file")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_db() -> Client:
    """Get Supabase database client"""
    return supabase

async def test_connection():
    """Test connection to Supabase"""
    try:
        # Try to fetch auth user (simple test)
        response = supabase.auth.get_session()
        print("✅ Supabase connection successful")
        return True
    except Exception as e:
        print(f"❌ Supabase connection failed: {str(e)}")
        return False

# ============== TABLE OPERATIONS ==============

async def create_note(user_id: str, title: str, content: str, file_url: str = None):
    """Create a new note in the database"""
    try:
        # First ensure user exists
        user = await get_user(user_id)
        if not user:
            print(f"⚠️ User {user_id} not found, attempting to create...")
            user = await create_user_if_not_exists(user_id)
            if not user:
                print(f"❌ Could not create or find user {user_id}")
                return None
        
        data = {
            "user_id": user_id,
            "title": title,
            "content": content,
        }
        if file_url:
            data["file_url"] = file_url
            
        print(f"📝 Inserting note: {data}")
        
        # Insert the note
        response = supabase.table("notes").insert(data).execute()
        
        print(f"Insert response: {response}")
        
        if response.data and len(response.data) > 0:
            note = response.data[0]
            print(f"✅ Note created: {note}")
            return note
        
        # If no data returned, try to fetch it back
        print(f"⚠️ No data in response, fetching recent note...")
        notes = supabase.table("notes").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
        
        if notes.data and len(notes.data) > 0:
            print(f"✅ Retrieved note: {notes.data[0]}")
            return notes.data[0]
        
        print(f"❌ Could not retrieve inserted note")
        return None
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

async def get_note(note_id: str):
    """Get a specific note by ID"""
    try:
        response = supabase.table("notes").select("*").eq("id", note_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"❌ Error fetching note: {str(e)}")
        return None

async def get_user_notes(user_id: str):
    """Get all notes for a user"""
    try:
        response = supabase.table("notes").select("*").eq("user_id", user_id).execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"❌ Error fetching user notes: {str(e)}")
        return []

async def update_note(note_id: str, title: str = None, content: str = None):
    """Update a note"""
    try:
        data = {}
        if title:
            data["title"] = title
        if content:
            data["content"] = content
        
        response = supabase.table("notes").update(data).eq("id", note_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"❌ Error updating note: {str(e)}")
        return None

async def delete_note(note_id: str):
    """Delete a note"""
    try:
        response = supabase.table("notes").delete().eq("id", note_id).execute()
        return True
    except Exception as e:
        print(f"❌ Error deleting note: {str(e)}")
        return False

# ============== USER OPERATIONS ==============

async def get_user(user_id: str):
    """Get user profile"""
    try:
        response = supabase.table("users").select("*").eq("id", user_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"❌ Error fetching user: {str(e)}")
        return None

async def create_user_if_not_exists(user_id: str, email: str = None, name: str = None):
    """Create user if they don't exist"""
    try:
        user = await get_user(user_id)
        if user:
            print(f"✅ User already exists: {user_id}")
            return user
        
        # Create new user
        data = {"id": user_id, "email": email, "name": name}
        response = supabase.table("users").insert(data).execute()
        if response.data:
            print(f"✅ User created: {response.data[0]}")
            return response.data[0]
        return None
    except Exception as e:
        print(f"❌ Error creating user: {str(e)}")
        return None

async def create_user(user_id: str, email: str, name: str = None):
    """Create a new user profile"""
    try:
        data = {
            "id": user_id,
            "email": email,
            "name": name,
        }
        response = supabase.table("users").insert(data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"❌ Error creating user: {str(e)}")
        return None
