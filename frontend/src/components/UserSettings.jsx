import React, { useState } from 'react';
import { api } from '../api';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { AddressInput } from './ui/AddressInput';
import { Button } from './ui/Button';
import { useMutation } from '@tanstack/react-query';
import styled from 'styled-components';

const FieldLabel = styled.label`
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 0.15rem;
`;

const DisabledInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  margin: 0 0 1rem 0;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-muted);
  cursor: not-allowed;
  font-size: 1rem;

  body.dark-theme & {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const SuccessBanner = styled.div`
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid var(--success);
  color: var(--success);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  font-size: 0.9rem;
`;

function UserSettings({ user, onClose, onProfileUpdate }) {
  const [fullName, setFullName] = useState(user.full_name || '');
  const [address,  setAddress]  = useState(user.address  || '');
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.updateProfile(user.id, { full_name: fullName, address }),
    onSuccess: (updatedUser) => {
      setSaved(true);
      onProfileUpdate(updatedUser);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaved(false);
    mutation.mutate();
  };

  return (
    <Modal isOpen onClose={onClose} title="Moje konto">
      <div style={{ minWidth: '320px', textAlign: 'left' }}>
        {saved && <SuccessBanner>Dane zostały zaktualizowane.</SuccessBanner>}
        {mutation.isError && (
          <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {mutation.error?.message || 'Błąd zapisu. Spróbuj ponownie.'}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FieldLabel>Nazwa użytkownika (nie można zmienić)</FieldLabel>
          <DisabledInput value={user.username} disabled readOnly />

          <FieldLabel>Imię i Nazwisko</FieldLabel>
          <Input
            placeholder="Imię i Nazwisko"
            value={fullName}
            onChange={e => { setFullName(e.target.value); setSaved(false); }}
            required
          />

          <FieldLabel>Adres zamieszkania</FieldLabel>
          <AddressInput
            placeholder="Warszawa, ul. Przykładowa 1, 00-001"
            value={address}
            onChange={e => { setAddress(e.target.value); setSaved(false); }}
          />

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button type="submit" disabled={mutation.isPending} style={{ flex: 1 }}>
              {mutation.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </Button>
            <Button variant="outline" type="button" onClick={onClose} style={{ flex: 1 }}>
              Zamknij
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default UserSettings;
