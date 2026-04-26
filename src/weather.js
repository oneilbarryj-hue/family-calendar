// Andover, MA coordinates
const LAT = 42.6584
const LON = -71.1368

const WMO_CODES = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '❄️',
  77: '❄️', 80: '🌦️', 81: '🌧️', 82: '⛈️',
  85: '🌨️', 86: '❄️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}

export async function fetchWeeklyWeather() {
 const today = new Date()
const startOfWeek = new Date(today)
startOfWeek.setDate(today.getDate() - today.getDay())
const start = startOfWeek.getFullYear() + '-' +
  String(startOfWeek.getMonth() + 1).padStart(2, '0') + '-' +
  String(startOfWeek.getDate()).padStart(2, '0')
  const end = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10)

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=America%2FNew_York&start_date=${start}&end_date=${end}`

  const res = await fetch(url)
  const data = await res.json()

  const weather = {}
  data.daily.time.forEach((date, i) => {
    weather[date] = {
      high: Math.round(data.daily.temperature_2m_max[i]),
      low: Math.round(data.daily.temperature_2m_min[i]),
      icon: WMO_CODES[data.daily.weathercode[i]] || '🌡️',
    }
  })
  return weather
}