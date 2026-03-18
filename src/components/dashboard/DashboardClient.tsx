'use client';

import React from 'react';
import Card from '@salesforce/design-system-react/components/card';
import Button from '@salesforce/design-system-react/components/button';
import { useRouter } from 'next/navigation';

interface DashboardClientProps {
  ptatCount: number;
  lppCount: number;
  cycleCount: number;
  applicationCount: number;
  activeCycleCount: number;
}

const StatCard = ({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: number;
  subtitle?: string;
  color: string;
}) => (
  <div
    style={{
      background: '#fff',
      borderRadius: '8px',
      padding: '24px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      borderLeft: `4px solid ${color}`,
      flex: '1 1 200px',
    }}
  >
    <div style={{ fontSize: '12px', color: '#706e6b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
      {title}
    </div>
    <div style={{ fontSize: '36px', fontWeight: 700, color: '#3e3e3c', lineHeight: 1 }}>
      {value}
    </div>
    {subtitle && (
      <div style={{ fontSize: '13px', color: '#706e6b', marginTop: '6px' }}>{subtitle}</div>
    )}
  </div>
);

export default function DashboardClient({
  ptatCount,
  lppCount,
  cycleCount,
  applicationCount,
  activeCycleCount,
}: DashboardClientProps) {
  const router = useRouter();

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#032d60', margin: 0 }}>
          Evaluation Management Dashboard
        </h1>
        <p style={{ color: '#706e6b', marginTop: '4px' }}>
          Manage evaluation cycles, criteria, and student rankings
        </p>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <StatCard title="Total PTATs" value={ptatCount} color="#0070d2" />
        <StatCard title="Learning Programs" value={lppCount} color="#4bca81" />
        <StatCard
          title="Total Cycles"
          value={cycleCount}
          subtitle={`${activeCycleCount} active`}
          color="#ff9e2c"
        />
        <StatCard title="Applications" value={applicationCount} color="#9e5cc5" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        <div
          style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ fontWeight: 700, color: '#3e3e3c', marginBottom: '8px' }}>Quick Actions</h3>
          <p style={{ color: '#706e6b', fontSize: '13px', marginBottom: '16px' }}>
            Get started with common tasks
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Button
              label="New PTAT"
              variant="brand"
              onClick={() => router.push('/ptats')}
              style={{ width: '100%' }}
            />
            <Button
              label="New Cycle"
              variant="outline-brand"
              onClick={() => router.push('/cycles')}
              style={{ width: '100%' }}
            />
            <Button
              label="View Applications"
              variant="neutral"
              onClick={() => router.push('/applications')}
              style={{ width: '100%' }}
            />
            <Button
              label="Manage Criteria Sets"
              variant="neutral"
              onClick={() => router.push('/criteria-sets')}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ fontWeight: 700, color: '#3e3e3c', marginBottom: '8px' }}>How It Works</h3>
          <ol style={{ color: '#706e6b', fontSize: '13px', paddingLeft: '20px', lineHeight: 2 }}>
            <li>Create <strong>PTATs</strong> (Program Types) and add <strong>LPPs</strong> (Learning Programs)</li>
            <li>Create an evaluation <strong>Cycle</strong> for a specific PTAT/LPP combination</li>
            <li>Define <strong>Criteria Sets</strong> with weighted scoring criteria</li>
            <li>Open a cycle and configure the <strong>Evaluation</strong> tab</li>
            <li>Run the evaluation to compute <strong>Composite Scores</strong></li>
            <li>Configure <strong>Tiebreaker</strong> rules and generate final rankings</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
