import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { CheckSquare, Trash2, X } from 'lucide-react'

const PERSONS = ['chip', 'cristina', 'lucia', 'bennett', 'family']
const PERSON_COLORS = {
  chip: '#7C9EE8',
  cristina: '#E88FAD',
  lucia: '#E8A87C',
  bennett: '#7CC4E8',
  family: '#7CCFB8',
}

function label(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export default function TodoList({ session }) {
  const [todos, setTodos] = useState([])
  const [newText, setNewText] = useState('')
  const [newPerson, setNewPerson] = useState('family')
  const [newDue, setNewDue] = useState('')
  const [filter, setFilter] = useState('all')

  const fetchTodos = async () => {
    const { data } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: true })
    setTodos(data || [])
  }

  useEffect(() => {
    fetchTodos()
    const channel = supabase.channel('todos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, fetchTodos)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const addTodo = async () => {
    if (!newText.trim()) return
    await supabase.from('todos').insert({
      title: newText.trim(),
      person: newPerson,
      due_date: newDue || null,
      completed: false,
      user_id: session.user.id,
    })
    setNewText('')
    setNewDue('')
    fetchTodos()
  }

  const toggleTodo = async (todo) => {
    await supabase.from('todos').update({ completed: !todo.completed }).eq('id', todo.id)
    fetchTodos()
  }

  const deleteTodo = async (id) => {
    await supabase.from('todos').delete().eq('id', id)
    fetchTodos()
  }

  const clearCompleted = async () => {
    const completed = todos.filter(t => t.completed)
    for (const t of completed) {
      await supabase.from('todos').delete().eq('id', t.id)
    }
    fetchTodos()
  }

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.completed
    if (filter === 'completed') return t.completed
    if (PERSONS.includes(filter)) return t.person === filter
    return true
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
  <CheckSquare size={22} className="text-indigo-500" /> To-Do
</h2>

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'completed', ...PERSONS].map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition"
              style={{
                background: filter === f
                  ? (PERSON_COLORS[f] || '#6366f1')
                  : '#f3f4f6',
                color: filter === f ? 'white' : '#6b7280',
              }}>
              {label(f)}
            </button>
          ))}
        </div>
      </div>

      {/* Add new */}
      <div className="px-4 pb-3 space-y-2">
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Add a to-do..."
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTodo()}
          />
          <button onClick={addTodo}
            className="bg-indigo-600 text-white rounded-xl px-4 py-3 font-bold text-lg">
            +
          </button>
        </div>
        <div className="flex gap-2">
          <select
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={newPerson}
            onChange={e => setNewPerson(e.target.value)}>
            {PERSONS.map(p => (
              <option key={p} value={p}>{label(p)}</option>
            ))}
          </select>
          <input type="date"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={newDue}
            onChange={e => setNewDue(e.target.value)} />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-gray-300 text-sm pt-8">No items here</p>
        )}
        {filtered.map(todo => (
          <div key={todo.id}
            className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm"
            style={{ borderLeft: `4px solid ${PERSON_COLORS[todo.person] || '#7CCFB8'}` }}>
            <input type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo)}
              className="w-5 h-5 rounded-full cursor-pointer accent-indigo-500" />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${todo.completed ? 'line-through text-gray-300' : 'text-gray-800'}`}>
                {todo.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                  style={{ background: PERSON_COLORS[todo.person] || '#7CCFB8' }}>
                  {label(todo.person)}
                </span>
                {todo.due_date && (
                  <span className="text-xs text-gray-400">
                    Due {new Date(todo.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
<button onClick={() => deleteTodo(todo.id)}
  className="text-gray-300 hover:text-red-400">
  <X size={18} />
</button>
          </div>
        ))}
      </div>

      {/* Clear completed */}
      {todos.some(t => t.completed) && (
        <div className="px-4 pb-6">
          <button onClick={clearCompleted}
            className="w-full py-3 rounded-xl text-sm font-semibold text-red-400 bg-red-50">
            Clear completed
          </button>
        </div>
      )}
    </div>
  )
}