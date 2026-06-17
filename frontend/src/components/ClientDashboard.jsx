import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { AddressInput } from './ui/AddressInput';
import { GlassCard } from './ui/GlassCard';
import { Modal } from './ui/Modal';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const statusLabel = (status, isPaid) => {
  if (status === 'pending') return isPaid ? 'Czeka na kuriera' : 'Oczekuje na płatność';
  if (status === 'accepted') return 'W doręczeniu';
  if (status === 'delivered') return 'Dostarczona';
  return status;
};

const statusColor = (status, isPaid) => {
  if (status === 'delivered') return '#10b981';
  if (status === 'accepted') return 'var(--primary-color)';
  if (status === 'pending' && isPaid) return '#f59e0b';
  return 'var(--text-muted)';
};

function ClientDashboard({ user }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    sender_name: user.full_name || '',
    receiver_name: '',
    origin_address: user.address || '',
    destination_address: '',
    weight_kg: '',
  });
  const [qrModal, setQrModal] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState(null);
  const [mapModal, setMapModal] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [estimate, setEstimate] = useState(null); // wynik wyliczenia kosztów

  // Kasuj wycenę gdy zmienią się kluczowe pola formularza
  useEffect(() => {
    setEstimate(null);
  }, [formData.origin_address, formData.destination_address, formData.weight_kg]);

  const { data: packages = [], isLoading: isLoadingPackages, isError } = useQuery({
    queryKey: ['packages', user.id],
    queryFn: () => api.getPackages({ client_id: user.id }),
  });

  const estimateMutation = useMutation({
    mutationFn: (payload) => api.estimatePackage(payload),
    onSuccess: (data) => setEstimate(data),
    onError: (e) => setPaymentMessage({ type: 'error', text: e.message || 'Błąd wyliczenia trasy. Sprawdź adresy.' }),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.createPackage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages', user.id] });
      setFormData({ sender_name: user.full_name || '', receiver_name: '', origin_address: user.address || '', destination_address: '', weight_kg: '' });
      setEstimate(null);
    },
    onError: (e) => setPaymentMessage({ type: 'error', text: e.message || 'Błąd tworzenia paczki. Sprawdź adresy i spróbuj ponownie.' })
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
      setPaymentMessage({ type: 'success', text: 'Płatność zakończona sukcesem! Paczka oczekuje na kuriera.' });
    },
    onError: (e) => {
      console.error(e);
      setPaymentMessage({ type: 'error', text: 'Błąd autoryzacji płatności PayPal. Spróbuj ponownie.' });
    }
  });

  const handleShowMap = async () => {
    setMapLoading(true);
    try {
      const data = await api.getDirectionsMapUrl(formData.origin_address, formData.destination_address);
      setMapModal({ url: data.url, origin: formData.origin_address, destination: formData.destination_address });
    } catch {
      setPaymentMessage({ type: 'error', text: 'Nie udało się wczytać mapy. Sprawdź adresy.' });
    } finally {
      setMapLoading(false);
    }
  };

  const handleEstimate = (e) => {
    e.preventDefault();
    estimateMutation.mutate({
      origin_address: formData.origin_address,
      destination_address: formData.destination_address,
      weight_kg: parseFloat(formData.weight_kg),
    });
  };

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
        {paymentMessage && (
          <div style={{
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            borderRadius: '8px',
            background: paymentMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${paymentMessage.type === 'success' ? 'var(--success)' : '#ef4444'}`,
            color: paymentMessage.type === 'success' ? 'var(--success)' : '#ef4444',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>{paymentMessage.text}</span>
            <Button variant="outline" onClick={() => setPaymentMessage(null)} style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem'}}>✕</Button>
          </div>
        )}
        <h2 className="mb-4">Wyślij nową paczkę</h2>
        <GlassCard>
          <form onSubmit={handleEstimate} className="flex-col gap-2">
            <Input placeholder="Imię Nadawcy" value={formData.sender_name} onChange={e => setFormData({...formData, sender_name: e.target.value})} required disabled={estimateMutation.isPending} />
            <AddressInput placeholder="Adres Nadania (np. Warszawa, ul. Kwiatowa 5, 00-001)" value={formData.origin_address} onChange={e => setFormData({...formData, origin_address: e.target.value})} required disabled={estimateMutation.isPending} />
            {user.address && formData.origin_address === user.address && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(79,70,229,0.07)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: '6px', padding: '0.4rem 0.75rem', marginTop: '-0.75rem', marginBottom: '0.5rem' }}>
                Domyślnie uzupełniony Twoim adresem zamieszkania. Możesz go zmienić powyżej.
              </div>
            )}

            <Input className="mt-4" placeholder="Imię Odbiorcy" value={formData.receiver_name} onChange={e => setFormData({...formData, receiver_name: e.target.value})} required disabled={estimateMutation.isPending} />
            <AddressInput placeholder="Adres Docelowy (np. Kraków, ul. Rynek Główny 1)" value={formData.destination_address} onChange={e => setFormData({...formData, destination_address: e.target.value})} required disabled={estimateMutation.isPending} />

            {formData.origin_address && formData.destination_address && (
              <Button type="button" variant="outline" onClick={handleShowMap} disabled={mapLoading} style={{ width: '100%', marginTop: '-0.25rem' }}>
                {mapLoading ? 'Wczytywanie mapy...' : '🗺 Pokaż trasę na mapie'}
              </Button>
            )}

            <Input type="number" step="0.1" placeholder="Waga paczki (kg)" value={formData.weight_kg} onChange={e => setFormData({...formData, weight_kg: e.target.value})} required disabled={estimateMutation.isPending} />

            <Button type="submit" disabled={estimateMutation.isPending || !formData.origin_address || !formData.destination_address || !formData.weight_kg} className="w-full mt-4">
              {estimateMutation.isPending ? 'Wyliczanie...' : '📦 Wylicz koszt dostawy'}
            </Button>
          </form>

          {/* Karta z wyceną */}
          {estimate && (
            <div style={{ marginTop: '1.25rem', padding: '1rem 1.25rem', borderRadius: '10px', background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ color: 'var(--text-main)', fontSize: '1rem' }}>Szczegóły wyceny</strong>
                <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ff4d4d' }}>{estimate.delivery_cost} PLN</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1rem', fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                <span>🛣 Dystans: <strong style={{ color: 'var(--text-main)' }}>{estimate.distance_km} km</strong></span>
                <span>🚗 Droga: <strong style={{ color: 'var(--text-main)' }}>{estimate.road_type}</strong></span>
                <span>⚖ Waga: <strong style={{ color: 'var(--text-main)' }}>{estimate.weight_label}</strong></span>
                <span>🌤 Pogoda: <strong style={{ color: 'var(--text-main)' }}>{estimate.weather_desc}</strong></span>
              </div>
              <Button onClick={handleCreate} disabled={createMutation.isPending} style={{ width: '100%' }}>
                {createMutation.isPending ? 'Nadawanie...' : '✅ Nadaj paczkę'}
              </Button>
            </div>
          )}
        </GlassCard>

        {/* Modal mapy trasy */}
        {mapModal && (
          <Modal isOpen onClose={() => setMapModal(null)} title="Trasa przesyłki" width="860px">
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                <strong>Nadanie:</strong> {mapModal.origin}<br />
                <strong>Dostawa:</strong> {mapModal.destination}
              </p>
              <iframe
                title="Trasa Google Maps"
                src={mapModal.url}
                width="100%"
                height="450"
                style={{ border: 0, borderRadius: '10px', display: 'block' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <Button variant="outline" onClick={() => setMapModal(null)} style={{ width: '100%', marginTop: '1rem' }}>
                Zamknij
              </Button>
            </div>
          </Modal>
        )}

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
              <GlassCard key={p.id} title={`Paczka #${p.id}`} style={{display: 'flex', flexDirection: 'column'}}>
                <p><strong>Do:</strong> {p.receiver_name}</p>
                <p><strong>Trasa:</strong> {p.origin_address?.split(',')[0]} ➔ {p.destination_address?.split(',')[0]}</p>
                <p><strong>Dystans:</strong> {p.distance_km} km</p>
                <p><strong>Koszt:</strong> {p.delivery_cost} PLN</p>
                <p>
                  <strong>Status: </strong>
                  <span style={{ color: statusColor(p.status, p.is_paid), fontWeight: 600 }}>
                    {statusLabel(p.status, p.is_paid)}
                  </span>
                  {p.is_paid && (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '0.75rem',
                      background: 'rgba(16,185,129,0.15)',
                      color: '#10b981',
                      border: '1px solid #10b981',
                      borderRadius: '4px',
                      padding: '1px 6px',
                      fontWeight: 600,
                    }}>OPŁACONA</span>
                  )}
                </p>

                <div style={{marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center'}}>
                  {!p.is_paid ? (
                    <div style={{minWidth: '200px', width: '100%'}}>
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
                <p><strong>Status:</strong> <span style={{ color: statusColor(p.status, p.is_paid), fontWeight: 600 }}>{statusLabel(p.status, p.is_paid)}</span></p>
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
