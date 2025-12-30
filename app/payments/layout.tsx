'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function PaymentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Determine active tab based on pathname
  const isCurrent = pathname === '/payments/current' || pathname === '/payments';
  const isHistory = pathname === '/payments/history';

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <div className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]">
          <Link
            href="/payments/current"
            className={cn(
              'inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50',
              isCurrent
                ? 'bg-background text-foreground shadow-sm border-input'
                : 'text-foreground'
            )}
          >
            Current
          </Link>
          <Link
            href="/payments/history"
            className={cn(
              'inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50',
              isHistory
                ? 'bg-background text-foreground shadow-sm border-input'
                : 'text-foreground'
            )}
          >
            History
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}

