'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CycleTimeline {
  startDate: string;
  offerReleaseDate: string;
  acceptanceDeadline: string;
  paymentDeadline: string;
  closingDate: string;
}

interface Cycle {
  id: string;
  name: string;
  number: number;
  academicYear: string;
  ptatId: string;
  lppIds: string[];
  timeline: CycleTimeline;
  status: 'Planned' | 'Active' | 'Closed' | 'Approved';
  evaluationStrategy: 'single' | 'program-wise' | null;
}

interface PTAT {
  id: string;
  name: string;
}

function statusBadge(status: string) {
  const classes: Record<string, string> = {
    Planned: 'badge badge-warning',
    Active: 'badge badge-success',
    Closed: 'badge badge-gray',
    Approved: 'badge badge-maroon',
  };
  return <span className={classes[status] ?? 'badge badge-default'}>{status}</span>;
}

function formatDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default function CyclesPage() {
  const router = useRouter();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [ptats, setPtats] = useState<PTAT[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [cyclesRes, ptatsRes] = await Promise.all([
          fetch('/api/cycles').then((r) => r.json()),
          fetch('/api/ptats').then((r) => r.json()),
        ]);
        setCycles(Array.isArray(cyclesRes) ? cyclesRes : []);
        setPtats(Array.isArray(ptatsRes) ? ptatsRes : []);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const ptatMap = new Map(ptats.map((p) => [p.id, p]));

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Admissions Cycles</h1>
        <button className="btn-primary" onClick={() => router.push('/create-cycle')}>
          + Create New Cycle
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          Loading cycles...
        </div>
      ) : cycles.length === 0 ? (
        <div
          style={{
            padding: '60px',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            background: 'white',
            borderRadius: '14px',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📋</div>
          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
            No cycles yet
          </div>
          <div style={{ fontSize: '14px', marginBottom: '24px' }}>
            Create your first admissions cycle to get started.
          </div>
          <button className="btn-primary" onClick={() => router.push('/create-cycle')}>
            + Create New Cycle
          </button>
        </div>
      ) : (
        <div className="cycles-grid">
          {cycles.map((cycle) => {
            const ptat = ptatMap.get(cycle.ptatId);
            return (
              <div
                key={cycle.id}
                className="cycle-card"
                onClick={() => router.push(`/cycle/${cycle.id}/evaluation`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', flex: 1 }}>
                    {cycle.name}
                  </div>
                  {statusBadge(cycle.status)}
                </div>

                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>{ptat?.name ?? cycle.ptatId}</strong>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Academic Year: <strong style={{ color: 'var(--color-text)' }}>{cycle.academicYear}</strong>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Cycle #<strong style={{ color: 'var(--color-text)' }}>{cycle.number}</strong>
                  {cycle.evaluationStrategy && (
                    <span style={{ marginLeft: '10px' }}>
                      <span className="badge badge-default" style={{ fontSize: '11px' }}>
                        {cycle.evaluationStrategy === 'single' ? 'Single Eval' : 'Program-wise'}
                      </span>
                    </span>
                  )}
                </div>

                {cycle.timeline && (
                  <div
                    style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--color-border)',
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      Start: <strong>{formatDate(cycle.timeline.startDate)}</strong>
                    </span>
                    <span>
                      Close: <strong>{formatDate(cycle.timeline.closingDate)}</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
