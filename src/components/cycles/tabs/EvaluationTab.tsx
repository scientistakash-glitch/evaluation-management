'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Cycle, Evaluation, CriteriaSet, Criterion, EvaluationScore, Application, LPP } from '@/types';
import { useToast } from '../../common/ToastContext';

interface EvaluationTabProps {
  cycle: Cycle;
  onGoToRankConfig?: () => void;
  lpp?: LPP | null;
}

interface NewCriterionForm {
  name: string;
  sourceField: string;
  weightage: number;
  parameterType: string;
  displayInSheet: boolean;
}

function AddCriteriaModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (criterion: NewCriterionForm) => void;
}) {
  const [form, setForm] = useState<NewCriterionForm>({
    name: '',
    sourceField: '',
    weightage: 0,
    parameterType: 'Numeric',
    displayInSheet: true,
  });

  const handleSubmit = () => {
    if (!form.name) return;
    onAdd(form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add a Criteria</h2>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Criteria Name</label>
            <input
              className="form-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter criteria name..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Evaluation Field</label>
            <input
              className="form-input"
              value={form.sourceField}
              onChange={(e) => setForm({ ...form, sourceField: e.target.value })}
              placeholder="Enter source field..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Total Score (Weightage %)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              max="100"
              value={form.weightage}
              onChange={(e) => setForm({ ...form, weightage: Number(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Parameter Type</label>
            <select
              className="form-select"
              value={form.parameterType}
              onChange={(e) => setForm({ ...form, parameterType: e.target.value })}
            >
              <option value="Numeric">Numeric</option>
              <option value="Text">Text</option>
              <option value="Boolean">Boolean</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.displayInSheet}
                onChange={(e) => setForm({ ...form, displayInSheet: e.target.checked })}
              />
              Display in Sheet
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-pill-outline" onClick={onClose}>Cancel</button>
          <button className="btn-pill-filled" onClick={handleSubmit} disabled={!form.name}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EvaluationTab({ cycle, onGoToRankConfig }: EvaluationTabProps) {
  const { showToast } = useToast();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [criteriaSets, setCriteriaSets] = useState<CriteriaSet[]>([]);
  const [customCriteria, setCustomCriteria] = useState<Criterion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [evals, csData] = await Promise.all([
        fetch(`/api/evaluations?cycleId=${cycle.id}`).then((r) => r.json()),
        fetch('/api/criteria-sets').then((r) => r.json()),
      ]);
      setCriteriaSets(csData);

      if (evals.length > 0) {
        const ev: Evaluation = evals[0];
        setEvaluation(ev);
        if (ev.customCriteria) {
          setCustomCriteria(ev.customCriteria);
        } else if (ev.criteriaSetId) {
          const cs = csData.find((c: CriteriaSet) => c.id === ev.criteriaSetId);
          if (cs) setCustomCriteria(cs.criteria);
        }
      }
    } catch {
      showToast('Failed to load evaluation data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [cycle.id, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddCriterion = (form: NewCriterionForm) => {
    const newCriterion: Criterion = {
      id: `crit-${Date.now()}`,
      name: form.name,
      sourceField: form.sourceField || null,
      weightage: form.weightage,
    };
    setCustomCriteria((prev) => [...prev, newCriterion]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let res;
      if (evaluation) {
        res = await fetch(`/api/evaluations/${evaluation.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customCriteria, criteriaSetId: undefined }),
        });
      } else {
        res = await fetch('/api/evaluations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cycleId: cycle.id, customCriteria }),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Failed to save evaluation', 'error');
        return;
      }

      const ev = await res.json();
      setEvaluation(ev);
      showToast('Criteria saved successfully', 'success');
    } catch {
      showToast('An error occurred', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      {/* Action buttons row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          padding: '16px 24px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button className="btn-secondary" onClick={() => setShowAddModal(true)}>
          Add a criteria
        </button>
        <button className="btn-secondary">
          Add existing evaluation sheet
        </button>
        <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Criteria Table */}
      {customCriteria.length === 0 ? (
        <div style={{ padding: '64px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>No criteria added yet</div>
          <div style={{ fontSize: '14px' }}>Click "Add a criteria" to get started.</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table-custom">
            <thead>
              <tr>
                <th>Column No.</th>
                <th>Criteria Name</th>
                <th>Evaluation Object</th>
                <th>Evaluation Type</th>
                <th>Evaluation Field</th>
                <th>Total Score</th>
                <th>Parameter Type</th>
                <th>Display in Sheet</th>
              </tr>
            </thead>
            <tbody>
              {customCriteria.map((criterion, index) => (
                <tr key={criterion.id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{index + 1}</td>
                  <td style={{ fontWeight: 500 }}>{criterion.name}</td>
                  <td>Application</td>
                  <td>Score</td>
                  <td>{criterion.sourceField || criterion.name}</td>
                  <td style={{ fontWeight: 600 }}>{criterion.weightage}%</td>
                  <td>Numeric</td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: '#DCFCE7',
                        color: '#166534',
                      }}
                    >
                      Yes
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddCriteriaModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddCriterion}
        />
      )}
    </div>
  );
}
