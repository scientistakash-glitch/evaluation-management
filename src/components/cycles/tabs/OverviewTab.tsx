'use client';

import React from 'react';
import { Cycle, PTAT, LPP } from '@/types';
import StatusBadge from '../../common/StatusBadge';

interface OverviewTabProps {
  cycle: Cycle;
  ptat: PTAT | null;
  lpp: LPP | null;
}

export default function OverviewTab({ cycle, ptat, lpp }: OverviewTabProps) {
  const fields = [
    { label: 'Academic Year', value: cycle.academicYear },
    { label: 'Cycle Number', value: cycle.cycleNumber },
    { label: 'Status', value: <StatusBadge status={cycle.status} /> },
    { label: 'PTAT', value: ptat ? `${ptat.name} (${ptat.code})` : cycle.ptatId },
    { label: 'Learning Program', value: lpp ? `${lpp.name} (${lpp.code})` : cycle.lppId },
    { label: 'Duration', value: lpp ? `${lpp.duration} year${lpp.duration !== 1 ? 's' : ''}` : '—' },
    { label: 'Start Date', value: cycle.startDate },
    { label: 'End Date', value: cycle.endDate },
    { label: 'Created At', value: new Date(cycle.createdAt).toLocaleDateString() },
  ];

  return (
    <div style={{ padding: '16px' }}>
      <div className="slds-grid slds-wrap slds-gutters">
        {fields.map((field) => (
          <div key={field.label} className="slds-col slds-size_1-of-3 slds-m-bottom_medium">
            <div className="slds-form-element">
              <label className="slds-form-element__label" style={{ color: '#706e6b', fontSize: '12px' }}>
                {field.label}
              </label>
              <div className="slds-form-element__control">
                <span className="slds-form-element__static" style={{ fontWeight: 500 }}>
                  {field.value}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
