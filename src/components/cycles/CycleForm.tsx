'use client';

import React from 'react';
import { Cycle } from '@/types';

interface CycleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cycle: Cycle) => void;
  editData?: Cycle | null;
}

// This component is no longer actively used. Cycle creation now happens via /create-cycle wizard.
export default function CycleForm({ isOpen, onClose }: CycleFormProps) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2>Create Cycle</h2>
        </div>
        <div className="modal-body">
          <p>Please use the new cycle creation wizard instead.</p>
        </div>
        <div className="modal-footer">
          <button className="btn-pill-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
