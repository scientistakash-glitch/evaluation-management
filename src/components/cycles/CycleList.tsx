'use client';

import React, { useState } from 'react';
import DataTable from '@salesforce/design-system-react/components/data-table';
import DataTableColumn from '@salesforce/design-system-react/components/data-table/column';
import DataTableCell from '@salesforce/design-system-react/components/data-table/cell';
import DataTableRowActions from '@salesforce/design-system-react/components/data-table/row-actions';
import PageHeader from '@salesforce/design-system-react/components/page-header';
import Button from '@salesforce/design-system-react/components/button';
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

const ROW_ACTIONS = [
  { label: 'View', value: 'view' },
  { label: 'Edit', value: 'edit' },
  { label: 'Delete', value: 'delete' },
];

const AcademicYearCell = ({ item, children, ...props }: any) => (
  <DataTableCell {...props} item={item}>
    <Link href={`/cycles/${item?.id}`} style={{ color: '#0070d2', textDecoration: 'none' }}>
      {children}
    </Link>
  </DataTableCell>
);
AcademicYearCell.displayName = DataTableCell.displayName;

const StatusCell = ({ item, ...props }: any) => (
  <DataTableCell {...props} item={item}>
    <StatusBadge status={item?.status ?? ''} />
  </DataTableCell>
);
StatusCell.displayName = DataTableCell.displayName;

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

  const handleRowAction = (item: any, action: { value: string }) => {
    const cycle = cycles.find((c) => c.id === item.id);
    if (!cycle) return;
    if (action.value === 'view') {
      window.location.href = `/cycles/${cycle.id}`;
    } else if (action.value === 'edit') {
      setEditData(cycle);
      setIsFormOpen(true);
    } else if (action.value === 'delete') {
      setDeleteTarget(cycle);
    }
  };

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
      <PageHeader
        label="Evaluation Cycles"
        title="Cycles"
        variant="object-home"
        onRenderActions={() => (
          <Button
            label="New Cycle"
            variant="brand"
            onClick={() => {
              setEditData(null);
              setIsFormOpen(true);
            }}
          />
        )}
      />
      <div className="slds-card slds-m-top_medium">
        <DataTable items={tableItems} id="cycles-table">
          <DataTableColumn label="Academic Year" property="academicYear" primaryColumn>
            <AcademicYearCell />
          </DataTableColumn>
          <DataTableColumn label="Cycle #" property="cycleNumber" />
          <DataTableColumn label="PTAT" property="ptatName" />
          <DataTableColumn label="Program" property="lppName" />
          <DataTableColumn label="Date Range" property="dateRange" />
          <DataTableColumn label="Status" property="status">
            <StatusCell />
          </DataTableColumn>
          <DataTableRowActions options={ROW_ACTIONS} onAction={handleRowAction} />
        </DataTable>
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
