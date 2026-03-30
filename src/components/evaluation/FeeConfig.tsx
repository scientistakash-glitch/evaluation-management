'use client';

import React, { useState, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface InstallmentRow {
  pct: number;
  amount: number;
  dueDate: string;
}

interface Props {
  cycleId: string;
  onSaved: () => void;
}

const INSTALLMENT_PLANS: { id: string; label: string; splits: number[] }[] = [
  { id: 'INSTA_1', label: 'INSTA 1 — Single payment (100%)',    splits: [100] },
  { id: 'INSTA_2', label: 'INSTA 2 — Two equal payments (50/50)', splits: [50, 50] },
  { id: 'INSTA_3', label: 'INSTA 3 — Three payments (30/30/40)', splits: [30, 30, 40] },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function FeeConfig({ cycleId, onSaved }: Props) {
  const [installmentPlanId, setInstallmentPlanId] = useState('');
  const [installmentRows, setInstallmentRows]     = useState<InstallmentRow[]>([]);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Load existing config on mount
  useEffect(() => {
    fetch(`/api/cycles/${cycleId}/fee-config`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.installmentPlanId) {
          setInstallmentPlanId(data.installmentPlanId);
          setInstallmentRows(data.installmentRows ?? []);
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false));
  }, [cycleId]);

  function selectPlan(planId: string) {
    setInstallmentPlanId(planId);
    const plan = INSTALLMENT_PLANS.find((p) => p.id === planId);
    if (!plan) { setInstallmentRows([]); return; }
    setInstallmentRows(plan.splits.map((pct) => ({ pct, amount: 0, dueDate: '' })));
  }

  async function handleSave() {
    if (!installmentPlanId) { setError('Please select an installment plan.'); return; }
    if (installmentRows.some((r) => !r.dueDate)) { setError('Please set a due date for every installment.'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/cycles/${cycleId}/fee-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installmentPlanId, installmentRows }),
      });
      if (!res.ok) throw new Error('Failed to save fee configuration');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '32px 0', color: 'var(--color-text-muted)' }}>
        <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
        Loading fee configuration…
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '32px' }}>
      <div className="section-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Fee Configuration</h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Select an installment plan and set due dates. Fee amounts are calculated per-program based on the program fee.
        </p>

        {/* Plan selector */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '8px' }}>
            Installment Plan *
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {INSTALLMENT_PLANS.map((plan) => (
              <label
                key={plan.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px',
                  border: `2px solid ${installmentPlanId === plan.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: '8px',
                  background: installmentPlanId === plan.id ? 'var(--color-primary-bg)' : 'white',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onClick={() => selectPlan(plan.id)}
              >
                <input
                  type="radio"
                  name="installmentPlan"
                  value={plan.id}
                  checked={installmentPlanId === plan.id}
                  onChange={() => selectPlan(plan.id)}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{plan.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {plan.splits.join('% + ')}% of program fee
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Due dates table */}
        {installmentRows.length > 0 && (
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Installment Due Dates</div>
            <table className="data-table" style={{ fontSize: '13px', width: '100%', marginBottom: '0' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>% of Program Fee</th>
                  <th>Due Date *</th>
                </tr>
              </thead>
              <tbody>
                {installmentRows.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{idx + 1}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{row.pct}%</span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '6px' }}>of program fee</span>
                    </td>
                    <td>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={row.dueDate}
                        style={{ width: '220px' }}
                        onChange={(e) => setInstallmentRows((prev) =>
                          prev.map((r, i) => i === idx ? { ...r, dueDate: e.target.value } : r)
                        )}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '16px', padding: '10px 14px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '8px', color: '#c53030', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !installmentPlanId || installmentRows.some((r) => !r.dueDate)}
          >
            {saving ? 'Saving…' : 'Save & Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
