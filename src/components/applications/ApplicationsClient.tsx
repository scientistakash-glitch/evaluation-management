'use client';

import React, { useState } from 'react';
import DataTable from '@salesforce/design-system-react/components/data-table';
import DataTableColumn from '@salesforce/design-system-react/components/data-table/column';
import DataTableCell from '@salesforce/design-system-react/components/data-table/cell';
import PageHeader from '@salesforce/design-system-react/components/page-header';
import Input from '@salesforce/design-system-react/components/input';
import { Application } from '@/types';
import StatusBadge from '../common/StatusBadge';

interface ApplicationsClientProps {
  initialApplications: Application[];
}

const CategoryCell = ({ item, ...props }: any) => (
  <DataTableCell {...props} item={item}>
    <StatusBadge status={item?.category ?? ''} />
  </DataTableCell>
);
CategoryCell.displayName = DataTableCell.displayName;

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
      <PageHeader
        label="Student Applications"
        title={`Applications (${initialApplications.length})`}
        variant="object-home"
      />
      <div className="slds-card slds-m-top_medium">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #dddbda' }}>
          <div style={{ maxWidth: '360px' }}>
            <Input
              id="app-search"
              label=""
              placeholder="Search by name or roll number..."
              value={search}
              onChange={(_e: any, data: { value: string }) => setSearch(data.value)}
            />
          </div>
        </div>
        <DataTable items={tableItems} id="applications-table">
          <DataTableColumn label="Roll Number" property="rollNumber" primaryColumn />
          <DataTableColumn label="Name" property="studentName" />
          <DataTableColumn label="Category" property="category">
            <CategoryCell />
          </DataTableColumn>
          <DataTableColumn label="Entrance Score" property="entranceScoreDisplay" />
          <DataTableColumn label="Academic Score" property="academicScoreDisplay" />
          <DataTableColumn label="Application Date" property="applicationDate" />
        </DataTable>
      </div>
    </div>
  );
}
