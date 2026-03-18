'use client';

import React from 'react';
import IconSettings from '@salesforce/design-system-react/components/icon-settings';

export default function IconSettingsWrapper({ children }: { children: React.ReactNode }) {
  return (
    <IconSettings iconPath="/assets/icons">
      {children}
    </IconSettings>
  );
}
