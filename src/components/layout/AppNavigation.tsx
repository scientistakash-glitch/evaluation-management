'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Evaluation Matrix', href: '/' },
  { label: 'PTATs', href: '/ptats' },
  { label: 'Applications', href: '/applications' },
  { label: 'Criteria Sets', href: '/criteria-sets' },
];

export default function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="app-nav">
      <span className="nav-brand">Evaluation Management</span>
      {navItems.map((item) => {
        const isActive =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link${isActive ? ' active' : ''}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
