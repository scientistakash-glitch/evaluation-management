'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Cycle {
  id: string;
  name: string;
  number: number;
  academicYear: string;
  ptatId: string;
  lppIds: string[];
  status: 'Planned' | 'Active' | 'Closed' | 'Approved' | 'Released';
  evaluationStrategy: 'single' | 'program-wise' | null;
}

interface PTAT { id: string; name: string; }
interface LPP  { id: string; ptatId: string; name: string; totalSeats: number; }

type DisplayStatus = 'Draft' | 'Approval Pending' | 'Review Needed' | 'Approved' | 'Released';

function getDisplayStatus(cycle: Cycle, hasOffers: boolean): DisplayStatus {
  switch (cycle.status) {
    case 'Released': return 'Released';
    case 'Active':   return 'Approval Pending';
    case 'Closed':   return 'Review Needed';
    case 'Approved': return 'Approved';
    case 'Planned':  return hasOffers ? 'Released' : 'Draft';
    default:         return 'Draft';
  }
}

const STATUS_BADGE: Record<DisplayStatus, string> = {
  'Draft':            'badge-warning',
  'Approval Pending': 'badge-default',
  'Review Needed':    'badge-warning',
  'Approved':         'badge-maroon',
  'Released':         'badge-success',
};

export default function CyclesPage() {
  const router = useRouter();
  const [cycles, setCycles]   = useState<Cycle[]>([]);
  const [ptats, setPtats]     = useState<PTAT[]>([]);
  const [lpps, setLpps]       = useState<LPP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offerOverrides, setOfferOverrides] = useState<Record<string, { released: number; accepted: number; pending: number; withdrawn: number }>>({});
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [cyclesRes, ptatsRes, lppsRes] = await Promise.all([
          fetch('/api/cycles').then((r) => r.json()),
          fetch('/api/ptats').then((r) => r.json()),
          fetch('/api/lpps').then((r) => r.json()),
        ]);
        const cyclesList: Cycle[] = Array.isArray(cyclesRes) ? cyclesRes : [];
        setCycles(cyclesList);
        setPtats(Array.isArray(ptatsRes) ? ptatsRes : []);
        setLpps(Array.isArray(lppsRes) ? lppsRes : []);

        // Load offer data from server for each cycle
        if (cyclesList.length > 0) {
          const offerPromises = cyclesList.map((c) =>
            fetch(`/api/cycles/${c.id}/offer-release`).then((r) => r.ok ? r.json() : null).catch(() => null)
          );
          const offerResults = await Promise.all(offerPromises);
          const overrides: Record<string, { released: number; accepted: number; pending: number; withdrawn: number }> = {};
          offerResults.forEach((data, i) => {
            if (data?.summary) overrides[cyclesList[i].id] = data.summary;
          });
          setOfferOverrides(overrides);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
    setHasDraft(!!localStorage.getItem('create-cycle-draft'));
  }, []);

  const ptatMap = new Map(ptats.map((p) => [p.id, p]));
  const lppMap  = new Map(lpps.map((l) => [l.id, l]));

  function getLppNames(cycle: Cycle): string {
    const names = (cycle.lppIds ?? []).map((id) => lppMap.get(id)?.name).filter(Boolean);
    return names.length > 0 ? names.join(' · ') : '—';
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Admissions Cycles</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px', color: 'var(--color-text-muted)' }}
            onClick={async () => {
              if (!confirm('Reset all data and start fresh?')) return;
              await fetch('/api/reset', { method: 'POST' });
              localStorage.removeItem('create-cycle-draft');
              window.location.reload();
            }}
          >
            Reset Demo
          </button>
          <button className="btn-primary" onClick={() => router.push('/create-cycle')}>
            + Create New Cycle
          </button>
        </div>
      </div>

      {/* Draft in progress banner */}
      {hasDraft && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 18px', marginBottom: '16px',
          background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px',
          fontSize: '14px', color: '#92400e',
        }}>
          <span style={{ fontSize: '18px' }}>◐</span>
          <span><strong>Draft cycle in progress</strong> — you have an unsaved cycle draft.</span>
          <button
            className="btn-primary"
            style={{ marginLeft: 'auto', fontSize: '13px', padding: '6px 16px' }}
            onClick={() => router.push('/create-cycle')}
          >
            Resume →
          </button>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          Loading cycles...
        </div>
      ) : cycles.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'white', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📋</div>
          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>No cycles yet</div>
          <div style={{ fontSize: '14px', marginBottom: '24px' }}>Create your first admissions cycle to get started.</div>
          <button className="btn-primary" onClick={() => router.push('/create-cycle')}>+ Create New Cycle</button>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: '800px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Program Group</th>
                  <th style={{ textAlign: 'left' }}>Program Plan</th>
                  <th>Cycle Status</th>
                  <th style={{ color: 'var(--color-text-muted)' }}>Offers Released</th>
                  <th style={{ color: '#276749' }}>Committed</th>
                  <th style={{ color: '#92400e' }}>Withdrawn</th>
                  <th style={{ color: '#1d4ed8' }}>Pending Acceptance</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle) => {
                  const ptat = ptatMap.get(cycle.ptatId);
                  const offers = offerOverrides[cycle.id];
                  const displayStatus = getDisplayStatus(cycle, !!offers);
                  return (
                    <tr
                      key={cycle.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/cycle/${cycle.id}/view`)}
                    >
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '14px' }}>{ptat?.name ?? cycle.ptatId}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{cycle.academicYear} · #{cycle.number}</div>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--color-text)' }}>{getLppNames(cycle)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${STATUS_BADGE[displayStatus]}`}>{displayStatus}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>{offers?.released ?? 0}</td>
                      <td style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#276749' }}>{offers?.accepted ?? 0}</td>
                      <td style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#92400e' }}>{offers?.withdrawn ?? 0}</td>
                      <td style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#1d4ed8' }}>{offers?.pending ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
