'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@salesforce/design-system-react/components/button';

export default function BackButton() {
  const router = useRouter();
  return <Button label="← Back to Cycles" onClick={() => router.push('/cycles')} />;
}
