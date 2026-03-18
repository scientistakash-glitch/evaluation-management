'use client';

import React, { useState } from 'react';
import PageHeader from '@salesforce/design-system-react/components/page-header';
import Button from '@salesforce/design-system-react/components/button';
import Card from '@salesforce/design-system-react/components/card';
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
      <PageHeader
        label="Evaluation Criteria"
        title="Criteria Sets"
        variant="object-home"
        onRenderActions={() => (
          <Button
            label="New Criteria Set"
            variant="brand"
            onClick={() => {
              setEditData(null);
              setIsFormOpen(true);
            }}
          />
        )}
      />

      <div className="slds-grid slds-wrap slds-gutters slds-m-top_medium">
        {sets.length === 0 && (
          <div className="slds-col slds-size_1-of-1" style={{ textAlign: 'center', padding: '40px', color: '#706e6b' }}>
            No criteria sets yet. Create one to get started.
          </div>
        )}
        {sets.map((cs) => (
          <div key={cs.id} className="slds-col slds-size_1-of-2 slds-m-bottom_medium">
            <Card
              heading={cs.name}
              headerActions={
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    label="Edit"
                    variant="icon"
                    onClick={() => {
                      setEditData(cs);
                      setIsFormOpen(true);
                    }}
                  />
                  <Button
                    label="Delete"
                    variant="icon"
                    onClick={() => setDeleteTarget(cs)}
                  />
                </div>
              }
            >
              <div className="slds-p-around_medium">
                {cs.description && (
                  <p style={{ color: '#706e6b', marginBottom: '12px', fontSize: '13px' }}>{cs.description}</p>
                )}
                <div>
                  {cs.criteria.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 0',
                        borderBottom: '1px solid #f3f3f3',
                      }}
                    >
                      <span style={{ fontSize: '13px' }}>{c.name}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {c.sourceField && (
                          <span style={{ fontSize: '11px', color: '#706e6b', background: '#f3f3f3', padding: '2px 6px', borderRadius: '3px' }}>
                            {c.sourceField}
                          </span>
                        )}
                        <span style={{ fontWeight: 700, color: '#0070d2', fontSize: '14px' }}>{c.weightage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '12px' }}>
                  <Link href={`/criteria-sets/${cs.id}`} style={{ color: '#0070d2', fontSize: '13px' }}>
                    View Details →
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        ))}
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
