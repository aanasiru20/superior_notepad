import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Auth from './components/Auth'
import { fetchUserNotes, createNote, updateNote, deleteNote, uploadFile, summarizeText, textToSpeech, textToSpeechBrowser, getAvailableVoices, speechToText } from './api'
import smartnoteLogo from '../../Asset/smartnoteLogo.png'
import './App.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

function App() {
  const [user, setUser] = useState(null)
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedNote, setSelectedNote] = useState(null)
  const [saving, setSaving] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState(0)
  const [pitch, setPitch] = useState(1.0)
  const [rate, setRate] = useState(1.0)
  const [showVoiceControls, setShowVoiceControls] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    checkUser()
    // Load voices for TTS
    const availableVoices = getAvailableVoices()
    setVoices(availableVoices)
    console.log('Available voices:', availableVoices)
    
    // Load PDF libraries from CDN
    const loadLibraries = async () => {
      if (!window.jspdf) {
        const script1 = document.createElement('script')
        script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
        document.head.appendChild(script1)
      }
      if (!window.html2canvas) {
        const script2 = document.createElement('script')
        script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
        document.head.appendChild(script2)
      }
    }
    loadLibraries()
  }, [])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user || null)
    
    // Ensure user record exists in public.users table
    if (session?.user) {
      try {
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (!existingUser) {
          console.log('Creating user record for:', session.user.id)
          await supabase
            .from('users')
            .insert([
              {
                id: session.user.id,
                email: session.user.email,
                name: session.user.email.split('@')[0]
              }
            ])
          console.log('User record created')
        }
      } catch (err) {
        console.log('User record check/create:', err.message)
      }
    }
    
    setLoading(false)
  }

  useEffect(() => {
    if (user) {
      loadNotes()
    }
  }, [user])

  const loadNotes = async () => {
    const userNotes = await fetchUserNotes(user.id)
    setNotes(userNotes)
  }

  const handleSaveNote = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please enter title and content')
      return
    }

    setSaving(true)
    try {
      if (selectedNote && !selectedNote.id.startsWith('temp_')) {
        // Update existing note
        console.log('Updating note:', selectedNote.id)
        const updated = await updateNote(selectedNote.id, title, content)
        if (updated) {
          const updatedNotes = notes.map(n => n.id === updated.id ? updated : n)
          setNotes(updatedNotes)
          setSelectedNote(updated)
          alert('✓ Note updated!')
        } else {
          alert('✗ Failed to update note')
        }
      } else {
        // Create new note
        if (!user) {
          alert('User not authenticated')
          return
        }
        
        console.log('Creating new note for user:', user.id)
        const newNote = await createNote(user.id, title, content)
        
        if (newNote) {
          console.log('Note created:', newNote)
          const updatedNotes = [newNote, ...notes]
          setNotes(updatedNotes)
          setSelectedNote(newNote)
          setTitle('')
          setContent('')
          alert('✓ Note saved!')
        } else {
          alert('✗ Failed to save note')
        }
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Error: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleExportPDF = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please enter title and content')
      return
    }

    try {
      setSaving(true)
      
      // Wait for libraries to load
      const waitForLibs = () => {
        return new Promise((resolve) => {
          const checkLibs = () => {
            if (window.jspdf && window.html2canvas) {
              resolve()
            } else {
              setTimeout(checkLibs, 100)
            }
          }
          checkLibs()
        })
      }
      
      await waitForLibs()

      // Create a temporary div to hold the content
      const tempDiv = document.createElement('div')
      tempDiv.style.padding = '20px'
      tempDiv.style.backgroundColor = 'white'
      tempDiv.style.fontFamily = 'Arial, sans-serif'
      tempDiv.style.lineHeight = '1.6'
      
      const titleElement = document.createElement('h1')
      titleElement.textContent = title
      titleElement.style.marginBottom = '10px'
      titleElement.style.color = '#333'
      
      const contentElement = document.createElement('p')
      contentElement.textContent = content
      contentElement.style.color = '#555'
      contentElement.style.whiteSpace = 'pre-wrap'
      contentElement.style.wordWrap = 'break-word'
      
      tempDiv.appendChild(titleElement)
      tempDiv.appendChild(contentElement)
      document.body.appendChild(tempDiv)

      // Convert to canvas
      const canvas = await window.html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      })

      // Create PDF
      const { jsPDF: JsPDF } = window.jspdf
      const pdf = new JsPDF('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 210 - 20 // A4 width minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)
      
      // Download
      const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}_${new Date().getTime()}.pdf`
      pdf.save(fileName)
      
      // Cleanup
      document.body.removeChild(tempDiv)
      alert('PDF downloaded successfully!')
    } catch (error) {
      console.error('PDF export error:', error)
      alert('Error exporting to PDF: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const result = await uploadFile(file)
      if (result) {
        setContent(result.extracted_text)
        alert('File uploaded and extracted!')
      } else {
        alert('Error uploading file')
      }
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const handleSummarize = async () => {
    if (!content.trim()) {
      alert('Please enter or upload content first')
      return
    }

    setSummarizing(true)
    try {
      const result = await summarizeText(content)
      if (result) {
        setContent(result.summary)
        alert(`Summary created! Reduced by ${result.reduction_percentage}%`)
      } else {
        alert('Error summarizing text')
      }
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setSummarizing(false)
    }
  }

  const handleTextToSpeech = async () => {
    if (!content.trim()) {
      alert('Please enter some text first')
      return
    }

    setSpeaking(true)
    try {
      console.log('Generating speech for:', content.substring(0, 50))
      // Use browser Web Speech API for more control
      const result = await textToSpeechBrowser(content, selectedVoice, pitch, rate)
      console.log('TTS result:', result)
      alert('Audio Completed...')
    } catch (error) {
      console.error('TTS error:', error)
      alert('Error: ' + error.message)
    } finally {
      setSpeaking(false)
    }
  }

  const handleSpeechToText = async () => {
    setListening(true)
    try {
      console.log('Starting speech recognition...')
      const transcript = await speechToText()
      console.log('Transcript:', transcript)
      
      if (transcript && transcript.trim()) {
        // Append the transcribed text to the current content
        setContent(prev => prev + (prev ? ' ' : '') + transcript)
        alert('Speech added to note!')
      } else {
        alert('No speech detected. Please try again.')
      }
    } catch (error) {
      console.error('STT error:', error)
      alert('Error: ' + error.message)
    } finally {
      setListening(false)
    }
  }

  const handleSelectNote = (note) => {
    setSelectedNote(note)
    setTitle(note.title)
    setContent(note.content)
  }

  const handleDeleteNote = async () => {
    if (!selectedNote) return
    if (!confirm('Delete this note?')) return

    try {
      const deleted = await deleteNote(selectedNote.id)
      if (deleted) {
        setNotes(notes.filter(n => n.id !== selectedNote.id))
        setSelectedNote(null)
        setTitle('')
        setContent('')
        alert('Note deleted!')
      }
    } catch (error) {
      alert('Error deleting note: ' + error.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-lg">Loading...</div>
  }

  if (!user) {
    return <Auth />
  }

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <div className={`w-64 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col shadow-lg`}>
        {/* Header */}
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700 bg-gradient-to-br from-indigo-600 to-purple-600' : 'border-gray-200 bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
          <div className="mb-4 flex items-center justify-center">
            <img src={smartnoteLogo} alt="SmartNote Logo" style={{ maxHeight: '100px', maxWidth: '150px', objectFit: 'contain' }} />
          </div>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-indigo-100'}`}>{user.email}</p>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 rounded-lg transition text-sm font-medium"
              title="Toggle dark mode"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button 
              onClick={handleLogout}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          <div className={`p-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3 opacity-50">Recent Notes</p>
            {notes.length === 0 ? (
              <p className="text-sm text-center py-4">No notes yet. Create one!</p>
            ) : (
              notes.map(note => (
                <div 
                  key={note.id}
                  className={`p-3 rounded-lg mb-2 transition-all duration-200 ${
                    selectedNote?.id === note.id 
                      ? darkMode 
                        ? 'bg-indigo-700 border-2 border-indigo-500 text-white' 
                        : 'bg-indigo-100 border-2 border-indigo-500 text-gray-900'
                      : darkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                  data-note-id={note.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div 
                      onClick={() => handleSelectNote(note)}
                      className="flex-1 cursor-pointer"
                    >
                      <p className="font-semibold text-sm truncate">{note.title || 'Untitled'}</p>
                      <p className="text-xs truncate opacity-75">{note.content.substring(0, 40)}...</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('Delete this note?')) {
                          deleteNote(note.id).then(() => {
                            setNotes(notes.filter(n => n.id !== note.id))
                            if (selectedNote?.id === note.id) {
                              setSelectedNote(null)
                              setTitle('')
                              setContent('')
                            }
                          }).catch(err => alert('Error: ' + err.message))
                        }
                      }}
                      className="flex-shrink-0 p-1.5 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                      title="Delete note"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        {/* Editor Title Bar */}
        <div className={`p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b shadow-sm`}>
          <input
            type="text"
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full text-3xl font-bold outline-none transition ${
              darkMode
                ? 'bg-gray-800 text-white placeholder-gray-500'
                : 'bg-white text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <textarea
            placeholder="Start typing your note... or use the voice input button to dictate! 🎤"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`w-full h-full p-6 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-md ${
              darkMode
                ? 'bg-gray-800 text-white placeholder-gray-500 border border-gray-700'
                : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-200'
            }`}
          />
        </div>

        {/* Voice Controls Panel */}
        {showVoiceControls && voices.length > 0 && (
          <div className={`p-4 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-indigo-50 border-indigo-300'}`}>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Voice</label>
                <select 
                  value={selectedVoice} 
                  onChange={(e) => setSelectedVoice(parseInt(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } border`}
                >
                  {voices.map((voice) => (
                    <option key={voice.index} value={voice.index}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Pitch: {pitch.toFixed(1)}
                </label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1" 
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-indigo-500"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Speed: {rate.toFixed(1)}x
                </label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1" 
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={`p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t shadow-lg`}>
          <div className="space-y-3">
            {/* Primary Actions */}
            <div className="flex gap-3 flex-wrap">
              <button 
                onClick={handleSaveNote}
                disabled={saving}
                className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-6 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
              >
                💾 Save
              </button>

              <button 
                onClick={handleExportPDF}
                disabled={saving}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg transition disabled:opacity-50 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
              >
                {saving ? '⏳ Exporting...' : '📄 PDF'}
              </button>

              <div className="relative">
                <input 
                  id="file-input"
                  type="file" 
                  accept=".pdf,.docx" 
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label 
                  htmlFor="file-input"
                  className="inline-block bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-lg transition cursor-pointer font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  📤 Upload
                </label>
              </div>
            </div>

            {/* AI & Speech Actions */}
            <div className="flex gap-3 flex-wrap">
              <button 
                onClick={handleSummarize}
                disabled={summarizing}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg transition disabled:opacity-50 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
              >
                {summarizing ? '⏳ Summarizing...' : '✨ Summarize'}
              </button>

              <button 
                onClick={handleTextToSpeech}
                disabled={speaking}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-lg transition disabled:opacity-50 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
              >
                {speaking ? '🔊 Playing...' : '🔊 Read Aloud'}
              </button>

              <button 
                onClick={() => setShowVoiceControls(!showVoiceControls)}
                className={`${showVoiceControls ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-gradient-to-r from-purple-500 to-purple-600'} hover:from-purple-600 hover:to-purple-700 text-white px-4 py-3 rounded-lg transition font-semibold shadow-md hover:shadow-lg transform hover:scale-105`}
              >
                ⚙️
              </button>

              <button 
                onClick={handleSpeechToText}
                disabled={listening}
                className="bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white px-6 py-3 rounded-lg transition disabled:opacity-50 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
              >
                {listening ? '🎤 Listening...' : '🎤 Voice Input'}
              </button>

              {selectedNote && (
                <button 
                  onClick={handleDeleteNote}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-lg transition ml-auto font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  🗑️ Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

