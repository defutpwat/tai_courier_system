import React, { useState, useEffect } from 'react'
import ClientDashboard from './components/ClientDashboard'
import CourierDashboard from './components/CourierDashboard'
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login'
import UserSettings from './components/UserSettings'
import { Button } from './components/ui/Button'

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogin = (data) => {
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleProfileUpdate = (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

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
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}>
        <Button variant="outline" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? '☀️ Jasny' : '🌙 Ciemny'}
        </Button>
      </div>
      <div className="nav flex-between flex-wrap gap-4 mb-8">
         <h2 className="text-primary" style={{margin: 0}}>Courier System</h2>
         <div className="flex items-center flex-wrap gap-4">
            <span className="text-main">
              <strong>{user.full_name || user.username}</strong> ({roleName})
            </span>
            {user.role !== 'admin' && (
              <Button variant="outline" onClick={() => setShowSettings(true)}>Moje konto</Button>
            )}
            <Button onClick={handleLogout}>Wyloguj</Button>
         </div>

         {showSettings && (
           <UserSettings
             user={user}
             onClose={() => setShowSettings(false)}
             onProfileUpdate={handleProfileUpdate}
           />
         )}
      </div>

      <div className="main-content">
        {renderDashboard()}
      </div>
    </div>
  )
}

export default App
