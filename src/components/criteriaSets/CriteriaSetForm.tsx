'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@salesforce/design-system-react/components/modal';
import Input from '@salesforce/design-system-react/components/input';
import Textarea from '@salesforce/design-system-react/components/textarea';
import Button from '@salesforce/design-system-react/components/button';
import { CriteriaSet, Criterion } from '@/types';
import { useToast } from '../common/ToastContext';
import CustomCriteriaBuilder from '../evaluation/CustomCriteriaBuilder';

interface CriteriaSetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cs: CriteriaSet) => void;
  editData?: CriteriaSet | null;
}

export default function CriteriaSetForm({ isOpen, onClose, onSuccess, editData }: CriteriaSetFormProps) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editData) {
      setName(editData.name);
      setDescription(editData.description ?? '');
      setCriteria(editData.criteria);
    } else {
      setName('');
      setDescription('');
      setCriteria([]);
    }
    setErrors({});
  }, [editData, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (criteria.length === 0) newErrors.criteria = 'At least one criterion is required';
    else {
      const sum = criteria.reduce((s, c) => s + c.weightage, 0);
      if (Math.abs(sum - 100) > 0.01) {
        newErrors.criteria = `Weightages must sum to 100% (currently ${sum.toFixed(1)}%)`;
      }
    }
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
      const url = editData ? `/api/criteria-sets/${editData.id}` : '/api/criteria-sets';
      const method = editData ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, criteria, isCustom: false }),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Operation failed', 'error');
        return;
      }

      const cs = await res.json();
      showToast(editData ? 'Criteria set updated' : 'Criteria set created', 'success');
      onSuccess(cs);
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
      heading={editData ? 'Edit Criteria Set' : 'New Criteria Set'}
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
      <div className="slds-p-around_medium">
        <div className="slds-m-bottom_medium">
          <Input
            label="Name"
            value={name}
            onChange={(_e: any, data: { value: string }) => setName(data.value)}
            required
            errorText={errors.name}
          />
        </div>
        <div className="slds-m-bottom_medium">
          <Textarea
            label="Description"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          />
        </div>
        <CustomCriteriaBuilder value={criteria} onChange={setCriteria} />
        {errors.criteria && (
          <p style={{ color: '#ba0517', fontSize: '12px', marginTop: '8px' }}>{errors.criteria}</p>
        )}
      </div>
    </Modal>
  );
}
