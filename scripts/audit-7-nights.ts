/**
 * 7-Night Audit Script
 * 
 * Run against your deployed API to validate Square data integrity.
 * Compares Orders layer vs Payments layer for each night,
 * then prints a summary you can manually verify against Square Dashboard.
 * 
 * Usage:
 *   npx tsx scripts/audit-7-nights.ts
 * 
 * Or if running against production:
 *   BASE_URL=https://your-app.railway.app npx tsx scripts/audit-7-nights.ts
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const VENUE = process.env.VENUE || "newburgh";
const NIGHTS = parseInt(process.env.NIGHTS || "7");

interface AuditResult {
  date: string;
  status: string;
  orders: {
    count: number;
    gross: number;
    discounts: number;
    tax: number;
    netSales: number;
    paginationComplete: boolean;
  };
  payments: {
    count: number;
    amountTotal: number;
    tipTotal: number;
    grandTotal: number;
    processingFees: number;
    paginationComplete: boolean;
  };
  reconciliation: {
    passed: boolean;
    delta: number;
  };
  warnings: string[];
  queryWindow: { startAt: string; endAt: string };
}

async function auditNight(date: string): Promise<AuditResult | { date: string; error: string }> {
  const url = `${BASE_URL}/api/square/daily?venue=${VENUE}&date=${date}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      return { date, error: JSON.stringify(err) };
    }
    const data = await res.json();
    return {
      date,
      status: data.status,
      orders: data.orders,
      payments: data.payments,
      reconciliation: data.reconciliation,
      warnings: data.warnings || [],
      queryWindow: data.queryWindow,
    };
  } catch (err: any) {
    return { date, error: err.message };
  }
}

function formatMoney(n: number): string {
  return `$${n.toFixed(2).padStart(8)}`;
}

async function main() {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`  P&L AUDIT: ${NIGHTS} Most Recent Nights`);
  console.log(`  Venue: ${VENUE} | API: ${BASE_URL}`);
  console.log(`${"=".repeat(80)}\n`);

  // Generate dates for the last N nights (going backwards from yesterday)
  const dates: string[] = [];
  for (let i = 1; i <= NIGHTS; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  const results: (AuditResult | { date: string; error: string })[] = [];

  for (const date of dates) {
    process.stdout.write(`Pulling ${date}... `);
    const result = await auditNight(date);
    results.push(result);

    if ("error" in result) {
      console.log(`❌ ERROR: ${result.error}`);
    } else {
      const icon = result.status === "complete" ? "✅" : result.status === "needs_review" ? "⚠️" : "🔶";
      console.log(`${icon} ${result.status} | ${result.orders.count} orders, ${result.payments.count} payments`);
    }

    // Be nice to rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  // Summary table
  console.log(`\n${"=".repeat(80)}`);
  console.log("  SUMMARY TABLE");
  console.log(`${"=".repeat(80)}`);
  console.log(
    `${"Date".padEnd(12)} | ${"Status".padEnd(13)} | ${"Gross".padStart(9)} | ${"Disc".padStart(8)} | ${"Tax".padStart(8)} | ${"Net".padStart(9)} | ${"Tips".padStart(8)} | ${"Fees".padStart(8)} | ${"Δ".padStart(6)} | Pg`
  );
  console.log("-".repeat(115));

  let totalGross = 0;
  let totalNet = 0;
  let totalTips = 0;
  let totalFees = 0;
  let passCount = 0;
  let failCount = 0;

  for (const r of results) {
    if ("error" in r) {
      console.log(`${r.date.padEnd(12)} | ${"ERROR".padEnd(13)} | ${r.error}`);
      failCount++;
      continue;
    }

    const pg = r.orders.paginationComplete && r.payments.paginationComplete ? "✓" : "INCOMPLETE";
    const statusIcon = r.status === "complete" ? "✅ complete" : r.status === "needs_review" ? "⚠️ review  " : "🔶 partial  ";
    const deltaStr = r.reconciliation.passed
      ? `  ✓  `
      : `$${r.reconciliation.delta.toFixed(2)}`.padStart(6);

    console.log(
      `${r.date.padEnd(12)} | ${statusIcon.padEnd(13)} | ${formatMoney(r.orders.gross)} | ${formatMoney(r.orders.discounts)} | ${formatMoney(r.orders.tax)} | ${formatMoney(r.orders.netSales)} | ${formatMoney(r.payments.tipTotal)} | ${formatMoney(r.payments.processingFees)} | ${deltaStr} | ${pg}`
    );

    totalGross += r.orders.gross;
    totalNet += r.orders.netSales;
    totalTips += r.payments.tipTotal;
    totalFees += r.payments.processingFees;

    if (r.reconciliation.passed) passCount++;
    else failCount++;
  }

  console.log("-".repeat(115));
  console.log(
    `${"TOTAL".padEnd(12)} |               | ${formatMoney(totalGross)} |          |          | ${formatMoney(totalNet)} | ${formatMoney(totalTips)} | ${formatMoney(totalFees)} |`
  );

  // Warnings detail
  const nightsWithWarnings = results.filter(
    (r) => !("error" in r) && r.warnings.length > 0
  ) as AuditResult[];

  if (nightsWithWarnings.length > 0) {
    console.log(`\n${"=".repeat(80)}`);
    console.log("  WARNINGS DETAIL");
    console.log(`${"=".repeat(80)}`);
    for (const r of nightsWithWarnings) {
      console.log(`\n${r.date}:`);
      for (const w of r.warnings) {
        console.log(`  → ${w}`);
      }
    }
  }

  // Reconciliation summary
  console.log(`\n${"=".repeat(80)}`);
  console.log("  RECONCILIATION VERDICT");
  console.log(`${"=".repeat(80)}`);
  console.log(`  Passed: ${passCount}/${results.length}`);
  console.log(`  Failed: ${failCount}/${results.length}`);

  if (failCount === 0 && passCount === results.length) {
    console.log(`\n  ✅ ALL ${NIGHTS} NIGHTS RECONCILE. Pipeline is trustworthy.`);
  } else if (failCount > 0) {
    console.log(`\n  ⚠️  ${failCount} night(s) need investigation.`);
    console.log(`  Next step: manually compare the flagged nights against Square Dashboard.`);
  }

  console.log(`\n  MANUAL VERIFICATION:`);
  console.log(`  Go to Square Dashboard → Transactions → filter by each date above.`);
  console.log(`  Compare "Gross Sales" in Square Dashboard to the "Gross" column.`);
  console.log(`  If all 7 match, your pipeline is proven correct.\n`);
}

main().catch(console.error);
