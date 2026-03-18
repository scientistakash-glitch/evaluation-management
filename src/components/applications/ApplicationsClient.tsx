'use client';

import React, { useState } from 'react';
import { Application } from '@/types';
import StatusBadge from '../common/StatusBadge';

interface ApplicationsClientProps {
  initialApplications: Application[];
}

export default function ApplicationsClient({ initialApplications }: ApplicationsClientProps) {
  const [search, setSearch] = useState('');

  const filtered = initialApplications.filter(
    (a) =>
      a.studentName.toLowerCase().includes(search.toLowerCase()) ||
      a.rollNumber.toLowerCase().includes(search.toLowerCase())
  );

  const tableItems = filtered.map((a) => ({
    ...a,
    entranceScoreDisplay: `${a.entranceScore}/300`,
    academicScoreDisplay: `${a.academicScore}%`,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: '12px', color: '#706e6b', marginBottom: '4px' }}>Student Applications</div>
          <h1 className="page-title">Applications ({initialApplications.length})</h1>
        </div>
      </div>

      <div style={{ marginTop: '16px' }}>
        <div style={{ padding: '12px 0', marginBottom: '8px', maxWidth: '360px' }}>
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Search by name or roll number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table className="table-custom">
          <thead>
            <tr>
              <th>Roll Number</th>
              <th>Name</th>
              <th>Category</th>
              <th>Entrance Score</th>
              <th>Academic Score</th>
              <th>Application Date</th>
            </tr>
          </thead>
          <tbody>
            {tableItems.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#706e6b', padding: '32px' }}>
                  No applications found.
                </td>
              </tr>
            )}
            {tableItems.map((item) => (
              <tr key={item.id}>
                <td>{item.rollNumber}</td>
                <td>{item.studentName}</td>
                <td>
                  <span className="badge badge-default">{item.category}</span>
                </td>
                <td>{item.entranceScoreDisplay}</td>
                <td>{item.academicScoreDisplay}</td>
                <td>{item.applicationDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
