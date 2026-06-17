import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';
import { api } from '../api';
import { GlassCard } from './ui/GlassCard';
import { Input } from './ui/Input';
import { AddressInput } from './ui/AddressInput';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PasswordInput } from './ui/PasswordInput';

const COLORS = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a'];
const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const RANK_MEDALS = ['🥇', '🥈', '🥉'];

const statusLabel = (status) => {
  if (status === 'pending')   return 'Oczekuje';
  if (status === 'accepted')  return 'W doręczeniu';
  if (status === 'delivered') return 'Dostarczona';
  return status;
};

const statusColor = (status) => {
  if (status === 'delivered') return '#10b981';
  if (status === 'accepted')  return '#818CF8';
  return 'var(--text-muted)';
};

const thStyle = {
  textAlign: 'left', padding: '0.6rem 0.8rem',
  color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem',
  borderBottom: '2px solid rgba(255,77,77,0.3)',
};
const tdStyle = { padding: '0.55rem 0.8rem', color: 'var(--text-main)', fontSize: '0.9rem' };

function Spinner() {
  return (
    <div className="flex-center p-8">
      <div className="spinner" style={{ borderTopColor: '#ff4d4d' }} />
    </div>
  );
}

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

function formatDatePL(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function buildPresets() {
  const now = new Date();
  const today = toDateStr(now);

  const curMonthStart = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));

  const prevStart = toDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const prevEnd   = toDateStr(new Date(now.getFullYear(), now.getMonth(), 0));

  const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const qFrom = toDateStr(new Date(now.getFullYear(), qStartMonth, 1));

  const yearFrom = `${now.getFullYear()}-01-01`;

  return [
    { label: 'Ten miesiąc',       from: curMonthStart, to: today },
    { label: 'Poprzedni miesiąc', from: prevStart,     to: prevEnd },
    { label: 'Ten kwartał',       from: qFrom,         to: today },
    { label: 'Ten rok',           from: yearFrom,      to: today },
    { label: 'Wszystkie okresy',  from: '2020-01-01',  to: today },
  ];
}

const TABS = [
  { id: 'stats',    label: 'Statystyki' },
  { id: 'free',     label: 'Wolne zlecenia' },
  { id: 'couriers', label: 'Kurienci' },
  { id: 'clients',  label: 'Klienci' },
  { id: 'manage',   label: 'Zarządzanie' },
];

const ROLE_LABELS = { client: 'Klient', courier: 'Kurier', admin: 'Admin' };

const emptyUser = { username: '', password: '', role: 'client', full_name: '', address: '' };
const emptyPackageEdit = { status: '', courier_id: '', is_paid: null };

function AdminDashboard({ user }) {
  const PRESETS = useMemo(() => buildPresets(), []);
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('stats');
  const [fromDate, setFromDate] = useState(PRESETS[0].from);
  const [toDate,   setToDate]   = useState(PRESETS[0].to);
  const [activePreset, setActivePreset] = useState(0);
  const [expandedClient, setExpandedClient] = useState(null);
  const [freeSearch, setFreeSearch] = useState({ sender: '', receiver: '' });

  // Zarządzanie — stan
  const [editUser,       setEditUser]       = useState(null);   // {id, full_name, address, role}
  const [editUserForm,   setEditUserForm]   = useState({});
  const [newUserForm,    setNewUserForm]    = useState(emptyUser);
  const [showNewUser,    setShowNewUser]    = useState(false);
  const [editPackage,    setEditPackage]    = useState(null);
  const [editPkgForm,    setEditPkgForm]    = useState(emptyPackageEdit);
  const [pkgSearch,      setPkgSearch]      = useState('');
  const [manageSection,    setManageSection]    = useState('users'); // 'users' | 'packages'
  const [editUserPassword, setEditUserPassword] = useState('');

  useEffect(() => {
    document.body.classList.add('admin-theme');
    return () => document.body.classList.remove('admin-theme');
  }, []);

  const applyPreset = (idx) => {
    setActivePreset(idx);
    setFromDate(PRESETS[idx].from);
    setToDate(PRESETS[idx].to);
  };

  const handleCustomRange = (field, val) => {
    setActivePreset(null);
    if (field === 'from') setFromDate(val);
    else setToDate(val);
  };

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['adminStats', fromDate, toDate],
    queryFn: () => api.getAdminStats(fromDate, toDate),
  });

  const { data: freePackages = [], isLoading: loadingFree } = useQuery({
    queryKey: ['adminFreePackages'],
    queryFn: () => api.getPackages({ unassigned: true }),
    enabled: selectedTab === 'free',
  });

  const { data: couriers = [], isLoading: loadingCouriers } = useQuery({
    queryKey: ['adminCouriers'],
    queryFn: api.getAdminCouriersOverview,
    enabled: selectedTab === 'couriers',
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['adminClients'],
    queryFn: api.getAdminClientsOverview,
    enabled: selectedTab === 'clients',
  });

  const { data: allUsers = [], isLoading: loadingAllUsers } = useQuery({
    queryKey: ['adminAllUsers'],
    queryFn: api.adminGetAllUsers,
    enabled: selectedTab === 'manage',
  });

  const { data: allPackages = [], isLoading: loadingAllPackages } = useQuery({
    queryKey: ['adminAllPackages'],
    queryFn: api.adminGetAllPackages,
    enabled: selectedTab === 'manage' && manageSection === 'packages',
  });

  // Mutacje zarządzania
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => api.adminUpdateUser(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminAllUsers'] }); setEditUser(null); },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => api.adminDeleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminAllUsers'] }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ id, password }) => api.adminChangeUserPassword(id, password),
    onSuccess: () => setEditUserPassword(''),
  });

  const createUserMutation = useMutation({
    mutationFn: (data) => api.adminCreateUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAllUsers'] });
      setNewUserForm(emptyUser);
      setShowNewUser(false);
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: ({ id, data }) => api.adminUpdatePackage(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminAllPackages'] }); setEditPackage(null); },
  });

  const deletePackageMutation = useMutation({
    mutationFn: (id) => api.adminDeletePackage(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminAllPackages'] }),
  });

  const filteredFree = freePackages.filter(p => {
    const s = freeSearch.sender.toLowerCase();
    const r = freeSearch.receiver.toLowerCase();
    return (
      (!s || p.sender_name?.toLowerCase().includes(s)) &&
      (!r || p.receiver_name?.toLowerCase().includes(r))
    );
  });

  const periodLabel = fromDate === toDate
    ? formatDatePL(fromDate)
    : `${formatDatePL(fromDate)} — ${formatDatePL(toDate)}`;

  return (
    <div className="mb-8">
      <h2 style={{ color: '#ff4d4d', textShadow: '0 0 10px rgba(255,0,0,0.5)', marginBottom: '1.5rem' }}>
        Panel Administratora
      </h2>

      {/* Zakładki */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            style={{
              padding: '0.6rem 1.4rem', borderRadius: '8px',
              border: '1px solid rgba(255,77,77,0.4)',
              background: selectedTab === tab.id ? '#ff4d4d' : 'rgba(255,77,77,0.1)',
              color: selectedTab === tab.id ? '#fff' : '#ff4d4d',
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.95rem',
            }}
          >
            {tab.label}
            {tab.id === 'free' && freePackages.length > 0 && selectedTab !== 'free' && (
              <span style={{
                marginLeft: '6px', background: '#ff4d4d', color: '#fff',
                borderRadius: '10px', padding: '1px 7px', fontSize: '0.75rem',
              }}>
                {freePackages.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* === STATYSTYKI === */}
      {selectedTab === 'stats' && (
        <>
          {/* Selektor okresu */}
          <GlassCard style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#ff4d4d', marginBottom: '1rem' }}>Zbadaj okres</h3>

            {/* Presety */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => applyPreset(i)}
                  style={{
                    padding: '0.4rem 1rem', borderRadius: '6px', fontSize: '0.88rem',
                    border: '1px solid rgba(255,77,77,0.35)',
                    background: activePreset === i ? '#ff4d4d' : 'rgba(255,77,77,0.08)',
                    color: activePreset === i ? '#fff' : '#ff4d4d',
                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Własny zakres */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Własny zakres:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={e => handleCustomRange('from', e.target.value)}
                  style={{ width: 'auto', margin: 0, padding: '0.4rem 0.6rem', background: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,77,77,0.3)' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>—</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={e => handleCustomRange('to', e.target.value)}
                  style={{ width: 'auto', margin: 0, padding: '0.4rem 0.6rem', background: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,77,77,0.3)' }}
                />
              </div>
              <span style={{ fontSize: '0.85rem', color: '#ff4d4d', fontWeight: 600 }}>
                Wybrany okres: {periodLabel}
              </span>
            </div>
          </GlassCard>

          {loadingStats ? <Spinner /> : stats && (
            <>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <GlassCard className="text-center">
                  <h3 className="text-muted">Przychód w okresie / Łącznie</h3>
                  <h1 style={{ fontSize: '2.2rem', margin: '0.5rem 0', color: '#ff4d4d' }}>
                    {stats.kpis.revenue_in_range}
                    <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}> / {stats.kpis.revenue} PLN</span>
                  </h1>
                </GlassCard>
                <GlassCard className="text-center">
                  <h3 className="text-muted">Zlecenia w wybranym okresie</h3>
                  <h1 style={{ fontSize: '3rem', margin: '0.5rem 0' }}>{stats.kpis.total_packages}</h1>
                </GlassCard>
                <GlassCard className="text-center">
                  <h3 className="text-muted">Klienci / Kurierzy</h3>
                  <h1 style={{ fontSize: '2.5rem', margin: '0.5rem 0' }}>{stats.kpis.clients} / {stats.kpis.couriers}</h1>
                </GlassCard>
              </div>

              <div className="grid mt-12" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                <GlassCard title="Rozkład przesyłek w systemie" className="text-center">
                  <div style={{ height: '320px', width: '100%', marginTop: '1rem' }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={stats.status_distribution} cx="50%" cy="50%" innerRadius={75} outerRadius={115} paddingAngle={5} dataKey="value" stroke="none">
                          {stats.status_distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip contentStyle={{ background: 'rgba(20,0,0,0.9)', border: '1px solid #ff4d4d' }} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
                <GlassCard title="Utargi miesięczne (pełna historia)" className="text-center">
                  <div style={{ height: '320px', width: '100%', marginTop: '1rem' }}>
                    <ResponsiveContainer>
                      <BarChart data={stats.monthly_revenue}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="month" stroke="var(--text-muted)" />
                        <YAxis stroke="var(--text-muted)" />
                        <RechartsTooltip contentStyle={{ background: 'rgba(20,0,0,0.9)', border: '1px solid #ff4d4d' }} />
                        <Bar dataKey="revenue" fill="#ff4d4d" radius={[5, 5, 0, 0]} name="Przychód [PLN]" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>
            </>
          )}
        </>
      )}

      {/* === WOLNE ZLECENIA === */}
      {selectedTab === 'free' && (
        <>
          {/* Filtry */}
          <GlassCard style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#ff4d4d', marginBottom: '0.75rem' }}>Filtruj zlecenia</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Nadawca</label>
                <Input
                  placeholder="Szukaj po nazwie nadawcy..."
                  value={freeSearch.sender}
                  onChange={e => setFreeSearch(s => ({ ...s, sender: e.target.value }))}
                  style={{ margin: '0.25rem 0 0' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Odbiorca</label>
                <Input
                  placeholder="Szukaj po nazwie odbiorcy..."
                  value={freeSearch.receiver}
                  onChange={e => setFreeSearch(s => ({ ...s, receiver: e.target.value }))}
                  style={{ margin: '0.25rem 0 0' }}
                />
              </div>
            </div>
          </GlassCard>

          <h3 style={{ color: '#ff4d4d', marginBottom: '1rem' }}>
            Opłacone paczki bez kuriera ({filteredFree.length}
            {filteredFree.length !== freePackages.length && ` z ${freePackages.length}`})
          </h3>

          {loadingFree ? <Spinner /> : filteredFree.length === 0 ? (
            <GlassCard>
              <p className="text-muted text-center">
                {freePackages.length === 0
                  ? 'Brak wolnych zleceń — wszystkie opłacone paczki mają przypisanego kuriera.'
                  : 'Brak wyników dla podanych kryteriów wyszukiwania.'}
              </p>
            </GlassCard>
          ) : (
            <div className="grid">
              {filteredFree.map(p => (
                <GlassCard key={p.id} title={`Paczka #${p.id}`} style={{ display: 'flex', flexDirection: 'column' }}>
                  <p><strong>Nadawca:</strong> {p.sender_name}</p>
                  <p><strong>Odbiorca:</strong> {p.receiver_name}</p>
                  <p><strong>Skąd:</strong> {p.origin_address}</p>
                  <p><strong>Dokąd:</strong> {p.destination_address}</p>
                  <p><strong>Dystans:</strong> {p.distance_km} km</p>
                  <p><strong>Waga:</strong> {p.weight_kg} kg</p>
                  <p style={{ marginTop: 'auto', paddingTop: '0.8rem', color: '#ff4d4d', fontWeight: 700 }}>
                    Koszt: {p.delivery_cost} PLN
                  </p>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}

      {/* === KURIENCI === */}
      {selectedTab === 'couriers' && (
        <>
          {loadingCouriers ? <Spinner /> : (
            <>
              {couriers.length > 0 && (
                <>
                  <h3 style={{ color: '#ff4d4d', marginBottom: '1rem' }}>Ranking kurierów</h3>
                  <div className="grid mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    {couriers.slice(0, 3).map((c, i) => (
                      <GlassCard key={c.id} className="text-center" style={{ borderTop: `4px solid ${RANK_COLORS[i]}` }}>
                        <div style={{ fontSize: '2.5rem', margin: '0.5rem 0' }}>{RANK_MEDALS[i]}</div>
                        <h3 style={{ color: RANK_COLORS[i], margin: '0 0 0.25rem 0' }}>{c.full_name || c.username}</h3>
                        {c.full_name && <p className="text-muted" style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>@{c.username}</p>}
                        <p style={{ fontSize: '2.5rem', fontWeight: 700, color: RANK_COLORS[i], margin: 0 }}>{c.delivered}</p>
                        <p className="text-muted" style={{ margin: '0 0 0.5rem 0' }}>dostaw</p>
                        <p style={{ color: '#10b981', fontWeight: 600, margin: 0 }}>{c.total_revenue} PLN</p>
                      </GlassCard>
                    ))}
                  </div>
                </>
              )}

              <h3 style={{ color: '#ff4d4d', marginBottom: '1rem' }}>Wszyscy kurierzy</h3>
              <GlassCard>
                {couriers.length === 0 ? (
                  <p className="text-muted text-center">Brak kurierów w systemie.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Kurier</th>
                          <th style={thStyle}>Adres</th>
                          <th style={thStyle}>W drodze</th>
                          <th style={thStyle}>Dostarczone</th>
                          <th style={thStyle}>Łącznie</th>
                          <th style={thStyle}>Śr. dystans</th>
                          <th style={thStyle}>Przychód [PLN]</th>
                        </tr>
                      </thead>
                      <tbody>
                        {couriers.map((c, i) => (
                          <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: i % 2 === 0 ? 'rgba(255,77,77,0.03)' : 'transparent' }}>
                            <td style={tdStyle}>
                              {i < 3 && <span style={{ marginRight: '6px' }}>{RANK_MEDALS[i]}</span>}
                              <strong>{c.full_name || c.username}</strong>
                              {c.full_name && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{c.username}</div>}
                            </td>
                            <td style={{ ...tdStyle, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.address || '—'}</td>
                            <td style={{ ...tdStyle, color: '#818CF8', fontWeight: 600 }}>{c.in_transit}</td>
                            <td style={{ ...tdStyle, color: '#10b981', fontWeight: 600 }}>{c.delivered}</td>
                            <td style={tdStyle}>{c.total_assigned}</td>
                            <td style={tdStyle}>{c.avg_distance} km</td>
                            <td style={{ ...tdStyle, color: '#ff4d4d', fontWeight: 600 }}>{c.total_revenue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            </>
          )}
        </>
      )}

      {/* === KLIENCI === */}
      {selectedTab === 'clients' && (
        <>
          <h3 style={{ color: '#ff4d4d', marginBottom: '1rem' }}>Klienci ({clients.length})</h3>
          {loadingClients ? <Spinner /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {clients.length === 0 && (
                <GlassCard><p className="text-muted text-center">Brak klientów w systemie.</p></GlassCard>
              )}
              {clients.map(client => (
                <GlassCard key={client.id}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                    onClick={() => setExpandedClient(expandedClient === client.id ? null : client.id)}
                  >
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--text-main)' }}>{client.full_name || client.username}</h3>
                      {client.full_name && (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>@{client.username}</span>
                      )}
                      {client.address && (
                        <p style={{ margin: '0.2rem 0 0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Adres: {client.address}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>Paczki: <strong style={{ color: 'var(--text-main)' }}>{client.packages_total}</strong></span>
                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>Opłacone: <strong style={{ color: '#10b981' }}>{client.packages_paid}</strong></span>
                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>Dostarczone: <strong style={{ color: '#818CF8' }}>{client.packages_delivered}</strong></span>
                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>Wydano: <strong style={{ color: '#ff4d4d' }}>{client.total_spent} PLN</strong></span>
                      </div>
                    </div>
                    <span style={{ color: '#ff4d4d', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, marginLeft: '1rem', paddingTop: '0.2rem' }}>
                      {expandedClient === client.id ? '▲ Zwiń' : '▼ Rozwiń'}
                    </span>
                  </div>

                  {expandedClient === client.id && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,77,77,0.2)', paddingTop: '1rem' }}>
                      {client.packages.length === 0 ? (
                        <p className="text-muted">Ten klient nie nadał jeszcze żadnych paczek.</p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                            <thead>
                              <tr>
                                <th style={thStyle}>#</th>
                                <th style={thStyle}>Trasa</th>
                                <th style={thStyle}>Dystans</th>
                                <th style={thStyle}>Waga</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Opłacona</th>
                                <th style={thStyle}>Koszt [PLN]</th>
                              </tr>
                            </thead>
                            <tbody>
                              {client.packages.map((p, i) => (
                                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'rgba(255,77,77,0.03)' : 'transparent' }}>
                                  <td style={tdStyle}>{p.id}</td>
                                  <td style={tdStyle}>{p.origin_address?.split(',')[0]} → {p.destination_address?.split(',')[0]}</td>
                                  <td style={tdStyle}>{p.distance_km} km</td>
                                  <td style={tdStyle}>{p.weight_kg} kg</td>
                                  <td style={{ ...tdStyle, color: statusColor(p.status), fontWeight: 600 }}>{statusLabel(p.status)}</td>
                                  <td style={{ ...tdStyle, color: p.is_paid ? '#10b981' : '#ff4d4d', fontWeight: 600 }}>{p.is_paid ? 'Tak' : 'Nie'}</td>
                                  <td style={{ ...tdStyle, fontWeight: 600 }}>{p.delivery_cost}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}

      {/* === ZARZĄDZANIE === */}
      {selectedTab === 'manage' && (
        <>
          {/* Pod-zakładki */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
            {[{ id: 'users', label: 'Użytkownicy' }, { id: 'packages', label: 'Zlecenia' }].map(s => (
              <button key={s.id} onClick={() => setManageSection(s.id)} style={{
                padding: '0.5rem 1.2rem', borderRadius: '6px',
                border: '1px solid rgba(255,77,77,0.35)',
                background: manageSection === s.id ? 'rgba(255,77,77,0.25)' : 'transparent',
                color: '#ff4d4d', fontWeight: 600, cursor: 'pointer',
              }}>{s.label}</button>
            ))}
          </div>

          {/* ── Użytkownicy ── */}
          {manageSection === 'users' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ color: '#ff4d4d', margin: 0 }}>Wszyscy użytkownicy</h3>
                <Button onClick={() => setShowNewUser(true)}>+ Utwórz konto</Button>
              </div>

              {loadingAllUsers ? <Spinner /> : (
                <GlassCard>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>#</th>
                          <th style={thStyle}>Użytkownik</th>
                          <th style={thStyle}>Imię i Nazwisko</th>
                          <th style={thStyle}>Adres pocztowy</th>
                          <th style={thStyle}>Rola</th>
                          <th style={thStyle}>Akcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map((u, i) => (
                          <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: i % 2 === 0 ? 'rgba(255,77,77,0.03)' : 'transparent' }}>
                            <td style={tdStyle}>{u.id}</td>
                            <td style={{ ...tdStyle, fontWeight: 600 }}>@{u.username}</td>
                            <td style={tdStyle}>{u.full_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                            <td style={{ ...tdStyle, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{u.address || '—'}</td>
                            <td style={tdStyle}>
                              <span style={{
                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700,
                                background: u.role === 'admin' ? 'rgba(255,77,77,0.2)' : u.role === 'courier' ? 'rgba(129,140,248,0.2)' : 'rgba(16,185,129,0.15)',
                                color: u.role === 'admin' ? '#ff4d4d' : u.role === 'courier' ? '#818CF8' : '#10b981',
                              }}>{ROLE_LABELS[u.role]}</span>
                            </td>
                            <td style={tdStyle}>
                              {u.username === 'admin' ? (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Konto chronione</span>
                              ) : (
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <button onClick={() => { setEditUser(u); setEditUserForm({ full_name: u.full_name || '', address: u.address || '', email: u.email || '', role: u.role }); setEditUserPassword(''); }} style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid rgba(255,77,77,0.4)', background: 'rgba(255,77,77,0.1)', color: '#ff4d4d', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>Edytuj</button>
                                  <button onClick={() => { if (window.confirm(`Usunąć użytkownika @${u.username}?`)) deleteUserMutation.mutate(u.id); }} style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>Usuń</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              )}

              {/* Modal edycji użytkownika */}
              {editUser && (
                <Modal isOpen onClose={() => { setEditUser(null); setEditUserPassword(''); }} title={`Edytuj: @${editUser.username}`}>
                  <div style={{ minWidth: '300px', textAlign: 'left' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Nazwa użytkownika (nie można zmienić)</label>
                    <input value={editUser.username} disabled style={{ width: '100%', padding: '0.6rem', margin: '0.25rem 0 0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.04)', color: 'var(--text-muted)', boxSizing: 'border-box', cursor: 'not-allowed' }} readOnly />

                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Nowe hasło (opcjonalne)</label>
                    <PasswordInput
                      placeholder="Zostaw puste, aby nie zmieniać"
                      value={editUserPassword}
                      onChange={e => setEditUserPassword(e.target.value)}
                    />
                    {changePasswordMutation.isError && (
                      <p style={{ color: '#ef4444', margin: '-0.5rem 0 0.6rem', fontSize: '0.85rem' }}>{changePasswordMutation.error?.message}</p>
                    )}
                    {changePasswordMutation.isSuccess && (
                      <p style={{ color: '#10b981', margin: '-0.5rem 0 0.6rem', fontWeight: 600, fontSize: '0.85rem' }}>Hasło zostało zmienione.</p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
                      <Button
                        onClick={() => {
                          if (window.confirm(`Czy na pewno chcesz zmienić hasło użytkownika: @${editUser.username}?`)) {
                            changePasswordMutation.mutate({ id: editUser.id, password: editUserPassword });
                          }
                        }}
                        disabled={changePasswordMutation.isPending || !editUserPassword}
                        style={{ minWidth: '130px' }}
                      >
                        {changePasswordMutation.isPending ? 'Zapisywanie...' : 'Zmień hasło'}
                      </Button>
                    </div>

                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Imię i Nazwisko</label>
                    <Input value={editUserForm.full_name} onChange={e => setEditUserForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Imię i Nazwisko" />
                    {editUser?.username !== 'admin' && (
                      <>
                        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Adres pocztowy</label>
                        <AddressInput value={editUserForm.address} onChange={e => setEditUserForm(f => ({ ...f, address: e.target.value }))} placeholder="Warszawa, ul. Przykładowa 1, 00-001" />
                      </>
                    )}
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Rola</label>
                    <select value={editUserForm.role} onChange={e => setEditUserForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%', padding: '0.6rem', margin: '0.25rem 0 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '1rem' }}>
                      <option value="client">Klient</option>
                      <option value="courier">Kurier</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <Button onClick={() => updateUserMutation.mutate({ id: editUser.id, data: editUserForm })} disabled={updateUserMutation.isPending} style={{ flex: 1 }}>
                        {updateUserMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
                      </Button>
                      <Button variant="outline" onClick={() => { setEditUser(null); setEditUserPassword(''); }} style={{ flex: 1 }}>Anuluj</Button>
                    </div>
                  </div>
                </Modal>
              )}

              {/* Modal nowego użytkownika */}
              {showNewUser && (
                <Modal isOpen onClose={() => setShowNewUser(false)} title="Utwórz nowe konto">
                  <div style={{ minWidth: '300px', textAlign: 'left' }}>
                    {createUserMutation.isError && <p style={{ color: '#ef4444', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{createUserMutation.error?.message}</p>}
                    <Input placeholder="Nazwa użytkownika" value={newUserForm.username} onChange={e => setNewUserForm(f => ({ ...f, username: e.target.value }))} />
                    <PasswordInput placeholder="Hasło" value={newUserForm.password} onChange={e => setNewUserForm(f => ({ ...f, password: e.target.value }))} />
                    <Input placeholder="Imię i Nazwisko" value={newUserForm.full_name} onChange={e => setNewUserForm(f => ({ ...f, full_name: e.target.value }))} />
                    <AddressInput placeholder="Adres pocztowy (np. Warszawa, ul. Kwiatowa 5, 00-001)" value={newUserForm.address} onChange={e => setNewUserForm(f => ({ ...f, address: e.target.value }))} />
                    <select value={newUserForm.role} onChange={e => setNewUserForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%', padding: '0.6rem', margin: '0 0 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '1rem' }}>
                      <option value="client">Klient</option>
                      <option value="courier">Kurier</option>
                      <option value="admin">Administrator</option>
                    </select>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <Button onClick={() => createUserMutation.mutate(newUserForm)} disabled={createUserMutation.isPending || !newUserForm.username || !newUserForm.password} style={{ flex: 1 }}>
                        {createUserMutation.isPending ? 'Tworzenie...' : 'Utwórz konto'}
                      </Button>
                      <Button variant="outline" onClick={() => setShowNewUser(false)} style={{ flex: 1 }}>Anuluj</Button>
                    </div>
                  </div>
                </Modal>
              )}
            </>
          )}

          {/* ── Zlecenia ── */}
          {manageSection === 'packages' && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <Input placeholder="Szukaj po ID, nadawcy lub odbiorcy..." value={pkgSearch} onChange={e => setPkgSearch(e.target.value)} style={{ maxWidth: '400px' }} />
              </div>

              {loadingAllPackages ? <Spinner /> : (
                <GlassCard>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>#</th>
                          <th style={thStyle}>Nadawca → Odbiorca</th>
                          <th style={thStyle}>Trasa</th>
                          <th style={thStyle}>Koszt</th>
                          <th style={thStyle}>Status</th>
                          <th style={thStyle}>Opłacona</th>
                          <th style={thStyle}>Akcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allPackages
                          .filter(p => {
                            const q = pkgSearch.toLowerCase();
                            return !q || String(p.id).includes(q) || p.sender_name?.toLowerCase().includes(q) || p.receiver_name?.toLowerCase().includes(q);
                          })
                          .map((p, i) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: i % 2 === 0 ? 'rgba(255,77,77,0.03)' : 'transparent' }}>
                              <td style={tdStyle}>{p.id}</td>
                              <td style={tdStyle}>{p.sender_name} → {p.receiver_name}</td>
                              <td style={{ ...tdStyle, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{p.origin_address?.split(',')[0]} → {p.destination_address?.split(',')[0]}</td>
                              <td style={{ ...tdStyle, color: '#ff4d4d', fontWeight: 600 }}>{p.delivery_cost} PLN</td>
                              <td style={{ ...tdStyle, color: statusColor(p.status), fontWeight: 600 }}>{statusLabel(p.status)}</td>
                              <td style={{ ...tdStyle, color: p.is_paid ? '#10b981' : '#ef4444', fontWeight: 600 }}>{p.is_paid ? 'Tak' : 'Nie'}</td>
                              <td style={tdStyle}>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <button onClick={() => { setEditPackage(p); setEditPkgForm({ status: p.status, courier_id: p.courier_id ?? '', is_paid: p.is_paid }); }} style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid rgba(255,77,77,0.4)', background: 'rgba(255,77,77,0.1)', color: '#ff4d4d', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>Edytuj</button>
                                  <button onClick={() => { if (window.confirm(`Usunąć paczke #${p.id}?`)) deletePackageMutation.mutate(p.id); }} style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>Usuń</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              )}

              {/* Modal edycji paczki */}
              {editPackage && (
                <Modal isOpen onClose={() => setEditPackage(null)} title={`Edytuj Paczka #${editPackage.id}`}>
                  <div style={{ minWidth: '300px', textAlign: 'left' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                      {editPackage.sender_name} → {editPackage.receiver_name}<br />
                      {editPackage.origin_address} → {editPackage.destination_address}
                    </p>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status</label>
                    <select value={editPkgForm.status} onChange={e => setEditPkgForm(f => ({ ...f, status: e.target.value }))} style={{ width: '100%', padding: '0.6rem', margin: '0.25rem 0 0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '1rem' }}>
                      <option value="pending">Oczekuje</option>
                      <option value="accepted">W doręczeniu</option>
                      <option value="delivered">Dostarczona</option>
                    </select>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>ID Kuriera (0 = odpisz)</label>
                    <Input type="number" placeholder="ID kuriera (0 = brak)" value={editPkgForm.courier_id} onChange={e => setEditPkgForm(f => ({ ...f, courier_id: e.target.value }))} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1rem', fontWeight: 600 }}>
                      <input type="checkbox" checked={!!editPkgForm.is_paid} onChange={e => setEditPkgForm(f => ({ ...f, is_paid: e.target.checked }))} style={{ width: '16px', height: '16px' }} />
                      Oznacz jako opłaconą
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <Button onClick={() => updatePackageMutation.mutate({ id: editPackage.id, data: { status: editPkgForm.status, courier_id: editPkgForm.courier_id !== '' ? Number(editPkgForm.courier_id) : undefined, is_paid: editPkgForm.is_paid } })} disabled={updatePackageMutation.isPending} style={{ flex: 1 }}>
                        {updatePackageMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
                      </Button>
                      <Button variant="outline" onClick={() => setEditPackage(null)} style={{ flex: 1 }}>Anuluj</Button>
                    </div>
                  </div>
                </Modal>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
