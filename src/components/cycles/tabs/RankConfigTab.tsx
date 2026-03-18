'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Cycle, Evaluation, TiebreakerConfig, TiebreakerRule, Criterion, CriteriaSet } from '@/types';
import { useToast } from '../../common/ToastContext';

interface RankConfigTabProps {
  cycle: Cycle;
}

export default function RankConfigTab({ cycle }: RankConfigTabProps) {
  const { showToast } = useToast();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [tbConfig, setTbConfig] = useState<TiebreakerConfig | null>(null);
  const [rules, setRules] = useState<TiebreakerRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const evals = await fetch(`/api/evaluations?cycleId=${cycle.id}`).then((r) => r.json());
      if (evals.length === 0) {
        setIsLoading(false);
        return;
      }
      const ev: Evaluation = evals[0];
      setEvaluation(ev);

      let crit: Criterion[] = [];
      if (ev.criteriaSetId) {
        const cs: CriteriaSet = await fetch(`/api/criteria-sets/${ev.criteriaSetId}`).then((r) => r.json());
        crit = cs.criteria;
      } else if (ev.customCriteria) {
        crit = ev.customCriteria;
      }

      const config = await fetch(`/api/tiebreaker-configs?evaluationId=${ev.id}`).then((r) => r.json());
      if (config) {
        setTbConfig(config);
        setRules([...config.rules].sort((a: TiebreakerRule, b: TiebreakerRule) => a.order - b.order));
      } else {
        const initialRules: TiebreakerRule[] = crit.map((c, idx) => ({
          order: idx + 1,
          criterionId: c.id,
          criterionName: c.name,
          direction: 'DESC' as const,
        }));
        setRules(initialRules);
      }
    } catch {
      showToast('Failed to load rank config data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [cycle.id, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const moveRule = (index: number, direction: 'up' | 'down') => {
    const newRules = [...rules];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newRules.length) return;
    [newRules[index], newRules[swapIndex]] = [newRules[swapIndex], newRules[index]];
    setRules(newRules.map((r, i) => ({ ...r, order: i + 1 })));
  };

  const updateRuleDirection = (index: number, direction: 'DESC' | 'ASC') => {
    setRules(rules.map((r, i) => i === index ? { ...r, direction } : r));
  };

  const handleSave = async () => {
    if (!evaluation) return;
    setIsSaving(true);
    try {
      let res;
      if (tbConfig) {
        res = await fetch(`/api/tiebreaker-configs/${tbConfig.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rules }),
        });
      } else {
        res = await fetch('/api/tiebreaker-configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ evaluationId: evaluation.id, rules }),
        });
      }

      if (!res.ok) {
        showToast('Failed to save tiebreaker config', 'error');
        return;
      }
      const saved = await res.json();
      setTbConfig(saved);
      showToast('Tiebreaker config saved', 'success');
    } catch {
      showToast('An error occurred', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateRankings = async () => {
    if (!evaluation) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/evaluations/${evaluation.id}/rankings`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Failed to generate rankings', 'error');
        return;
      }
      setEvaluation(await res.json());
      showToast('Rankings generated successfully!', 'success');
    } catch {
      showToast('An error occurred', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading...
      </div>
    );
  }

  if (!evaluation || evaluation.status === 'Draft') {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>No Evaluation Available</div>
        <div style={{ fontSize: '14px' }}>Complete the Evaluation step first before configuring rankings.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontWeight: 600, color: 'var(--color-primary)', margin: 0, fontSize: '16px' }}>
          Tiebreaker Rules
        </h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Tiebreaker Config'}
          </button>
          <button className="btn-primary" onClick={handleGenerateRankings} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Rankings'}
          </button>
        </div>
      </div>

      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '20px' }}>
        Define the order of tiebreaker criteria. When composite scores are equal, rules are applied in order.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rules.map((rule, index) => (
          <div
            key={rule.criterionId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              background: 'white',
            }}
          >
            <span
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'var(--color-primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
                flexShrink: 0,
              }}
            >
              {rule.order}
            </span>
            <span style={{ flex: 1, fontWeight: 600, color: 'var(--color-text)', fontSize: '14px' }}>
              {rule.criterionName}
            </span>
            <select
              className="form-select"
              value={rule.direction}
              onChange={(e) => updateRuleDirection(index, e.target.value as 'DESC' | 'ASC')}
              style={{ width: '140px', padding: '8px 12px' }}
            >
              <option value="DESC">Highest First</option>
              <option value="ASC">Lowest First</option>
            </select>
            <button
              className="btn-secondary"
              onClick={() => moveRule(index, 'up')}
              disabled={index === 0}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              ↑ Up
            </button>
            <button
              className="btn-secondary"
              onClick={() => moveRule(index, 'down')}
              disabled={index === rules.length - 1}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              ↓ Down
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
