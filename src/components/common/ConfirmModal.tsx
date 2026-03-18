'use client';

import React from 'react';
import Modal from '@salesforce/design-system-react/components/modal';
import Button from '@salesforce/design-system-react/components/button';

interface ConfirmModalProps {
  isOpen: boolean;
  heading: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  heading,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      heading={heading}
      onRequestClose={onCancel}
      prompt="warning"
      size="small"
      footer={[
        <Button key="cancel" label={cancelLabel} onClick={onCancel} disabled={isLoading} />,
        <Button
          key="confirm"
          label={isLoading ? 'Processing...' : confirmLabel}
          variant="destructive"
          onClick={onConfirm}
          disabled={isLoading}
        />,
      ]}
    >
      <div className="slds-p-around_medium">
        <p>{message}</p>
      </div>
    </Modal>
  );
}
