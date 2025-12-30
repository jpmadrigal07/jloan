'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface Payment {
  payment: {
    id: number;
    loanId: number;
    dueDate: string;
    amountDue: number | string;
    amountPaid: number | string | null;
    status: string;
    paidDate: string | null;
  };
  loan: {
    id: number;
    lenderName: string;
    sourceType: string;
    minimumPayment?: number | string;
  };
}

interface PaymentsResponse {
  data: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ITEMS_PER_PAGE = 10;

// Query function to fetch paid payments with pagination
async function fetchPaidPayments(page: number): Promise<PaymentsResponse> {
  const response = await fetch(
    `/api/payments?status=paid&page=${page}&limit=${ITEMS_PER_PAGE}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch payment history');
  }
  return response.json();
}

export function PaymentsHistory() {
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch paid payments with TanStack Query (page number in query key for caching)
  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['payments', 'history', currentPage],
    queryFn: () => fetchPaidPayments(currentPage),
    staleTime: 60 * 1000, // 1 minute
  });

  const payments = response?.data || [];
  const pagination = response?.pagination || {
    page: 1,
    limit: ITEMS_PER_PAGE,
    total: 0,
    totalPages: 0,
  };

  const formatCurrency = (amount: number | string | null) => {
    if (amount === null) return '—';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(num);
  };

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (
      pagination.totalPages > 0 &&
      currentPage > pagination.totalPages
    ) {
      setCurrentPage(1);
    }
  }, [currentPage, pagination.totalPages]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of the table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = 5;
    const totalPages = pagination.totalPages;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near the start
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            {error instanceof Error
              ? error.message
              : 'Failed to load payment history. Please try again.'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(
    startIndex + payments.length,
    pagination.total
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
        {pagination.total > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Showing {startIndex + 1}-{endIndex} of {pagination.total} payments
          </p>
        )}
      </CardHeader>
      <CardContent>
        {pagination.total === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No payment history found.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lender</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Original Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((item) => (
                  <TableRow key={item.payment.id}>
                    <TableCell className="font-medium">
                      {item.loan.lenderName}
                    </TableCell>
                    <TableCell>
                      {item.payment.paidDate
                        ? new Date(item.payment.paidDate).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {formatCurrency(item.payment.amountPaid)}
                    </TableCell>
                    <TableCell>
                      {new Date(item.payment.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className="text-green-600">{item.payment.status}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pagination.totalPages > 1 && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) {
                            handlePageChange(currentPage - 1);
                          }
                        }}
                        className={
                          currentPage === 1 ? 'pointer-events-none opacity-50' : ''
                        }
                      />
                    </PaginationItem>
                    {getPageNumbers().map((page, index) => (
                      <PaginationItem key={index}>
                        {page === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(page);
                            }}
                            isActive={currentPage === page}
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < pagination.totalPages) {
                            handlePageChange(currentPage + 1);
                          }
                        }}
                        className={
                          currentPage === pagination.totalPages
                            ? 'pointer-events-none opacity-50'
                            : ''
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

