'use client';

import React from 'react';
import PageHeader from '@salesforce/design-system-react/components/page-header';
import Card from '@salesforce/design-system-react/components/card';
import { CriteriaSet } from '@/types';
import Link from 'next/link';
import Button from '@salesforce/design-system-react/components/button';

interface CriteriaSetDetailProps {
  criteriaSet: CriteriaSet;
}

export default function CriteriaSetDetail({ criteriaSet }: CriteriaSetDetailProps) {
  const totalWeightage = criteriaSet.criteria.reduce((sum, c) => sum + c.weightage, 0);

  return (
    <div>
      <PageHeader
        label="Criteria Set"
        title={criteriaSet.name}
        variant="record-home"
        onRenderActions={() => (
          <Link href="/criteria-sets">
            <Button label="Back to Criteria Sets" />
          </Link>
        )}
      />

      <Card heading="Details" className="slds-m-top_medium">
        <div className="slds-p-around_medium">
          {criteriaSet.description && (
            <p style={{ color: '#706e6b', marginBottom: '16px' }}>{criteriaSet.description}</p>
          )}

          <table className="slds-table slds-table_cell-buffer slds-table_bordered">
            <thead>
              <tr>
                <th scope="col">Criterion Name</th>
                <th scope="col">Source Field</th>
                <th scope="col">Weightage</th>
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
      </Card>
    </div>
  );
}
