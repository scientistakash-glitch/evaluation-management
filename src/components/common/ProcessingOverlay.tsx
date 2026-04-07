'use client';

import React, { useEffect, useState } from 'react';

interface ProcessingOverlayProps {
  title: string;
  subtitle?: string;
  steps: string[];
}

export default function ProcessingOverlay({ title, subtitle, steps }: ProcessingOverlayProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    if (steps.length === 0) return;
    const interval = setInterval(() => {
      setCompletedSteps((prev) => {
        if (prev.length >= steps.length - 1) {
          clearInterval(interval);
          return prev;
        }
        const next = prev.length;
        setActiveStep(next + 1);
        return [...prev, next];
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(255,255,255,0.97)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px',
    }}>
      {/* Spinner */}
      <div style={{ position: 'relative', width: '72px', height: '72px', marginBottom: '32px' }}>
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          border: '3px solid var(--color-border, #f0e8e4)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: 'var(--color-primary, #c9837a)',
          animation: 'spin 0.9s linear infinite',
        }} />
      </div>

      {/* Title */}
      <h2 style={{
        fontSize: '22px', fontWeight: 700,
        color: 'var(--color-text, #1a1a1a)',
        marginBottom: '8px', textAlign: 'center',
      }}>
        {title}
      </h2>

      {subtitle && (
        <p style={{
          fontSize: '14px', color: 'var(--color-text-muted, #888)',
          marginBottom: '36px', textAlign: 'center', maxWidth: '400px',
        }}>
          {subtitle}
        </p>
      )}

      {/* Step checklist */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '12px',
        width: '100%', maxWidth: '360px',
        marginBottom: '40px',
      }}>
        {steps.map((label, i) => {
          const done = completedSteps.includes(i);
          const active = activeStep === i && !done;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              opacity: i > activeStep ? 0.35 : 1,
              transition: 'opacity 0.4s',
            }}>
              {/* Icon */}
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px',
                background: done
                  ? 'var(--color-primary, #c9837a)'
                  : active
                    ? 'transparent'
                    : 'var(--color-border, #f0e8e4)',
                border: active ? '2px solid var(--color-primary, #c9837a)' : 'none',
                transition: 'background 0.3s',
              }}>
                {done ? (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : active ? (
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: 'var(--color-primary, #c9837a)',
                    animation: 'pulse 1.2s ease-in-out infinite',
                  }} />
                ) : null}
              </div>
              <span style={{
                fontSize: '14px',
                color: done || active ? 'var(--color-text, #1a1a1a)' : 'var(--color-text-muted, #aaa)',
                fontWeight: active ? 600 : done ? 500 : 400,
                transition: 'color 0.3s',
              }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Email notice */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        background: 'var(--color-surface, #fdf8f7)',
        border: '1px solid var(--color-border, #f0e8e4)',
        borderRadius: '10px',
        padding: '14px 18px',
        maxWidth: '400px', width: '100%',
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
          <rect x="1" y="3" width="14" height="10" rx="2" stroke="var(--color-primary, #c9837a)" strokeWidth="1.4"/>
          <path d="M1 5.5L8 9.5L15 5.5" stroke="var(--color-primary, #c9837a)" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: '13px', color: 'var(--color-text-muted, #777)', lineHeight: '1.5' }}>
          A confirmation email will be sent to your registered email ID once this process is complete.
        </span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.75); }
        }
      `}</style>
    </div>
  );
}
