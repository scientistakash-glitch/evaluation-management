'use client';

import React from 'react';
import { CriteriaSet } from '@/types';
import Link from 'next/link';

interface CriteriaSetDetailProps {
  criteriaSet: CriteriaSet;
}

export default function CriteriaSetDetail({ criteriaSet }: CriteriaSetDetailProps) {
  const totalWeightage = criteriaSet.criteria.reduce((sum, c) => sum + c.weightage, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: '12px', color: '#706e6b', marginBottom: '4px' }}>Criteria Set</div>
          <h1 className="page-title">{criteriaSet.name}</h1>
        </div>
        <Link href="/criteria-sets">
          <button className="btn-secondary">Back to Criteria Sets</button>
        </Link>
      </div>

      <div className="card" style={{ marginTop: '16px', padding: '24px' }}>
        <h3 style={{ fontWeight: 700, color: '#3e3e3c', marginBottom: '16px' }}>Details</h3>
        {criteriaSet.description && (
          <p style={{ color: '#706e6b', marginBottom: '16px' }}>{criteriaSet.description}</p>
        )}

        <table className="table-custom">
          <thead>
            <tr>
              <th>Criterion Name</th>
              <th>Source Field</th>
              <th>Weightage</th>
            </tr>
          </thead>
          <tbody>
            {criteriaSet.criteria.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td>
                  {c.sourceField ? (
                    <span
                      style={{
                        background: '#e8f4fd',
                        color: '#0070d2',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '13px',
                      }}
                    >
                      {c.sourceField}
                    </span>
                  ) : (
                    <span style={{ color: '#706e6b', fontSize: '13px' }}>Manual scoring</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: `${c.weightage * 2}px`,
                        height: '8px',
                        background: '#0070d2',
                        borderRadius: '4px',
                        minWidth: '4px',
                      }}
                    />
                    <span style={{ fontWeight: 700 }}>{c.weightage}%</span>
                  </div>
                </td>
              </tr>
            ))}
            <tr style={{ background: '#f3f3f3', fontWeight: 700 }}>
              <td colSpan={2}>Total</td>
              <td style={{ color: totalWeightage === 100 ? '#2e844a' : '#ba0517' }}>
                {totalWeightage}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
