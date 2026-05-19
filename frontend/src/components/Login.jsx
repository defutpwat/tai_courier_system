import React, { useState } from 'react';
import { api } from '../api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { GlassCard } from './ui/GlassCard';

function Login({ onLoginSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'client' });
  const [resetData, setResetData] = useState({ username: '', new_password: '' });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      let data;
      if (isRegistering) {
        data = await api.register(formData);
        alert('Konto utworzone pomyślnie. Zostaniesz zalogowany.');
      } else {
        data = await api.login(formData);
      }
      onLoginSuccess(data);
    } catch (err) {
      alert(err.message || 'Nie można połączyć się z serwerem');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.resetPassword(resetData);
      alert('Hasło zresetowane pomyślnie. Zaloguj się nowym hasłem.');
      setIsResetting(false);
    } catch (err) {
      alert(err.message || 'Nie można połączyć się z serwerem');
    }
  };

  if (isResetting) {
    return (
      <GlassCard className="mx-auto mt-12 max-w-md text-center">
        <h2 className="text-primary mb-4">Zresetuj hasło</h2>
        <form onSubmit={handleResetSubmit} className="flex-col gap-2">
          <Input 
            placeholder="Nazwa użytkownika" 
            value={resetData.username} 
            onChange={e => setResetData({...resetData, username: e.target.value})} 
            required 
          />
          <Input 
            type="password" 
            placeholder="Nowe hasło" 
            value={resetData.new_password} 
            onChange={e => setResetData({...resetData, new_password: e.target.value})} 
            required 
          />
          <Button type="submit" className="w-full mt-2">Zmień hasło</Button>
        </form>
        <Button className="w-full mt-4 text-muted bg-transparent" onClick={() => setIsResetting(false)}>
          Wróć do logowania
        </Button>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="mx-auto mt-12 max-w-md text-center">
      <h2 className="text-primary mb-4">{isRegistering ? 'Rejestracja' : 'Logowanie'}</h2>
      <form onSubmit={handleLoginSubmit} className="flex-col gap-2">
        <Input 
          placeholder="Nazwa użytkownika" 
          value={formData.username} 
          onChange={e => setFormData({...formData, username: e.target.value})} 
          required 
        />
        <Input 
          type="password" 
          placeholder="Hasło" 
          value={formData.password} 
          onChange={e => setFormData({...formData, password: e.target.value})} 
          required 
        />
        {isRegistering && (
           <select 
             value={formData.role} 
             onChange={e => setFormData({...formData, role: e.target.value})} 
             className="w-full mt-2 mb-4 p-3 rounded-lg"
           >
             <option value="client">Klient</option>
             <option value="courier">Kurier</option>
           </select>
        )}
        <Button type="submit" className="w-full mt-2">
          {isRegistering ? 'Zarejestruj się' : 'Zaloguj się'}
        </Button>
      </form>

      <div className="flex-col gap-2 mt-4">
        <button className="nav-link" onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Zarejestruj się'}
        </button>
        {!isRegistering && (
          <button className="nav-link text-primary border-none bg-transparent" onClick={() => setIsResetting(true)}>
            Zapomniałeś hasła? Zresetuj
          </button>
        )}
      </div>
    </GlassCard>
  );
}

export default Login;
