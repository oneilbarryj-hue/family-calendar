import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import Calendar from './Calendar'

export default function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return session ? <Calendar session={session} /> : <Login />
}