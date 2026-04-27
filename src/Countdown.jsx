import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const PERSONS = ['chip', 'cristina', 'lucia', 'bennett', 'family']
const PERSON_COLORS = {
  chip: '#7C9EE8',
  cristina: '#E88FAD',
  lucia: '#E8A87C',
  bennett: '#7CC4E8',
  family: '#7CCFB8',
}

const EMOJIS = ['🎉', '✈️', '🎂', '🏖️', '🎄', '🎃', '❤️', '🏆', '🎓', '🏠', '👶', '🎸']

function label(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24))
  return diff
}

export default function Countdown({ session, calendarEvents }) {
  const [countdowns, setCountdowns] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    title: '', target_date: '', person: 'family', emoji: '🎉'
  })

  const fetchCountdowns = async () => {
    const { data } = await supabase
      .from('countdowns')
      .select('*')
      .order('target_date', { ascending: true })
    setCountdowns(data || [])
  }

  useEffect(() => {
    fetchCountdowns()
    const channel = supabase.channel('countdowns-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'countdowns' }, fetchCountdowns)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const saveCountdown = async () => {
    if (!form.title.trim() || !form.target_date) return
    await supabase.from('countdowns').insert({
      title: form.title.trim(),
      target_date: form.target_date,
      person: form.person,
      emoji: form.emoji,
      user_id: session.user.id,
    })
    setModalOpen(false)
    setForm({ title: '', target_date: '', person: 'family', emoji: '🎉' })
    fetchCountdowns()
  }

  const deleteCountdown = async (id) => {
    await supabase.from('countdowns').delete().eq('id', id)
    fetchCountdowns()
  }

  // Merge manual countdowns with upcoming calendar events marked as countdowns
const calendarCountdowns = (calendarEvents || [])
    .filter(e => {
      const days = daysUntil(e.start)
      return days > 0 && days <= 365 && e.extendedProps?.show_countdown === true
    })
    .map(e => ({
      id: `cal-${e.id}`,
      calendarId: e.id,
      title: e.extendedProps?.rawTitle || e.title,
      target_date: e.start?.slice(0, 10),
      person: e.extendedProps?.person || 'family',
      emoji: '📅',
      fromCalendar: true,
    }))

  const allCountdowns = [
  ...countdowns.filter(c => daysUntil(c.target_date) > 0),
    ...calendarCountdowns.filter(c =>
      !countdowns.find(m => m.title.toLowerCase() === c.title.toLowerCase())
    )
  ].sort((a, b) => new Date(a.target_date) - new Date(b.target_date))

  const removeCalendarCountdown = async (eventId) => {
  await supabase.from('events').update({ show_countdown: false }).eq('id', eventId)
}

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">⏳ Countdowns</h2>
        <button onClick={() => setModalOpen(true)}
          className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-bold">
          + Add
        </button>
      </div>

      {/* Countdown cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
        {allCountdowns.length === 0 && (
          <p className="text-center text-gray-300 text-sm pt-8">No upcoming countdowns</p>
        )}
        {allCountdowns.map(c => {
          const days = daysUntil(c.target_date)
          const color = PERSON_COLORS[c.person] || '#7CCFB8'
          return (
            <div key={c.id}
              className="bg-white rounded-3xl shadow-sm overflow-hidden"
              style={{ borderLeft: `5px solid ${color}` }}>
              <div className="flex items-center px-4 py-4 gap-4">
                {/* Big day counter */}
                <div className="flex flex-col items-center justify-center rounded-2xl w-16 h-16 flex-shrink-0"
                  style={{ background: color + '22' }}>
                  <span className="text-2xl font-black leading-none" style={{ color }}>
                    {days === 0 ? '🎉' : days}
                  </span>
                  {days > 0 && (
                    <span className="text-xs font-semibold" style={{ color }}>
                      {days === 1 ? 'day' : 'days'}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{c.emoji}</span>
                    <p className="font-bold text-gray-800 text-base">{c.title}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ background: color }}>
                      {label(c.person)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(c.target_date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </span>
                    {c.fromCalendar && (
                      <span className="text-xs text-gray-300 italic">from calendar</span>
                    )}
                  </div>
                </div>

                {/* Delete — only for manual entries */}
                {!c.fromCalendar ? (
  <button onClick={() => deleteCountdown(c.id)}
    className="text-gray-300 hover:text-red-400 text-xl leading-none flex-shrink-0">
    ×
  </button>
) : (
  <button onClick={() => removeCalendarCountdown(c.calendarId)}
    className="text-gray-300 hover:text-red-400 text-xl leading-none flex-shrink-0">
    ×
  </button>
)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">New Countdown</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 text-2xl">&times;</button>
            </div>

            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="What are you counting down to?"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})} />

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Date</label>
              <input type="date"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={form.target_date}
                onChange={e => setForm({...form, target_date: e.target.value})} />
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Person</label>
              <div className="flex flex-wrap gap-2">
                {PERSONS.map(p => (
                  <button key={p} onClick={() => setForm({...form, person: p})}
                    className="px-3 py-2 rounded-xl text-sm font-semibold border-2 transition"
                    style={{
                      background: form.person === p ? PERSON_COLORS[p] : 'transparent',
                      borderColor: PERSON_COLORS[p],
                      color: form.person === p ? 'white' : PERSON_COLORS[p],
                    }}>
                    {label(p)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Emoji</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setForm({...form, emoji: e})}
                    className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition"
                    style={{
                      background: form.emoji === e ? '#eef2ff' : '#f9fafb',
                      border: form.emoji === e ? '2px solid #6366f1' : '2px solid transparent',
                    }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={saveCountdown}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold">
                Save
              </button>
              <button onClick={() => setModalOpen(false)}
                className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 text-sm font-bold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}