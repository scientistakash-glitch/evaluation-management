'use client';

import React, { useState, useEffect } from 'react';
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2>{editData ? 'Edit PTAT' : 'New PTAT'}</h2>
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
            <label className="form-label">Code</label>
            <input
              className="form-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {errors.code && <span style={{ color: '#ba0517', fontSize: '12px' }}>{errors.code}</span>}
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
