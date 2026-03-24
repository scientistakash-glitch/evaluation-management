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

interface PTAT { id: string; name: string; }
interface LPP  { id: string; ptatId: string; totalSeats: number; }

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
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function getOfferFigures(totalSeats: number, cycleNumber: number) {
  if (cycleNumber <= 1) return { released: 0, accepted: 0, withdrawn: 0, pending: 0 };
  const released  = Math.round(totalSeats * 0.85);
  const accepted  = Math.round(released * 0.70);
  const withdrawn = Math.round(released * 0.05);
  const pending   = released - accepted - withdrawn;
  return { released, accepted, withdrawn, pending };
}

export default function CyclesPage() {
  const router = useRouter();
  const [cycles, setCycles]   = useState<Cycle[]>([]);
  const [ptats, setPtats]     = useState<PTAT[]>([]);
  const [lpps, setLpps]       = useState<LPP[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [cyclesRes, ptatsRes, lppsRes] = await Promise.all([
          fetch('/api/cycles').then((r) => r.json()),
          fetch('/api/ptats').then((r) => r.json()),
          fetch('/api/lpps').then((r) => r.json()),
        ]);
        setCycles(Array.isArray(cyclesRes) ? cyclesRes : []);
        setPtats(Array.isArray(ptatsRes) ? ptatsRes : []);
        setLpps(Array.isArray(lppsRes) ? lppsRes : []);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const ptatMap = new Map(ptats.map((p) => [p.id, p]));
  const lppTotalSeats = new Map(lpps.map((l) => [l.id, l.totalSeats]));

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
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'white', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📋</div>
          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>No cycles yet</div>
          <div style={{ fontSize: '14px', marginBottom: '24px' }}>Create your first admissions cycle to get started.</div>
          <button className="btn-primary" onClick={() => router.push('/create-cycle')}>+ Create New Cycle</button>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: '1000px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Cycle</th>
                  <th>Program Group</th>
                  <th>Year</th>
                  <th>#</th>
                  <th>Strategy</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>Offer Release</th>
                  <th>Closing Date</th>
                  <th style={{ color: 'var(--color-text-muted)' }}>Released</th>
                  <th style={{ color: '#276749' }}>Accepted</th>
                  <th style={{ color: '#1d4ed8' }}>Pending</th>
                  <th style={{ color: '#92400e' }}>Withdrawn</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle) => {
                  const ptat = ptatMap.get(cycle.ptatId);
                  const totalSeats = (cycle.lppIds ?? []).reduce((s, id) => s + (lppTotalSeats.get(id) ?? 0), 0);
                  const offers = getOfferFigures(totalSeats, cycle.number);
                  return (
                    <tr
                      key={cycle.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/cycle/${cycle.id}/evaluation`)}
                    >
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{cycle.name}</td>
                      <td style={{ fontSize: '13px' }}>{ptat?.name ?? cycle.ptatId}</td>
                      <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{cycle.academicYear}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-default" style={{ fontSize: '11px' }}>#{cycle.number}</span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {cycle.evaluationStrategy === 'single' ? 'Single' : cycle.evaluationStrategy === 'program-wise' ? 'Program-wise' : '—'}
                      </td>
                      <td>{statusBadge(cycle.status)}</td>
                      <td style={{ fontSize: '13px' }}>{formatDate(cycle.timeline?.startDate)}</td>
                      <td style={{ fontSize: '13px' }}>{formatDate(cycle.timeline?.offerReleaseDate)}</td>
                      <td style={{ fontSize: '13px' }}>{formatDate(cycle.timeline?.closingDate)}</td>
                      <td style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>{offers.released}</td>
                      <td style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#276749' }}>{offers.accepted}</td>
                      <td style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#1d4ed8' }}>{offers.pending}</td>
                      <td style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#92400e' }}>{offers.withdrawn}</td>
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
