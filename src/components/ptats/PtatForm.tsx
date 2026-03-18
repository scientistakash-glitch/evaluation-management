'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@salesforce/design-system-react/components/modal';
import Input from '@salesforce/design-system-react/components/input';
import Textarea from '@salesforce/design-system-react/components/textarea';
import Button from '@salesforce/design-system-react/components/button';
import { PTAT } from '@/types';
import { useToast } from '../common/ToastContext';

interface PtatFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ptat: PTAT) => void;
  editData?: PTAT | null;
}

export default function PtatForm({ isOpen, onClose, onSuccess, editData }: PtatFormProps) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editData) {
      setName(editData.name);
      setCode(editData.code);
      setDescription(editData.description ?? '');
    } else {
      setName('');
      setCode('');
      setDescription('');
    }
    setErrors({});
  }, [editData, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!code.trim()) newErrors.code = 'Code is required';
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
      const url = editData ? `/api/ptats/${editData.id}` : '/api/ptats';
      const method = editData ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Operation failed', 'error');
        return;
      }

      const ptat = await res.json();
      showToast(editData ? 'PTAT updated successfully' : 'PTAT created successfully', 'success');
      onSuccess(ptat);
      onClose();
    } catch {
      showToast('An error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      heading={editData ? 'Edit PTAT' : 'New PTAT'}
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
          <Textarea
            label="Description"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
