'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Cycle, RankRecord, Application } from '@/types';
import { useToast } from '../../common/ToastContext';

interface RankOutputTabProps {
  cycle: Cycle;
}

const CATEGORIES = ['All', 'General', 'OBC', 'SC', 'ST', 'EWS'];

export default function RankOutputTab({ cycle }: RankOutputTabProps) {
  const { showToast } = useToast();
  const [rankRecords, setRankRecords] = useState<RankRecord[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [records, apps] = await Promise.all([
        fetch(`/api/rank-records?cycleId=${cycle.id}`).then((r) => r.json()),
        fetch('/api/applications').then((r) => r.json()),
      ]);
      setRankRecords(Array.isArray(records) ? records : []);
      setApplications(Array.isArray(apps) ? apps : []);
    } catch {
      showToast('Failed to load rank records', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [cycle.id, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading...
      </div>
    );
  }

  if (rankRecords.length === 0) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>No Rankings Yet</div>
      </div>
    );
  }

  const appMap = new Map(applications.map((a) => [a.id, a]));

  const filteredRecords = (
    activeCategory === 'All'
      ? rankRecords
      : rankRecords.filter((r) => r.category === activeCategory)
  ).sort((a, b) => (activeCategory === 'All' ? a.globalRank - b.globalRank : a.categoryRank - b.categoryRank));

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {CATEGORIES.map((cat) => {
          const count = cat === 'All'
            ? rankRecords.length
            : rankRecords.filter((r) => r.category === cat).length;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '6px 16px',
                borderRadius: '999px',
                border: isActive ? 'none' : '1.5px solid var(--color-border)',
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 400,
                background: isActive ? 'var(--color-primary)' : 'white',
                color: isActive ? 'white' : 'var(--color-text)',
                fontSize: '13px',
              }}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      <table className="table-custom">
        <thead>
          <tr>
            <th>{activeCategory === 'All' ? 'Global Rank' : 'Category Rank'}</th>
            <th>Name</th>
            <th>Category</th>
            <th>Composite Score</th>
          </tr>
        </thead>
        <tbody>
          {filteredRecords.map((record) => {
            const app = appMap.get(record.applicationId);
            return (
              <tr key={record.id}>
                <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                  #{activeCategory === 'All' ? record.globalRank : record.categoryRank}
                </td>
                <td style={{ fontWeight: 500 }}>{app?.studentName ?? record.applicationId}</td>
                <td>
                  <span className="badge badge-default">{record.category}</span>
                </td>
                <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>
                  {record.compositeScore.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
