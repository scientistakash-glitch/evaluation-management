'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@salesforce/design-system-react/components/modal';
import Input from '@salesforce/design-system-react/components/input';
import Button from '@salesforce/design-system-react/components/button';
import Combobox from '@salesforce/design-system-react/components/combobox';
import { LPP, PTAT } from '@/types';
import { useToast } from '../common/ToastContext';

interface LppFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lpp: LPP) => void;
  editData?: LPP | null;
  defaultPtatId?: string;
}

export default function LppForm({ isOpen, onClose, onSuccess, editData, defaultPtatId }: LppFormProps) {
  const { showToast } = useToast();
  const [ptats, setPtats] = useState<PTAT[]>([]);
  const [ptatId, setPtatId] = useState('');
  const [ptatSelection, setPtatSelection] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [duration, setDuration] = useState('4');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/ptats').then((r) => r.json()).then((data) => setPtats(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (editData) {
      setPtatId(editData.ptatId);
      setName(editData.name);
      setCode(editData.code);
      setDuration(String(editData.duration));
    } else {
      setPtatId(defaultPtatId ?? '');
      setName('');
      setCode('');
      setDuration('4');
    }
    setErrors({});
  }, [editData, isOpen, defaultPtatId]);

  useEffect(() => {
    if (ptatId && ptats.length > 0) {
      const p = ptats.find((pt) => pt.id === ptatId);
      if (p) setPtatSelection([{ id: p.id, label: p.name }]);
    }
  }, [ptatId, ptats]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!ptatId) newErrors.ptatId = 'PTAT is required';
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!code.trim()) newErrors.code = 'Code is required';
    const d = parseInt(duration);
    if (isNaN(d) || d <= 0) newErrors.duration = 'Duration must be a positive number';
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
      const url = editData ? `/api/lpps/${editData.id}` : '/api/lpps';
      const method = editData ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ptatId, name, code, duration: parseInt(duration) }),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Operation failed', 'error');
        return;
      }

      const lpp = await res.json();
      showToast(editData ? 'LPP updated' : 'LPP created', 'success');
      onSuccess(lpp);
      onClose();
    } catch {
      showToast('An error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const ptatOptions = ptats.map((p) => ({ id: p.id, label: p.name }));

  return (
    <Modal
      isOpen={isOpen}
      heading={editData ? 'Edit LPP' : 'New Learning Program'}
      onRequestClose={onClose}
      size="small"
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
        <div className="slds-col slds-size_1-of-1 slds-m-bottom_medium">
          <Combobox
            id="lpp-ptat"
            labels={{ label: 'PTAT', placeholder: 'Select PTAT...' }}
            options={ptatOptions}
            selection={ptatSelection}
            value=""
            events={{
              onSelect: (_e: any, { selection }: any) => {
                setPtatSelection(selection);
                setPtatId(selection[0]?.id ?? '');
              },
            }}
            variant="readonly"
            errorText={errors.ptatId}
          />
        </div>
        <div className="slds-col slds-size_1-of-1 slds-m-bottom_medium">
          <Input
            label="Name"
            value={name}
            onChange={(_e: any, data: { value: string }) => setName(data.value)}
            required
            errorText={errors.name}
          />
        </div>
        <div className="slds-col slds-size_1-of-1 slds-m-bottom_medium">
          <Input
            label="Code"
            value={code}
            onChange={(_e: any, data: { value: string }) => setCode(data.value)}
            required
            errorText={errors.code}
          />
        </div>
        <div className="slds-col slds-size_1-of-1 slds-m-bottom_medium">
          <Input
            label="Duration (years)"
            type="number"
            value={duration}
            onChange={(_e: any, data: { value: string }) => setDuration(data.value)}
            required
            errorText={errors.duration}
          />
        </div>
      </div>
    </Modal>
  );
}
