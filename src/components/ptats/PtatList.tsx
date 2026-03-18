'use client';

import React, { useState } from 'react';
import DataTable from '@salesforce/design-system-react/components/data-table';
import DataTableColumn from '@salesforce/design-system-react/components/data-table/column';
import DataTableCell from '@salesforce/design-system-react/components/data-table/cell';
import DataTableRowActions from '@salesforce/design-system-react/components/data-table/row-actions';
import PageHeader from '@salesforce/design-system-react/components/page-header';
import Button from '@salesforce/design-system-react/components/button';
import { PTAT } from '@/types';
import PtatForm from './PtatForm';
import ConfirmModal from '../common/ConfirmModal';
import { useToast } from '../common/ToastContext';
import Link from 'next/link';

interface PtatListProps {
  initialPtats: PTAT[];
}

const ROW_ACTIONS = [
  { label: 'Edit', value: 'edit' },
  { label: 'Delete', value: 'delete' },
];

const NameCell = ({ item, children, ...props }: any) => (
  <DataTableCell {...props} item={item}>
    <Link href={`/ptats/${item?.id}`} style={{ color: '#0070d2', textDecoration: 'none' }}>
      {children}
    </Link>
  </DataTableCell>
);
NameCell.displayName = DataTableCell.displayName;

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

  const handleRowAction = (item: any, action: { value: string }) => {
    const ptat = ptats.find((p) => p.id === item.id);
    if (!ptat) return;
    if (action.value === 'edit') {
      setEditData(ptat);
      setIsFormOpen(true);
    } else if (action.value === 'delete') {
      setDeleteTarget(ptat);
    }
  };

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
      <PageHeader
        label="Program Type & Academic Track"
        title="PTATs"
        variant="object-home"
        onRenderActions={() => (
          <Button
            label="New PTAT"
            variant="brand"
            onClick={() => {
              setEditData(null);
              setIsFormOpen(true);
            }}
          />
        )}
      />
      <div className="slds-card slds-m-top_medium">
        <DataTable items={tableItems} id="ptats-table">
          <DataTableColumn label="Name" property="name" primaryColumn>
            <NameCell />
          </DataTableColumn>
          <DataTableColumn label="Code" property="code" />
          <DataTableColumn label="Description" property="description" />
          <DataTableColumn label="Created Date" property="createdDate" />
          <DataTableRowActions
            options={ROW_ACTIONS}
            onAction={handleRowAction}
          />
        </DataTable>
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
