'use client';

import React, { useState } from 'react';
import { Cycle, PTAT, LPP } from '@/types';
import CycleForm from './CycleForm';
import ConfirmModal from '../common/ConfirmModal';
import StatusBadge from '../common/StatusBadge';
import { useToast } from '../common/ToastContext';
import Link from 'next/link';

interface CycleListProps {
  initialCycles: Cycle[];
  ptats: PTAT[];
  lpps: LPP[];
}

export default function CycleList({ initialCycles, ptats, lpps }: CycleListProps) {
  const { showToast } = useToast();
  const [cycles, setCycles] = useState<Cycle[]>(initialCycles);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editData, setEditData] = useState<Cycle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cycle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const ptatMap = new Map(ptats.map((p) => [p.id, p]));
  const lppMap = new Map(lpps.map((l) => [l.id, l]));

  const tableItems = cycles.map((c) => ({
    ...c,
    ptatName: ptatMap.get(c.ptatId)?.name ?? c.ptatId,
    lppName: lppMap.get(c.lppId)?.name ?? c.lppId,
    dateRange: `${c.startDate} – ${c.endDate}`,
  }));

  const handleSuccess = (cycle: Cycle) => {
    setCycles((prev) => {
      const index = prev.findIndex((c) => c.id === cycle.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = cycle;
        return updated;
      }
      return [...prev, cycle];
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/cycles/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        showToast('Failed to delete cycle', 'error');
        return;
      }
      setCycles((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      showToast('Cycle deleted', 'success');
      setDeleteTarget(null);
    } catch {
      showToast('An error occurred', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: '12px', color: '#706e6b', marginBottom: '4px' }}>Evaluation Cycles</div>
          <h1 className="page-title">Cycles</h1>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditData(null);
            setIsFormOpen(true);
          }}
        >
          New Cycle
        </button>
      </div>

      <div style={{ marginTop: '16px' }}>
        <table className="table-custom">
          <thead>
            <tr>
              <th>Academic Year</th>
              <th>Cycle #</th>
              <th>PTAT</th>
              <th>Program</th>
              <th>Date Range</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableItems.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#706e6b', padding: '32px' }}>
                  No cycles found. Create one to get started.
                </td>
              </tr>
            )}
            {tableItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link href={`/cycles/${item.id}`} style={{ color: '#0070d2', textDecoration: 'none' }}>
                    {item.academicYear}
                  </Link>
                </td>
                <td>{item.cycleNumber}</td>
                <td>{item.ptatName}</td>
                <td>{item.lppName}</td>
                <td>{item.dateRange}</td>
                <td><StatusBadge status={item.status} /></td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => { window.location.href = `/cycles/${item.id}`; }}
                    >
                      View
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => {
                        const cycle = cycles.find((c) => c.id === item.id);
                        if (cycle) { setEditData(cycle); setIsFormOpen(true); }
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px', color: '#ba0517', borderColor: '#ba0517' }}
                      onClick={() => {
                        const cycle = cycles.find((c) => c.id === item.id);
                        if (cycle) setDeleteTarget(cycle);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CycleForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditData(null);
        }}
        onSuccess={handleSuccess}
        editData={editData}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        heading="Delete Cycle"
        message={`Are you sure you want to delete cycle ${deleteTarget?.cycleNumber} (${deleteTarget?.academicYear})?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
