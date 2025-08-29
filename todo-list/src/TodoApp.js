import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/todos`)
      .then(response => setTodos(response.data))
      .catch(error => console.error('There was an error fetching the to-dos!', error));
  }, []);

  const handleAddTodo = () => {
    axios.post(`${process.env.REACT_APP_API_URL}/api/todos`, { text: newTodo })
      .then(response => {
        setTodos([...todos, response.data]);
        setNewTodo('');
      })
      .catch(error => console.error('Error adding todo:', error));
  };

  const handleDeleteTodo = (id) => {
    axios.delete(`${process.env.REACT_APP_API_URL}/api/todos/${id}`)
      .then(() => {
        setTodos(todos.filter(todo => todo.id !== id));
      })
      .catch(error => console.error('Error deleting todo:', error));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddTodo();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Sandip's To-Do List
          </h1>
          <p className="text-gray-600">Stay organized and get things done</p>
        </div>

        {/* Stats Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{todos.length}</div>
            <div className="text-gray-600">Total Tasks</div>
          </div>
        </div>

        {/* Add Todo Form */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/30 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="What needs to be done?"
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
            />
            <button
              onClick={handleAddTodo}
              disabled={!newTodo.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <span className="text-lg">+</span>
              Add Todo
            </button>
          </div>
        </div>

        {/* Todo List */}
        <div className="space-y-3">
          {todos.length === 0 ? (
            <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/30">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No tasks yet
              </h3>
              <p className="text-gray-500">
                Add your first task above to get started!
              </p>
            </div>
          ) : (
            todos.map(todo => (
              <div
                key={todo.id}
                className="group bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-lg text-gray-800 break-words">
                      {todo.text}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                  >
                    <span className="text-lg">🗑️</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {todos.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            {todos.length} task{todos.length !== 1 ? 's' : ''} total
          </div>
        )}
      </div>
    </div>
  );
}

export default TodoApp;
