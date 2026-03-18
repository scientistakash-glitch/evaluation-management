'use client';

import React, { useState } from 'react';
import { PTAT } from '@/types';
import PtatForm from './PtatForm';
import ConfirmModal from '../common/ConfirmModal';
import { useToast } from '../common/ToastContext';
import Link from 'next/link';

interface PtatListProps {
  initialPtats: PTAT[];
}

export default function PtatList({ initialPtats }: PtatListProps) {
  const { showToast } = useToast();
  const [ptats, setPtats] = useState<PTAT[]>(initialPtats);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editData, setEditData] = useState<PTAT | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PTAT | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const tableItems = ptats.map((p) => ({
    ...p,
    createdDate: new Date(p.createdAt).toLocaleDateString(),
  }));

  const handleSuccess = (ptat: PTAT) => {
    setPtats((prev) => {
      const index = prev.findIndex((p) => p.id === ptat.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = ptat;
        return updated;
      }
      return [...prev, ptat];
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/ptats/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        showToast('Failed to delete PTAT', 'error');
        return;
      }
      setPtats((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showToast('PTAT deleted successfully', 'success');
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
          <div style={{ fontSize: '12px', color: '#706e6b', marginBottom: '4px' }}>Program Type &amp; Academic Track</div>
          <h1 className="page-title">PTATs</h1>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditData(null);
            setIsFormOpen(true);
          }}
        >
          New PTAT
        </button>
      </div>

      <div style={{ marginTop: '16px' }}>
        <table className="table-custom">
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Description</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableItems.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#706e6b', padding: '32px' }}>
                  No PTATs found. Create one to get started.
                </td>
              </tr>
            )}
            {tableItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link href={`/ptats/${item.id}`} style={{ color: '#0070d2', textDecoration: 'none' }}>
                    {item.name}
                  </Link>
                </td>
                <td>{item.code}</td>
                <td>{item.description || '—'}</td>
                <td>{item.createdDate}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => {
                        const ptat = ptats.find((p) => p.id === item.id);
                        if (ptat) { setEditData(ptat); setIsFormOpen(true); }
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px', color: '#ba0517', borderColor: '#ba0517' }}
                      onClick={() => {
                        const ptat = ptats.find((p) => p.id === item.id);
                        if (ptat) setDeleteTarget(ptat);
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

      <PtatForm
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
        heading="Delete PTAT"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
