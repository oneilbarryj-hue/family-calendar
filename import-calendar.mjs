import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://fyduvenlhopgepzqjhmn.supabase.co'
const SUPABASE_KEY = 'sb_publishable_v3epfoeRXn196A34c8KV5A_R6DziCPE'
const CALENDAR_FILE = './your-calendar.ics'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const raw = readFileSync(CALENDAR_FILE, 'utf-8')
const lines = raw.split(/\r?\n/)

const events = []
let current = null

for (const line of lines) {
  if (line === 'BEGIN:VEVENT') {
    current = {}
  } else if (line === 'END:VEVENT' && current) {
    if (current.title && current.start) {
      events.push(current)
    }
    current = null
  } else if (current) {
    if (line.startsWith('SUMMARY:')) {
      current.title = line.replace('SUMMARY:', '').trim()
    } else if (line.startsWith('DTSTART;TZID=') || line.startsWith('DTSTART:')) {
      const val = line.split(':').slice(1).join(':').trim()
      if (val.length === 8) {
        // All day: YYYYMMDD
        current.start = `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}`
        current.allDay = true
      } else {
        // DateTime: YYYYMMDDTHHMMSS
        const d = val.replace(/[TZ]/g, '')
        current.start = `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T${d.slice(8,10)}:${d.slice(10,12)}:00`
        current.allDay = false
      }
    } else if (line.startsWith('DTEND;TZID=') || line.startsWith('DTEND:')) {
      const val = line.split(':').slice(1).join(':').trim()
      if (val.length === 8) {
        current.end = `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}`
      } else {
        const d = val.replace(/[TZ]/g, '')
        current.end = `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T${d.slice(8,10)}:${d.slice(10,12)}:00`
      }
    } else if (line.startsWith('LOCATION:')) {
      current.location = line.replace('LOCATION:', '').trim()
    } else if (line.startsWith('DESCRIPTION:')) {
      current.description = line.replace('DESCRIPTION:', '').trim()
    }
  }
}

console.log(`Found ${events.length} events, importing...`)

for (const e of events) {
  const { error } = await supabase.from('events').insert({
    title: e.title,
    start_time: e.start,
    end_time: e.end || null,
    all_day: e.allDay || false,
    location: e.location || null,
    description: e.description || null,
    color: '#7CC4E8', // default to family teal — you can change
    person: 'family',
    category: 'other',
    user_id: '882ad939-85f9-4cc0-bf15-ee1bb5b4a708', // paste your Supabase user ID
  })
  if (error) console.error('Error importing:', e.title, error.message)
  else console.log('Imported:', e.title)
}

console.log('Done!')