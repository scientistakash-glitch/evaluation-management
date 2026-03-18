'use client';

import React, { useState } from 'react';
import PageHeader from '@salesforce/design-system-react/components/page-header';
import Card from '@salesforce/design-system-react/components/card';
import DataTable from '@salesforce/design-system-react/components/data-table';
import DataTableColumn from '@salesforce/design-system-react/components/data-table/column';
import DataTableRowActions from '@salesforce/design-system-react/components/data-table/row-actions';
import Button from '@salesforce/design-system-react/components/button';
import { PTAT, LPP } from '@/types';
import LppForm from '../lpps/LppForm';
import ConfirmModal from '../common/ConfirmModal';
import { useToast } from '../common/ToastContext';
import Link from 'next/link';

interface Props {
  ptat: PTAT;
  initialLpps: LPP[];
}

const LPP_ROW_ACTIONS = [
  { label: 'Edit', value: 'edit' },
  { label: 'Delete', value: 'delete' },
];

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

  const handleLppRowAction = (item: any, action: { value: string }) => {
    const lpp = lpps.find((l) => l.id === item.id);
    if (!lpp) return;
    if (action.value === 'edit') {
      setEditLpp(lpp);
      setIsLppFormOpen(true);
    } else if (action.value === 'delete') {
      setDeleteLppTarget(lpp);
    }
  };

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
      <PageHeader
        label="PTAT Detail"
        title={ptat.name}
        variant="record-home"
        onRenderActions={() => (
          <Link href="/ptats">
            <Button label="Back to PTATs" />
          </Link>
        )}
      />

      <Card
        heading="PTAT Information"
        className="slds-m-top_medium"
      >
        <div className="slds-p-around_medium slds-grid slds-wrap slds-gutters">
          <div className="slds-col slds-size_1-of-3">
            <div className="slds-form-element">
              <label className="slds-form-element__label">Name</label>
              <div className="slds-form-element__control">
                <span className="slds-form-element__static">{ptat.name}</span>
              </div>
            </div>
          </div>
          <div className="slds-col slds-size_1-of-3">
            <div className="slds-form-element">
              <label className="slds-form-element__label">Code</label>
              <div className="slds-form-element__control">
                <span className="slds-form-element__static">{ptat.code}</span>
              </div>
            </div>
          </div>
          <div className="slds-col slds-size_1-of-3">
            <div className="slds-form-element">
              <label className="slds-form-element__label">Description</label>
              <div className="slds-form-element__control">
                <span className="slds-form-element__static">{ptat.description || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card
        heading={`Learning Programs (${lpps.length})`}
        className="slds-m-top_medium"
        headerActions={
          <Button
            label="Add LPP"
            variant="brand"
            onClick={() => {
              setEditLpp(null);
              setIsLppFormOpen(true);
            }}
          />
        }
      >
        <DataTable items={tableItems} id="lpps-table">
          <DataTableColumn label="Name" property="name" primaryColumn />
          <DataTableColumn label="Code" property="code" />
          <DataTableColumn label="Duration" property="durationYears" />
          <DataTableColumn label="Created Date" property="createdDate" />
          <DataTableRowActions options={LPP_ROW_ACTIONS} onAction={handleLppRowAction} />
        </DataTable>
      </Card>

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
