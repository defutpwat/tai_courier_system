import React, { useState } from 'react';
import { api } from '../api';
import { Button } from './ui/Button';
import { GlassCard } from './ui/GlassCard';
import { Modal } from './ui/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const statusLabel = (status) => {
  if (status === 'pending') return 'Oczekuje na kuriera';
  if (status === 'accepted') return 'W doręczeniu';
  if (status === 'delivered') return 'Dostarczona';
  return status;
};

const statusColor = (status) => {
  if (status === 'delivered') return '#10b981';
  if (status === 'accepted') return 'var(--primary-color)';
  return 'var(--text-muted)';
};

function CourierDashboard({ user }) {
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [routeModal, setRouteModal] = useState(null); // { optimized_packages, map_url, total_distance_km }

  const optimizeRouteMutation = useMutation({
    mutationFn: (packages) => api.optimizeRoute({
      start_address: user.address || '',
      packages: packages.map(p => ({ id: p.id, destination_address: p.destination_address, receiver_name: p.receiver_name })),
    }),
    onSuccess: (data) => setRouteModal(data),
    onError: (e) => alert(e.message || 'Błąd optymalizacji trasy'),
  });

  const { data: unassignedPackages = [], isLoading: isLoadingUnassigned } = useQuery({
    queryKey: ['packages', 'unassigned'],
    queryFn: () => api.getPackages({ unassigned: true })
  });

  const { data: myPackages = [], isLoading: isLoadingMine } = useQuery({
    queryKey: ['packages', 'courier', user.id],
    queryFn: () => api.getPackages({ courier_id: user.id })
  });

  const assignMutation = useMutation({
    mutationFn: (id) => api.assignPackage(id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages', 'unassigned'] });
      queryClient.invalidateQueries({ queryKey: ['packages', 'courier', user.id] });
    },
    onError: (e) => console.error(e)
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => api.updatePackageStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['packages', 'courier', user.id] }),
    onError: (e) => console.error(e)
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => api.archivePackage(id, 'courier'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['packages', 'courier', user.id] }),
    onError: (e) => console.error(e)
  });

  const handleAssign = (id) => assignMutation.mutate(id);
  const handleUpdateStatus = (id, status) => updateStatusMutation.mutate({ id, status });
  const handleArchive = (id) => archiveMutation.mutate(id);

  const printLabel = (p) => {
    const printWindow = window.open('', '', 'width=600,height=400');
    printWindow.document.write(`
      <html>
        <head><title>Return Label #${p.id}</title></head>
        <body style="font-family: sans-serif; padding: 20px;">
          <div style="border: 2px dashed #000; padding: 20px;">
            <h1>RETURN LABEL</h1>
            <h2>Tracking ID: ${p.id}</h2>
            <p><strong>Sender:</strong> ${p.sender_name}</p>
            <p><strong>From:</strong> ${p.origin_address?.split(',')[0] || 'Brak'}</p>
            <p><strong>To:</strong> ${p.destination_address}</p>
            <p><strong>Total Weight:</strong> ${p.weight_kg} kg</p>
            <p><strong>Distance:</strong> ${p.distance_km} km</p>
            <hr />
            <p><strong>Return Address:</strong> [Courier Depot Center]</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const activeMyPackages = myPackages.filter(p => !p.courier_archived);
  const archivedMyPackages = myPackages.filter(p => p.courier_archived);

  const activeAccepted = myPackages.filter(p => !p.courier_archived && p.status === 'accepted');

  return (
    <div>
      {/* Sekcja optymalizacji trasy */}
      {activeAccepted.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 className="mb-4">Zaplanuj trasę dnia</h2>
          <GlassCard>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Masz <strong style={{ color: 'var(--text-main)' }}>{activeAccepted.length}</strong> aktywnych dostaw. Kliknij poniżej, aby wyliczyć optymalną trasę.
            </p>
            {!user.address && (
              <p style={{ color: '#f59e0b', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                Uwaga: nie masz ustawionego adresu domowego — trasa zaczyna się od pierwszego zlecenia. Ustaw adres w ustawieniach konta.
              </p>
            )}
            <Button onClick={() => optimizeRouteMutation.mutate(activeAccepted)} disabled={optimizeRouteMutation.isPending} style={{ width: '100%' }}>
              {optimizeRouteMutation.isPending ? 'Optymalizowanie...' : '🗺 Optymalizuj trasę dnia'}
            </Button>
          </GlassCard>
        </div>
      )}

      {/* Modal z wynikiem optymalizacji */}
      {routeModal && (
        <Modal isOpen onClose={() => setRouteModal(null)} title="Optymalna trasa dnia" width="860px">
          <div style={{ textAlign: 'left' }}>
            {routeModal.total_distance_km && (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Łączny dystans: <strong style={{ color: 'var(--text-main)' }}>{routeModal.total_distance_km} km</strong>
              </p>
            )}
            <ol style={{ paddingLeft: '1.2rem', marginBottom: '1rem' }}>
              {routeModal.optimized_packages.map((p, i) => (
                <li key={p.id} style={{ marginBottom: '0.4rem', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  <strong>#{i + 1}</strong> — Paczka #{p.id}: <span style={{ color: 'var(--text-muted)' }}>{p.receiver_name}</span>, {p.destination_address}
                </li>
              ))}
            </ol>
            {routeModal.map_url ? (
              <iframe
                title="Optymalna trasa kuriera"
                src={routeModal.map_url}
                width="100%"
                height="420"
                style={{ border: 0, borderRadius: '10px', display: 'block', marginBottom: '1rem' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Podgląd mapy niedostępny.</p>
            )}
            <Button variant="outline" onClick={() => setRouteModal(null)} style={{ width: '100%' }}>
              Zamknij
            </Button>
          </div>
        </Modal>
      )}

      <h2 className="mb-4">Wolne Zlecenia do pobrania</h2>
      {isLoadingUnassigned ? (
         <div className="flex-center p-4"><div className="spinner"></div><p className="ml-4">Ładowanie zleceń...</p></div>
      ) : (
        <div className="grid">
          {unassignedPackages.map(p => (
            <GlassCard key={p.id} className="border-success" style={{display: 'flex', flexDirection: 'column'}}>
              <h3 className="text-success">Paczka #{p.id}</h3>
              <p><strong>Od:</strong> {p.sender_name}</p>
              <p><strong>Do:</strong> {p.receiver_name}</p>
              <p><strong>Trasa:</strong> {p.origin_address?.split(',')[0]} ➔ {p.destination_address?.split(',')[0]}</p>
              <p><strong>Opłacona:</strong> {p.is_paid ? 'Tak' : 'Nie'}</p>
              <div style={{marginTop: 'auto', paddingTop: '1rem', display: 'flex', justifyContent: 'center'}}>
                {p.is_paid ? (
                  <Button variant="success" disabled={assignMutation.isPending} onClick={() => handleAssign(p.id)}>Przypisz do siebie</Button>
                ) : (
                  <Button disabled className="bg-gray text-muted">Nieopłacona</Button>
                )}
              </div>
            </GlassCard>
          ))}
          {unassignedPackages.length === 0 && <p className="text-muted">Brak wolnych zleceń w systemie.</p>}
        </div>
      )}

      <h2 className="mt-12 mb-4">Twoje Aktywne Zlecenia</h2>
      {isLoadingMine ? (
         <div className="flex-center p-4"><div className="spinner"></div><p className="ml-4">Ładowanie twoich zleceń...</p></div>
      ) : (
        <div className="grid">
          {activeMyPackages.map(p => (
             <GlassCard key={p.id} style={{display: 'flex', flexDirection: 'column'}}>
               <h3>Paczka #{p.id}</h3>
               <p><strong>Trasa:</strong> {p.origin_address?.split(',')[0]} ➔ {p.destination_address?.split(',')[0]}</p>
               <p>
                 <strong>Status: </strong>
                 <span style={{ color: statusColor(p.status), fontWeight: 600 }}>
                   {statusLabel(p.status)}
                 </span>
               </p>

               <div style={{marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center'}}>
                 {p.status === 'accepted' && <Button variant="success" disabled={updateStatusMutation.isPending} onClick={() => handleUpdateStatus(p.id, 'delivered')}>Zgłoś Ukończenie</Button>}
                 <Button onClick={() => printLabel(p)}>Etykieta</Button>
                 {p.status === 'delivered' && (
                    <Button className="bg-gray" disabled={archiveMutation.isPending} onClick={() => handleArchive(p.id)}>Zarchiwizuj</Button>
                 )}
               </div>
             </GlassCard>
          ))}
          {activeMyPackages.length === 0 && <p className="text-muted">Nie masz aktywnych przypisanych dostaw.</p>}
        </div>
      )}

      <div className="mt-12 pt-8" style={{borderTop: '1px solid rgba(0,0,0,0.1)'}}>
        <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? 'Ukryj Zarchiwizowane Doręczenia' : 'Pokaż Zarchiwizowane Doręczenia'}
        </Button>
      </div>

      {showArchived && (
        <div className="grid mt-6" style={{opacity: '0.8'}}>
          {archivedMyPackages.map(p => (
            <GlassCard key={p.id} className="bg-gray-100">
              <h3>Paczka #{p.id}</h3>
              <p><strong>Status:</strong> <span style={{ color: statusColor(p.status), fontWeight: 600 }}>{statusLabel(p.status)}</span></p>
            </GlassCard>
          ))}
          {archivedMyPackages.length === 0 && <p className="text-muted">Archiwum doręczeń jest puste.</p>}
        </div>
      )}
    </div>
  );
}

export default CourierDashboard;
