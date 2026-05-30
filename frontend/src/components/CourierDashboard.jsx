import React, { useState } from 'react';
import { api } from '../api';
import { Button } from './ui/Button';
import { GlassCard } from './ui/GlassCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function CourierDashboard({ user }) {
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);

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

  return (
    <div>
      <h2 className="mb-4">Wolne Zlecenia do pobrania</h2>
      {isLoadingUnassigned ? (
         <div className="flex-center p-4"><div className="spinner"></div><p className="ml-4">Ładowanie zleceń...</p></div>
      ) : (
        <div className="grid">
          {unassignedPackages.map(p => (
            <GlassCard key={p.id} className="border-success">
              <h3 className="text-success">Paczka #{p.id}</h3>
              <p><strong>Od:</strong> {p.sender_name}</p>
              <p><strong>Do:</strong> {p.receiver_name}</p>
              <p><strong>Trasa:</strong> {p.origin_address?.split(',')[0]} ➔ {p.destination_address?.split(',')[0]}</p>
              <p><strong>Opłacona:</strong> {p.is_paid ? 'Tak' : 'Nie'}</p>
              <div className="flex flex-wrap gap-2 mt-4">
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
             <GlassCard key={p.id}>
               <h3>Paczka #{p.id}</h3>
               <p><strong>Trasa:</strong> {p.origin_address?.split(',')[0]} ➔ {p.destination_address?.split(',')[0]}</p>
               <p><strong>Status:</strong> {p.status.toUpperCase()}</p>
               
               <div className="flex flex-wrap gap-2 mt-6">
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
              <p><strong>Status:</strong> {p.status.toUpperCase()}</p>
            </GlassCard>
          ))}
          {archivedMyPackages.length === 0 && <p className="text-muted">Archiwum doręczeń jest puste.</p>}
        </div>
      )}
    </div>
  );
}

export default CourierDashboard;
