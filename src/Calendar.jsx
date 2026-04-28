import { useState, useEffect, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import rrulePlugin from '@fullcalendar/rrule'
import { supabase } from './supabaseClient'
import { fetchWeeklyWeather } from './weather'
import { CalendarDays, Menu } from 'lucide-react'

const PERSON_COLORS = {
  chip: '#7C9EE8',
  cristina: '#E88FAD',
  lucia: '#E8A87C',
  bennett: '#7CC4E8',
  family: '#7CCFB8',
}

const CATEGORY_COLORS = {
  work: '#A0A8C8',
  school: '#B5A8E8',
  health: '#E89A9A',
  sports: '#E8C47C',
  social: '#7CC4CF',
  other: '#B8BCC8',
}

const PERSONS = ['chip', 'cristina', 'lucia', 'bennett', 'family']
const CATEGORIES = ['work', 'school', 'health', 'sports', 'social', 'other']
const RECURRENCE = ['none', 'weekly', 'monthly', 'annually']

function getColor(person) {
  return PERSON_COLORS[person] || '#7CCFB8'
}

function getCategoryEmoji(category) {
  const emojis = { work: '💼', school: '🎒', health: '❤️', sports: '⚽', social: '🎉', other: '' }
  return emojis[category] || ''
}

function label(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function getInitial(person) {
  return person ? person.charAt(0).toUpperCase() : 'F'
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
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

// Custom Agenda/List View
function AgendaView({ events, onEventClick, onDateClick, weather }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(d)
  }

  const getEventsForDay = (date) => {
  return events.filter(e => {
    // Handle regular events
    if (e.start) {
      const start = new Date(e.start)
      start.setHours(0, 0, 0, 0)
      return start.getTime() === date.getTime()
    }
    // Handle rrule recurring events
    if (e.rrule) {
      const dtstart = new Date(e.rrule.dtstart)
      dtstart.setHours(0, 0, 0, 0)
      // Check if this date matches the recurrence pattern
      if (date < dtstart) return false
      if (e.rrule.until && date > new Date(e.rrule.until)) return false
      const freq = e.rrule.freq
      const diffDays = Math.round((date - dtstart) / (1000 * 60 * 60 * 24))
      if (freq === 'WEEKLY') return diffDays % 7 === 0
      if (freq === 'MONTHLY') return date.getDate() === dtstart.getDate()
      if (freq === 'YEARLY') return date.getDate() === dtstart.getDate() && date.getMonth() === dtstart.getMonth()
    }
    return false
  }).sort((a, b) => {
    const aTime = a.start ? new Date(a.start) : new Date(a.rrule?.dtstart)
    const bTime = b.start ? new Date(b.start) : new Date(b.rrule?.dtstart)
    return aTime - bTime
  })
}

  const formatDayHeader = (date) => {
    const isToday = date.getTime() === today.getTime()
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
    const dayNum = date.getDate()
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    return { dayName, dayNum, month, isToday }
  }

  const getWeatherForDay = (date) => {
    const dateStr = date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0')
    return weather[dateStr]
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-3">
      {days.map((date, i) => {
        const dayEvents = getEventsForDay(date)
        const { dayName, dayNum, month, isToday } = formatDayHeader(date)
        const w = getWeatherForDay(date)

        return (
          <div key={i} className="mb-4">
            {/* Day header */}
            <div
              className="flex items-center justify-between mb-2 cursor-pointer"
              onClick={() => onDateClick(date)}
            >
              <div className="flex items-center gap-3">
                <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl ${isToday ? 'bg-indigo-500' : 'bg-gray-100'}`}>
                  <span className={`text-xs font-bold ${isToday ? 'text-white' : 'text-gray-400'}`}>{dayName}</span>
                  <span className={`text-lg font-bold leading-none ${isToday ? 'text-white' : 'text-gray-700'}`}>{dayNum}</span>
                </div>
                <span className={`text-sm font-medium ${isToday ? 'text-indigo-500' : 'text-gray-400'}`}>{month}</span>
              </div>
              {w && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span>{w.icon}</span>
                  <span className="text-red-400 font-medium">{w.high}°</span>
                  <span className="text-blue-400">{w.low}°</span>
                </div>
              )}
            </div>

            {/* Events */}
            {dayEvents.length === 0 ? (
              <div className="ml-15 pl-3 text-xs text-gray-300 italic mb-1">No events</div>
            ) : (
              <div className="space-y-2 ml-0">
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="flex items-center rounded-2xl px-4 py-3 cursor-pointer active:opacity-80"
                    style={{ backgroundColor: event.backgroundColor + '33', borderLeft: `4px solid ${event.backgroundColor}` }}
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 text-sm">
                        {getCategoryEmoji(event.extendedProps?.category)} {event.extendedProps?.rawTitle || event.title}
                      </div>
                      {!event.allDay && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {formatTime(event.start)}{event.end ? ` – ${formatTime(event.end)}` : ''}
                          {event.extendedProps?.location ? ` · ${event.extendedProps.location}` : ''}
                        </div>
                      )}
                    </div>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ml-3 flex-shrink-0"
                      style={{ backgroundColor: event.backgroundColor }}
                    >
                      {getInitial(event.extendedProps?.person)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Calendar({ session, onEventsLoaded }) {
  const [events, setEvents] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [view, setView] = useState('agenda')
  const [showLegend, setShowLegend] = useState(false)
  const [weather, setWeather] = useState({})
const [isMobile, setIsMobile] = useState(window.innerWidth < 768)


useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth < 768)
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])
  const [form, setForm] = useState({
    title: '', start: '', end: '', allDay: false,
    person: 'family', category: 'other',
    location: '', recurrence: 'none', recurrence_end: '', reminder: 30, show_countdown: false,

  })

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*')
    const expanded = []
    data?.forEach(e => {
      const eventObj = {
        id: e.id,
        title: e.title,
        allDay: e.all_day,
        backgroundColor: getColor(e.person),
        borderColor: getColor(e.person),
        textColor: '#ffffff',
        extendedProps: {
          person: e.person,
          category: e.category,
          location: e.location,
          recurrence: e.recurrence,
          recurrence_end: e.recurrence_end,
          reminder: e.reminder,
          rawTitle: e.title,
          show_countdown: e.show_countdown,
        }
      }
      if (e.recurrence && e.recurrence !== 'none') {
        let freq
        if (e.recurrence === 'weekly') freq = 'WEEKLY'
        else if (e.recurrence === 'monthly') freq = 'MONTHLY'
        else if (e.recurrence === 'annually') freq = 'YEARLY'
        eventObj.rrule = {
          freq,
          dtstart: e.start_time,
          until: e.recurrence_end ? new Date(e.recurrence_end) : undefined,
        }
        eventObj.duration = {
          milliseconds: e.end_time
            ? new Date(e.end_time) - new Date(e.start_time)
            : 3600000
        }
      } else {
        eventObj.start = e.start_time
        eventObj.end = e.end_time
      }
      expanded.push(eventObj)
    })
    if (onEventsLoaded) onEventsLoaded(expanded)
    setEvents(expanded)
  }

  useEffect(() => {
    fetchEvents()
    fetchWeeklyWeather().then(setWeather)
    const channel = supabase.channel('events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const openNew = (info) => {
    setSelectedEvent(null)
    let startStr = info.startStr || info.toISOString?.() || new Date().toISOString()
    if (startStr && startStr.endsWith('Z')) {
      const d = new Date(startStr)
      startStr = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0') + 'T' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0')
    }
    const endDate = new Date(startStr)
    endDate.setHours(endDate.getHours() + 1)
    const endStr = endDate.getFullYear() + '-' +
      String(endDate.getMonth() + 1).padStart(2, '0') + '-' +
      String(endDate.getDate()).padStart(2, '0') + 'T' +
      String(endDate.getHours()).padStart(2, '0') + ':' +
      String(endDate.getMinutes()).padStart(2, '0')
    setForm({
      title: '', start: startStr, end: endStr, allDay: false,
      person: 'family', category: 'other',
      location: '', recurrence: 'none', recurrence_end: '', reminder: 30, show_countdown: false,
    })
    setModalOpen(true)
  }

  const openEdit = (event) => {
    const ev = event.event || event
    setSelectedEvent(ev)
    setForm({
      title: ev.extendedProps?.rawTitle || ev.title,
      start: ev.startStr || ev.start,
      end: ev.endStr || ev.end || '',
      allDay: ev.allDay || false,
      person: ev.extendedProps?.person || 'family',
      category: ev.extendedProps?.category || 'other',
      location: ev.extendedProps?.location || '',
      recurrence: ev.extendedProps?.recurrence || 'none',
      recurrence_end: ev.extendedProps?.recurrence_end || '',
      reminder: ev.extendedProps?.reminder || 30,
      show_countdown: ev.extendedProps?.show_countdown || false,
    })
    setModalOpen(true)
  }

  const toISO = (str) => {
    if (!str) return null
    if (str.endsWith('Z')) return str
    const [datePart, timePart] = str.split('T')
    if (!timePart) return str
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = timePart.split(':').map(Number)
    return new Date(year, month - 1, day, hour, minute).toISOString()
  }

  const saveEvent = async () => {
    const color = getColor(form.person)
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
      show_countdown: form.show_countdown || false,
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
    const id = selectedEvent?.id || selectedEvent?.extendedProps?.id
    if (selectedEvent) {
      await supabase.from('events').delete().eq('id', selectedEvent.id)
      setModalOpen(false)
      fetchEvents()
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-2">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
  <CalendarDays size={22} className="text-indigo-500" /> ONeil Family
</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLegend(!showLegend)}
            className="text-xs text-indigo-500 font-semibold border border-indigo-200 rounded-full px-3 py-1">
            {showLegend ? 'Hide' : 'Legend'}
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
            <div className="flex flex-wrap gap-2">
              {PERSONS.map(p => (
                <span key={p} className="flex items-center gap-1.5 text-xs text-white font-medium px-3 py-1 rounded-full"
                  style={{ background: PERSON_COLORS[p] }}>
                  {label(p)}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Categories</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <span key={c} className="text-xs text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1">
                  {getCategoryEmoji(c)} {label(c)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View switcher */}
      <div className="flex gap-2 px-4 pb-3 pt-1">
        {[
          { key: 'agenda', label: 'List' },
          { key: 'timeGridWeek', label: 'Week' },
          { key: 'dayGridMonth', label: 'Month' },
        ].map(v => (
          <button key={v.key} onClick={() => setView(v.key)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition"
            style={{
              background: view === v.key ? '#6366f1' : '#e5e7eb',
              color: view === v.key ? 'white' : '#374151',
            }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Agenda View */}
      {view === 'agenda' && (
        <AgendaView
          events={events}
          onEventClick={openEdit}
          onDateClick={(date) => openNew(date)}
          weather={weather}
        />
      )}

      {/* FullCalendar Views */}
      {view !== 'agenda' && (
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
            .fc .fc-daygrid-day-number { font-size: 0.78rem; font-weight: 600; color: #9ca3af; text-decoration: none; padding: 4px 6px; }
            .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number { color: #6366f1; background: #eef2ff; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
            .fc .fc-daygrid-day { border-color: #f3f4f6; }
            .fc .fc-timegrid-axis { border: none; width: 36px !important; }
            .fc .fc-timegrid-axis-cushion { font-size: 0.65rem; color: #d1d5db; max-width: 36px; }
            .fc .fc-list-event-dot { display: none; }
          `}</style>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, rrulePlugin]}
            initialView={view === 'timeGridWeek' && isMobile ? 'timeGrid' : view}
            key={view}
            headerToolbar={{
              left: 'prev,next',
              center: 'title',
              right: 'today',
            }}
            events={events}
            selectable={true}
            selectMirror={true}
            dateClick={(info) => openNew({ startStr: info.dateStr, allDay: info.allDay })}
            eventClick={openEdit}
            height="100%"
            slotMinTime="06:00:00"
            slotMaxTime="21:00:00"
            expandRows={true}
            nowIndicator={true}
            dayMaxEvents={3}
            snapDuration="00:15:00"
            views={{
  timeGrid: {
    type: 'timeGrid',
    duration: { days: 3 },
    buttonText: 'Week'
  }
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
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>
                    {dayName}
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#111827' }}>
                    {dayNum}
                  </div>
                  {w && view === 'timeGridWeek' && (
                    <div style={{ fontSize: '0.65rem', color: '#9ca3af', lineHeight: '1.4' }}>
                      <div>{w.icon}</div>
                      <div style={{ color: '#f87171', fontWeight: '600' }}>{w.high}°</div>
                      <div style={{ color: '#60a5fa' }}>{w.low}°</div>
                    </div>
                  )}
                </div>
              )
            }}
            eventContent={(arg) => {
  const emoji = arg.event.extendedProps?.category && arg.event.extendedProps.category !== 'other'
    ? getCategoryEmoji(arg.event.extendedProps.category) + ' '
    : ''
  return (
    <div style={{
      backgroundColor: arg.event.backgroundColor,
      borderRadius: '12px',
      padding: '3px 8px',
      fontSize: '0.72rem',
      fontWeight: '600',
      color: 'white',
      overflow: 'hidden',
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      width: '100%',
      height: '100%',
      lineHeight: '1.3',
    }}>
      {emoji}{arg.event.extendedProps?.rawTitle || arg.event.title}
    </div>
  )
}}
          />
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => {
          const now = new Date()
          const localStr = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + 'T' +
            String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0')
          openNew({ startStr: localStr, allDay: false })
        }}
        className="fixed bottom-20 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg text-3xl flex items-center justify-center z-40">
        +
      </button>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" style={{ paddingBottom: '64px' }}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg space-y-4 overflow-y-auto max-h-[80vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">{selectedEvent ? 'Edit Event' : 'New Event'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 text-2xl leading-none">&times;</button>
            </div>

            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Event title"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})} />

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
                value={form.location}
                onChange={e => setForm({...form, location: e.target.value})} />
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
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Repeat ends (optional)</label>
                <input type="date"
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
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setForm({...form, category: c})}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border-2 transition"
                    style={{
                      background: form.category === c ? CATEGORY_COLORS[c] : 'transparent',
                      borderColor: CATEGORY_COLORS[c],
                      color: form.category === c ? 'white' : CATEGORY_COLORS[c],
                    }}>
                    {getCategoryEmoji(c)} {label(c)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Reminder</label>
              <div className="flex gap-2">
                {[15, 30, 60].map(r => (
                  <button key={r} onClick={() => setForm({...form, reminder: r})}
                    className="flex-1 py-2 rounded-xl text-sm font-medium border-2 transition"
                    style={{
                      background: form.reminder === r ? '#6366f1' : 'transparent',
                      borderColor: '#6366f1',
                      color: form.reminder === r ? 'white' : '#6366f1',
                    }}>
                    {r === 60 ? '1 hour' : `${r} min`}
                  </button>
                ))}
              </div>
            </div>
<label className="flex items-center gap-3 cursor-pointer">
  <div
    onClick={() => setForm({...form, show_countdown: !form.show_countdown})}
    className="relative w-12 h-6 rounded-full transition"
    style={{ background: form.show_countdown ? '#6366f1' : '#e5e7eb' }}>
    <div className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all"
      style={{ left: form.show_countdown ? '26px' : '4px' }} />
  </div>
  <span className="text-sm text-gray-600 font-medium">Include in countdowns ⏳</span>
</label>
            <div className="flex gap-2 pt-2 pb-2">
              <button onClick={saveEvent}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold">
                Save
              </button>
              {selectedEvent && (
                <button onClick={deleteEvent}
                  className="flex-1 bg-red-50 text-red-500 rounded-xl py-3 text-sm font-bold">
                  Delete
                </button>
              )}
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