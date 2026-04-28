import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import Calendar from './Calendar'
import TodoList from './TodoList'
import BuyList from './BuyList'
import Countdown from './Countdown'
import { Calendar as CalendarIcon, CheckSquare, ShoppingCart, Timer } from 'lucide-react'

export default function App() {
  const [session, setSession] = useState(null)
  const [activeNav, setActiveNav] = useState('calendar')
  const [calendarEvents, setCalendarEvents] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!session) return <Login />

const NAV_ITEMS = [
  { key: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { key: 'todo', label: 'To-Do', icon: CheckSquare },
  { key: 'buylist', label: 'Buy List', icon: ShoppingCart },
  { key: 'countdown', label: 'Countdown', icon: Timer },
]

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Left sidebar — desktop only */}
      <div className="hidden md:flex flex-col w-20 bg-white border-r border-gray-100 items-center py-8 gap-2 shadow-sm">
        <div className="mb-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg">
            O
          </div>
        </div>
        {NAV_ITEMS.map(item => (
          <button key={item.key}
  onClick={() => setActiveNav(item.key)}
  className="flex-1 flex flex-col items-center pt-3 pb-2 gap-1 transition"
  style={{
    color: activeNav === item.key ? '#6366f1' : '#9ca3af',
  }}>
            <item.icon size={22} />
            <span className="text-xs font-semibold">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeNav === 'calendar' && <Calendar session={session} onEventsLoaded={setCalendarEvents} />}
        {activeNav === 'todo' && <TodoList session={session} />}
        {activeNav === 'buylist' && <BuyList session={session} />}
        {activeNav === 'countdown' && <Countdown session={session} calendarEvents={calendarEvents} />}
      </div>

      {/* Bottom nav — mobile only */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-100 flex z-50 shadow-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV_ITEMS.map(item => (
          <button key={item.key}
            onClick={() => setActiveNav(item.key)}
            className="flex-1 flex flex-col items-center py-3 gap-1 transition"
            style={{
              color: activeNav === item.key ? '#6366f1' : '#9ca3af',
            }}>
            <item.icon size={22} />
            <span className="text-xs font-semibold">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}