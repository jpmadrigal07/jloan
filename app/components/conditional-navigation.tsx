'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from './navigation';

export function ConditionalNavigation() {
  const pathname = usePathname();
  
  // Hide navigation on login page
  if (pathname === '/') {
    return null;
  }
  
  return <Navigation />;
}

