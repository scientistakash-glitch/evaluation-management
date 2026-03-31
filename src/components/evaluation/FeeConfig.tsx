'use client';

import React, { useState, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface InstallmentRow {
  pct: number;
  amount: number;
  dueDate: string;
}

interface RowConfig {
  programId: string;
  programName: string;
  category: string;     // e.g. 'Resident Indian' | 'NRI'
  subcategory: string;  // e.g. 'General' | 'OBC' | 'SC/ST' | 'American' | 'Arab'
  programFee: number;
  installmentPlanId: string;
  installmentRows: InstallmentRow[];
}

interface LPPSubcategory { name: string; category: string; approvedIntake: number; }
interface FullLPP {
  id: string; name: string; fee: number; totalSeats: number;
  subcategories?: LPPSubcategory[];
}
interface CycleData { lppIds: string[]; }

interface Props {
  cycleId: string;
  onSaved: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const INSTALLMENT_PLANS: { id: string; label: string; splits: number[] }[] = [
  { id: 'INSTA_1', label: 'INSTA 1 — Single payment (100%)',     splits: [100] },
  { id: 'INSTA_2', label: 'INSTA 2 — Two equal payments (50/50)', splits: [50, 50] },
  { id: 'INSTA_3', label: 'INSTA 3 — Three payments (30/30/40)', splits: [30, 30, 40] },
];

function buildInstallmentRows(planId: string, programFee: number): InstallmentRow[] {
  const plan = INSTALLMENT_PLANS.find((p) => p.id === planId);
  if (!plan) return [];
  return plan.splits.map((pct) => ({
    pct,
    amount: Math.round((programFee * pct) / 100),
    dueDate: '',
  }));
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function FeeConfig({ cycleId, onSaved }: Props) {
  const [rowConfigs, setRowConfigs] = useState<RowConfig[]>([]);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [cycleRes, lppsRes] = await Promise.all([
          fetch(`/api/cycles/${cycleId}`),
          fetch('/api/lpps'),
        ]);
        const cycle: CycleData    = cycleRes.ok ? await cycleRes.json() : { lppIds: [] };
        const allLpps: FullLPP[]  = lppsRes.ok  ? await lppsRes.json()  : [];
        const cycleLpps = allLpps.filter((l) => cycle.lppIds.includes(l.id));

        // Build one row per LPP × subcategory
        const initialRows: RowConfig[] = [];
        for (const lpp of cycleLpps) {
          for (const sub of (lpp.subcategories ?? [])) {
            initialRows.push({
              programId: lpp.id, programName: lpp.name,
              category: sub.category, subcategory: sub.name,
              programFee: lpp.fee ?? 0,
              installmentPlanId: '', installmentRows: [],
            });
          }
        }

        // Merge any existing saved config
        const feeRes = await fetch(`/api/cycles/${cycleId}/fee-config`);
        const existing = feeRes.ok ? await feeRes.json() : null;
        if (Array.isArray(existing?.categoryConfigs) && existing.categoryConfigs.length > 0) {
          setRowConfigs(initialRows.map((row) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const saved = existing.categoryConfigs.find((c: any) =>
              c.programId === row.programId && c.subcategory === row.subcategory
            );
            return saved
              ? { ...row, installmentPlanId: saved.installmentPlanId ?? '', installmentRows: saved.installmentRows ?? [] }
              : row;
          }));
        } else {
          setRowConfigs(initialRows);
        }
      } catch {
        setError('Failed to load configuration');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [cycleId]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function setPlan(programId: string, subcategory: string, planId: string) {
    setRowConfigs((prev) => prev.map((r) =>
      r.programId !== programId || r.subcategory !== subcategory ? r : {
        ...r,
        installmentPlanId: planId,
        installmentRows: buildInstallmentRows(planId, r.programFee),
      }
    ));
  }

  function setAmount(programId: string, subcategory: string, idx: number, amount: number) {
    setRowConfigs((prev) => prev.map((r) => {
      if (r.programId !== programId || r.subcategory !== subcategory) return r;
      const newRows = r.installmentRows.map((row, i) => {
        if (i !== idx) return row;
        const pct = r.programFee > 0 ? Math.round((amount / r.programFee) * 1000) / 10 : 0;
        return { ...row, amount, pct };
      });
      return { ...r, installmentRows: newRows };
    }));
  }

  function setDueDate(programId: string, subcategory: string, idx: number, dueDate: string) {
    setRowConfigs((prev) => prev.map((r) =>
      r.programId !== programId || r.subcategory !== subcategory ? r : {
        ...r,
        installmentRows: r.installmentRows.map((row, i) => i === idx ? { ...row, dueDate } : row),
      }
    ));
  }

  // ── Validation ───────────────────────────────────────────────────────────────

  function isRowDone(row: RowConfig): boolean {
    if (!row.installmentPlanId || row.installmentRows.length === 0) return false;
    const total = row.installmentRows.reduce((s, r) => s + r.amount, 0);
    return Math.abs(total - row.programFee) <= 1 && row.installmentRows.every((r) => r.dueDate !== '');
  }

  const doneCount = rowConfigs.filter(isRowDone).length;
  const canSave   = doneCount > 0;

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    const configured = rowConfigs.filter((r) => r.installmentPlanId);
    if (configured.length === 0) { setError('Please configure at least one row.'); return; }
    setError('');
    setSaving(true);
    try {
      const categoryConfigs = configured.map((r) => ({
        programId: r.programId, programName: r.programName,
        category: r.category, subcategory: r.subcategory,
        programFee: r.programFee,
        installmentPlanId: r.installmentPlanId,
        installmentRows: r.installmentRows,
      }));
      const res = await fetch(`/api/cycles/${cycleId}/fee-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installmentPlanId: configured[0]?.installmentPlanId ?? '', categoryConfigs }),
      });
      if (!res.ok) throw new Error('Failed to save fee configuration');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '32px 0', color: 'var(--color-text-muted)' }}>
        <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
        Loading fee configuration…
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ marginBottom: '32px' }}>
      <div className="section-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Fee Configuration</h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          Set the installment plan and due dates per program and student category.
          Program fees are pre-configured from each program plan.
        </p>

        {/* Progress indicator */}
        {doneCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', marginBottom: '16px',
            background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
            fontSize: '12px', color: '#15803d',
          }}>
            <span>✓</span>
            <span><b>{doneCount}</b> of {rowConfigs.length} subcategories fully configured</span>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ fontSize: '12px', whiteSpace: 'nowrap', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left',  minWidth: '140px' }}>Program</th>
                <th style={{ textAlign: 'left',  minWidth: '130px' }}>Category</th>
                <th style={{ textAlign: 'left',  minWidth: '90px'  }}>Subcategory</th>
                <th style={{ textAlign: 'right', minWidth: '110px' }}>Program Fee</th>
                <th style={{ textAlign: 'left',  minWidth: '230px' }}>Installment Plan</th>
                <th style={{ textAlign: 'center',minWidth: '30px'  }}>#</th>
                <th style={{ textAlign: 'right', minWidth: '110px' }}>Amount (₹)</th>
                <th style={{ textAlign: 'right', minWidth: '50px'  }}>%</th>
                <th style={{ textAlign: 'left',  minWidth: '200px' }}>Due Date</th>
                <th style={{ textAlign: 'center',minWidth: '70px'  }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rowConfigs.map((row, rowIdx) => {
                const prevRow       = rowConfigs[rowIdx - 1];
                const isNewProgram  = !prevRow || prevRow.programId !== row.programId;
                const isNewCategory = !prevRow || prevRow.programId !== row.programId || prevRow.category !== row.category;
                const done          = isRowDone(row);
                const total         = row.installmentRows.reduce((s, r) => s + r.amount, 0);
                const totalOk       = Math.abs(total - row.programFee) <= 1;
                const hasInst       = row.installmentRows.length > 0;

                // ── Main subcategory row ───────────────────────────────────
                const mainRow = (
                  <tr
                    key={`main-${row.programId}-${row.subcategory}`}
                    style={{ borderTop: isNewProgram && rowIdx > 0 ? '2px solid var(--color-border)' : undefined }}
                  >
                    {/* Program */}
                    <td style={{
                      fontWeight: isNewProgram ? 700 : 400,
                      color: isNewProgram ? 'var(--color-primary)' : 'transparent',
                      borderLeft: isNewProgram ? '3px solid var(--color-primary)' : '3px solid transparent',
                      paddingLeft: '10px',
                    }}>
                      {isNewProgram ? row.programName : ''}
                    </td>
                    {/* Category */}
                    <td style={{ color: isNewCategory ? 'var(--color-text)' : 'transparent', fontWeight: 500 }}>
                      {isNewCategory ? row.category : ''}
                    </td>
                    {/* Subcategory */}
                    <td style={{ fontWeight: 500 }}>{row.subcategory}</td>
                    {/* Program Fee — read-only */}
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {row.programFee > 0 ? `₹${row.programFee.toLocaleString('en-IN')}` : '—'}
                    </td>
                    {/* Installment Plan dropdown */}
                    <td>
                      <select
                        className="form-input"
                        style={{ fontSize: '12px', padding: '4px 8px', width: '220px' }}
                        value={row.installmentPlanId}
                        onChange={(e) => setPlan(row.programId, row.subcategory, e.target.value)}
                      >
                        <option value="">— Select plan —</option>
                        {INSTALLMENT_PLANS.map((p) => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </td>
                    {/* Installment cols: empty on main row */}
                    <td /><td /><td /><td />
                    {/* Status */}
                    <td style={{ textAlign: 'center' }}>
                      {done
                        ? <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>✓ Done</span>
                        : <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      }
                    </td>
                  </tr>
                );

                if (!hasInst) return <React.Fragment key={`${row.programId}-${row.subcategory}`}>{mainRow}</React.Fragment>;

                // ── Installment sub-rows ───────────────────────────────────
                const instRows = row.installmentRows.map((inst, i) => (
                  <tr key={`inst-${row.programId}-${row.subcategory}-${i}`} style={{ background: '#fafafa' }}>
                    {/* Program, Category, Subcategory, Fee: empty */}
                    <td /><td /><td /><td />
                    {/* Plan col: show total on last installment */}
                    <td style={{ paddingLeft: '20px', fontSize: '11px' }}>
                      {i === row.installmentRows.length - 1 ? (
                        <span style={{ fontWeight: 600, color: totalOk ? '#15803d' : '#c53030' }}>
                          Total: ₹{total.toLocaleString('en-IN')} {totalOk ? '✓' : `(need ₹${row.programFee.toLocaleString('en-IN')})`}
                        </span>
                      ) : null}
                    </td>
                    {/* # */}
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-primary)' }}>{i + 1}</td>
                    {/* Amount — EDITABLE */}
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        className="form-input"
                        style={{ width: '100px', padding: '3px 8px', fontSize: '12px', textAlign: 'right' }}
                        value={inst.amount}
                        min={0}
                        onChange={(e) => setAmount(row.programId, row.subcategory, i, parseInt(e.target.value) || 0)}
                      />
                    </td>
                    {/* % — auto */}
                    <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                      {inst.pct}%
                    </td>
                    {/* Due Date — datetime-local */}
                    <td>
                      <input
                        type="datetime-local"
                        className="form-input"
                        style={{ fontSize: '12px', padding: '3px 6px', width: '190px' }}
                        value={inst.dueDate}
                        onChange={(e) => setDueDate(row.programId, row.subcategory, i, e.target.value)}
                      />
                    </td>
                    <td />
                  </tr>
                ));

                return (
                  <React.Fragment key={`${row.programId}-${row.subcategory}`}>
                    {mainRow}
                    {instRows}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {error && (
          <div style={{ marginTop: '16px', padding: '10px 14px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '8px', color: '#c53030', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px' }}>
          {!canSave && (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Configure at least one row — amounts must total the program fee and all due dates must be set
            </span>
          )}
          <button className="btn-primary" onClick={handleSave} disabled={saving || !canSave}>
            {saving ? 'Saving…' : 'Save & Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
