'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();
  return (
    <button className="btn-secondary" onClick={() => router.push('/cycles')}>
      ← Back to Cycles
    </button>
  );
}
