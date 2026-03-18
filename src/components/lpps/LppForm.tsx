'use client';

import React, { useState, useEffect } from 'react';
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2>{editData ? 'Edit LPP' : 'New Learning Program'}</h2>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">PTAT</label>
            <select
              className="form-select"
              value={ptatId}
              onChange={(e) => setPtatId(e.target.value)}
            >
              <option value="">Select PTAT...</option>
              {ptats.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {errors.ptatId && <span style={{ color: '#ba0517', fontSize: '12px' }}>{errors.ptatId}</span>}
          </div>

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
            <label className="form-label">Duration (years)</label>
            <input
              className="form-input"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            {errors.duration && <span style={{ color: '#ba0517', fontSize: '12px' }}>{errors.duration}</span>}
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
