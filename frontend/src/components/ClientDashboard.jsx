import React, { useState } from 'react';
import { api } from '../api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { GlassCard } from './ui/GlassCard';
import { Modal } from './ui/Modal';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function ClientDashboard({ user }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ sender_name: '', receiver_name: '', origin_address: '', destination_address: '', weight_kg: '' });
  const [qrModal, setQrModal] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const { data: packages = [], isLoading: isLoadingPackages, isError } = useQuery({
    queryKey: ['packages', user.id],
    queryFn: () => api.getPackages({ client_id: user.id }),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.createPackage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages', user.id] });
      setFormData({ sender_name: '', receiver_name: '', origin_address: '', destination_address: '', weight_kg: '' });
    },
    onError: (e) => console.error(e)
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => api.archivePackage(id, 'client'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['packages', user.id] }),
    onError: (e) => console.error(e)
  });

  const createOrderMutation = useMutation({
    mutationFn: (packageId) => api.createPayPalOrder(packageId)
  });

  const captureOrderMutation = useMutation({
    mutationFn: ({ packageId, orderId }) => api.capturePayPalOrder(packageId, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages', user.id] });
      alert('Płatność zakończona sukcesem!');
    },
    onError: (e) => {
      console.error(e);
      alert('Błąd autoryzacji płatności PayPal');
    }
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    const payload = {
        ...formData,
        client_id: user.id,
        weight_kg: parseFloat(formData.weight_kg)
    };
    createMutation.mutate(payload);
  };

  const createOrder = async (packageId) => {
    try {
      const data = await createOrderMutation.mutateAsync(packageId);
      return data.orderID; 
    } catch (e) {
      console.error(e);
      alert('Nie udało się utworzyć zamówienia PayPal');
    }
  };

  const onApprove = async (packageId, data) => {
    captureOrderMutation.mutate({ packageId, orderId: data.orderID });
  };

  const activePackages = packages.filter(p => !p.client_archived);
  const archivedPackages = packages.filter(p => p.client_archived);

  return (
    <PayPalScriptProvider options={{ "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID, currency: "PLN" }}>
      <div>
        <h2 className="mb-4">Wyślij nową paczkę</h2>
        <GlassCard>
          <form onSubmit={handleCreate} className="flex-col gap-2">
            <Input placeholder="Imię Nadawcy" value={formData.sender_name} onChange={e => setFormData({...formData, sender_name: e.target.value})} required disabled={createMutation.isPending} />
            <Input placeholder="Adres Nadania (np. Warszawa, Centrum)" value={formData.origin_address} onChange={e => setFormData({...formData, origin_address: e.target.value})} required disabled={createMutation.isPending} />
            
            <Input className="mt-4" placeholder="Imię Odbiorcy" value={formData.receiver_name} onChange={e => setFormData({...formData, receiver_name: e.target.value})} required disabled={createMutation.isPending} />
            <Input placeholder="Adres Docelowy (np. Kraków, Rynek)" value={formData.destination_address} onChange={e => setFormData({...formData, destination_address: e.target.value})} required disabled={createMutation.isPending} />
            
            <Input type="number" step="0.1" placeholder="Waga (kg)" value={formData.weight_kg} onChange={e => setFormData({...formData, weight_kg: e.target.value})} required disabled={createMutation.isPending} />
            
            <Button type="submit" disabled={createMutation.isPending} className={`w-full mt-4 ${createMutation.isPending ? 'text-muted' : ''}`}>
               {createMutation.isPending ? 'Ładowanie wyników...' : 'Wylicz & Nadaj Paczkę'}
            </Button>
          </form>
        </GlassCard>

        <h2 className="mt-12 mb-4">Twoje Aktywne Przesyłki</h2>
        
        {isLoadingPackages ? (
          <div className="flex-center p-8 gap-4">
            <div className="spinner"></div>
            <p>Ładowanie danych (trwa próba łączenia z serwerem)...</p>
          </div>
        ) : isError ? (
          <p className="text-red" style={{color: 'red'}}>Błąd pobierania paczek. System ponawia próbę w tle.</p>
        ) : (
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
                        <Button className="bg-gray text-white" disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate(p.id)}>Zarchiwizuj</Button>
                      )}
                    </>
                  )}
                </div>
              </GlassCard>
            ))}
            {activePackages.length === 0 && <p className="text-muted">Brak aktywnych nadanych paczek.</p>}
          </div>
        )}

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
