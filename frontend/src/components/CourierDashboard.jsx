import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Button } from './ui/Button';
import { GlassCard } from './ui/GlassCard';

function CourierDashboard({ user }) {
  const [unassignedPackages, setUnassignedPackages] = useState([]);
  const [myPackages, setMyPackages] = useState([]);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, [user.id]);

  const fetchPackages = async () => {
    try {
      const [unassignedData, myData] = await Promise.all([
        api.getPackages({ unassigned: true }),
        api.getPackages({ courier_id: user.id })
      ]);
      setUnassignedPackages(unassignedData);
      setMyPackages(myData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssign = async (id) => {
    try {
      await api.assignPackage(id, user.id);
      fetchPackages();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.updatePackageStatus(id, status);
      fetchPackages();
    } catch (e) {
      console.error(e);
    }
  };

  const handleArchive = async (id) => {
    try {
      await api.archivePackage(id, 'courier');
      fetchPackages();
    } catch (e) {
      console.error(e);
    }
  };

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
                <Button variant="success" onClick={() => handleAssign(p.id)}>Przypisz do siebie</Button>
              ) : (
                <Button disabled className="bg-gray text-muted">Nieopłacona</Button>
              )}
            </div>
          </GlassCard>
        ))}
        {unassignedPackages.length === 0 && <p className="text-muted">Brak wolnych zleceń w systemie.</p>}
      </div>

      <h2 className="mt-12 mb-4">Twoje Aktywne Zlecenia</h2>
      <div className="grid">
        {activeMyPackages.map(p => (
           <GlassCard key={p.id}>
             <h3>Paczka #{p.id}</h3>
             <p><strong>Trasa:</strong> {p.origin_address?.split(',')[0]} ➔ {p.destination_address?.split(',')[0]}</p>
             <p><strong>Status:</strong> {p.status.toUpperCase()}</p>
             
             <div className="flex flex-wrap gap-2 mt-6">
               {p.status === 'accepted' && <Button variant="success" onClick={() => handleUpdateStatus(p.id, 'delivered')}>Zgłoś Ukończenie</Button>}
               <Button onClick={() => printLabel(p)}>Etykieta</Button>
               {p.status === 'delivered' && (
                  <Button className="bg-gray" onClick={() => handleArchive(p.id)}>Zarchiwizuj</Button>
               )}
             </div>
           </GlassCard>
        ))}
        {activeMyPackages.length === 0 && <p className="text-muted">Nie masz aktywnych przypisanych dostaw.</p>}
      </div>

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
