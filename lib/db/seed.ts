import { db } from './index';
import { loans, upcomingPayments, monthlyBudget } from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await db.delete(upcomingPayments);
    await db.delete(loans);
    await db.delete(monthlyBudget);

    // Get current date for calculations
    const today = new Date();
    const getDateString = (daysOffset: number) => {
      const date = new Date(today);
      date.setDate(date.getDate() + daysOffset);
      return date.toISOString().split('T')[0];
    };

    // Create monthly budget
    console.log('💰 Creating monthly budget...');
    const [budget] = await db
      .insert(monthlyBudget)
      .values({
        monthlyAllocation: '25000.00',
        effectiveDate: getDateString(-30),
        isActive: true,
        notes: 'Monthly salary allocation for debt payments',
      })
      .returning();

    console.log(`✅ Created budget: ₱${budget.monthlyAllocation}/month`);

    // Create loans with various scenarios
    console.log('📝 Creating loans...');

    const loansData = [
      // Bank Loans
      {
        sourceType: 'bank' as const,
        lenderName: 'BDO',
        accountNumber: 'BDO-123456789',
        principalAmount: '500000.00',
        currentBalance: '300000.00',
        interestRate: '5.00',
        loanTermMonths: 60,
        startDate: getDateString(-180), // 6 months ago
        paymentFrequency: 'monthly' as const,
        minimumPayment: '5000.00',
        nextPaymentDueDate: getDateString(5), // Due in 5 days
        paymentStatus: 'upcoming' as const,
        strategyType: null,
        priorityOrder: null,
        isActive: true,
      },
      {
        sourceType: 'bank' as const,
        lenderName: 'BPI',
        accountNumber: 'BPI-987654321',
        principalAmount: '200000.00',
        currentBalance: '150000.00',
        interestRate: '6.50',
        loanTermMonths: 36,
        startDate: getDateString(-120), // 4 months ago
        paymentFrequency: 'monthly' as const,
        minimumPayment: '6000.00',
        nextPaymentDueDate: getDateString(-5), // Overdue by 5 days
        paymentStatus: 'overdue' as const,
        strategyType: null,
        priorityOrder: null,
        isActive: true,
      },
      {
        sourceType: 'bank' as const,
        lenderName: 'Metrobank',
        accountNumber: 'MB-456789123',
        principalAmount: '100000.00',
        currentBalance: '45000.00',
        interestRate: '4.75',
        loanTermMonths: 24,
        startDate: getDateString(-90), // 3 months ago
        paymentFrequency: 'monthly' as const,
        minimumPayment: '3000.00',
        nextPaymentDueDate: getDateString(15), // Due in 15 days
        paymentStatus: 'current' as const,
        strategyType: null,
        priorityOrder: null,
        isActive: true,
      },
      // Mobile App Loans
      {
        sourceType: 'mobile_app' as const,
        lenderName: 'GCash',
        accountNumber: 'GC-789123456',
        principalAmount: '50000.00',
        currentBalance: '25000.00',
        interestRate: '12.00', // Higher interest
        loanTermMonths: 12,
        startDate: getDateString(-60), // 2 months ago
        paymentFrequency: 'monthly' as const,
        minimumPayment: '4500.00',
        nextPaymentDueDate: getDateString(10), // Due in 10 days
        paymentStatus: 'current' as const,
        strategyType: null,
        priorityOrder: null,
        isActive: true,
      },
      {
        sourceType: 'mobile_app' as const,
        lenderName: 'Maya',
        accountNumber: 'MY-321654987',
        principalAmount: '30000.00',
        currentBalance: '18000.00',
        interestRate: '15.00', // Highest interest
        loanTermMonths: 6,
        startDate: getDateString(-30), // 1 month ago
        paymentFrequency: 'bi_weekly' as const,
        minimumPayment: '3500.00',
        nextPaymentDueDate: getDateString(3), // Due in 3 days
        paymentStatus: 'upcoming' as const,
        strategyType: null,
        priorityOrder: null,
        isActive: true,
      },
      {
        sourceType: 'mobile_app' as const,
        lenderName: 'Tala',
        accountNumber: 'TL-147258369',
        principalAmount: '20000.00',
        currentBalance: '8500.00', // Smallest balance
        interestRate: '18.00',
        loanTermMonths: 3,
        startDate: getDateString(-15), // 2 weeks ago
        paymentFrequency: 'weekly' as const,
        minimumPayment: '3000.00',
        nextPaymentDueDate: getDateString(7), // Due in 7 days
        paymentStatus: 'current' as const,
        strategyType: null,
        priorityOrder: null,
        isActive: true,
      },
      // Person-to-Person Loans
      {
        sourceType: 'person' as const,
        lenderName: 'John Santos',
        accountNumber: null,
        principalAmount: '80000.00',
        currentBalance: '60000.00',
        interestRate: '3.00', // Lower interest (friendly rate)
        loanTermMonths: 48,
        startDate: getDateString(-200), // ~6.5 months ago
        paymentFrequency: 'monthly' as const,
        minimumPayment: '2000.00',
        nextPaymentDueDate: getDateString(20), // Due in 20 days
        paymentStatus: 'current' as const,
        strategyType: null,
        priorityOrder: null,
        isActive: true,
      },
      {
        sourceType: 'person' as const,
        lenderName: 'Maria Garcia',
        accountNumber: null,
        principalAmount: '40000.00',
        currentBalance: '12000.00',
        interestRate: '5.50',
        loanTermMonths: 18,
        startDate: getDateString(-100), // ~3 months ago
        paymentFrequency: 'monthly' as const,
        minimumPayment: '2500.00',
        nextPaymentDueDate: getDateString(12), // Due in 12 days
        paymentStatus: 'current' as const,
        strategyType: null,
        priorityOrder: null,
        isActive: true,
      },
      // Paid off loan (inactive)
      {
        sourceType: 'mobile_app' as const,
        lenderName: 'Cashalo',
        accountNumber: 'CA-999888777',
        principalAmount: '15000.00',
        currentBalance: '0.00',
        interestRate: '10.00',
        loanTermMonths: 6,
        startDate: getDateString(-200),
        paymentFrequency: 'monthly' as const,
        minimumPayment: '3000.00',
        nextPaymentDueDate: getDateString(30),
        paymentStatus: 'current' as const,
        strategyType: null,
        priorityOrder: null,
        isActive: false, // Paid off
      },
    ];

    const insertedLoans = await db.insert(loans).values(loansData).returning();
    console.log(`✅ Created ${insertedLoans.length} loans`);

    // Create upcoming payments for various scenarios
    console.log('📅 Creating upcoming payments...');

    const paymentsData = [
      // Overdue payments
      {
        loanId: insertedLoans[1].id, // BPI (overdue loan)
        dueDate: getDateString(-5),
        amountDue: '6000.00',
        amountPaid: null,
        status: 'overdue' as const,
        paidDate: null,
      },
      {
        loanId: insertedLoans[1].id, // BPI (overdue loan)
        dueDate: getDateString(-35),
        amountDue: '6000.00',
        amountPaid: '6000.00',
        status: 'paid' as const,
        paidDate: getDateString(-33),
      },
      // Upcoming payments
      {
        loanId: insertedLoans[0].id, // BDO
        dueDate: getDateString(5),
        amountDue: '5000.00',
        amountPaid: null,
        status: 'pending' as const,
        paidDate: null,
      },
      {
        loanId: insertedLoans[2].id, // Metrobank
        dueDate: getDateString(15),
        amountDue: '3000.00',
        amountPaid: null,
        status: 'pending' as const,
        paidDate: null,
      },
      {
        loanId: insertedLoans[3].id, // GCash
        dueDate: getDateString(10),
        amountDue: '4500.00',
        amountPaid: null,
        status: 'pending' as const,
        paidDate: null,
      },
      {
        loanId: insertedLoans[4].id, // Maya
        dueDate: getDateString(3),
        amountDue: '3500.00',
        amountPaid: null,
        status: 'pending' as const,
        paidDate: null,
      },
      {
        loanId: insertedLoans[5].id, // Tala
        dueDate: getDateString(7),
        amountDue: '3000.00',
        amountPaid: null,
        status: 'pending' as const,
        paidDate: null,
      },
      {
        loanId: insertedLoans[6].id, // John Santos
        dueDate: getDateString(20),
        amountDue: '2000.00',
        amountPaid: null,
        status: 'pending' as const,
        paidDate: null,
      },
      {
        loanId: insertedLoans[7].id, // Maria Garcia
        dueDate: getDateString(12),
        amountDue: '2500.00',
        amountPaid: null,
        status: 'pending' as const,
        paidDate: null,
      },
      // Past paid payments
      {
        loanId: insertedLoans[0].id, // BDO
        dueDate: getDateString(-25),
        amountDue: '5000.00',
        amountPaid: '5000.00',
        status: 'paid' as const,
        paidDate: getDateString(-23),
      },
      {
        loanId: insertedLoans[2].id, // Metrobank
        dueDate: getDateString(-15),
        amountDue: '3000.00',
        amountPaid: '3000.00',
        status: 'paid' as const,
        paidDate: getDateString(-13),
      },
      {
        loanId: insertedLoans[3].id, // GCash
        dueDate: getDateString(-20),
        amountDue: '4500.00',
        amountPaid: '4500.00',
        status: 'paid' as const,
        paidDate: getDateString(-18),
      },
    ];

    const insertedPayments = await db
      .insert(upcomingPayments)
      .values(paymentsData)
      .returning();
    console.log(`✅ Created ${insertedPayments.length} payment records`);

    // Summary
    console.log('\n📊 Seed Summary:');
    console.log(`   - Monthly Budget: ₱${budget.monthlyAllocation}`);
    console.log(`   - Active Loans: ${insertedLoans.filter((l) => l.isActive).length}`);
    console.log(`   - Total Loans: ${insertedLoans.length}`);
    console.log(`   - Payment Records: ${insertedPayments.length}`);
    console.log(`   - Overdue Payments: ${insertedPayments.filter((p) => p.status === 'overdue').length}`);
    console.log(`   - Pending Payments: ${insertedPayments.filter((p) => p.status === 'pending').length}`);
    console.log(`   - Paid Payments: ${insertedPayments.filter((p) => p.status === 'paid').length}`);

    console.log('\n✨ Seed completed successfully!');
    console.log('\n💡 Loan scenarios included:');
    console.log('   - Bank loans (BDO, BPI, Metrobank)');
    console.log('   - Mobile app loans (GCash, Maya, Tala)');
    console.log('   - Person-to-person loans (John, Maria)');
    console.log('   - Overdue loan (BPI)');
    console.log('   - Smallest balance (Tala - ₱8,500)');
    console.log('   - Highest interest (Maya - 15%, Tala - 18%)');
    console.log('   - Paid off loan (Cashalo - inactive)');
    console.log('   - Various payment frequencies (monthly, bi-weekly, weekly)');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed if called directly
if (import.meta.main || process.argv[1]?.includes('seed.ts')) {
  seed()
    .then(() => {
      console.log('\n✅ Seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seed };

