import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import heroImage from '../assets/hero.png'
import smartnoteLogo from '../../../Asset/smartnoteLogo.png'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        // Sign up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        
        if (signUpError) {
          setError(signUpError.message)
        } else {
          // Create user record in public.users table
          if (data.user) {
            try {
              const { error: userError } = await supabase
                .from('users')
                .insert([
                  {
                    id: data.user.id,
                    email: email,
                    name: email.split('@')[0]
                  }
                ])
              
              if (userError) {
                console.error('User creation error:', userError)
                // Don't show this to user, auth still worked
              } else {
                console.log('User record created successfully')
              }
            } catch (err) {
              console.error('Error creating user record:', err)
            }
          }
          
          setMessage('Sign up successful! Check your email to confirm.')
          setEmail('')
          setPassword('')
        }
      } else {
        // Sign in
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (signInError) {
          setError(signInError.message)
        } else {
          // Ensure user record exists
          if (data.user) {
            try {
              const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single()
              
              if (!existingUser) {
                // Create user record if it doesn't exist
                await supabase
                  .from('users')
                  .insert([
                    {
                      id: data.user.id,
                      email: email,
                      name: email.split('@')[0]
                    }
                  ])
              }
            } catch (err) {
              console.error('Error managing user record:', err)
            }
          }
          
          setMessage('Sign in successful!')
          setEmail('')
          setPassword('')
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      })
      
      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        {/* Left Panel - Hero Section */}
        <div className="auth-hero">
          <div className="auth-hero-content">
            <img src={heroImage} alt="SmartNote Hero" />
            
            <h2>Your AI-Powered Notepad</h2>
            <p>Transform your ideas into organized insights with intelligent features</p>
            
            <div className="auth-hero-features">
              <div className="auth-hero-feature">
                <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                <span>Smart Suggestions & Auto-Complete</span>
              </div>
              <div className="auth-hero-feature">
                <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                <span>Voice Input & Text-to-Speech</span>
              </div>
              <div className="auth-hero-feature">
                <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                <span>AI-Powered Summarization</span>
              </div>
              <div className="auth-hero-feature">
                <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                <span>File Upload & Extract</span>
              </div>
              <div className="auth-hero-feature">
                <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                <span>Dark Mode & Export to PDF</span>
              </div>
            </div>

            <div className="auth-hero-footer">
              <p>✓ No credit card required • ✓ Free forever plan • ✓ Cancel anytime</p>
            </div>
          </div>
        </div>

        {/* Right Panel - Form Section */}
        <div className="auth-form-section">
          <div className="auth-header">
            <div className="auth-logo">
              <img src={smartnoteLogo} alt="SmartNote Logo" />
            </div>
            <p>
              {isSignUp ? 'Create your account and start taking smarter notes' : 'Welcome back! Sign in to your account'}
            </p>
          </div>

          {error && (
            <div className="auth-alert auth-alert-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="auth-alert auth-alert-success">
              <span>✓</span>
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="auth-form">
            <div className="auth-form-group">
              <label className="auth-form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="auth-form-input"
                required
              />
            </div>

            <div className="auth-form-group">
              <label className="auth-form-label">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="auth-form-input"
                  style={{ width: '100%' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="button button-primary"
            >
              {loading ? (
                <span className="button-loading">
                  <span className="spinner">⏳</span>
                  Loading...
                </span>
              ) : isSignUp ? (
                '✨ Create Account'
              ) : (
                '🚀 Sign In'
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span className="auth-divider-text">OR</span>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="button-google"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-toggle">
            <p>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError(null)
                  setMessage(null)
                }}
                className="auth-toggle-link"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>

          <div className="auth-trust">
            <p>✓ No credit card required • ✓ Free forever plan • ✓ Cancel anytime</p>
          </div>
        </div>
      </div>

      {/* Mobile Version */}
      <div className="auth-mobile">
        <div className="auth-mobile-card">
          <div className="auth-header">
            <div className="auth-logo" style={{ marginBottom: '1rem' }}>
              <img src={smartnoteLogo} alt="SmartNote Logo" style={{ height: '60px' }} />
            </div>
            <p>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </p>
          </div>

          {error && (
            <div className="auth-alert auth-alert-error">
              ⚠️ {error}
            </div>
          )}

          {message && (
            <div className="auth-alert auth-alert-success">
              ✓ {message}
            </div>
          )}

          <form onSubmit={handleAuth} className="auth-form">
            <div className="auth-form-group">
              <label className="auth-form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="auth-form-input"
                required
              />
            </div>

            <div className="auth-form-group">
              <label className="auth-form-label">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="auth-form-input"
                  style={{ width: '100%' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="button button-primary"
            >
              {loading ? '⏳ Loading...' : isSignUp ? '✨ Sign Up' : '🚀 Sign In'}
            </button>
          </form>

          <div className="auth-divider">
            <span className="auth-divider-text">OR</span>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="button-google"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-toggle">
            <p>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError(null)
                  setMessage(null)
                }}
                className="auth-toggle-link"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>

          <div className="auth-trust">
            <p>✓ No credit card required • ✓ Free forever plan</p>
          </div>
        </div>
      </div>
    </div>
  )
}
