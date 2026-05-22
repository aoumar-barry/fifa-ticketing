import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { fetchAdminStats, exportAdminSalesCSV } from '../../services/adminService';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [hoveredBar, setHoveredBar] = useState(null);

  const loadStats = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err) {
      setError(err.message || 'Impossible de charger les statistiques.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const blob = await exportAdminSalesCSV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fifa-ventes-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || "Erreur lors de l'exportation du fichier CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col justify-center items-center">
        <span className="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></span>
        <p className="mt-4 text-text-secondary text-sm font-mono tracking-wider uppercase">Chargement des statistiques...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col justify-center items-center px-4">
        <div className="bg-bg-secondary p-8 rounded-lg border border-brand-red/30 max-w-md w-full text-center">
          <span className="text-brand-red text-4xl mb-4 block">⚠️</span>
          <h2 className="text-xl font-bold mb-2">Erreur</h2>
          <p className="text-text-secondary mb-6 text-sm">{error}</p>
          <button
            onClick={loadStats}
            className="w-full bg-brand-gold hover:bg-brand-gold-dark text-black font-bold py-2.5 px-4 rounded transition-colors duration-200"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const { totalRevenue = 0, ticketsSold = 0, activeMatchesCount = 0, matchStats = [] } = stats || {};

  // Formatter utilities
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
  };

  // SVG Chart settings
  const chartHeight = 220;
  const chartWidth = 600;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const maxRevenue = Math.max(...matchStats.map((m) => m.revenue), 100);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 bg-bg-primary/80 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-brand-gold font-mono font-black text-lg tracking-wider">FIFA</span>
              <span className="text-text-primary font-bold text-sm tracking-widest uppercase">Admin</span>
            </Link>
            <div className="h-4 w-px bg-border-light"></div>
            <span className="text-text-secondary text-sm font-medium">Tableau de bord</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-text-muted hidden md:inline">Connecté en tant que admin ({user?.email})</span>
            <button
              onClick={() => navigate('/')}
              className="text-xs text-text-secondary hover:text-text-primary border border-border-light px-3 py-1.5 rounded transition-all"
            >
              Retour Boutique
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Title and Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Statistiques de ventes</h1>
            <p className="text-sm text-text-secondary mt-1">Consultez en temps réel les revenus et les taux d'occupation des stades.</p>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center justify-center gap-2 bg-brand-gold hover:bg-brand-gold-dark disabled:bg-brand-gold/50 text-black font-semibold text-sm px-4 py-2.5 rounded-md transition-all duration-200"
          >
            {isExporting ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                <span>Exportation...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Exporter les Ventes (CSV)</span>
              </>
            )}
          </button>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Revenue */}
          <div className="bg-bg-secondary p-6 rounded-xl border border-border-subtle flex flex-col justify-between shadow-card relative overflow-hidden group hover:border-brand-gold/30 transition-all duration-300">
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-brand-gold/20 via-brand-gold to-brand-gold/20 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-text-muted">Revenus Totaux</span>
              <h2 className="text-3xl font-bold mt-2 font-mono tracking-tight text-brand-gold">
                {formatCurrency(totalRevenue)}
              </h2>
            </div>
            <p className="text-xs text-text-muted mt-4">Somme de tous les billets vendus non annulés.</p>
          </div>

          {/* Card 2: Tickets Sold */}
          <div className="bg-bg-secondary p-6 rounded-xl border border-border-subtle flex flex-col justify-between shadow-card relative overflow-hidden group hover:border-brand-gold/30 transition-all duration-300">
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-brand-gold/20 via-brand-gold to-brand-gold/20 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-text-muted">Billets Vendus</span>
              <h2 className="text-3xl font-bold mt-2 font-mono tracking-tight text-text-primary">
                {ticketsSold}
              </h2>
            </div>
            <p className="text-xs text-text-muted mt-4">Nombre de places réservées actives.</p>
          </div>

          {/* Card 3: Active Matches */}
          <div className="bg-bg-secondary p-6 rounded-xl border border-border-subtle flex flex-col justify-between shadow-card relative overflow-hidden group hover:border-brand-gold/30 transition-all duration-300">
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-brand-gold/20 via-brand-gold to-brand-gold/20 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-text-muted">Matchs Actifs</span>
              <h2 className="text-3xl font-bold mt-2 font-mono tracking-tight text-text-primary">
                {activeMatchesCount}
              </h2>
            </div>
            <p className="text-xs text-text-muted mt-4">Matchs ouverts à la vente dans le catalogue.</p>
          </div>
        </div>

        {/* SVG Chart & Match Table grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-bg-secondary p-6 rounded-xl border border-border-subtle shadow-card flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Revenus par Match</h3>
              <span className="text-xs text-text-muted font-mono">Montant en Euros</span>
            </div>

            {matchStats.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center h-48 border border-dashed border-border-light rounded-lg">
                <span className="text-text-muted text-sm">Aucune donnée disponible</span>
              </div>
            ) : (
              <div className="relative flex-1">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto select-none overflow-visible">
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand-gold)" />
                      <stop offset="100%" stopColor="var(--brand-gold-dark)" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = paddingTop + innerHeight * (1 - ratio);
                    const labelVal = maxRevenue * ratio;
                    return (
                      <g key={idx} className="opacity-40">
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={chartWidth - paddingRight}
                          y2={y}
                          stroke="var(--border-light)"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={paddingLeft - 8}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-text-secondary text-[10px] font-mono"
                        >
                          {Math.round(labelVal)}€
                        </text>
                      </g>
                    );
                  })}

                  {/* Axis lines */}
                  <line
                    x1={paddingLeft}
                    y1={chartHeight - paddingBottom}
                    x2={chartWidth - paddingRight}
                    y2={chartHeight - paddingBottom}
                    stroke="var(--text-muted)"
                    strokeWidth={1}
                  />

                  {/* Bars */}
                  {matchStats.map((item, idx) => {
                    const barWidth = Math.min(40, innerWidth / (matchStats.length * 1.5));
                    const spacing = innerWidth / matchStats.length;
                    const x = paddingLeft + (idx * spacing) + (spacing - barWidth) / 2;
                    const barHeight = maxRevenue > 0 ? (item.revenue / maxRevenue) * innerHeight : 0;
                    const y = chartHeight - paddingBottom - barHeight;

                    const matchLabel = `${item.match.teamA} vs ${item.match.teamB}`;
                    const labelX = x + barWidth / 2;

                    return (
                      <g
                        key={idx}
                        onMouseEnter={() => setHoveredBar({ ...item, x: labelX, y })}
                        onMouseLeave={() => setHoveredBar(null)}
                        className="cursor-pointer group"
                      >
                        {/* Interactive Bar */}
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={Math.max(barHeight, 4)}
                          rx={3}
                          fill="url(#barGrad)"
                          className="transition-all duration-300 group-hover:brightness-110"
                        />
                        {/* Hover Overlay */}
                        <rect
                          x={x - 4}
                          y={y - 4}
                          width={barWidth + 8}
                          height={Math.max(barHeight, 4) + 8}
                          rx={6}
                          fill="var(--brand-gold)"
                          fillOpacity={0.08}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        />

                        {/* Match Label */}
                        <text
                          x={labelX}
                          y={chartHeight - paddingBottom + 16}
                          textAnchor="middle"
                          className="fill-text-secondary text-[9px] font-mono max-w-[50px] truncate"
                        >
                          {item.match.teamA.slice(0, 3)} - {item.match.teamB.slice(0, 3)}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Tooltip Overlay */}
                {hoveredBar && (
                  <div
                    className="absolute bg-bg-elevated border border-border-light text-text-primary px-3 py-2 rounded-lg shadow-modal text-xs pointer-events-none transition-all z-10 font-sans"
                    style={{
                      left: `${(hoveredBar.x / chartWidth) * 100}%`,
                      top: `${(hoveredBar.y / chartHeight) * 100 - 15}%`,
                      transform: 'translate(-50%, -100%)',
                    }}
                  >
                    <p className="font-bold text-text-primary mb-0.5">
                      {hoveredBar.match.teamA} vs {hoveredBar.match.teamB}
                    </p>
                    <p className="text-brand-gold font-semibold font-mono">
                      Revenus : {formatCurrency(hoveredBar.revenue)}
                    </p>
                    <p className="text-text-secondary">
                      Tickets : {hoveredBar.ticketsSold} ({Math.round(hoveredBar.occupancyRate * 100)}%)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Side Info */}
          <div className="bg-bg-secondary p-6 rounded-xl border border-border-subtle shadow-card flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wider text-text-secondary mb-4">Informations Système</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-border-subtle pb-2">
                  <span className="text-text-muted">Version API</span>
                  <span className="font-mono text-text-secondary">v1.0.0</span>
                </div>
                <div className="flex justify-between border-b border-border-subtle pb-2">
                  <span className="text-text-muted">Statut Serveur</span>
                  <span className="text-brand-green font-semibold">Opérationnel</span>
                </div>
                <div className="flex justify-between border-b border-border-subtle pb-2">
                  <span className="text-text-muted">Dernier export</span>
                  <span className="font-mono text-text-secondary">Aujourd'hui</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border-subtle">
              <h4 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-3">Ressources rapides</h4>
              <div className="flex flex-col gap-2">
                <Link to="/" className="text-xs text-brand-gold hover:underline flex items-center gap-1">
                  <span>Accéder à la boutique</span>
                  <span>→</span>
                </Link>
                <a href="/api/v1/admin/stats" target="_blank" rel="noreferrer" className="text-xs text-brand-gold hover:underline flex items-center gap-1">
                  <span>Visualiser le JSON brut</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Match Performance Table */}
        <div className="bg-bg-secondary rounded-xl border border-border-subtle shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border-subtle">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Performance des Matchs</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-subtle text-text-muted font-mono text-xs uppercase bg-bg-tertiary/30">
                  <th className="px-6 py-4">Match</th>
                  <th className="px-6 py-4">Stade</th>
                  <th className="px-6 py-4">Taux d'occupation</th>
                  <th className="px-6 py-4 text-right">Billets vendus</th>
                  <th className="px-6 py-4 text-right">Revenus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {matchStats.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-text-muted">
                      Aucun match enregistré ou données indisponibles.
                    </td>
                  </tr>
                ) : (
                  matchStats.map((item, idx) => {
                    const matchDate = new Date(item.match.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const ratePercent = Math.round(item.occupancyRate * 100);

                    return (
                      <tr key={idx} className="hover:bg-bg-tertiary/10 transition-colors animate-fade-in">
                        <td className="px-6 py-4">
                          <div className="font-bold text-text-primary">
                            {item.match.teamA} vs {item.match.teamB}
                          </div>
                          <div className="text-xs text-text-muted font-mono mt-0.5">{matchDate}</div>
                        </td>
                        <td className="px-6 py-4 text-text-secondary">
                          {item.match.stadium ? (
                            <>
                              <div>{item.match.stadium.name}</div>
                              <div className="text-xs text-text-muted">{item.match.stadium.city}, {item.match.stadium.country}</div>
                            </>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 max-w-[200px]">
                            <div className="flex-1 bg-border-light h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-brand-gold h-full rounded-full transition-all duration-500"
                                style={{ width: `${ratePercent}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-mono font-semibold text-text-secondary w-10 text-right">
                              {ratePercent}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-text-secondary">
                          {item.ticketsSold} / {item.match.totalSeats || 0}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-brand-gold">
                          {formatCurrency(item.revenue)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
