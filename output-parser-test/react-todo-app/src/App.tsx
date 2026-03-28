import { useState, useEffect } from 'react'
import './App.css'

interface Todo {
  id: number
  text: string
  completed: boolean
  createdAt: Date
}

type FilterType = 'all' | 'active' | 'completed'

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('todos')
    if (saved) {
      return JSON.parse(saved).map((todo: Todo) => ({
        ...todo,
        createdAt: new Date(todo.createdAt)
      }))
    }
    return []
  })
  const [inputValue, setInputValue] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  // 持久化到 localStorage
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }, [todos])

  // 添加待办事项
  const addTodo = () => {
    if (inputValue.trim() === '') return
    const newTodo: Todo = {
      id: Date.now(),
      text: inputValue.trim(),
      completed: false,
      createdAt: new Date()
    }
    setTodos([newTodo, ...todos])
    setInputValue('')
  }

  // 删除待办事项
  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  // 切换完成状态
  const toggleComplete = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  // 开始编辑
  const startEdit = (todo: Todo) => {
    setEditingId(todo.id)
    setEditText(todo.text)
  }

  // 保存编辑
  const saveEdit = (id: number) => {
    if (editText.trim() === '') {
      deleteTodo(id)
    } else {
      setTodos(todos.map(todo =>
        todo.id === id ? { ...todo, text: editText.trim() } : todo
      ))
    }
    setEditingId(null)
    setEditText('')
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  // 处理回车
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo()
    }
  }

  const handleEditKeyPress = (e: React.KeyboardEvent, id: number) => {
    if (e.key === 'Enter') {
      saveEdit(id)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  // 筛选待办事项
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  // 统计信息
  const totalTodos = todos.length
  const completedTodos = todos.filter(t => t.completed).length
  const activeTodos = totalTodos - completedTodos
  const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0

  // 清除已完成
  const clearCompleted = () => {
    setTodos(todos.filter(todo => !todo.completed))
  }

  return (
    <div className="app-container">
      <div className="todo-app">
        <header className="app-header">
          <h1>📝 Todo List</h1>
          <p className="subtitle">Organize your tasks efficiently</p>
        </header>

        {/* 统计信息卡片 */}
        <div className="stats-container">
          <div className="stat-card">
            <span className="stat-number">{totalTodos}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-card active">
            <span className="stat-number">{activeTodos}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-card completed">
            <span className="stat-number">{completedTodos}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-card rate">
            <span className="stat-number">{completionRate}%</span>
            <span className="stat-label">Progress</span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${completionRate}%` }}></div>
        </div>

        {/* 输入区域 */}
        <div className="input-section">
          <input
            type="text"
            className="todo-input"
            placeholder="What needs to be done?"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button className="add-btn" onClick={addTodo}>
            <span>+</span> Add
          </button>
        </div>

        {/* 筛选按钮 */}
        <div className="filter-section">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({totalTodos})
          </button>
          <button
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active ({activeTodos})
          </button>
          <button
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({completedTodos})
          </button>
          {completedTodos > 0 && (
            <button className="clear-btn" onClick={clearCompleted}>
              Clear Completed
            </button>
          )}
        </div>

        {/* 待办事项列表 */}
        <ul className="todo-list">
          {filteredTodos.length === 0 ? (
            <li className="empty-state">
              <span className="empty-icon">📋</span>
              <p>{filter === 'all' ? 'No tasks yet. Add one above!' : `No ${filter} tasks.`}</p>
            </li>
          ) : (
            filteredTodos.map((todo, index) => (
              <li
                key={todo.id}
                className={`todo-item ${todo.completed ? 'completed' : ''} ${editingId === todo.id ? 'editing' : ''}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="todo-content">
                  <input
                    type="checkbox"
                    className="todo-checkbox"
                    checked={todo.completed}
                    onChange={() => toggleComplete(todo.id)}
                  />
                  {editingId === todo.id ? (
                    <input
                      type="text"
                      className="edit-input"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => saveEdit(todo.id)}
                      onKeyDown={(e) => handleEditKeyPress(e, todo.id)}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="todo-text"
                      onDoubleClick={() => startEdit(todo)}
                    >
                      {todo.text}
                    </span>
                  )}
                </div>
                <div className="todo-actions">
                  {editingId !== todo.id && (
                    <>
                      <button
                        className="action-btn edit-btn"
                        onClick={() => startEdit(todo)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => deleteTodo(todo.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>

        {/* 页脚提示 */}
        <footer className="app-footer">
          <p>Double-click to edit a task</p>
        </footer>
      </div>
    </div>
  )
}

export default App
