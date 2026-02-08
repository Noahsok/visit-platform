// @ts-nocheck
"use client";

import { useState, useEffect } from "react";

/* 
  Ice Production Tracker - ported exactly from Drink Bible
  Inline styles with CSS variables
*/

const cssVars = {
  '--bg-primary': '#111',
  '--bg-secondary': '#1a1a1a',
  '--bg-tertiary': '#222',
  '--text-primary': '#eee',
  '--text-secondary': '#888',
  '--border-color': '#333',
  '--accent': '#eee',
  '--accent-hover': '#fff',
  '--card-bg': '#1a1a1a',
};

export default function IcePage() {
  return (
    <div style={cssVars}>
      <h1 style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '24px',
        fontWeight: 500,
        padding: '16px 16px 0',
      }}>
        Ice Production
      </h1>
      <IceProduction />
    </div>
  );
}

function getDefaultCoolers() {
  return [
    { id: 1, name: 'Cooler #1', purchaseDate: '2024-06-15', targetHours: 34, startedAt: null, history: [] },
    { id: 2, name: 'Cooler #2', purchaseDate: '2024-06-15', targetHours: 36, startedAt: null, history: [] },
    { id: 3, name: 'Cooler #3', purchaseDate: '2024-08-01', targetHours: 35, startedAt: null, history: [] },
    { id: 4, name: 'Cooler #4', purchaseDate: '2025-01-01', targetHours: 34, startedAt: null, history: [] },
  ];
}

function IceProduction() {
  const [view, setView] = useState('status');
  const [historyCooler, setHistoryCooler] = useState(null);
  const [showPullModal, setShowPullModal] = useState(null);
  const [showStartModal, setShowStartModal] = useState(null);
  const [showEditModal, setShowEditModal] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const [coolers, setCoolers] = useState(() => {
    if (typeof window === 'undefined') return getDefaultCoolers();
    const saved = localStorage.getItem('iceTrackerV2');
    if (saved) {
      const data = JSON.parse(saved);
      return data.coolers || [
        { id: 1, name: 'Cooler #1', purchaseDate: '2024-06-15', targetHours: 34, startedAt: null, history: [] },
        { id: 2, name: 'Cooler #2', purchaseDate: '2024-06-15', targetHours: 36, startedAt: null, history: [] },
        { id: 3, name: 'Cooler #3', purchaseDate: '2024-08-01', targetHours: 35, startedAt: null, history: [] },
        { id: 4, name: 'Cooler #4', purchaseDate: '2025-01-01', targetHours: 34, startedAt: null, history: [] },
      ];
    }
    return [
      { id: 1, name: 'Cooler #1', purchaseDate: '2024-06-15', targetHours: 34, startedAt: null, history: [] },
      { id: 2, name: 'Cooler #2', purchaseDate: '2024-06-15', targetHours: 36, startedAt: null, history: [] },
      { id: 3, name: 'Cooler #3', purchaseDate: '2024-08-01', targetHours: 35, startedAt: null, history: [] },
      { id: 4, name: 'Cooler #4', purchaseDate: '2025-01-01', targetHours: 34, startedAt: null, history: [] },
    ];
  });

  const [inventory, setInventory] = useState(() => {
    if (typeof window === 'undefined') return { bricks: 0, cubes: 0, cracked: 0 };
    const saved = localStorage.getItem('iceTrackerV2');
    if (saved) {
      const data = JSON.parse(saved);
      return data.inventory || { bricks: 0, cubes: 0, cracked: 0 };
    }
    return { bricks: 0, cubes: 0, cracked: 0 };
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('iceTrackerV2', JSON.stringify({ coolers, inventory }));
  }, [coolers, inventory]);

  // Timer tick
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Helpers
  const getStatus = (cooler) => {
    if (!cooler.startedAt) return 'empty';
    const elapsed = (currentTime - cooler.startedAt) / (1000 * 60 * 60);
    return elapsed >= cooler.targetHours ? 'ready' : 'freezing';
  };

  const getElapsedHours = (cooler) => {
    if (!cooler.startedAt) return 0;
    return (currentTime - cooler.startedAt) / (1000 * 60 * 60);
  };

  const getTimeRemaining = (cooler) => {
    if (!cooler.startedAt) return null;
    const elapsed = getElapsedHours(cooler);
    const remaining = Math.max(0, cooler.targetHours - elapsed);
    const hours = Math.floor(remaining);
    const minutes = Math.floor((remaining - hours) * 60);
    return { hours, minutes, total: remaining };
  };

  const getProgress = (cooler) => {
    if (!cooler.startedAt) return 0;
    const elapsed = getElapsedHours(cooler);
    return Math.min(100, (elapsed / cooler.targetHours) * 100);
  };

  const formatDateTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (isToday) return `Today ${timeStr}`;
    if (isTomorrow) return `Tomorrow ${timeStr}`;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const formatDuration = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const getReadyTime = (cooler) => {
    if (!cooler.startedAt) return null;
    const readyAt = new Date(cooler.startedAt + cooler.targetHours * 60 * 60 * 1000);
    return formatDateTime(readyAt);
  };

  const getCoolerAge = (cooler) => {
    const purchase = new Date(cooler.purchaseDate);
    const now = new Date();
    const months = Math.floor((now - purchase) / (1000 * 60 * 60 * 24 * 30));
    if (months < 1) return 'New';
    if (months === 1) return '1 month';
    return `${months} months`;
  };

  const getAverageOptimalTime = (cooler) => {
    const perfectPulls = cooler.history.filter(h => h.quality === 'perfect');
    if (perfectPulls.length === 0) return null;
    const avgFreezeTime = perfectPulls.reduce((sum, h) => {
      const freezeTime = (h.pulledAt - h.startedAt) / (1000 * 60 * 60);
      return sum + freezeTime;
    }, 0) / perfectPulls.length;
    return Math.round(avgFreezeTime * 10) / 10;
  };

  const getSuccessRate = (cooler) => {
    if (cooler.history.length === 0) return null;
    const perfect = cooler.history.filter(h => h.quality === 'perfect').length;
    return Math.round((perfect / cooler.history.length) * 100);
  };

  const getOverageForReady = (cooler) => {
    if (getStatus(cooler) !== 'ready') return null;
    const readyAt = cooler.startedAt + cooler.targetHours * 60 * 60 * 1000;
    return currentTime - readyAt;
  };

  // Actions
  const handleStartCooler = (coolerId) => {
    setCoolers(coolers.map(c => 
      c.id === coolerId ? { ...c, startedAt: Date.now() } : c
    ));
    setShowStartModal(null);
  };

  const handlePullCooler = (coolerId, quality) => {
    const cooler = coolers.find(c => c.id === coolerId);
    const readyAt = cooler.startedAt + cooler.targetHours * 60 * 60 * 1000;
    
    const newEntry = {
      startedAt: cooler.startedAt,
      readyAt: readyAt,
      pulledAt: Date.now(),
      quality: quality,
    };
    
    setCoolers(coolers.map(c => 
      c.id === coolerId ? {
        ...c,
        startedAt: null,
        history: [newEntry, ...c.history].slice(0, 50)
      } : c
    ));
    
    setInventory({ ...inventory, bricks: inventory.bricks + 1 });
    setShowPullModal(null);
  };

  const handleUpdateTarget = (coolerId, hours) => {
    setCoolers(coolers.map(c => 
      c.id === coolerId ? { ...c, targetHours: hours } : c
    ));
  };

  const sortedCoolers = [...coolers].sort((a, b) => {
    const statusA = getStatus(a);
    const statusB = getStatus(b);
    if (statusA === 'ready' && statusB !== 'ready') return -1;
    if (statusB === 'ready' && statusA !== 'ready') return 1;
    if (statusA === 'empty') return 1;
    if (statusB === 'empty') return -1;
    return (getTimeRemaining(a)?.total || 0) - (getTimeRemaining(b)?.total || 0);
  });

  const readyCoolers = coolers.filter(c => getStatus(c) === 'ready');

  // Badge component
  const Badge = ({ children, variant = 'default' }) => (
    <span style={{
      fontSize: '10px',
      fontWeight: 600,
      padding: '4px 10px',
      background: variant === 'ready' ? 'var(--accent)' : variant === 'freezing' ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
      color: variant === 'ready' ? 'var(--bg-primary)' : variant === 'freezing' ? 'var(--text-primary)' : 'var(--text-secondary)',
      letterSpacing: '0.5px',
      boxShadow: variant === 'ready' ? '0 0 8px rgba(255,255,255,0.2)' : 'none',
      textTransform: 'uppercase',
    }}>
      {children}
    </span>
  );

  // STATUS VIEW
  const StatusView = () => (
    <div style={{ padding: '16px' }}>
      {readyCoolers.length > 0 && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          padding: '16px',
          marginBottom: '16px',
        }}>
          <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>
            {readyCoolers.length} {readyCoolers.length === 1 ? 'Cooler' : 'Coolers'} Ready to Pull
          </div>
          {readyCoolers.map(c => {
            const overage = getOverageForReady(c);
            return (
              <div key={c.id} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {c.name} — ready {formatDuration(overage)} ago
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '20px' }}>
        {sortedCoolers.map(cooler => {
          const status = getStatus(cooler);
          const time = getTimeRemaining(cooler);
          const progress = getProgress(cooler);
          const avgTime = getAverageOptimalTime(cooler);
          const overage = getOverageForReady(cooler);

          return (
            <div
              key={cooler.id}
              onClick={() => {
                if (status === 'ready') setShowPullModal(cooler.id);
                else if (status === 'empty') setShowStartModal(cooler.id);
                else if (status === 'freezing') setShowEditModal(cooler.id);
              }}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                padding: '16px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: status === 'freezing' ? '12px' : '0' }}>
                <div>
                  <div style={{ 
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: '18px', 
                    fontWeight: 500,
                    marginBottom: '4px',
                  }}>
                    {cooler.name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {status === 'empty' && (
                      <>Tap to fill with water{avgTime && ` • Avg: ${avgTime}h`}</>
                    )}
                    {status === 'ready' && (
                      <>Waiting {formatDuration(overage)} — tap to pull</>
                    )}
                    {status === 'freezing' && (
                      <>{getCoolerAge(cooler)} old • Target: {cooler.targetHours}h</>
                    )}
                  </div>
                </div>
                <Badge variant={status}>{status}</Badge>
              </div>

              {status === 'freezing' && time && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                    <div style={{ 
                      fontSize: '28px', 
                      fontWeight: 600,
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}>
                      {time.hours}h {time.minutes}m
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {getReadyTime(cooler)}
                    </div>
                  </div>
                  <div style={{
                    height: '4px',
                    background: 'var(--bg-secondary)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: 'var(--accent)',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Inventory */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        padding: '16px',
      }}>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: 600, 
          color: 'var(--text-secondary)', 
          letterSpacing: '0.5px',
          marginBottom: '12px',
          textTransform: 'uppercase',
        }}>
          Inventory
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { key: 'bricks', label: 'Bricks' },
            { key: 'cubes', label: 'Cubes' },
            { key: 'cracked', label: 'Cracked' },
          ].map(item => (
            <div key={item.key} style={{ 
              flex: 1, 
              background: 'var(--bg-secondary)',
              padding: '12px',
              textAlign: 'center',
            }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 600,
                fontFamily: "'Playfair Display', Georgia, serif",
              }}>
                {inventory[item.key]}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{item.label}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setInventory({ ...inventory, [item.key]: Math.max(0, inventory[item.key] - 1) }); }}
                  style={{
                    width: '28px',
                    height: '28px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--card-bg)',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: 'var(--text-primary)',
                  }}
                >−</button>
                <button
                  onClick={(e) => { e.stopPropagation(); setInventory({ ...inventory, [item.key]: inventory[item.key] + 1 }); }}
                  style={{
                    width: '28px',
                    height: '28px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--card-bg)',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: 'var(--text-primary)',
                  }}
                >+</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // HISTORY VIEW
  const HistoryView = () => {
    const selectedCoolerData = historyCooler ? coolers.find(c => c.id === historyCooler) : null;
    
    const historyToShow = selectedCoolerData 
      ? selectedCoolerData.history.map(h => ({ ...h, coolerName: selectedCoolerData.name, coolerId: selectedCoolerData.id }))
      : coolers.flatMap(c => c.history.map(h => ({ ...h, coolerName: c.name, coolerId: c.id })));
    
    const sortedHistory = historyToShow.sort((a, b) => b.pulledAt - a.pulledAt);

    const stats = {
      total: sortedHistory.length,
      perfect: sortedHistory.filter(h => h.quality === 'perfect').length,
      tooEarly: sortedHistory.filter(h => h.quality === 'too_early').length,
      tooLate: sortedHistory.filter(h => h.quality === 'too_late').length,
    };

    const perfectPulls = sortedHistory.filter(h => h.quality === 'perfect');
    const avgFreezeTime = perfectPulls.length > 0 
      ? perfectPulls.reduce((sum, h) => sum + (h.pulledAt - h.startedAt) / (1000 * 60 * 60), 0) / perfectPulls.length
      : null;

    return (
      <div style={{ padding: '16px' }}>
        {/* Cooler Filter */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '16px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}>
          <button
            onClick={() => setHistoryCooler(null)}
            style={{
              padding: '8px 14px',
              border: 'none',
              background: !historyCooler ? 'var(--accent)' : 'var(--bg-secondary)',
              color: !historyCooler ? 'var(--bg-primary)' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: !historyCooler ? '0 0 8px rgba(255,255,255,0.2)' : 'none',
            }}
          >
            All
          </button>
          {coolers.map(c => (
            <button
              key={c.id}
              onClick={() => setHistoryCooler(c.id)}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: historyCooler === c.id ? 'var(--accent)' : 'var(--bg-secondary)',
                color: historyCooler === c.id ? 'var(--bg-primary)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: historyCooler === c.id ? '0 0 8px rgba(255,255,255,0.2)' : 'none',
              }}
            >
              #{c.id}
            </button>
          ))}
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '2px', marginBottom: '16px' }}>
          {[
            { label: 'Total', value: stats.total },
            { label: 'Perfect', value: stats.perfect },
            { label: 'Early', value: stats.tooEarly },
            { label: 'Late', value: stats.tooLate },
          ].map(stat => (
            <div key={stat.label} style={{
              flex: 1,
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              padding: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 600 }}>{stat.value}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Insight */}
        {avgFreezeTime && (
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            padding: '14px 16px',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '13px' }}>
              <strong>Optimal freeze time:</strong> {Math.round(avgFreezeTime * 10) / 10}h average for perfect ice
            </div>
          </div>
        )}

        {/* History List */}
        {sortedHistory.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px', 
            color: 'var(--text-secondary)',
            fontSize: '14px',
          }}>
            No pulls logged yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {sortedHistory.slice(0, 20).map((h, i) => {
              const freezeTime = (h.pulledAt - h.startedAt) / (1000 * 60 * 60);
              const overage = (h.pulledAt - h.readyAt) / (1000 * 60);
              
              return (
                <div key={i} style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      {!selectedCoolerData && (
                        <div style={{ 
                          fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: '15px', 
                          fontWeight: 500, 
                          marginBottom: '2px' 
                        }}>
                          {h.coolerName}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(h.pulledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    <Badge variant={h.quality === 'perfect' ? 'ready' : 'default'}>
                      {h.quality === 'perfect' ? 'Perfect' : h.quality === 'too_early' ? 'Early' : 'Late'}
                    </Badge>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                  }}>
                    <span>Froze: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(freezeTime * 10) / 10}h</strong></span>
                    <span>
                      {overage < 0 
                        ? `Pulled ${Math.abs(Math.round(overage))}m early`
                        : overage === 0 
                          ? 'Pulled on time'
                          : `+${formatDuration(overage * 60 * 1000)} after ready`
                      }
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // PULL MODAL
  const PullModal = () => {
    const cooler = coolers.find(c => c.id === showPullModal);
    if (!cooler) return null;
    const freezeTime = getElapsedHours(cooler);
    const overage = getOverageForReady(cooler);
    
    return (
      <div onClick={() => setShowPullModal(null)} style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: '20px',
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: 'var(--bg-primary)',
          padding: '24px',
          width: '100%',
          maxWidth: '300px',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ 
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '20px', 
              fontWeight: 500, 
              marginBottom: '8px' 
            }}>
              {cooler.name}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Froze for {Math.round(freezeTime * 10) / 10}h
              <br />
              Ready {formatDuration(overage)} ago
            </div>
          </div>
          
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '16px' }}>
            How did the ice turn out?
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => handlePullCooler(showPullModal, 'perfect')} style={{
              padding: '14px',
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--bg-primary)',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              Perfect
            </button>
            <button onClick={() => handlePullCooler(showPullModal, 'too_early')} style={{
              padding: '14px',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
            }}>
              Too Early (not frozen)
            </button>
            <button onClick={() => handlePullCooler(showPullModal, 'too_late')} style={{
              padding: '14px',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
            }}>
              Too Late (cracked)
            </button>
          </div>

          <button onClick={() => setShowPullModal(null)} style={{
            width: '100%',
            padding: '14px',
            marginTop: '12px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
          }}>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // START MODAL - pick date, time and duration
  const StartModal = () => {
    const cooler = coolers.find(c => c.id === showStartModal);
    if (!cooler) return null;
    
    const now = new Date();
    const [startDay, setStartDay] = useState('today'); // 'today' or 'yesterday'
    const [startHour, setStartHour] = useState(now.getHours());
    const [startMinute, setStartMinute] = useState(Math.floor(now.getMinutes() / 15) * 15);
    const [duration, setDuration] = useState(cooler.targetHours >= 24 ? cooler.targetHours : 34);
    
    const avgTime = getAverageOptimalTime(cooler);

    // Build the start time
    const getStartTime = () => {
      const start = new Date();
      if (startDay === 'yesterday') {
        start.setDate(start.getDate() - 1);
      }
      start.setHours(startHour, startMinute, 0, 0);
      return start;
    };

    const startTime = getStartTime();
    const readyTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

    const handleConfirm = () => {
      setCoolers(coolers.map(c => 
        c.id === showStartModal ? { ...c, startedAt: startTime.getTime(), targetHours: duration } : c
      ));
      setShowStartModal(null);
    };

    const formatHour = (h) => {
      const hour12 = h % 12 || 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      return `${hour12} ${ampm}`;
    };
    
    return (
      <div onClick={() => setShowStartModal(null)} style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: '20px',
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: 'var(--bg-primary)',
          padding: '24px',
          width: '100%',
          maxWidth: '340px',
          border: '1px solid var(--border-color)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}>
          <div style={{ 
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '20px', 
            fontWeight: 500, 
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            {cooler.name}
          </div>

          {/* Day Picker */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              When did you put it in?
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setStartDay('today')}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: startDay === 'today' ? 'none' : '1px solid var(--border-color)',
                  background: startDay === 'today' ? 'var(--accent)' : 'var(--card-bg)',
                  color: startDay === 'today' ? 'var(--bg-primary)' : 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Today
              </button>
              <button
                onClick={() => setStartDay('yesterday')}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: startDay === 'yesterday' ? 'none' : '1px solid var(--border-color)',
                  background: startDay === 'yesterday' ? 'var(--accent)' : 'var(--card-bg)',
                  color: startDay === 'yesterday' ? 'var(--bg-primary)' : 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Yesterday
              </button>
            </div>
          </div>

          {/* Time Picker */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              What time?
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
              {/* Hour */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setStartHour((startHour + 1) % 24)}
                  style={{
                    width: '44px',
                    height: '32px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                  }}
                >▲</button>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: 600, 
                  fontFamily: "'Playfair Display', Georgia, serif",
                  minWidth: '60px',
                  textAlign: 'center',
                }}>
                  {formatHour(startHour)}
                </div>
                <button
                  onClick={() => setStartHour((startHour - 1 + 24) % 24)}
                  style={{
                    width: '44px',
                    height: '32px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                  }}
                >▼</button>
              </div>
              
              <div style={{ fontSize: '24px', fontWeight: 600 }}>:</div>
              
              {/* Minute */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setStartMinute((startMinute + 15) % 60)}
                  style={{
                    width: '44px',
                    height: '32px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                  }}
                >▲</button>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: 600, 
                  fontFamily: "'Playfair Display', Georgia, serif",
                  minWidth: '40px',
                  textAlign: 'center',
                }}>
                  {startMinute.toString().padStart(2, '0')}
                </div>
                <button
                  onClick={() => setStartMinute((startMinute - 15 + 60) % 60)}
                  style={{
                    width: '44px',
                    height: '32px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                  }}
                >▼</button>
              </div>
            </div>
          </div>

          {/* Duration Picker */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Freeze for how long?
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setDuration(Math.max(24, duration - 1))}
                style={{
                  width: '44px',
                  height: '44px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: 'var(--text-primary)',
                }}
              >−</button>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 600,
                fontFamily: "'Playfair Display', Georgia, serif",
                minWidth: '80px',
                textAlign: 'center',
              }}>
                {duration}h
              </div>
              <button
                onClick={() => setDuration(Math.min(48, duration + 1))}
                style={{
                  width: '44px',
                  height: '44px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: 'var(--text-primary)',
                }}
              >+</button>
            </div>
            {avgTime && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '8px' }}>
                Avg perfect: {avgTime}h
              </div>
            )}
          </div>

          {/* Preview */}
          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: '14px', 
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Ready</div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>
              {formatDateTime(readyTime)}
            </div>
          </div>

          {/* Actions */}
          <button onClick={handleConfirm} style={{
            width: '100%',
            padding: '14px',
            border: 'none',
            background: 'var(--accent)',
            color: 'var(--bg-primary)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '8px',
          }}>
            Start Freezing
          </button>

          <button onClick={() => setShowStartModal(null)} style={{
            width: '100%',
            padding: '12px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
          }}>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // EDIT MODAL - same UI as Start modal
  const EditModal = () => {
    const cooler = coolers.find(c => c.id === showEditModal);
    if (!cooler) return null;
    
    // Get the original start time
    const originalStart = new Date(cooler.startedAt);
    const now = new Date();
    const isToday = originalStart.toDateString() === now.toDateString();
    const isYesterday = originalStart.toDateString() === new Date(now.getTime() - 86400000).toDateString();
    
    const [startDay, setStartDay] = useState(isToday ? 'today' : 'yesterday');
    const [startHour, setStartHour] = useState(originalStart.getHours());
    const [startMinute, setStartMinute] = useState(Math.floor(originalStart.getMinutes() / 15) * 15);
    const [duration, setDuration] = useState(cooler.targetHours);
    
    const avgTime = getAverageOptimalTime(cooler);

    const getStartTime = () => {
      const start = new Date();
      if (startDay === 'yesterday') {
        start.setDate(start.getDate() - 1);
      }
      start.setHours(startHour, startMinute, 0, 0);
      return start;
    };

    const startTime = getStartTime();
    const readyTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

    const handleSave = () => {
      setCoolers(coolers.map(c => 
        c.id === showEditModal ? { ...c, startedAt: startTime.getTime(), targetHours: duration } : c
      ));
      setShowEditModal(null);
    };

    const handleCancelFreezing = () => {
      setCoolers(coolers.map(c => 
        c.id === showEditModal ? { ...c, startedAt: null } : c
      ));
      setShowEditModal(null);
    };

    const formatHour = (h) => {
      const hour12 = h % 12 || 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      return `${hour12} ${ampm}`;
    };
    
    return (
      <div onClick={() => setShowEditModal(null)} style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: '20px',
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: 'var(--bg-primary)',
          padding: '24px',
          width: '100%',
          maxWidth: '340px',
          border: '1px solid var(--border-color)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}>
          <div style={{ 
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '20px', 
            fontWeight: 500, 
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            Edit {cooler.name}
          </div>

          {/* Day Picker */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              When did you put it in?
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setStartDay('today')}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: startDay === 'today' ? 'none' : '1px solid var(--border-color)',
                  background: startDay === 'today' ? 'var(--accent)' : 'var(--card-bg)',
                  color: startDay === 'today' ? 'var(--bg-primary)' : 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Today
              </button>
              <button
                onClick={() => setStartDay('yesterday')}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: startDay === 'yesterday' ? 'none' : '1px solid var(--border-color)',
                  background: startDay === 'yesterday' ? 'var(--accent)' : 'var(--card-bg)',
                  color: startDay === 'yesterday' ? 'var(--bg-primary)' : 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Yesterday
              </button>
            </div>
          </div>

          {/* Time Picker */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              What time?
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
              {/* Hour */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setStartHour((startHour + 1) % 24)}
                  style={{
                    width: '44px',
                    height: '32px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                  }}
                >▲</button>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: 600, 
                  fontFamily: "'Playfair Display', Georgia, serif",
                  minWidth: '60px',
                  textAlign: 'center',
                }}>
                  {formatHour(startHour)}
                </div>
                <button
                  onClick={() => setStartHour((startHour - 1 + 24) % 24)}
                  style={{
                    width: '44px',
                    height: '32px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                  }}
                >▼</button>
              </div>
              
              <div style={{ fontSize: '24px', fontWeight: 600 }}>:</div>
              
              {/* Minute */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setStartMinute((startMinute + 15) % 60)}
                  style={{
                    width: '44px',
                    height: '32px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                  }}
                >▲</button>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: 600, 
                  fontFamily: "'Playfair Display', Georgia, serif",
                  minWidth: '40px',
                  textAlign: 'center',
                }}>
                  {startMinute.toString().padStart(2, '0')}
                </div>
                <button
                  onClick={() => setStartMinute((startMinute - 15 + 60) % 60)}
                  style={{
                    width: '44px',
                    height: '32px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                  }}
                >▼</button>
              </div>
            </div>
          </div>

          {/* Duration Picker */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Freeze for how long?
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setDuration(Math.max(24, duration - 1))}
                style={{
                  width: '44px',
                  height: '44px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: 'var(--text-primary)',
                }}
              >−</button>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 600,
                fontFamily: "'Playfair Display', Georgia, serif",
                minWidth: '80px',
                textAlign: 'center',
              }}>
                {duration}h
              </div>
              <button
                onClick={() => setDuration(Math.min(48, duration + 1))}
                style={{
                  width: '44px',
                  height: '44px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: 'var(--text-primary)',
                }}
              >+</button>
            </div>
            {avgTime && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '8px' }}>
                Avg perfect: {avgTime}h
              </div>
            )}
          </div>

          {/* Preview */}
          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: '14px', 
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Ready</div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>
              {formatDateTime(readyTime)}
            </div>
          </div>

          {/* Actions */}
          <button onClick={handleSave} style={{
            width: '100%',
            padding: '14px',
            border: 'none',
            background: 'var(--accent)',
            color: 'var(--bg-primary)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '8px',
          }}>
            Save Changes
          </button>
          
          <button onClick={handleCancelFreezing} style={{
            width: '100%',
            padding: '14px',
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            fontSize: '15px',
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: '8px',
          }}>
            Cancel Freezing
          </button>

          <button onClick={() => setShowEditModal(null)} style={{
            width: '100%',
            padding: '12px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Sub-tabs for Ice */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '0' }}>
        {[
          { id: 'status', label: 'Status' },
          { id: 'history', label: 'History' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: view === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: view === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'status' && <StatusView />}
      {view === 'history' && <HistoryView />}

      {showPullModal && <PullModal />}
      {showStartModal && <StartModal />}
      {showEditModal && <EditModal />}
    </div>
  );
}
