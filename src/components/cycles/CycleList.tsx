'use client';

import React, { useState } from 'react';
import { Cycle, PTAT, LPP } from '@/types';
import StatusBadge from '../common/StatusBadge';
import Link from 'next/link';

interface CycleListProps {
  initialCycles: Cycle[];
  ptats: PTAT[];
  lpps: LPP[];
}

export default function CycleList({ initialCycles, ptats, lpps }: CycleListProps) {
  const [cycles] = useState<Cycle[]>(initialCycles);

  const ptatMap = new Map(ptats.map((p) => [p.id, p]));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Cycles</h1>
      </div>

      <div style={{ marginTop: '16px' }}>
        <table className="table-custom">
          <thead>
            <tr>
              <th>Name</th>
              <th>Academic Year</th>
              <th>Cycle #</th>
              <th>PTAT</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cycles.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#706e6b', padding: '32px' }}>
                  No cycles found.
                </td>
              </tr>
            )}
            {cycles.map((cycle) => (
              <tr key={cycle.id}>
                <td>
                  <Link href={`/cycle/${cycle.id}/evaluation`} style={{ color: '#0070d2', textDecoration: 'none' }}>
                    {cycle.name}
                  </Link>
                </td>
                <td>{cycle.academicYear}</td>
                <td>{cycle.number}</td>
                <td>{ptatMap.get(cycle.ptatId)?.name ?? cycle.ptatId}</td>
                <td><StatusBadge status={cycle.status} /></td>
                <td>
                  <Link href={`/cycle/${cycle.id}/evaluation`}>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                      View
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
