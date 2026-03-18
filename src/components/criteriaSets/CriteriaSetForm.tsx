'use client';

import React, { useState, useEffect } from 'react';
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2>{editData ? 'Edit Criteria Set' : 'New Criteria Set'}</h2>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <span style={{ color: '#ba0517', fontSize: '12px' }}>{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <CustomCriteriaBuilder value={criteria} onChange={setCriteria} />
          {errors.criteria && (
            <p style={{ color: '#ba0517', fontSize: '12px', marginTop: '8px' }}>{errors.criteria}</p>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-pill-outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button className="btn-pill-filled" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
