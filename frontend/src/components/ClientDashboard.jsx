import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { GlassCard } from './ui/GlassCard';
import { Modal } from './ui/Modal';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

function ClientDashboard({ user }) {
  const [packages, setPackages] = useState([]);
  const [formData, setFormData] = useState({ sender_name: '', receiver_name: '', origin_address: '', destination_address: '', weight_kg: '' });
  const [qrModal, setQrModal] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, [user.id]);

  const fetchPackages = async () => {
    try {
      const data = await api.getPackages({ client_id: user.id });
      setPackages(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
          ...formData,
          client_id: user.id,
          weight_kg: parseFloat(formData.weight_kg)
      };
      
      await api.createPackage(payload);
      fetchPackages();
      setFormData({ sender_name: '', receiver_name: '', origin_address: '', destination_address: '', weight_kg: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const createOrder = async (packageId) => {
    try {
      const data = await api.createPayPalOrder(packageId);
      return data.orderID; 
    } catch (e) {
      console.error(e);
      alert('Nie udało się utworzyć zamówienia PayPal');
    }
  };

  const onApprove = async (packageId, data) => {
    try {
      await api.capturePayPalOrder(packageId, data.orderID);
      fetchPackages();
      alert('Płatność zakończona sukcesem!');
    } catch (e) {
      console.error(e);
      alert('Błąd autoryzacji płatności PayPal');
    }
  };

  const handleArchive = async (id) => {
    try {
      await api.archivePackage(id, 'client');
      fetchPackages();
    } catch (e) {
      console.error(e);
    }
  };

  const activePackages = packages.filter(p => !p.client_archived);
  const archivedPackages = packages.filter(p => p.client_archived);

  return (
    <PayPalScriptProvider options={{ "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID, currency: "PLN" }}>
      <div>
        <h2 className="mb-4">Wyślij nową paczkę</h2>
        <GlassCard>
          <form onSubmit={handleCreate} className="flex-col gap-2">
            <Input placeholder="Imię Nadawcy" value={formData.sender_name} onChange={e => setFormData({...formData, sender_name: e.target.value})} required />
            <Input placeholder="Adres Nadania (np. Warszawa, Centrum)" value={formData.origin_address} onChange={e => setFormData({...formData, origin_address: e.target.value})} required disabled={isLoading} />
            
            <Input className="mt-4" placeholder="Imię Odbiorcy" value={formData.receiver_name} onChange={e => setFormData({...formData, receiver_name: e.target.value})} required />
            <Input placeholder="Adres Docelowy (np. Kraków, Rynek)" value={formData.destination_address} onChange={e => setFormData({...formData, destination_address: e.target.value})} required disabled={isLoading} />
            
            <Input type="number" step="0.1" placeholder="Waga (kg)" value={formData.weight_kg} onChange={e => setFormData({...formData, weight_kg: e.target.value})} required />
            
            <Button type="submit" disabled={isLoading} className={`w-full mt-4 ${isLoading ? 'text-muted' : ''}`}>
               {isLoading ? 'Ładowanie wyników...' : 'Wylicz & Nadaj Paczkę'}
            </Button>
          </form>
        </GlassCard>

        <h2 className="mt-12 mb-4">Twoje Aktywne Przesyłki</h2>
        <div className="grid">
          {activePackages.map(p => (
            <GlassCard key={p.id} title={`Paczka #${p.id}`}>
              <p><strong>Do:</strong> {p.receiver_name}</p>
              <p><strong>Trasa:</strong> {p.origin_address?.split(',')[0]} ➔ {p.destination_address?.split(',')[0]}</p>
              <p><strong>Dystans:</strong> {p.distance_km} km</p>
              <p><strong>Koszt:</strong> {p.delivery_cost} PLN</p>
              <p><strong>Status:</strong> {p.status.toUpperCase()}</p>
              
              <div className="flex-between flex-wrap gap-2 mt-6">
                {!p.is_paid ? (
                  <div style={{minWidth: '200px'}}>
                      <PayPalButtons 
                        createOrder={() => createOrder(p.id)}
                        onApprove={(data) => onApprove(p.id, data)}
                        style={{ layout: "horizontal", height: 40 }}
                      />
                  </div>
                ) : (
                  <>
                    <Button onClick={() => setQrModal(p.id)}>Pokaż QR</Button>
                    {p.status === 'delivered' && (
                      <Button className="bg-gray text-white" onClick={() => handleArchive(p.id)}>Zarchiwizuj</Button>
                    )}
                  </>
                )}
              </div>
            </GlassCard>
          ))}
          {activePackages.length === 0 && <p className="text-muted">Brak aktywnych nadanych paczek.</p>}
        </div>

        <div className="mt-12 pt-8" style={{borderTop: '1px solid rgba(0,0,0,0.1)'}}>
          <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Ukryj Zarchiwizowane Paczki' : 'Pokaż Zarchiwizowane Paczki'}
          </Button>
        </div>

        {showArchived && (
          <div className="grid mt-6" style={{opacity: '0.8'}}>
            {archivedPackages.map(p => (
              <GlassCard key={p.id} title={`Paczka #${p.id}`} className="bg-gray-100">
                <p><strong>Do:</strong> {p.receiver_name}</p>
                <p><strong>Trasa:</strong> {p.distance_km}km</p>
                <p><strong>Status:</strong> {p.status.toUpperCase()}</p>
              </GlassCard>
            ))}
            {archivedPackages.length === 0 && <p className="text-muted">Archiwum jest puste.</p>}
          </div>
        )}

        <Modal isOpen={!!qrModal} onClose={() => setQrModal(null)} title={`Paczka #${qrModal} - Kod QR`}>
          <div className="text-center">
            <img src={api.getQrUrl(qrModal)} alt="QR Code" className="max-w-full" />
            <Button onClick={() => setQrModal(null)} className="mt-4">Zamknij</Button>
          </div>
        </Modal>
      </div>
    </PayPalScriptProvider>
  );
}

export default ClientDashboard;
