'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProgramWeights {
  entrance: number;
  academic: number;
  interview: number;
}

interface ProgramConfig {
  programId: string;
  programName: string;
  weights: ProgramWeights;
  scoresGenerated: boolean;
}

interface Evaluation {
  id: string;
  cycleId: string;
  strategy: 'single' | 'program-wise' | null;
  programConfigs: ProgramConfig[];
  tieBreaker: 'entrance' | 'academic' | null;
  ranksGenerated: boolean;
  status: 'Draft' | 'Scored' | 'Ranked' | 'Approved';
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface EvaluationScore {
  id: string;
  evaluationId: string;
  applicationId: string;
  programId: string;
  entranceScore: number;
  academicScore: number;
  interviewScore: number;
  compositeScore: number;
}

interface RankRecord {
  id: string;
  evaluationId: string;
  cycleId: string;
  applicationId: string;
  programId: string;
  compositeScore: number;
  globalRank: number;
  categoryRank: number;
  category: string;
  tieBreakerValue: number;
  tieBreakerType: string;
}

interface Application {
  id: string;
  studentName: string;
  category: string;
  entranceScore: number;
  academicScore: number;
  interviewScore: number;
}

interface Cycle {
  id: string;
  name: string;
  number: number;
  academicYear: string;
  ptatId: string;
  lppIds: string[];
  evaluationStrategy: 'single' | 'program-wise' | null;
  status: string;
}

interface PTAT {
  id: string;
  name: string;
  code: string;
}

interface LPP {
  id: string;
  name: string;
  code: string;
}

interface Props {
  cycle: Cycle;
  ptat: PTAT | null;
  lpps: LPP[];
  initialEvaluation: Evaluation | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Strategy', 'Composite Score', 'Ranking', 'Preview', 'Approval'];

function StepProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="step-progress">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;
        return (
          <React.Fragment key={stepNum}>
            <div className="step-item">
              <div className={`step-circle${isActive || isDone ? ' active' : ''}`}>
                {isDone ? '✓' : stepNum}
              </div>
              <span className={`step-label${isActive ? ' active' : ''}`}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && <div className="step-connector" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function catClass(category: string) {
  const map: Record<string, string> = {
    General: 'cat-general',
    OBC: 'cat-obc',
    SC: 'cat-sc',
    ST: 'cat-st',
    EWS: 'cat-ews',
  };
  return `badge ${map[category] ?? 'badge-default'}`;
}

// ─── Weight Config Panel ──────────────────────────────────────────────────────

interface WeightPanelProps {
  config: ProgramConfig;
  onSave: (programId: string, weights: ProgramWeights) => Promise<void>;
  saving: boolean;
}

function WeightPanel({ config, onSave, saving }: WeightPanelProps) {
  const [editing, setEditing] = useState(false);
  const [entrance, setEntrance] = useState(String(config.weights.entrance));
  const [academic, setAcademic] = useState(String(config.weights.academic));
  const [interview, setInterview] = useState(String(config.weights.interview));

  const e = parseFloat(entrance) || 0;
  const a = parseFloat(academic) || 0;
  const iv = parseFloat(interview) || 0;
  const total = e + a + iv;
  const isValid = Math.abs(total - 100) < 0.01;

  // If weights are 0 and haven't been set, auto-open editing
  useEffect(() => {
    if (config.weights.entrance === 0 && config.weights.academic === 0 && config.weights.interview === 0) {
      setEditing(true);
    }
  }, [config.weights.entrance, config.weights.academic, config.weights.interview]);

  async function handleSave() {
    if (!isValid) return;
    await onSave(config.programId, { entrance: e, academic: a, interview: iv });
    setEditing(false);
  }

  const hasWeights = config.weights.entrance > 0 || config.weights.academic > 0 || config.weights.interview > 0;

  return (
    <div className="info-card" style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text)' }}>
          {config.programName}
        </div>
        {!editing && hasWeights && (
          <button
            className="btn-secondary"
            onClick={() => setEditing(true)}
            style={{ fontSize: '12px', padding: '4px 12px' }}
          >
            Edit Weights
          </button>
        )}
      </div>

      {!editing && hasWeights ? (
        <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          <span>Entrance: <strong style={{ color: 'var(--color-text)' }}>{config.weights.entrance}%</strong></span>
          <span>Academic: <strong style={{ color: 'var(--color-text)' }}>{config.weights.academic}%</strong></span>
          <span>Interview: <strong style={{ color: 'var(--color-text)' }}>{config.weights.interview}%</strong></span>
        </div>
      ) : (
        <div>
          <div className="weight-row">
            <span className="weight-label">Entrance (%)</span>
            <input
              className="weight-input"
              type="number"
              min={0}
              max={100}
              value={entrance}
              onChange={(e) => setEntrance(e.target.value)}
            />
          </div>
          <div className="weight-row">
            <span className="weight-label">Academic (%)</span>
            <input
              className="weight-input"
              type="number"
              min={0}
              max={100}
              value={academic}
              onChange={(e) => setAcademic(e.target.value)}
            />
          </div>
          <div className="weight-row">
            <span className="weight-label">Interview (%)</span>
            <input
              className="weight-input"
              type="number"
              min={0}
              max={100}
              value={interview}
              onChange={(e) => setInterview(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: isValid ? '#166534' : '#C41010',
              }}
            >
              Total: {total.toFixed(1)}/100
            </span>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={!isValid || saving}
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              {saving ? 'Saving...' : 'Save Weights'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function EvaluationWorkflow({ cycle, ptat, lpps, initialEvaluation }: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(initialEvaluation);
  const [scores, setScores] = useState<EvaluationScore[]>([]);
  const [ranks, setRanks] = useState<RankRecord[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [generatingScores, setGeneratingScores] = useState(false);
  const [generatingRanks, setGeneratingRanks] = useState(false);
  const [savingWeights, setSavingWeights] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [tieBreaker, setTieBreaker] = useState<'entrance' | 'academic'>(
    initialEvaluation?.tieBreaker ?? 'entrance'
  );

  // Load applications
  useEffect(() => {
    fetch('/api/applications')
      .then((r) => r.json())
      .then((data) => setApps(Array.isArray(data) ? data : []));
  }, []);

  // Load scores if evaluation exists
  useEffect(() => {
    if (!evaluation) return;
    const programId = evaluation.strategy === 'single' ? 'all' : selectedProgram;
    if (!programId) return;
    fetch(`/api/evaluation-scores?evaluationId=${evaluation.id}&programId=${programId}`)
      .then((r) => r.json())
      .then((data) => setScores(Array.isArray(data) ? data : []));
  }, [evaluation, selectedProgram]);

  // Load ranks if evaluation exists
  useEffect(() => {
    if (!evaluation) return;
    const programId = evaluation.strategy === 'single' ? 'all' : selectedProgram;
    if (!programId) return;
    fetch(`/api/rank-records?evaluationId=${evaluation.id}&programId=${programId}`)
      .then((r) => r.json())
      .then((data) => setRanks(Array.isArray(data) ? data : []));
  }, [evaluation, selectedProgram]);

  const appMap = new Map(apps.map((a) => [a.id, a]));

  // Move to a step if evaluation already has data
  useEffect(() => {
    if (!initialEvaluation) return;
    if (initialEvaluation.status === 'Approved') {
      setCurrentStep(5);
      setApproved(true);
    } else if (initialEvaluation.ranksGenerated) {
      setCurrentStep(4);
    } else if (initialEvaluation.status === 'Scored') {
      setCurrentStep(3);
    } else if (initialEvaluation.strategy) {
      setCurrentStep(2);
    }
    setTieBreaker(initialEvaluation.tieBreaker ?? 'entrance');
  }, [initialEvaluation]);

  // Initialize selectedProgram for program-wise
  useEffect(() => {
    if (evaluation?.strategy === 'program-wise' && lpps.length > 0) {
      setSelectedProgram(lpps[0].id);
    } else {
      setSelectedProgram('all');
    }
  }, [evaluation?.strategy, lpps]);

  // ── Step 1: Strategy ──
  async function handleStrategySelect(strategy: 'single' | 'program-wise') {
    // Build programConfigs
    let programConfigs: ProgramConfig[];
    if (strategy === 'single') {
      programConfigs = [
        {
          programId: 'all',
          programName: 'All Programs',
          weights: { entrance: 0, academic: 0, interview: 0 },
          scoresGenerated: false,
        },
      ];
    } else {
      programConfigs = lpps.map((lpp) => ({
        programId: lpp.id,
        programName: lpp.name,
        weights: { entrance: 0, academic: 0, interview: 0 },
        scoresGenerated: false,
      }));
    }

    let newEval: Evaluation;
    if (evaluation) {
      // Update existing
      const res = await fetch(`/api/evaluations/${evaluation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy, programConfigs }),
      });
      newEval = await res.json();
    } else {
      // Create new
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId: cycle.id,
          strategy,
          programConfigs,
          tieBreaker: null,
          ranksGenerated: false,
          status: 'Draft',
        }),
      });
      newEval = await res.json();
    }
    setEvaluation(newEval);
    setCurrentStep(2);
  }

  // ── Save weights ──
  const handleSaveWeights = useCallback(
    async (programId: string, weights: ProgramWeights) => {
      if (!evaluation) return;
      setSavingWeights(true);
      try {
        const updatedConfigs = evaluation.programConfigs.map((pc) =>
          pc.programId === programId ? { ...pc, weights } : pc
        );
        const res = await fetch(`/api/evaluations/${evaluation.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programConfigs: updatedConfigs }),
        });
        const updated: Evaluation = await res.json();
        setEvaluation(updated);
      } finally {
        setSavingWeights(false);
      }
    },
    [evaluation]
  );

  // ── Generate Scores ──
  async function handleGenerateScores() {
    if (!evaluation) return;
    setGeneratingScores(true);
    try {
      const programId = evaluation.strategy === 'single' ? 'all' : selectedProgram;
      await fetch(`/api/evaluations/${evaluation.id}/generate-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId }),
      });
      // Reload evaluation and scores
      const [evalRes, scoresRes] = await Promise.all([
        fetch(`/api/evaluations/${evaluation.id}`).then((r) => r.json()),
        fetch(
          `/api/evaluation-scores?evaluationId=${evaluation.id}&programId=${programId}`
        ).then((r) => r.json()),
      ]);
      setEvaluation(evalRes);
      setScores(Array.isArray(scoresRes) ? scoresRes : []);
    } finally {
      setGeneratingScores(false);
    }
  }

  // ── Save tiebreaker & generate rankings ──
  async function handleGenerateRankings() {
    if (!evaluation) return;
    setGeneratingRanks(true);
    try {
      // Save tiebreaker first
      await fetch(`/api/evaluations/${evaluation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tieBreaker }),
      });

      const programId = evaluation.strategy === 'single' ? 'all' : selectedProgram;
      await fetch(`/api/evaluations/${evaluation.id}/generate-rankings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId }),
      });

      const [evalRes, ranksRes] = await Promise.all([
        fetch(`/api/evaluations/${evaluation.id}`).then((r) => r.json()),
        fetch(
          `/api/rank-records?evaluationId=${evaluation.id}&programId=${programId}`
        ).then((r) => r.json()),
      ]);
      setEvaluation(evalRes);
      setRanks(Array.isArray(ranksRes) ? ranksRes : []);
    } finally {
      setGeneratingRanks(false);
    }
  }

  // ── Approve ──
  async function handleApprove() {
    if (!evaluation) return;
    setApproving(true);
    try {
      await fetch(`/api/evaluations/${evaluation.id}/approve`, { method: 'POST' });
      setApproved(true);
      setCurrentStep(5);
    } finally {
      setApproving(false);
    }
  }

  // ─── Render Steps ─────────────────────────────────────────────────────────

  function renderStep1() {
    const selectedStrategy = evaluation?.strategy;
    return (
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
          Evaluation Strategy
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Choose how to evaluate candidates for this cycle.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label className={`radio-card${selectedStrategy === 'single' ? ' selected' : ''}`}>
            <input
              type="radio"
              name="evalStrategy"
              value="single"
              checked={selectedStrategy === 'single'}
              onChange={() => {}}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px' }}>
                Single Evaluation
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                One composite score configuration applies to all candidates across all programs.
              </div>
            </div>
          </label>
          <label className={`radio-card${selectedStrategy === 'program-wise' ? ' selected' : ''}`}>
            <input
              type="radio"
              name="evalStrategy"
              value="program-wise"
              checked={selectedStrategy === 'program-wise'}
              onChange={() => {}}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px' }}>
                Program-wise Evaluation
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Configure separate weights for each program. All candidates are ranked for every program.
              </div>
            </div>
          </label>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '28px' }}>
          <button
            className={`btn-secondary${selectedStrategy === 'single' ? '' : ''}`}
            onClick={() => handleStrategySelect('single')}
          >
            Use Single Evaluation
          </button>
          <button
            className="btn-secondary"
            onClick={() => handleStrategySelect('program-wise')}
          >
            Use Program-wise
          </button>
        </div>
      </div>
    );
  }

  function renderStep2() {
    if (!evaluation) return null;
    const isSingle = evaluation.strategy === 'single';
    const config = evaluation.programConfigs.find(
      (pc) => pc.programId === (isSingle ? 'all' : selectedProgram)
    );

    const allScoresGenerated = evaluation.programConfigs.every((pc) => pc.scoresGenerated);
    const hasWeights = evaluation.programConfigs.every(
      (pc) => pc.weights.entrance + pc.weights.academic + pc.weights.interview > 0
    );

    return (
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
          Composite Score Configuration
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
          Set the weights for entrance, academic, and interview scores. They must sum to 100.
        </p>

        {isSingle ? (
          config && (
            <WeightPanel
              config={config}
              onSave={handleSaveWeights}
              saving={savingWeights}
            />
          )
        ) : (
          <>
            <div className="program-tabs">
              {evaluation.programConfigs.map((pc) => (
                <button
                  key={pc.programId}
                  className={`program-tab${selectedProgram === pc.programId ? ' active' : ''}`}
                  onClick={() => setSelectedProgram(pc.programId)}
                >
                  {pc.programName}
                  {pc.scoresGenerated && (
                    <span style={{ marginLeft: '6px', color: '#166534' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ padding: '20px 0 0' }}>
              {config && (
                <WeightPanel
                  config={config}
                  onSave={handleSaveWeights}
                  saving={savingWeights}
                />
              )}
            </div>
          </>
        )}

        {hasWeights && (
          <div style={{ marginTop: '24px' }}>
            <button
              className="btn-primary"
              onClick={handleGenerateScores}
              disabled={generatingScores}
              style={{ background: '#16A34A', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {generatingScores ? (
                <>
                  <span className="spinner" style={{ width: '16px', height: '16px', borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
                  Generating...
                </>
              ) : (
                `Generate Scores${isSingle ? '' : ` for ${config?.programName ?? 'program'}`}`
              )}
            </button>
          </div>
        )}

        {scores.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>
              Score Results ({scores.length} candidates)
            </div>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Entrance</th>
                    <th>Academic</th>
                    <th>Interview</th>
                    <th>Composite</th>
                  </tr>
                </thead>
                <tbody>
                  {[...scores]
                    .sort((a, b) => b.compositeScore - a.compositeScore)
                    .map((score) => {
                      const app = appMap.get(score.applicationId);
                      return (
                        <tr key={score.id}>
                          <td style={{ fontWeight: 500 }}>{app?.studentName ?? score.applicationId}</td>
                          <td>
                            <span className={catClass(app?.category ?? '')}>
                              {app?.category ?? '-'}
                            </span>
                          </td>
                          <td>{score.entranceScore}</td>
                          <td>{score.academicScore}</td>
                          <td>{score.interviewScore}</td>
                          <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                            {score.compositeScore.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ marginTop: '28px' }}>
          <button
            className="btn-primary"
            onClick={() => setCurrentStep(3)}
            disabled={!allScoresGenerated && scores.length === 0}
          >
            Continue to Ranking →
          </button>
        </div>
      </div>
    );
  }

  function renderStep3() {
    if (!evaluation) return null;
    const isSingle = evaluation.strategy === 'single';

    return (
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
          Ranking Configuration
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Configure the tiebreaker and generate rankings.
        </p>

        <div className="info-card" style={{ marginBottom: '24px' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '14px' }}>Tiebreaker</div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Applied only when two candidates have the same composite score (within 0.1)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label
              className={`radio-card${tieBreaker === 'entrance' ? ' selected' : ''}`}
              style={{ padding: '14px 18px' }}
            >
              <input
                type="radio"
                value="entrance"
                checked={tieBreaker === 'entrance'}
                onChange={() => setTieBreaker('entrance')}
              />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Entrance Score</span>
            </label>
            <label
              className={`radio-card${tieBreaker === 'academic' ? ' selected' : ''}`}
              style={{ padding: '14px 18px' }}
            >
              <input
                type="radio"
                value="academic"
                checked={tieBreaker === 'academic'}
                onChange={() => setTieBreaker('academic')}
              />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Academic Score</span>
            </label>
          </div>
        </div>

        {!isSingle && (
          <div className="program-tabs" style={{ marginBottom: '20px' }}>
            {evaluation.programConfigs.map((pc) => (
              <button
                key={pc.programId}
                className={`program-tab${selectedProgram === pc.programId ? ' active' : ''}`}
                onClick={() => setSelectedProgram(pc.programId)}
              >
                {pc.programName}
              </button>
            ))}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleGenerateRankings}
          disabled={generatingRanks}
          style={{ background: '#16A34A', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}
        >
          {generatingRanks ? (
            <>
              <span className="spinner" style={{ width: '16px', height: '16px', borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
              Generating Rankings...
            </>
          ) : (
            'Generate Rankings'
          )}
        </button>

        {ranks.length > 0 && (
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>
              Rankings ({ranks.length} candidates)
            </div>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Composite</th>
                    <th>Global Rank</th>
                    <th>Category Rank</th>
                    <th>Tie Breaker</th>
                    <th>Entrance</th>
                    <th>Academic</th>
                    <th>Interview</th>
                  </tr>
                </thead>
                <tbody>
                  {[...ranks]
                    .sort((a, b) => a.globalRank - b.globalRank)
                    .map((rank) => {
                      const app = appMap.get(rank.applicationId);
                      return (
                        <tr key={rank.id}>
                          <td style={{ fontWeight: 500 }}>{app?.studentName ?? rank.applicationId}</td>
                          <td>
                            <span className={catClass(rank.category)}>{rank.category}</span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{rank.compositeScore.toFixed(2)}</td>
                          <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>#{rank.globalRank}</td>
                          <td>#{rank.categoryRank}</td>
                          <td>{rank.tieBreakerType !== '-' ? rank.tieBreakerValue : '-'}</td>
                          <td>{app?.entranceScore}</td>
                          <td>{app?.academicScore}</td>
                          <td>{app?.interviewScore}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {ranks.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <button className="btn-primary" onClick={() => setCurrentStep(4)}>
              Continue to Preview →
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderStep4() {
    if (!evaluation) return null;
    const isSingle = evaluation.strategy === 'single';

    const categories = ['All', 'General', 'OBC', 'SC', 'ST', 'EWS'];
    const filteredRanks =
      categoryFilter === 'All'
        ? ranks
        : ranks.filter((r) => r.category === categoryFilter);

    const totalConfig = evaluation.programConfigs;

    return (
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
          Preview
        </h2>

        {/* Summary card */}
        <div className="info-card" style={{ marginBottom: '20px' }}>
          <div className="info-row">
            <span className="info-label">Evaluation Strategy</span>
            <span className="info-value">{isSingle ? 'Single' : 'Program-wise'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Tiebreaker</span>
            <span className="info-value">{evaluation.tieBreaker ?? tieBreaker ?? '-'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Total Candidates</span>
            <span className="info-value">{ranks.length}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Ranking Types</span>
            <span className="info-value">Global + Category</span>
          </div>
        </div>

        {!isSingle && (
          <div className="program-tabs" style={{ marginBottom: '20px' }}>
            {evaluation.programConfigs.map((pc) => (
              <button
                key={pc.programId}
                className={`program-tab${selectedProgram === pc.programId ? ' active' : ''}`}
                onClick={() => setSelectedProgram(pc.programId)}
              >
                {pc.programName}
              </button>
            ))}
          </div>
        )}

        {/* Category filter */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: '1.5px solid',
                borderColor: categoryFilter === cat ? 'var(--color-primary)' : '#D0C8C8',
                background: categoryFilter === cat ? 'var(--color-primary)' : 'white',
                color: categoryFilter === cat ? 'white' : 'var(--color-text)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Composite</th>
                <th>Global Rank</th>
                <th>Category Rank</th>
                <th>Tie Breaker</th>
                <th>Entrance</th>
                <th>Academic</th>
                <th>Interview</th>
              </tr>
            </thead>
            <tbody>
              {filteredRanks.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>
                    No data for this filter
                  </td>
                </tr>
              ) : (
                [...filteredRanks]
                  .sort((a, b) => a.globalRank - b.globalRank)
                  .map((rank) => {
                    const app = appMap.get(rank.applicationId);
                    return (
                      <tr key={rank.id}>
                        <td style={{ fontWeight: 500 }}>{app?.studentName ?? rank.applicationId}</td>
                        <td>
                          <span className={catClass(rank.category)}>{rank.category}</span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{rank.compositeScore.toFixed(2)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>#{rank.globalRank}</td>
                        <td>#{rank.categoryRank}</td>
                        <td>{rank.tieBreakerType !== '-' ? rank.tieBreakerValue : '-'}</td>
                        <td>{app?.entranceScore}</td>
                        <td>{app?.academicScore}</td>
                        <td>{app?.interviewScore}</td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>

        <div className="success-banner" style={{ marginBottom: '24px' }}>
          <span>✓</span>
          Ready for Approval — all rankings have been generated successfully.
        </div>

        <button className="btn-primary" onClick={() => setCurrentStep(5)}>
          Continue to Approval →
        </button>
      </div>
    );
  }

  function renderStep5() {
    if (!evaluation) return null;

    if (approved || evaluation.status === 'Approved') {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
            Cycle Evaluation Approved
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '32px' }}>
            The evaluation for <strong>{cycle.name}</strong> has been approved successfully.
          </div>
          <button className="btn-primary" onClick={() => router.push('/')}>
            Back to Cycles
          </button>
        </div>
      );
    }

    return (
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '20px' }}>
          Approval
        </h2>

        {/* Cycle Info */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '10px' }}>
            Cycle Info
          </div>
          <div className="info-card">
            <div className="info-row">
              <span className="info-label">Cycle Name</span>
              <span className="info-value">{cycle.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Academic Year</span>
              <span className="info-value">{cycle.academicYear}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Program Group</span>
              <span className="info-value">{ptat?.name ?? cycle.ptatId}</span>
            </div>
          </div>
        </div>

        {/* Evaluation Config */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '10px' }}>
            Evaluation Config
          </div>
          <div className="info-card">
            <div className="info-row">
              <span className="info-label">Strategy</span>
              <span className="info-value">{evaluation.strategy}</span>
            </div>
            {evaluation.programConfigs.map((pc) => (
              <div key={pc.programId} className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                <span className="info-label">{pc.programName}</span>
                <span className="info-value" style={{ fontSize: '13px' }}>
                  Entrance: {pc.weights.entrance}% | Academic: {pc.weights.academic}% | Interview: {pc.weights.interview}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking Config */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', marginBottom: '10px' }}>
            Ranking Config
          </div>
          <div className="info-card">
            <div className="info-row">
              <span className="info-label">Tiebreaker</span>
              <span className="info-value">{evaluation.tieBreaker ?? '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Total Ranked</span>
              <span className="info-value">{ranks.length} candidates</span>
            </div>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleApprove}
          disabled={approving}
          style={{ width: '100%', padding: '14px', fontSize: '16px', borderRadius: '10px' }}
        >
          {approving ? 'Sending for Approval...' : 'Send for Approval'}
        </button>
      </div>
    );
  }

  // ─── Layout ───────────────────────────────────────────────────────────────

  return (
    <div className="page-container">
      <div style={{ marginBottom: '8px' }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-primary)',
            fontSize: '14px',
            cursor: 'pointer',
            padding: 0,
            fontWeight: 500,
          }}
        >
          ← Back to Cycles
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>{cycle.name}</h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {ptat?.name} · Academic Year {cycle.academicYear} · Cycle #{cycle.number}
          </div>
        </div>
        <span
          className={`badge ${cycle.status === 'Approved' ? 'badge-maroon' : cycle.status === 'Active' ? 'badge-success' : 'badge-default'}`}
          style={{ marginTop: '6px' }}
        >
          {cycle.status}
        </span>
      </div>

      <StepProgress currentStep={currentStep} />

      <div className="wizard-card">
        <div className="wizard-body">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </div>
      </div>
    </div>
  );
}
