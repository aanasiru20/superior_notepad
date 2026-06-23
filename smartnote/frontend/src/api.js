const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ============== NOTES ==============

export async function fetchUserNotes(userId) {
  try {
    const response = await fetch(`${API_URL}/api/notes/?user_id=${userId}`)
    if (!response.ok) throw new Error('Failed to fetch notes')
    return await response.json()
  } catch (error) {
    console.error('Error fetching notes:', error)
    return []
  }
}

export async function createNote(userId, title, content) {
  try {
    console.log('Creating note with:', { userId, title, content })
    const response = await fetch(`${API_URL}/api/notes/?user_id=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    })
    console.log('Create response status:', response.status)
    if (!response.ok) {
      const error = await response.text()
      console.error('Create error response:', error)
      throw new Error(`Failed to create note: ${response.status}`)
    }
    const data = await response.json()
    console.log('Note created successfully:', data)
    return data
  } catch (error) {
    console.error('Error creating note:', error)
    return null
  }
}

export async function updateNote(noteId, title, content) {
  try {
    console.log('Updating note:', { noteId, title, content })
    const response = await fetch(`${API_URL}/api/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    })
    console.log('Update response status:', response.status)
    if (!response.ok) {
      const error = await response.text()
      console.error('Update error response:', error)
      throw new Error(`Failed to update note: ${response.status}`)
    }
    const data = await response.json()
    console.log('Note updated successfully:', data)
    return data
  } catch (error) {
    console.error('Error updating note:', error)
    return null
  }
}

export async function deleteNote(noteId) {
  try {
    const response = await fetch(`${API_URL}/api/notes/${noteId}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete note')
    return true
  } catch (error) {
    console.error('Error deleting note:', error)
    return false
  }
}

// ============== FILE UPLOAD ==============

export async function uploadFile(file) {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const endpoint = file.type === 'application/pdf' ? '/api/upload/pdf' : '/api/upload/docx'
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) throw new Error('Failed to upload file')
    return await response.json()
  } catch (error) {
    console.error('Error uploading file:', error)
    return null
  }
}

// ============== SUMMARIZATION ==============

export async function summarizeText(text, maxLength = 150, minLength = 50) {
  try {
    const response = await fetch(`${API_URL}/api/summarizer/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        max_length: maxLength,
        min_length: minLength,
      }),
    })

    if (!response.ok) throw new Error('Failed to summarize text')
    return await response.json()
  } catch (error) {
    console.error('Error summarizing:', error)
    return null
  }
}

// ============== TEXT-TO-SPEECH ==============

export async function textToSpeech(text, language = 'en') {
  try {
    const response = await fetch(`${API_URL}/api/speech/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        language,
        speed: 1.0,
      }),
    })

    if (!response.ok) throw new Error('Failed to generate speech')
    return await response.json()
  } catch (error) {
    console.error('Error generating speech:', error)
    return null
  }
}

// Web Speech API TTS (browser native with voice control)
export async function textToSpeechBrowser(text, voiceIndex = 0, pitch = 1.0, rate = 1.0) {
  try {
    const synth = window.speechSynthesis
    if (!synth) {
      throw new Error('Speech Synthesis not supported in this browser')
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      
      // Get available voices
      let voices = synth.getVoices()
      if (voices.length === 0) {
        // Wait for voices to load
        synth.onvoiceschanged = () => {
          voices = synth.getVoices()
          if (voices.length > voiceIndex) {
            utterance.voice = voices[voiceIndex]
          }
        }
      } else if (voices.length > voiceIndex) {
        utterance.voice = voices[voiceIndex]
      }

      utterance.pitch = pitch
      utterance.rate = rate
      utterance.volume = 1.0

      utterance.onend = () => {
        console.log('✅ Speech finished')
        resolve({ status: 'success', message: 'Speech finished' })
      }

      utterance.onerror = (event) => {
        console.error('Speech error:', event.error)
        reject(new Error(`Speech error: ${event.error}`))
      }

      console.log(`🔊 Speaking with voice index ${voiceIndex}, pitch: ${pitch}, rate: ${rate}`)
      synth.speak(utterance)
    })
  } catch (error) {
    console.error('Error with browser TTS:', error)
    throw error
  }
}

// Get available voices
export function getAvailableVoices() {
  try {
    const synth = window.speechSynthesis
    if (!synth) {
      return []
    }

    let voices = synth.getVoices()
    if (voices.length === 0) {
      synth.onvoiceschanged = () => {
        voices = synth.getVoices()
      }
    }

    return voices.map((voice, index) => ({
      index,
      name: voice.name,
      lang: voice.lang,
      default: voice.default,
    }))
  } catch (error) {
    console.error('Error getting voices:', error)
    return []
  }
}
// ============== SPEECH-TO-TEXT ==============

export async function speechToText() {
  try {
    // Check browser support for Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      throw new Error('Speech Recognition not supported in this browser. Try Chrome or Edge.')
    }

    return new Promise((resolve, reject) => {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started - listening...')
      }

      recognition.onresult = (event) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript
          transcript += transcriptPart
          console.log('Partial transcript:', transcriptPart, 'Confidence:', event.results[i][0].confidence)
        }
        console.log('Final transcript:', transcript)
        resolve(transcript)
      }

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        reject(new Error(`Speech recognition error: ${event.error}. Try speaking again or check microphone permissions.`))
      }

      recognition.onend = () => {
        console.log('🎤 Speech recognition ended')
      }

      recognition.start()
    })
  } catch (error) {
    console.error('Error with speech to text:', error)
    throw error
  }
}