'use client';

import React, { useState, useEffect } from 'react';
import { Cycle, CycleStatus, PTAT, LPP } from '@/types';
import { useToast } from '../common/ToastContext';

interface CycleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cycle: Cycle) => void;
  editData?: Cycle | null;
}

const STATUS_OPTIONS = ['Planned', 'Active', 'Closed'];

export default function CycleForm({ isOpen, onClose, onSuccess, editData }: CycleFormProps) {
  const { showToast } = useToast();
  const [ptats, setPtats] = useState<PTAT[]>([]);
  const [lpps, setLpps] = useState<LPP[]>([]);
  const [ptatId, setPtatId] = useState('');
  const [lppId, setLppId] = useState('');
  const [status, setStatus] = useState<string>('Planned');
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
      setStatus(editData.status);
    } else {
      setPtatId('');
      setLppId('');
      setAcademicYear('');
      setCycleNumber('1');
      setStartDate('');
      setEndDate('');
      setStatus('Planned');
    }
    setErrors({});
  }, [editData, isOpen]);

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
          status: status as CycleStatus,
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2>{editData ? 'Edit Cycle' : 'New Cycle'}</h2>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">PTAT</label>
              <select
                className="form-select"
                value={ptatId}
                onChange={(e) => {
                  setPtatId(e.target.value);
                  setLppId('');
                }}
              >
                <option value="">Select PTAT...</option>
                {ptats.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {errors.ptatId && <span style={{ color: '#ba0517', fontSize: '12px' }}>{errors.ptatId}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Learning Program</label>
              <select
                className="form-select"
                value={lppId}
                onChange={(e) => setLppId(e.target.value)}
                disabled={!ptatId}
              >
                <option value="">Select LPP...</option>
                {lpps.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              {errors.lppId && <span style={{ color: '#ba0517', fontSize: '12px' }}>{errors.lppId}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Academic Year</label>
              <input
                className="form-input"
                placeholder="e.g. 2024-25"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
              {errors.academicYear && <span style={{ color: '#ba0517', fontSize: '12px' }}>{errors.academicYear}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Cycle Number</label>
              <input
                className="form-input"
                type="number"
                value={cycleNumber}
                onChange={(e) => setCycleNumber(e.target.value)}
              />
              {errors.cycleNumber && <span style={{ color: '#ba0517', fontSize: '12px' }}>{errors.cycleNumber}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                className="form-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              {errors.startDate && <span style={{ color: '#ba0517', fontSize: '12px' }}>{errors.startDate}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                className="form-input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              {errors.endDate && <span style={{ color: '#ba0517', fontSize: '12px' }}>{errors.endDate}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
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
