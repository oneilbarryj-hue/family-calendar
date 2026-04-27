import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { ShoppingCart } from 'lucide-react'

const CATEGORIES = [
  { key: 'groceries', label: 'Groceries', emoji: '🛒' },
  { key: 'household', label: 'Household', emoji: '🏠' },
  { key: 'kids', label: 'Kids', emoji: '👶' },
  { key: 'wishlist', label: 'Wish List', emoji: '⭐' },
]

export default function BuyList({ session }) {
  const [items, setItems] = useState([])
  const [activeTab, setActiveTab] = useState('groceries')
  const [newText, setNewText] = useState('')

  const fetchItems = async () => {
    const { data } = await supabase
      .from('buy_list')
      .select('*')
      .order('created_at', { ascending: true })
    setItems(data || [])
  }

  useEffect(() => {
    fetchItems()
    const channel = supabase.channel('buylist-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buy_list' }, fetchItems)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const addItem = async () => {
    if (!newText.trim()) return
    await supabase.from('buy_list').insert({
      title: newText.trim(),
      category: activeTab,
      completed: false,
      user_id: session.user.id,
    })
    setNewText('')
    fetchItems()
  }

  const toggleItem = async (item) => {
    await supabase.from('buy_list').update({ completed: !item.completed }).eq('id', item.id)
    fetchItems()
  }

  const deleteItem = async (id) => {
    await supabase.from('buy_list').delete().eq('id', id)
    fetchItems()
  }

  const clearChecked = async () => {
    const checked = items.filter(i => i.completed && i.category === activeTab)
    for (const i of checked) {
      await supabase.from('buy_list').delete().eq('id', i.id)
    }
    fetchItems()
  }

  const activeItems = items.filter(i => i.category === activeTab)
  const unchecked = activeItems.filter(i => !i.completed)
  const checked = activeItems.filter(i => i.completed)

  const currentCat = CATEGORIES.find(c => c.key === activeTab)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
  <ShoppingCart size={22} className="text-indigo-500" /> Buy List
</h2>

        {/* Category tabs */}
        <div className="flex gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat.key}
              onClick={() => setActiveTab(cat.key)}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition"
              style={{
                background: activeTab === cat.key ? '#6366f1' : '#f3f4f6',
                color: activeTab === cat.key ? 'white' : '#6b7280',
              }}>
              {cat.emoji}<br />{cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add new */}
      <div className="px-4 pb-3">
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder={`Add to ${currentCat?.label}...`}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
          />
          <button onClick={addItem}
            className="bg-indigo-600 text-white rounded-xl px-4 py-3 font-bold text-lg">
            +
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-2">
        {activeItems.length === 0 && (
          <p className="text-center text-gray-300 text-sm pt-8">
            Nothing here yet — add something above
          </p>
        )}

        {/* Unchecked items */}
        {unchecked.map(item => (
          <div key={item.id}
            className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm">
            <input type="checkbox"
              checked={false}
              onChange={() => toggleItem(item)}
              className="w-5 h-5 rounded cursor-pointer accent-indigo-500" />
            <p className="flex-1 text-sm font-semibold text-gray-800">{item.title}</p>
            <button onClick={() => deleteItem(item.id)}
              className="text-gray-300 hover:text-red-400 text-lg leading-none">
              ×
            </button>
          </div>
        ))}

        {/* Checked items */}
        {checked.length > 0 && (
          <>
            <p className="text-xs text-gray-300 uppercase tracking-wide pt-2 pb-1">Checked off</p>
            {checked.map(item => (
              <div key={item.id}
                className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                <input type="checkbox"
                  checked={true}
                  onChange={() => toggleItem(item)}
                  className="w-5 h-5 rounded cursor-pointer accent-indigo-500" />
                <p className="flex-1 text-sm text-gray-300 line-through">{item.title}</p>
                <button onClick={() => deleteItem(item.id)}
                  className="text-gray-300 hover:text-red-400 text-lg leading-none">
                  ×
                </button>
              </div>
            ))}
            <button onClick={clearChecked}
              className="w-full py-3 rounded-xl text-sm font-semibold text-red-400 bg-red-50 mt-2">
              Clear checked
            </button>
          </>
        )}
      </div>
    </div>
  )
}