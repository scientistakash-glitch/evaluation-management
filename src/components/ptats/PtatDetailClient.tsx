'use client';

import React, { useState } from 'react';
import { PTAT, LPP } from '@/types';
import LppForm from '../lpps/LppForm';
import ConfirmModal from '../common/ConfirmModal';
import { useToast } from '../common/ToastContext';
import Link from 'next/link';

interface Props {
  ptat: PTAT;
  initialLpps: LPP[];
}

export default function PtatDetailClient({ ptat, initialLpps }: Props) {
  const { showToast } = useToast();
  const [lpps, setLpps] = useState<LPP[]>(initialLpps);
  const [isLppFormOpen, setIsLppFormOpen] = useState(false);
  const [editLpp, setEditLpp] = useState<LPP | null>(null);
  const [deleteLppTarget, setDeleteLppTarget] = useState<LPP | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const tableItems = lpps.map((l) => ({
    ...l,
    createdDate: new Date(l.createdAt).toLocaleDateString(),
    durationYears: `${l.duration} year${l.duration !== 1 ? 's' : ''}`,
  }));

  const handleLppSuccess = (lpp: LPP) => {
    setLpps((prev) => {
      const index = prev.findIndex((l) => l.id === lpp.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = lpp;
        return updated;
      }
      return [...prev, lpp];
    });
  };

  const handleDeleteLpp = async () => {
    if (!deleteLppTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/lpps/${deleteLppTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        showToast('Failed to delete LPP', 'error');
        return;
      }
      setLpps((prev) => prev.filter((l) => l.id !== deleteLppTarget.id));
      showToast('LPP deleted successfully', 'success');
      setDeleteLppTarget(null);
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
          <div style={{ fontSize: '12px', color: '#706e6b', marginBottom: '4px' }}>PTAT Detail</div>
          <h1 className="page-title">{ptat.name}</h1>
        </div>
        <Link href="/ptats">
          <button className="btn-secondary">Back to PTATs</button>
        </Link>
      </div>

      <div className="card" style={{ marginTop: '16px', padding: '24px' }}>
        <h3 style={{ fontWeight: 700, color: '#3e3e3c', marginBottom: '16px' }}>PTAT Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#706e6b', marginBottom: '4px' }}>Name</div>
            <div style={{ fontWeight: 500 }}>{ptat.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#706e6b', marginBottom: '4px' }}>Code</div>
            <div style={{ fontWeight: 500 }}>{ptat.code}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#706e6b', marginBottom: '4px' }}>Description</div>
            <div style={{ fontWeight: 500 }}>{ptat.description || '—'}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontWeight: 700, color: '#3e3e3c', margin: 0 }}>
            Learning Programs ({lpps.length})
          </h3>
          <button
            className="btn-primary"
            onClick={() => {
              setEditLpp(null);
              setIsLppFormOpen(true);
            }}
          >
            Add LPP
          </button>
        </div>

        <table className="table-custom">
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Duration</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableItems.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#706e6b', padding: '32px' }}>
                  No learning programs found.
                </td>
              </tr>
            )}
            {tableItems.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.code}</td>
                <td>{item.durationYears}</td>
                <td>{item.createdDate}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => {
                        const lpp = lpps.find((l) => l.id === item.id);
                        if (lpp) { setEditLpp(lpp); setIsLppFormOpen(true); }
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px', color: '#ba0517', borderColor: '#ba0517' }}
                      onClick={() => {
                        const lpp = lpps.find((l) => l.id === item.id);
                        if (lpp) setDeleteLppTarget(lpp);
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

      <LppForm
        isOpen={isLppFormOpen}
        onClose={() => {
          setIsLppFormOpen(false);
          setEditLpp(null);
        }}
        onSuccess={handleLppSuccess}
        editData={editLpp}
        defaultPtatId={ptat.id}
      />

      <ConfirmModal
        isOpen={!!deleteLppTarget}
        heading="Delete LPP"
        message={`Are you sure you want to delete "${deleteLppTarget?.name}"?`}
        onConfirm={handleDeleteLpp}
        onCancel={() => setDeleteLppTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
