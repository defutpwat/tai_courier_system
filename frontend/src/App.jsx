import React, { useState, useEffect } from 'react'
import ClientDashboard from './components/ClientDashboard'
import CourierDashboard from './components/CourierDashboard'
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login'
import { Button } from './components/ui/Button'

function App() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogin = (userData) => { setUser(userData) };

  const handleLogout = () => { setUser(null) };

  const renderDashboard = () => {
    if (user.role === 'admin') return <AdminDashboard user={user} />;
    if (user.role === 'client') return <ClientDashboard user={user} />;
    if (user.role === 'courier') return <CourierDashboard user={user} />;
  };

  const roleName = user?.role === 'client' ? 'Klient' : user?.role === 'admin' ? 'Admin' : 'Kurier';

  if (!user) {
    return (
       <div>
         <div style={{position: 'absolute', top: '20px', right: '20px'}}>
             <Button variant="outline" onClick={() => setDarkMode(!darkMode)}>
               {darkMode ? '☀️ Jasny' : '🌙 Ciemny'}
             </Button>
         </div>
         <Login onLoginSuccess={handleLogin} />
       </div>
    );
  }

  return (
    <div>
      <div className="nav flex-between flex-wrap gap-4 mb-8">
         <h2 className="text-primary" style={{margin: 0}}>Courier System</h2>
         <div className="flex items-center flex-wrap gap-4">
            <Button variant="outline" onClick={() => setDarkMode(!darkMode)}>
               {darkMode ? '☀️ Jasny' : '🌙 Ciemny'}
            </Button>
            <span className="text-main">
              Zalogowano jako: <strong>{user.username}</strong> ({roleName})
            </span>
            <Button onClick={handleLogout}>Wyloguj</Button>
         </div>
      </div>

      <div className="main-content">
        {renderDashboard()}
      </div>
    </div>
  )
}

export default App
