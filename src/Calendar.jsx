import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { supabase } from './supabaseClient'
import { fetchWeeklyWeather } from './weather'
import rrulePlugin from '@fullcalendar/rrule'

const PERSON_COLORS = {
  chip: '#6366f1',
  cristina: '#ec4899',
  lucia: '#f59e0b',
  bennett: '#3b82f6',
  family: '#10b981',
}

const CATEGORY_COLORS = {
  work: '#64748b',
  school: '#8b5cf6',
  health: '#ef4444',
  sports: '#f97316',
  social: '#06b6d4',
  other: '#6b7280',
}

const PERSONS = ['chip', 'cristina', 'lucia', 'bennett', 'family']
const CATEGORIES = ['work', 'school', 'health', 'sports', 'social', 'other']
const RECURRENCE = ['none', 'weekly', 'monthly', 'annually']

function getCategoryEmoji(category) {
  const emojis = {
    work: '💼',
    school: '🎒',
    health: '❤️',
    sports: '⚽',
    social: '🎉',
    other: '',
  }
  return emojis[category] || ''
}

function getColor(person, category) {
  return PERSON_COLORS[person] || '#10b981'
}


function buildRRule(recurrence) {
  switch (recurrence) {
    case 'weekly': return 'RRULE:FREQ=WEEKLY'
    case 'monthly': return 'RRULE:FREQ=MONTHLY'
    case 'annually': return 'RRULE:FREQ=YEARLY'
    default: return null
  }
}

export default function Calendar({ session }) {
  const [events, setEvents] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [view, setView] = useState('dayGridMonth')
  const [showLegend, setShowLegend] = useState(false)
  const [form, setForm] = useState({
    title: '',
    start: '',
    end: '',
    allDay: false,
    person: 'family',
    category: 'other',
    location: '',
    recurrence: 'none',
  })
  const [weather, setWeather] = useState({})

const fetchEvents = async () => {
  const { data } = await supabase.from('events').select('*')
  const expanded = []
  data?.forEach(e => {
    const categoryLabel = e.category && e.category !== 'other'
      ? `${getCategoryEmoji(e.category)} ${e.title}`
      : e.title
    expanded.push({
      id: e.id,
      title: categoryLabel,
      start: e.start_time,
      end: e.end_time,
      allDay: e.all_day,
      backgroundColor: PERSON_COLORS[e.person] || '#10b981',
      borderColor: PERSON_COLORS[e.person] || '#10b981',
      textColor: '#ffffff',
      extendedProps: {
        person: e.person,
        category: e.category,
        location: e.location,
        recurrence: e.recurrence,
        reminder: e.reminder,
        rawTitle: e.title,
      }
    })
  })
  setEvents(expanded)
}

useEffect(() => {
  fetchEvents()
  const channel = supabase.channel('events-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents)
    .subscribe()

  fetchWeeklyWeather().then(data => {
    console.log('Weather data:', data)
    setWeather(data)
  })

  return () => supabase.removeChannel(channel)
}, [])

  const openNew = (selectInfo) => {
    setSelectedEvent(null)
    setForm({
      title: '',
      start: selectInfo.startStr,
      end: selectInfo.endStr,
      allDay: selectInfo.allDay,
      person: 'family',
      category: 'other',
      location: '',
      recurrence: 'none',
    })
    setModalOpen(true)
  }

 const openEdit = (clickInfo) => {
  const ev = clickInfo.event
  setSelectedEvent(ev)
  setForm({
    title: ev.extendedProps.rawTitle || ev.title.replace(/[\u{1F300}-\u{1FFFF}]|\u26½|\u26BD|\u26BF/gu, '').trim(),
    start: ev.startStr,
    end: ev.endStr || '',
    allDay: ev.allDay,
    person: ev.extendedProps.person || 'family',
    category: ev.extendedProps.category || 'other',
    location: ev.extendedProps.location || '',
    recurrence: ev.extendedProps.recurrence || 'none',
    reminder: ev.extendedProps.reminder || 30,
  })
  setModalOpen(true)
}

  const saveEvent = async () => {
    const color = getColor(form.person, form.category)
    const payload = {
      title: form.title,
      start_time: form.start,
      end_time: form.end || null,
      all_day: form.allDay,
      color,
      person: form.person,
      category: form.category,
      location: form.location || null,
      recurrence: form.recurrence !== 'none' ? form.recurrence : null,
      user_id: session.user.id,
    }
    if (selectedEvent) {
      await supabase.from('events').update(payload).eq('id', selectedEvent.id)
    } else {
      await supabase.from('events').insert(payload)
    }
    setModalOpen(false)
    fetchEvents()
  }

  const deleteEvent = async () => {
    if (selectedEvent) {
      await supabase.from('events').delete().eq('id', selectedEvent.id)
      setModalOpen(false)
      fetchEvents()
    }
  }

  const label = (str) => str.charAt(0).toUpperCase() + str.slice(1)

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-800">📅 ONeil Family Calendar</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowLegend(!showLegend)}
            className="text-xs text-indigo-600 font-medium border border-indigo-200 rounded-full px-3 py-1">
            {showLegend ? 'Hide legend' : 'Legend'}
          </button>
          <button onClick={() => supabase.auth.signOut()}
            className="text-xs text-gray-400 hover:text-gray-600">
            Sign out
          </button>
        </div>
      </div>

{/* Legend */}
{showLegend && (
  <div className="px-4 pb-2 space-y-2">
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">People</p>
      <div className="flex flex-wrap gap-2 text-xs">
        {PERSONS.map(p => (
          <span key={p} className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-full px-2.5 py-1 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PERSON_COLORS[p] }} />
            {label(p)}
          </span>
        ))}
      </div>
    </div>
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Categories</p>
      <div className="flex flex-wrap gap-2 text-xs">
        {CATEGORIES.map(c => (
          <span key={c} className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-full px-2.5 py-1 shadow-sm">
            {getCategoryEmoji(c)} {label(c)}
          </span>
        ))}
      </div>
    </div>
  </div>
)}

      {/* View switcher */}
      <div className="flex gap-2 px-4 pb-2">
        {[
          { key: 'dayGridMonth', label: 'Month' },
          { key: 'timeGridWeek', label: 'Week' },
          { key: 'listWeek', label: 'List' },
        ].map(v => (
          <button key={v.key} onClick={() => setView(v.key)}
            className="flex-1 py-1.5 rounded-xl text-sm font-medium transition"
            style={{
              background: view === v.key ? '#6366f1' : '#e5e7eb',
              color: view === v.key ? 'white' : '#374151',
            }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div className="flex-1 bg-white mx-4 mb-4 rounded-2xl shadow-sm p-2 overflow-hidden">
        <style>{`
          .fc .fc-toolbar { flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
          .fc .fc-toolbar-title { font-size: 1.1rem; font-weight: 600; }
          .fc .fc-button { padding: 4px 10px; font-size: 0.78rem; border-radius: 8px; border: none; background: #e5e7eb; color: #374151; }
          .fc .fc-button:hover { background: #d1d5db; }
          .fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-today-button { background: #6366f1 !important; color: white !important; }
          .fc .fc-col-header-cell-cushion { font-size: 0.72rem; padding: 4px 0; text-decoration: none; color: #6b7280; }
          .fc .fc-daygrid-day-number { font-size: 0.8rem; padding: 2px 4px; text-decoration: none; color: inherit; }
          .fc .fc-daygrid-day.fc-day-today { background: #eef2ff; }
          .fc .fc-event { border-radius: 4px; font-size: 0.72rem; padding: 1px 3px; border: none; }
          .fc td, .fc th { border-color: #f3f4f6; }
          .fc .fc-timegrid-slot { height: 40px; }
          .fc .fc-list-event-title { font-size: 0.85rem; }
          .fc .fc-col-header-cell { vertical-align: top; }
.fc .fc-col-header-cell-cushion { display: block; padding-bottom: 2px; }
.weather-tag { font-size: 0.7rem; color: #6b7280; text-align: center; padding-bottom: 4px; line-height: 1.3; }
        `}</style>
        <FullCalendar
         plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin, rrulePlugin]}
  initialView={view}
  key={view}
  headerToolbar={{
    left: 'prev,next',
    center: 'title',
    right: 'today',
  }}
  events={events}
  selectable={true}
  selectMirror={true}
  dateClick={(info) => {
    const start = info.dateStr
    const end = info.dateStr
    openNew({
      startStr: start,
      endStr: end,
      allDay: info.allDay,
    })
  }}
  eventClick={openEdit}
  height="100%"
  dayMaxEvents={3}
  dayHeaderContent={(args) => {
  const d = new Date(args.date)
  const dateStr = d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
  const w = weather[dateStr]
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
  const dayNum = d.getDate()
  return (
    <div style={{ textAlign: 'center', padding: '4px 0' }}>
      <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {dayName}
      </div>
      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#111827' }}>
        {dayNum}
      </div>
      {w && view === 'timeGridWeek' && (
        <div style={{ fontSize: '0.7rem', color: '#6b7280', lineHeight: '1.4' }}>
          <div>{w.icon}</div>
          <div style={{ color: '#ef4444', fontWeight: '500' }}>{w.high}°</div>
          <div style={{ color: '#3b82f6' }}>{w.low}°</div>
        </div>
      )}
    </div>
  )
}}
        />
      </div>

      {/* + Add Event button */}
      <button
        onClick={() => {
          const now = new Date()
          openNew({
            startStr: now.toISOString(),
            endStr: new Date(now.getTime() + 3600000).toISOString(),
            allDay: false,
          })
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg text-3xl flex items-center justify-center z-40">
        +
      </button>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg space-y-4 overflow-y-auto max-h-[92vh]">

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedEvent ? 'Edit Event' : 'New Event'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 text-2xl leading-none">&times;</button>
            </div>

            <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Event title"
              value={form.title} onChange={e => setForm({...form, title: e.target.value})} />

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.allDay}
                onChange={e => setForm({...form, allDay: e.target.checked})} />
              All day
            </label>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Start</label>
              <input type={form.allDay ? 'date' : 'datetime-local'}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={form.start?.slice(0, form.allDay ? 10 : 16)}
                onChange={e => setForm({...form, start: e.target.value})} />
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">End</label>
              <input type={form.allDay ? 'date' : 'datetime-local'}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={form.end?.slice(0, form.allDay ? 10 : 16)}
                onChange={e => setForm({...form, end: e.target.value})} />
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Location</label>
              <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Add a location"
                value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Repeat</label>
              <div className="flex gap-2 flex-wrap">
                {RECURRENCE.map(r => (
                  <button key={r} onClick={() => setForm({...form, recurrence: r})}
                    className="px-3 py-2 rounded-xl text-sm font-medium border-2 transition"
                    style={{
                      background: form.recurrence === r ? '#6366f1' : 'transparent',
                      borderColor: '#6366f1',
                      color: form.recurrence === r ? 'white' : '#6366f1',
                    }}>
                    {label(r)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Who is this for?</label>
              <div className="flex flex-wrap gap-2">
                {PERSONS.map(p => (
                  <button key={p} onClick={() => setForm({...form, person: p})}
                    className="px-3 py-2 rounded-xl text-sm font-medium border-2 transition"
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
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setForm({...form, category: c})}
                    className="px-3 py-2 rounded-xl text-sm font-medium border-2 transition"
                    style={{
                      background: form.category === c ? CATEGORY_COLORS[c] : 'transparent',
                      borderColor: CATEGORY_COLORS[c],
                      color: form.category === c ? 'white' : CATEGORY_COLORS[c],
                    }}>
                    {label(c)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2 pb-2">
              <button onClick={saveEvent}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold">
                Save
              </button>
              {selectedEvent && (
                <button onClick={deleteEvent}
                  className="flex-1 bg-red-50 text-red-500 rounded-xl py-3 text-sm font-semibold">
                  Delete
                </button>
              )}
              <button onClick={() => setModalOpen(false)}
                className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 text-sm font-semibold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}