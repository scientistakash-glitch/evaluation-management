'use client';

import React, { useState } from 'react';
import { CriteriaSet } from '@/types';
import CriteriaSetForm from './CriteriaSetForm';
import ConfirmModal from '../common/ConfirmModal';
import { useToast } from '../common/ToastContext';
import Link from 'next/link';

interface CriteriaSetListProps {
  initialSets: CriteriaSet[];
}

export default function CriteriaSetList({ initialSets }: CriteriaSetListProps) {
  const { showToast } = useToast();
  const [sets, setSets] = useState<CriteriaSet[]>(initialSets);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editData, setEditData] = useState<CriteriaSet | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CriteriaSet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSuccess = (cs: CriteriaSet) => {
    setSets((prev) => {
      const index = prev.findIndex((s) => s.id === cs.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = cs;
        return updated;
      }
      return [...prev, cs];
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/criteria-sets/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        showToast('Failed to delete criteria set', 'error');
        return;
      }
      setSets((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      showToast('Criteria set deleted', 'success');
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
          <div style={{ fontSize: '12px', color: '#706e6b', marginBottom: '4px' }}>Evaluation Criteria</div>
          <h1 className="page-title">Criteria Sets</h1>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditData(null);
            setIsFormOpen(true);
          }}
        >
          New Criteria Set
        </button>
      </div>

      <div style={{ marginTop: '16px' }}>
        <table className="table-custom">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Criteria Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sets.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#706e6b', padding: '32px' }}>
                  No criteria sets yet. Create one to get started.
                </td>
              </tr>
            )}
            {sets.map((cs) => (
              <tr key={cs.id}>
                <td>
                  <Link href={`/criteria-sets/${cs.id}`} style={{ color: '#0070d2', textDecoration: 'none' }}>
                    {cs.name}
                  </Link>
                </td>
                <td style={{ color: '#706e6b', fontSize: '13px' }}>{cs.description || '—'}</td>
                <td>{cs.criteria.length}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="icon-btn"
                      title="Edit"
                      onClick={() => {
                        setEditData(cs);
                        setIsFormOpen(true);
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      className="icon-btn"
                      title="Delete"
                      onClick={() => setDeleteTarget(cs)}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CriteriaSetForm
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
        heading="Delete Criteria Set"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
