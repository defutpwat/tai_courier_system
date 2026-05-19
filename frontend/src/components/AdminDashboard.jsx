import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer 
} from 'recharts';
import { api } from '../api';
import { GlassCard } from './ui/GlassCard';
import { Input } from './ui/Input';

const COLORS = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a'];

function AdminDashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    document.body.classList.add('admin-theme');
    fetchStats();
    return () => {
      document.body.classList.remove('admin-theme');
    };
  }, [selectedMonth]);

  const fetchStats = async () => {
    try {
      const data = await api.getAdminStats(selectedMonth);
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  if (!stats) return <div className="text-center mt-12"><h2>Ładowanie Oka Saurona...</h2></div>;

  return (
    <div className="mb-8">
      <div className="flex-between flex-wrap items-center">
        <h2 style={{color: '#ff4d4d', textShadow: '0 0 10px rgba(255,0,0,0.5)'}}>Statystyki</h2>
        <div className="glass-container flex items-center p-2 rounded-lg shadow-sm" style={{borderColor: 'var(--glass-border)'}}>
          <label className="text-main mr-4 font-bold">Zbadaj Okres:</label>
          <Input 
            type="month" 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
            className="border-none"
            style={{background: 'rgba(255,0,0,0.1)', color: 'var(--text-main)', padding: '0.5rem', margin: 0}}
          />
        </div>
      </div>
      
      <div className="grid mt-8" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'}}>
        <GlassCard className="text-center border-t-4" style={{borderTopColor: '#ff4d4d'}}>
          <h3 className="text-muted">Zarobki ({selectedMonth} / Całość)</h3>
          <h1 style={{fontSize: '2.5rem', margin: '0.5rem 0', color: '#ff4d4d'}}>
            {stats.kpis.revenue_current_month} <span style={{fontSize: '1rem', color: 'var(--text-main)'}}>/ {stats.kpis.revenue} PLN</span>
          </h1>
        </GlassCard>
        
        <GlassCard className="text-center border-t-4" style={{borderTopColor: '#e9c46a'}}>
          <h3 className="text-muted">Ilość Zleceń w Wybranym Okresie</h3>
          <h1 style={{fontSize: '3rem', margin: '0.5rem 0'}}>{stats.kpis.total_packages}</h1>
        </GlassCard>
        
        <GlassCard className="text-center border-t-4" style={{borderTopColor: '#f4a261'}}>
          <h3 className="text-muted">Klienci / Kurierzy</h3>
          <h1 style={{fontSize: '2.5rem', margin: '0.5rem 0'}}>{stats.kpis.clients} / {stats.kpis.couriers}</h1>
        </GlassCard>
      </div>

      <div className="grid mt-12" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'}}>
        <GlassCard title="Rozkład Przesyłek w Systemie" className="text-center">
          <div style={{ height: '350px', width: '100%', marginTop: '2rem' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={stats.status_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.status_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{background: 'rgba(20,0,0,0.9)', border: '1px solid #ff4d4d'}} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard title="Utargi Miesięczne" className="text-center">
          <div style={{ height: '350px', width: '100%', marginTop: '2rem' }}>
            <ResponsiveContainer>
              <BarChart data={stats.monthly_revenue}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <RechartsTooltip contentStyle={{background: 'rgba(20,0,0,0.9)', border: '1px solid #ff4d4d'}} />
                <Bar dataKey="revenue" fill="#ff4d4d" radius={[5, 5, 0, 0]} name="Przychód [PLN]" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
      
    </div>
  );
}

export default AdminDashboard;
