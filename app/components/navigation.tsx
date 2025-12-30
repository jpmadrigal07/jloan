'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, CreditCard, TrendingUp, Calendar, Wallet, LogOut } from 'lucide-react';
import { StrategySelector } from './strategy-selector';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/payments', label: 'Payments', icon: Calendar },
  { href: '/budget', label: 'Monthly Budget', icon: Wallet },
  { href: '/loans', label: 'Loans', icon: CreditCard },
  { href: '/projections', label: 'Payoff Projections', icon: TrendingUp },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-6 h-16">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">Loan Management</h1>
            <div className="flex gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                // For payments, check if pathname starts with /payments
                // For dashboard, check if pathname is /dashboard
                // For other routes, check exact match
                const isActive =
                  item.href === '/payments'
                    ? pathname === item.href || pathname.startsWith('/payments/')
                    : item.href === '/dashboard'
                    ? pathname === item.href
                    : pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <StrategySelector />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
