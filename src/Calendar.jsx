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

function generateTimeOptions() {
  const times = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = String(h).padStart(2, '0')
      const min = String(m).padStart(2, '0')
      const label12 = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${min} ${h < 12 ? 'AM' : 'PM'}`
      times.push({ value: `${hour}:${min}`, label: label12 })
    }
  }
  return times
}
const TIME_OPTIONS = generateTimeOptions()

export default function Calendar({ session }) {
  const [events, setEvents] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
const [view, setView] = useState('listWeek')
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
  recurrence_end: '',
  reminder: 30,
})
  const [weather, setWeather] = useState({})

const fetchEvents = async () => {
  const { data } = await supabase.from('events').select('*')
  const expanded = []
  data?.forEach(e => {
const categoryLabel = e.title

    const eventObj = {
      id: e.id,
      title: categoryLabel,
      allDay: e.all_day,
      backgroundColor: PERSON_COLORS[e.person] || '#10b981',
      borderColor: PERSON_COLORS[e.person] || '#10b981',
      textColor: '#ffffff',
      extendedProps: {
        person: e.person,
        category: e.category,
        location: e.location,
        recurrence: e.recurrence,
          recurrence_end: e.recurrence_end,
        reminder: e.reminder,
        rawTitle: e.title,
      }
    }

    if (e.recurrence && e.recurrence !== 'none') {
      // rrule format needs dtstart
      const dtstart = e.start_time
      const duration = e.end_time
        ? new Date(e.end_time) - new Date(e.start_time)
        : 3600000

      let freq
      if (e.recurrence === 'weekly') freq = 'WEEKLY'
      else if (e.recurrence === 'monthly') freq = 'MONTHLY'
      else if (e.recurrence === 'annually') freq = 'YEARLY'

      eventObj.rrule = {
        freq,
        dtstart,
         until: e.recurrence_end ? new Date(e.recurrence_end) : undefined,
      }
      eventObj.duration = { milliseconds: duration }
    } else {
      eventObj.start = e.start_time
      eventObj.end = e.end_time
    }

    expanded.push(eventObj)
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

  const openNew = (info) => {
  setSelectedEvent(null)
  
  // Build a clean local start string
  let startStr = info.startStr
  if (startStr && startStr.endsWith('Z')) {
    const d = new Date(startStr)
    startStr = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0') + 'T' +
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0')
  }

  // Auto set end to 1 hour after start
  const endDate = new Date(startStr)
  endDate.setHours(endDate.getHours() + 1)
  const endStr = endDate.getFullYear() + '-' +
    String(endDate.getMonth() + 1).padStart(2, '0') + '-' +
    String(endDate.getDate()).padStart(2, '0') + 'T' +
    String(endDate.getHours()).padStart(2, '0') + ':' +
    String(endDate.getMinutes()).padStart(2, '0')

  setForm({
    title: '',
    start: startStr,
    end: endStr,
    allDay: false,
    person: 'family',
    category: 'other',
    location: '',
    recurrence: 'none',
    reminder: 30,
  })
  setModalOpen(true)
}

const openEdit = (clickInfo) => {
  const ev = clickInfo.event
  setSelectedEvent(ev)
  setForm({
    title: ev.extendedProps.rawTitle || ev.title,
    start: ev.startStr,
    end: ev.endStr || '',
    allDay: ev.allDay,
    person: ev.extendedProps.person || 'family',
    category: ev.extendedProps.category || 'other',
    location: ev.extendedProps.location || '',
    recurrence: ev.extendedProps.recurrence || 'none',
    recurrence_end: ev.extendedProps.recurrence_end || '',
    reminder: ev.extendedProps.reminder || 30,
  })
  setModalOpen(true)
}
const deleteEvent = async () => {
  if (selectedEvent) {
    await supabase.from('events').delete().eq('id', selectedEvent.id)
    setModalOpen(false)
    fetchEvents()
  }
}
const saveEvent = async () => {
  const color = getColor(form.person, form.category)


const toISO = (str) => {
  if (!str) return null
  // If already a Z UTC string, convert to local time first
  if (str.endsWith('Z')) {
    return str
  }
  // datetime-local gives us "2026-04-26T10:00" without timezone
  // We need to treat it as local time
  const [datePart, timePart] = str.split('T')
  if (!timePart) return str
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  const d = new Date(year, month - 1, day, hour, minute)
  return d.toISOString()
}

  console.log('Saving start:', toISO(form.start), 'Raw:', form.start)

  console.log('Saving start:', toISO(form.start), 'Raw:', form.start)

  const payload = {
    title: form.title,
    start_time: form.allDay ? form.start : toISO(form.start),
    end_time: form.end ? (form.allDay ? form.end : toISO(form.end)) : null,
    all_day: form.allDay,
    color,
    person: form.person,
    category: form.category,
    location: form.location || null,
    recurrence: form.recurrence !== 'none' ? form.recurrence : null,
      recurrence_end: form.recurrence_end || null,
    reminder: form.reminder || 30,
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
      <span key={p}
        className="px-3 py-1 rounded-full text-white font-medium text-xs"
        style={{ background: PERSON_COLORS[p] }}>
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
  { key: 'listWeek', label: 'List' },
  { key: 'timeGridWeek', label: 'Week' },
  { key: 'dayGridMonth', label: 'Month' },
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
          .fc { font-family: 'Nunito', sans-serif; }
          .fc .fc-toolbar { flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
          .fc .fc-toolbar-title { font-size: 1.1rem; font-weight: 700; color: #111827; }
          .fc .fc-button { padding: 4px 10px; font-size: 0.78rem; border-radius: 8px; border: none; background: #f3f4f6; color: #374151; font-weight: 600; }
          .fc .fc-button:hover { background: #e5e7eb; }
          .fc .fc-button-primary:not(:disabled).fc-button-active,
          .fc .fc-today-button { background: #6366f1 !important; color: white !important; }
          .fc .fc-col-header-cell { border: none; background: transparent; }
          .fc .fc-col-header-cell-cushion { font-size: 0.72rem; font-weight: 700; padding: 4px 0 2px; text-decoration: none; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; }
          .fc .fc-col-header { border-bottom: 2px solid #f3f4f6; }
          .fc .fc-day-today { background: #fafafa !important; }
          .fc .fc-day-today .fc-col-header-cell-cushion { color: #6366f1 !important; }
          .fc .fc-timegrid-slot-label { font-size: 0.65rem; color: #d1d5db; font-weight: 500; border: none; padding-right: 6px; vertical-align: top; width: 36px !important; }
          .fc .fc-timegrid-slot-label-cushion { padding: 0 4px 0 0; }
          .fc .fc-timegrid-slot { border-color: #f9fafb; height: 40px; }
          .fc .fc-timegrid-slot-minor { border-color: transparent; }
          .fc td, .fc th { border-color: #f3f4f6; }
          .fc .fc-scrollgrid { border: none; }
          .fc .fc-scrollgrid-section > td { border: none; }
          .fc .fc-timegrid-col { border-color: #f3f4f6; }
          .fc .fc-timegrid-event { border-radius: 10px !important; border: none !important; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin: 1px 2px; }
          .fc .fc-timegrid-event .fc-event-main { padding: 3px 6px; }
          .fc .fc-event-time { font-size: 0.65rem; font-weight: 600; opacity: 0.85; }
          .fc .fc-event-title { font-size: 0.75rem; font-weight: 700; }
          .fc .fc-timegrid-now-indicator-line { border-color: #6366f1; border-width: 2px; }
          .fc .fc-timegrid-now-indicator-arrow { border-color: #6366f1; }
          .fc .fc-list-event-title { font-size: 0.85rem; font-weight: 600; }
          .fc .fc-list-event-time { font-size: 0.78rem; color: #9ca3af; }
          .fc .fc-list-day-cushion { background: #f9fafb; font-size: 0.8rem; font-weight: 700; color: #6366f1; }
          .fc .fc-list-table { border: none; }
          .fc .fc-daygrid-day-number { font-size: 0.78rem; font-weight: 600; color: #9ca3af; text-decoration: none; padding: 4px 6px; }
          .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number { color: #6366f1; background: #eef2ff; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
          .fc .fc-daygrid-day { border-color: #f3f4f6; }
          .fc .fc-timegrid-axis { border: none; width: 36px !important; }
          .fc .fc-timegrid-axis-cushion { font-size: 0.65rem; color: #d1d5db; max-width: 36px; }
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
      recurrence_end: '',
    })
  }}
  eventClick={openEdit}
  height="100%"
    slotMinTime="06:00:00"
  slotMaxTime="21:00:00"
  expandRows={true}
  nowIndicator={true}
  dayMaxEvents={3}
  listDaySideFormat={{ weekday: 'long' }}
listDayFormat={{ month: 'short', day: 'numeric' }}
dayCellContent={(args) => {
  const d = new Date(args.date)
  const dateStr = d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
  const w = weather[dateStr]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span>{args.dayNumberText}</span>
      {w && (
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {w.icon} {w.high}°↑ {w.low}°↓
        </span>
      )}
    </div>
  )
}}
  eventContent={(arg) => {
  const emoji = arg.event.extendedProps.category && arg.event.extendedProps.category !== 'other'
    ? getCategoryEmoji(arg.event.extendedProps.category) + ' '
    : ''
  return (
    <div style={{
      backgroundColor: arg.event.backgroundColor,
      borderRadius: '999px',
      padding: '2px 8px',
      fontSize: '0.72rem',
      fontWeight: '500',
      color: 'white',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      width: '100%',
    }}>
      {emoji}{arg.event.title.replace(/^[\u{1F300}-\u{1FFFF}]\s*/u, '')}
    </div>
  )
}}
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
  const localStr = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + 'T' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0')
  openNew({
    startStr: localStr,
    endStr: localStr,
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
  {form.allDay ? (
    <input type="date"
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      value={form.start?.slice(0, 10)}
      onChange={e => setForm({...form, start: e.target.value})} />
  ) : (
    <div className="flex gap-2">
      <input type="date"
        className="flex-1 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        value={form.start?.slice(0, 10)}
        onChange={e => {
          const timePart = form.start?.slice(11, 16) || '09:00'
          const newStart = `${e.target.value}T${timePart}`
          const endDate = new Date(newStart)
          endDate.setHours(endDate.getHours() + 1)
          const newEnd = endDate.getFullYear() + '-' +
            String(endDate.getMonth() + 1).padStart(2, '0') + '-' +
            String(endDate.getDate()).padStart(2, '0') + 'T' +
            String(endDate.getHours()).padStart(2, '0') + ':' +
            String(endDate.getMinutes()).padStart(2, '0')
          setForm({...form, start: newStart, end: newEnd})
        }} />
      <select
        className="border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        value={form.start?.slice(11, 16) || '09:00'}
        onChange={e => {
          const datePart = form.start?.slice(0, 10) || new Date().toISOString().slice(0, 10)
          const newStart = `${datePart}T${e.target.value}`
          const endDate = new Date(newStart)
          endDate.setHours(endDate.getHours() + 1)
          const newEnd = endDate.getFullYear() + '-' +
            String(endDate.getMonth() + 1).padStart(2, '0') + '-' +
            String(endDate.getDate()).padStart(2, '0') + 'T' +
            String(endDate.getHours()).padStart(2, '0') + ':' +
            String(endDate.getMinutes()).padStart(2, '0')
          setForm({...form, start: newStart, end: newEnd})
        }}>
        {TIME_OPTIONS.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
    </div>
  )}
</div>

<div>
  <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">End</label>
  {form.allDay ? (
    <input type="date"
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      value={form.end?.slice(0, 10)}
      onChange={e => setForm({...form, end: e.target.value})} />
  ) : (
    <div className="flex gap-2">
      <input type="date"
        className="flex-1 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        value={form.end?.slice(0, 10)}
        onChange={e => {
          const timePart = form.end?.slice(11, 16) || '10:00'
          setForm({...form, end: `${e.target.value}T${timePart}`})
        }} />
      <select
        className="border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        value={form.end?.slice(11, 16) || '10:00'}
        onChange={e => {
          const datePart = form.end?.slice(0, 10) || new Date().toISOString().slice(0, 10)
          setForm({...form, end: `${datePart}T${e.target.value}`})
        }}>
        {TIME_OPTIONS.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
    </div>
  )}
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
{form.recurrence !== 'none' && (
  <div>
    <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
      Repeat ends (optional)
    </label>
    <input
      type="date"
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      value={form.recurrence_end}
      onChange={e => setForm({...form, recurrence_end: e.target.value})} />
  </div>
)}
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