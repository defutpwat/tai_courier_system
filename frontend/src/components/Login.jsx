import React, { useState } from 'react';
import { api } from '../api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { PasswordInput } from './ui/PasswordInput';
import { AddressInput } from './ui/AddressInput';
import { GlassCard } from './ui/GlassCard';

function Login({ onLoginSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'client', full_name: '', address: '' });
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
          <PasswordInput
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
        <PasswordInput
          placeholder="Hasło"
          value={formData.password}
          onChange={e => setFormData({...formData, password: e.target.value})}
          required
        />
        {isRegistering && (
          <>
            <Input
              placeholder="Imię i Nazwisko"
              value={formData.full_name}
              onChange={e => setFormData({...formData, full_name: e.target.value})}
              required
            />
            <AddressInput
              placeholder="Adres zamieszkania (np. Warszawa, ul. Kwiatowa 5, 00-001)"
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              required
            />
            <div style={{
              background: 'rgba(79,70,229,0.08)',
              border: '1px solid rgba(79,70,229,0.25)',
              borderRadius: '8px',
              padding: '0.6rem 0.9rem',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              textAlign: 'left',
              marginBottom: '0.5rem',
            }}>
              Adres zamieszkania będzie domyślnie używany jako punkt nadania paczki. Zawsze możesz go zmienić przed wysyłką.
            </div>
          </>
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
