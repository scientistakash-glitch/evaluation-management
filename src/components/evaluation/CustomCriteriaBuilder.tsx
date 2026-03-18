'use client';

import React from 'react';
import { Criterion } from '@/types';
import { generateId } from '@/lib/utils/idGenerator';

interface CustomCriteriaBuilderProps {
  value: Criterion[];
  onChange: (criteria: Criterion[]) => void;
}

const SOURCE_OPTIONS = [
  { value: '', label: 'Manual (no auto-source)' },
  { value: 'entranceScore', label: 'Entrance Score' },
  { value: 'academicScore', label: 'Academic Score' },
];

export default function CustomCriteriaBuilder({ value, onChange }: CustomCriteriaBuilderProps) {
  const totalWeightage = value.reduce((sum, c) => sum + (Number(c.weightage) || 0), 0);
  const isValid = Math.abs(totalWeightage - 100) < 0.01;

  const addCriterion = () => {
    const newCriterion: Criterion = {
      id: generateId('crit'),
      name: '',
      weightage: 0,
      sourceField: null,
    };
    onChange([...value, newCriterion]);
  };

  const updateCriterion = (index: number, field: keyof Criterion, val: any) => {
    const updated = value.map((c, i) =>
      i === index ? { ...c, [field]: val } : c
    );
    onChange(updated);
  };

  const removeCriterion = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const progressWidth = Math.min(totalWeightage, 100);

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontWeight: 600, color: '#3e3e3c' }}>Criteria</span>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: isValid ? '#2e844a' : '#ba0517',
            }}
          >
            Total: {totalWeightage.toFixed(1)}%
            {isValid ? ' ✓' : ' (must be 100%)'}
          </span>
        </div>
        <div
          style={{
            height: '6px',
            background: '#f3f3f3',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressWidth}%`,
              background: isValid ? '#2e844a' : totalWeightage > 100 ? '#ba0517' : '#0070d2',
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {value.length === 0 && (
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            color: '#706e6b',
            border: '1px dashed #dddbda',
            borderRadius: '4px',
            marginBottom: '12px',
          }}
        >
          No criteria added yet. Click &quot;Add Criterion&quot; to get started.
        </div>
      )}

      {value.map((criterion, index) => (
        <div
          key={criterion.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 160px auto',
            gap: '8px',
            alignItems: 'flex-end',
            padding: '8px',
            border: '1px solid #dddbda',
            borderRadius: '4px',
            marginBottom: '8px',
            background: '#fafaf9',
          }}
        >
          <div>
            {index === 0 && (
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#3e3e3c' }}>
                Criterion Name
              </label>
            )}
            <input
              className="form-input"
              placeholder="e.g. Interview Score"
              value={criterion.name}
              onChange={(e) => updateCriterion(index, 'name', e.target.value)}
            />
          </div>
          <div>
            {index === 0 && (
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#3e3e3c' }}>
                Weight %
              </label>
            )}
            <input
              className="form-input"
              placeholder="0"
              type="number"
              value={String(criterion.weightage)}
              onChange={(e) => updateCriterion(index, 'weightage', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            {index === 0 && (
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#3e3e3c' }}>
                Source Field
              </label>
            )}
            <select
              className="form-select"
              value={criterion.sourceField ?? ''}
              onChange={(e) => updateCriterion(index, 'sourceField', e.target.value || null)}
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              className="btn-secondary"
              style={{ color: '#ba0517', borderColor: '#ba0517' }}
              onClick={() => removeCriterion(index)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <button className="btn-secondary" onClick={addCriterion}>
        Add Criterion
      </button>
    </div>
  );
}
