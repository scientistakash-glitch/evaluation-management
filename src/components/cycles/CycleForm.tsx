'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@salesforce/design-system-react/components/modal';
import Input from '@salesforce/design-system-react/components/input';
import Button from '@salesforce/design-system-react/components/button';
import Combobox from '@salesforce/design-system-react/components/combobox';
import { Cycle, CycleStatus, PTAT, LPP } from '@/types';
import { useToast } from '../common/ToastContext';

interface CycleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cycle: Cycle) => void;
  editData?: Cycle | null;
}

const STATUS_OPTIONS = [
  { id: 'Planned', label: 'Planned' },
  { id: 'Active', label: 'Active' },
  { id: 'Closed', label: 'Closed' },
];

export default function CycleForm({ isOpen, onClose, onSuccess, editData }: CycleFormProps) {
  const { showToast } = useToast();
  const [ptats, setPtats] = useState<PTAT[]>([]);
  const [lpps, setLpps] = useState<LPP[]>([]);
  const [ptatId, setPtatId] = useState('');
  const [ptatSelection, setPtatSelection] = useState<any[]>([]);
  const [lppId, setLppId] = useState('');
  const [lppSelection, setLppSelection] = useState<any[]>([]);
  const [statusSelection, setStatusSelection] = useState<any[]>([{ id: 'Planned', label: 'Planned' }]);
  const [academicYear, setAcademicYear] = useState('');
  const [cycleNumber, setCycleNumber] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/ptats').then((r) => r.json()).then((data) => setPtats(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (ptatId) {
      fetch(`/api/lpps?ptatId=${ptatId}`)
        .then((r) => r.json())
        .then((data) => setLpps(data))
        .catch(() => {});
    } else {
      setLpps([]);
    }
  }, [ptatId]);

  useEffect(() => {
    if (editData) {
      setPtatId(editData.ptatId);
      setLppId(editData.lppId);
      setAcademicYear(editData.academicYear);
      setCycleNumber(String(editData.cycleNumber));
      setStartDate(editData.startDate);
      setEndDate(editData.endDate);
      setStatusSelection([{ id: editData.status, label: editData.status }]);
    } else {
      setPtatId('');
      setPtatSelection([]);
      setLppId('');
      setLppSelection([]);
      setAcademicYear('');
      setCycleNumber('1');
      setStartDate('');
      setEndDate('');
      setStatusSelection([{ id: 'Planned', label: 'Planned' }]);
    }
    setErrors({});
  }, [editData, isOpen]);

  useEffect(() => {
    if (editData && ptats.length > 0) {
      const p = ptats.find((pt) => pt.id === editData.ptatId);
      if (p) setPtatSelection([{ id: p.id, label: p.name }]);
    }
  }, [editData, ptats]);

  useEffect(() => {
    if (editData && lpps.length > 0) {
      const l = lpps.find((lp) => lp.id === editData.lppId);
      if (l) setLppSelection([{ id: l.id, label: l.name }]);
    }
  }, [editData, lpps]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!ptatId) newErrors.ptatId = 'PTAT is required';
    if (!lppId) newErrors.lppId = 'LPP is required';
    if (!academicYear.trim()) newErrors.academicYear = 'Academic Year is required';
    const cn = parseInt(cycleNumber);
    if (isNaN(cn) || cn <= 0) newErrors.cycleNumber = 'Cycle Number must be positive';
    if (!startDate) newErrors.startDate = 'Start Date is required';
    if (!endDate) newErrors.endDate = 'End Date is required';
    if (startDate && endDate && startDate >= endDate) newErrors.endDate = 'End Date must be after Start Date';
    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      const status = (statusSelection[0]?.id ?? 'Planned') as CycleStatus;
      const url = editData ? `/api/cycles/${editData.id}` : '/api/cycles';
      const method = editData ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ptatId,
          lppId,
          academicYear,
          cycleNumber: parseInt(cycleNumber),
          startDate,
          endDate,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Operation failed', 'error');
        return;
      }

      const cycle = await res.json();
      showToast(editData ? 'Cycle updated' : 'Cycle created', 'success');
      onSuccess(cycle);
      onClose();
    } catch {
      showToast('An error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const ptatOptions = ptats.map((p) => ({ id: p.id, label: p.name }));
  const lppOptions = lpps.map((l) => ({ id: l.id, label: l.name }));

  return (
    <Modal
      isOpen={isOpen}
      heading={editData ? 'Edit Cycle' : 'New Cycle'}
      onRequestClose={onClose}
      size="medium"
      footer={[
        <Button key="cancel" label="Cancel" onClick={onClose} disabled={isLoading} />,
        <Button
          key="save"
          label={isLoading ? 'Saving...' : 'Save'}
          variant="brand"
          onClick={handleSubmit}
          disabled={isLoading}
        />,
      ]}
    >
      <div className="slds-p-around_medium slds-grid slds-wrap slds-gutters">
        <div className="slds-col slds-size_1-of-2 slds-m-bottom_medium">
          <Combobox
            id="cycle-ptat"
            labels={{ label: 'PTAT', placeholder: 'Select PTAT...' }}
            options={ptatOptions}
            selection={ptatSelection}
            value=""
            events={{
              onSelect: (_e: any, { selection }: any) => {
                setPtatSelection(selection);
                setPtatId(selection[0]?.id ?? '');
                setLppId('');
                setLppSelection([]);
              },
            }}
            variant="readonly"
            errorText={errors.ptatId}
          />
        </div>
        <div className="slds-col slds-size_1-of-2 slds-m-bottom_medium">
          <Combobox
            id="cycle-lpp"
            labels={{ label: 'Learning Program', placeholder: 'Select LPP...' }}
            options={lppOptions}
            selection={lppSelection}
            value=""
            events={{
              onSelect: (_e: any, { selection }: any) => {
                setLppSelection(selection);
                setLppId(selection[0]?.id ?? '');
              },
            }}
            variant="readonly"
            errorText={errors.lppId}
            disabled={!ptatId}
          />
        </div>
        <div className="slds-col slds-size_1-of-2 slds-m-bottom_medium">
          <Input
            label="Academic Year"
            placeholder="e.g. 2024-25"
            value={academicYear}
            onChange={(_e: any, data: { value: string }) => setAcademicYear(data.value)}
            required
            errorText={errors.academicYear}
          />
        </div>
        <div className="slds-col slds-size_1-of-2 slds-m-bottom_medium">
          <Input
            label="Cycle Number"
            type="number"
            value={cycleNumber}
            onChange={(_e: any, data: { value: string }) => setCycleNumber(data.value)}
            required
            errorText={errors.cycleNumber}
          />
        </div>
        <div className="slds-col slds-size_1-of-2 slds-m-bottom_medium">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(_e: any, data: { value: string }) => setStartDate(data.value)}
            required
            errorText={errors.startDate}
          />
        </div>
        <div className="slds-col slds-size_1-of-2 slds-m-bottom_medium">
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(_e: any, data: { value: string }) => setEndDate(data.value)}
            required
            errorText={errors.endDate}
          />
        </div>
        <div className="slds-col slds-size_1-of-2 slds-m-bottom_medium">
          <Combobox
            id="cycle-status"
            labels={{ label: 'Status' }}
            options={STATUS_OPTIONS}
            selection={statusSelection}
            value=""
            events={{
              onSelect: (_e: any, { selection }: any) => setStatusSelection(selection),
            }}
            variant="readonly"
          />
        </div>
      </div>
    </Modal>
  );
}
