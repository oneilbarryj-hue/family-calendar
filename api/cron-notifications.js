import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  // Verify this is called by Vercel cron
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now = new Date()

  // Get all subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')

  if (!subscriptions?.length) return res.status(200).json({ sent: 0 })

  // Get upcoming events with reminders
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .gte('start_time', now.toISOString())

  let sent = 0
console.log(`Found ${subscriptions.length} subscriptions and ${events?.length} events`)

  for (const event of events || []) {
    const startTime = new Date(event.start_time)
    const reminderMs = (event.reminder || 30) * 60 * 1000
    const notifyAt = new Date(startTime.getTime() - reminderMs)

    // Check if we should notify now (within 1 minute window)
    const diff = Math.abs(notifyAt - now)
    if (diff > 120000) continue
    console.log(`Event: ${event.title}, notifyAt: ${notifyAt}, now: ${now}, diff: ${diff}`)

    const timeStr = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    })

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: `📅 ${event.title}`,
            body: event.location
              ? `${timeStr} · ${event.location}`
              : `Starting in ${event.reminder || 30} minutes at ${timeStr}`,
            tag: event.id,
          })
        )
        sent++
      } catch (err) {
        console.error('Failed to send to subscription:', err.message)
        // Remove invalid subscriptions
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }
  }

  res.status(200).json({ sent })
}