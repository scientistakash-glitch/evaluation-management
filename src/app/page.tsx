'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface LPP {
  id: string;
  ptatId: string;
  name: string;
  code: string;
}

interface PTAT {
  id: string;
  name: string;
}

interface Cycle {
  id: string;
  ptatId: string;
  lppId: string;
  academicYear: string;
  cycleNumber: number;
  status: string;
  startDate: string;
  endDate: string;
}

const FILTER_FIELDS = [
  '--None--',
  'Application Type',
  'Category',
  'Program Term Application Timeline ID',
];

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [lpps, setLpps] = useState<LPP[]>([]);
  const [ptats, setPtats] = useState<PTAT[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Modal form state
  const [selectedLppId, setSelectedLppId] = useState('');
  const [filterField, setFilterField] = useState('--None--');
  const [filterValue, setFilterValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<Cycle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [cyclesRes, lppsRes, ptatsRes] = await Promise.all([
          fetch('/api/cycles').then((r) => r.json()),
          fetch('/api/lpps').then((r) => r.json()),
          fetch('/api/ptats').then((r) => r.json()),
        ]);
        setCycles(cyclesRes);
        setLpps(lppsRes);
        setPtats(ptatsRes);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const lppMap = useMemo(() => new Map(lpps.map((l) => [l.id, l])), [lpps]);
  const ptatMap = useMemo(() => new Map(ptats.map((p) => [p.id, p])), [ptats]);

  const filteredCycles = useMemo(() => {
    if (!search.trim()) return cycles;
    const q = search.toLowerCase();
    return cycles.filter((c) => {
      const lpp = lppMap.get(c.lppId);
      const ptat = ptatMap.get(c.ptatId);
      return (
        lpp?.name.toLowerCase().includes(q) ||
        ptat?.name.toLowerCase().includes(q) ||
        c.academicYear.toLowerCase().includes(q)
      );
    });
  }, [cycles, search, lppMap, ptatMap]);

  const handleOpenModal = () => {
    setSelectedLppId('');
    setFilterField('--None--');
    setFilterValue('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedLppId) return;
    const lpp = lppMap.get(selectedLppId);
    if (!lpp) return;

    setIsSaving(true);
    try {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 180);

      const existingForPtat = cycles.filter((c) => c.ptatId === lpp.ptatId);
      const nextCycleNumber = existingForPtat.length + 1;

      const body = {
        lppId: selectedLppId,
        ptatId: lpp.ptatId,
        filterField: filterField !== '--None--' ? filterField : undefined,
        filterValue: filterValue || undefined,
        academicYear: '2024-25',
        cycleNumber: nextCycleNumber,
        status: 'Active',
        startDate: today.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };

      const res = await fetch('/api/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const newCycle = await res.json();
        setCycles((prev) => [...prev, newCycle]);
        setShowModal(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/cycles/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setCycles((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Application Evaluation Matrix</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="search-wrapper">
            <SearchIcon />
            <input
              className="search-input"
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={handleOpenModal}>
            + New Matrix for a Program
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="card">
        {isLoading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading...
          </div>
        ) : filteredCycles.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No evaluation matrices found.
          </div>
        ) : (
          <table className="table-custom">
            <thead>
              <tr>
                <th>Programs</th>
                <th>Filter Field</th>
                <th>Filter Value</th>
                <th>Evaluation Matrix</th>
                <th>Evaluation Sheet</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {filteredCycles.map((cycle) => {
                const lpp = lppMap.get(cycle.lppId);
                const ptat = ptatMap.get(cycle.ptatId);
                return (
                  <tr key={cycle.id}>
                    <td style={{ fontWeight: 500 }}>{lpp?.name ?? cycle.lppId}</td>
                    <td>{ptat?.name ?? cycle.ptatId}</td>
                    <td>{cycle.academicYear} - Cycle {cycle.cycleNumber}</td>
                    <td>
                      <button
                        className="icon-btn"
                        title="Edit evaluation matrix"
                        onClick={() => router.push(`/cycles/${cycle.id}`)}
                      >
                        <EditIcon />
                      </button>
                    </td>
                    <td>
                      <button
                        className="icon-btn"
                        title="View evaluation sheet"
                        onClick={() => router.push(`/cycles/${cycle.id}`)}
                      >
                        <EyeIcon />
                      </button>
                    </td>
                    <td>
                      <button
                        className="icon-btn"
                        title="Delete"
                        onClick={() => setDeleteTarget(cycle)}
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* New Matrix Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Matrix for a Program</h2>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Select Program</label>
                <select
                  className="form-select"
                  value={selectedLppId}
                  onChange={(e) => setSelectedLppId(e.target.value)}
                >
                  <option value="">-- Select a Program --</option>
                  {lpps.map((lpp) => (
                    <option key={lpp.id} value={lpp.id}>
                      {lpp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Select Filter Field</label>
                <select
                  className="form-select"
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                >
                  {FILTER_FIELDS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Filter Value</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Enter filter value here..."
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-pill-outline" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                className="btn-pill-filled"
                onClick={handleSave}
                disabled={!selectedLppId || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ width: '420px' }}>
            <div className="modal-header">
              <h2>Delete Evaluation Matrix</h2>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                Are you sure you want to delete this evaluation matrix? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-pill-outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                className="btn-pill-filled"
                style={{ background: '#C41010' }}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
