import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { supabase } from './supabaseClient'

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

function getColor(person, category) {
  return category !== 'other'
    ? CATEGORY_COLORS[category]
    : PERSON_COLORS[person] || '#10b981'
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

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*')
    const expanded = []
    data?.forEach(e => {
      expanded.push({
        id: e.id,
        title: e.title,
        start: e.start_time,
        end: e.end_time,
        allDay: e.all_day,
        backgroundColor: e.color,
        borderColor: e.color,
        textColor: '#ffffff',
        rrule: e.recurrence ? buildRRule(e.recurrence)?.replace('RRULE:', '') : undefined,
        extendedProps: {
          person: e.person,
          category: e.category,
          location: e.location,
          recurrence: e.recurrence,
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
      title: ev.title,
      start: ev.startStr,
      end: ev.endStr || '',
      allDay: ev.allDay,
      person: ev.extendedProps.person || 'family',
      category: ev.extendedProps.category || 'other',
      location: ev.extendedProps.location || '',
      recurrence: ev.extendedProps.recurrence || 'none',
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
    <div className="h-screen flex flex-col p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-xl font-semibold">Family Calendar</h1>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-gray-500 hover:text-gray-700">
          Sign out
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs">
        {PERSONS.map(p => (
          <span key={p} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PERSON_COLORS[p] }} />
            {label(p)}
          </span>
        ))}
        <span className="text-gray-300">|</span>
        {CATEGORIES.map(c => (
          <span key={c} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[c] }} />
            {label(c)}
          </span>
        ))}
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
          }}
          events={events}
          selectable={true}
          select={openNew}
          eventClick={openEdit}
          height="100%"
        />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-auto space-y-4 overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-semibold">{selectedEvent ? 'Edit Event' : 'New Event'}</h2>

            {/* Title */}
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Title"
              value={form.title} onChange={e => setForm({...form, title: e.target.value})} />

            {/* All day toggle */}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.allDay}
                onChange={e => setForm({...form, allDay: e.target.checked})} />
              All day
            </label>

            {/* Start */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Start</label>
              <input
                type={form.allDay ? 'date' : 'datetime-local'}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.start?.slice(0, form.allDay ? 10 : 16)}
                onChange={e => setForm({...form, start: e.target.value})} />
            </div>

            {/* End */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">End</label>
              <input
                type={form.allDay ? 'date' : 'datetime-local'}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.end?.slice(0, form.allDay ? 10 : 16)}
                onChange={e => setForm({...form, end: e.target.value})} />
            </div>

            {/* Location */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Location (optional)</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Add a location"
                value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
            </div>

            {/* Recurrence */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Repeat</label>
              <div className="flex gap-2 flex-wrap">
                {RECURRENCE.map(r => (
                  <button key={r} onClick={() => setForm({...form, recurrence: r})}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition"
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

            {/* Person picker */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Who is this for?</label>
              <div className="flex flex-wrap gap-2">
                {PERSONS.map(p => (
                  <button key={p} onClick={() => setForm({...form, person: p})}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition"
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

            {/* Category picker */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setForm({...form, category: c})}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition"
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

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button onClick={saveEvent}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium">
                Save
              </button>
              {selectedEvent && (
                <button onClick={deleteEvent}
                  className="flex-1 bg-red-100 text-red-600 rounded-lg py-2 text-sm font-medium">
                  Delete
                </button>
              )}
              <button onClick={() => setModalOpen(false)}
                className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}