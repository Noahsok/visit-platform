export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const SQUARE_BASE_URL = "https://connect.squareup.com/v2";

function squareHeaders() {
  return {
    Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "Square-Version": "2024-01-18",
  };
}

// ============================================
// RETRY HELPER (Spec §6 - simplified)
// Single retry with 1s delay. Enough to handle transient failures
// without the complexity of full exponential backoff.
// ============================================
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 1
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      // Retry on 5xx or 429 (rate limit)
      if (attempt < retries && (response.status >= 500 || response.status === 429)) {
        const delay = response.status === 429 ? 2000 : 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return response;
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }
  // TypeScript: unreachable but makes compiler happy
  throw new Error("Retry exhausted");
}

// ============================================
// NIGHT BOUNDARY (Spec §2)
// Handles EST/EDT correctly via iterative offset resolution.
//
// Why iterative? On a UTC server (Railway), new Date("2026-03-08T05:00:00")
// creates 5am UTC, not 5am ET. Asking Intl for the offset at that UTC moment
// gives the wrong answer on DST transition nights (off by 1 hour).
//
// Fix: guess an offset, compute the UTC moment that would correspond to our
// intended local time, check if Intl agrees, retry if not. Converges in ≤2 iterations.
// ============================================
const BUSINESS_TZ = "America/New_York";
const NIGHT_START_HOUR = "17:00:00"; // 5pm local
const NIGHT_END_HOUR = "05:00:00";   // 5am next day local

function getNightWindow(dateStr: string): { startAt: string; endAt: string } {
  const nextDay = getNextDay(dateStr);

  const startOffset = resolveOffset(dateStr, NIGHT_START_HOUR, BUSINESS_TZ);
  const endOffset = resolveOffset(nextDay, NIGHT_END_HOUR, BUSINESS_TZ);

  return {
    startAt: `${dateStr}T${NIGHT_START_HOUR}${startOffset}`,
    endAt: `${nextDay}T${NIGHT_END_HOUR}${endOffset}`,
  };
}

function getNextDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z"); // noon UTC to avoid date-boundary issues
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

function resolveOffset(dateStr: string, timeStr: string, timeZone: string): string {
  // Iterative offset resolution: guess → check → converge
  let guessHours = -5; // start with EST as initial guess

  for (let attempt = 0; attempt < 3; attempt++) {
    // "If local time is X and offset is guessHours, then UTC = local - offset"
    const localMs = new Date(`${dateStr}T${timeStr}Z`).getTime();
    const utcMs = localMs - guessHours * 3_600_000;
    const utcDate = new Date(utcMs);

    // Ask Intl: at this UTC moment, what's the actual offset in this timezone?
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(utcDate);
    const tzPart = parts.find((p) => p.type === "timeZoneName")?.value || "GMT-5";
    const match = tzPart.match(/GMT([+-]?\d+)/);
    const actualHours = match ? parseInt(match[1]) : -5;

    if (actualHours === guessHours) {
      // Converged
      const sign = actualHours <= 0 ? "-" : "+";
      return `${sign}${String(Math.abs(actualHours)).padStart(2, "0")}:00`;
    }

    guessHours = actualHours; // retry with corrected guess
  }

  return "-05:00"; // fallback EST (should never reach here)
}

// ============================================
// PAGINATED ORDERS FETCH (Spec §2 / Point 2)
// Loops until cursor is null
// ============================================
async function fetchAllOrders(
  locationId: string,
  startAt: string,
  endAt: string
): Promise<{
  orders: any[];
  pageCount: number;
  complete: boolean;
  error?: string;
}> {
  const allOrders: any[] = [];
  let cursor: string | null = null;
  let pageCount = 0;
  const MAX_PAGES = 50; // safety valve

  do {
    pageCount++;

    const payload: any = {
      location_ids: [locationId],
      query: {
        filter: {
          date_time_filter: {
            closed_at: {
              start_at: startAt,
              end_at: endAt,
            },
          },
          state_filter: {
            states: ["COMPLETED"],
          },
        },
        sort: {
          sort_field: "CLOSED_AT",
          sort_order: "ASC",
        },
      },
      limit: 500,
    };

    if (cursor) {
      payload.cursor = cursor;
    }

    try {
      const response = await fetchWithRetry(`${SQUARE_BASE_URL}/orders/search`, {
        method: "POST",
        headers: squareHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return {
          orders: allOrders,
          pageCount,
          complete: false,
          error: `Square API ${response.status}: ${JSON.stringify(err)}`,
        };
      }

      const data = await response.json();
      const orders = data.orders || [];
      allOrders.push(...orders);

      cursor = data.cursor || null;
    } catch (err: any) {
      return {
        orders: allOrders,
        pageCount,
        complete: false,
        error: `Fetch failed on page ${pageCount}: ${err.message}`,
      };
    }
  } while (cursor && pageCount < MAX_PAGES);

  return {
    orders: allOrders,
    pageCount,
    complete: cursor === null,
  };
}

// ============================================
// PAGINATED PAYMENTS FETCH (Spec §1 - tender layer)
// ============================================
async function fetchAllPayments(
  locationId: string,
  startAt: string,
  endAt: string
): Promise<{
  payments: any[];
  pageCount: number;
  complete: boolean;
  error?: string;
}> {
  const allPayments: any[] = [];
  let cursor: string | null = null;
  let pageCount = 0;
  const MAX_PAGES = 50;

  do {
    pageCount++;

    const params = new URLSearchParams({
      begin_time: startAt,
      end_time: endAt,
      location_id: locationId,
      limit: "100",
    });
    if (cursor) params.set("cursor", cursor);

    try {
      const response = await fetchWithRetry(
        `${SQUARE_BASE_URL}/payments?${params}`,
        { headers: squareHeaders() }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return {
          payments: allPayments,
          pageCount,
          complete: false,
          error: `Payments API ${response.status}: ${JSON.stringify(err)}`,
        };
      }

      const data = await response.json();
      allPayments.push(...(data.payments || []));
      cursor = data.cursor || null;
    } catch (err: any) {
      return {
        payments: allPayments,
        pageCount,
        complete: false,
        error: `Payments fetch failed page ${pageCount}: ${err.message}`,
      };
    }
  } while (cursor && pageCount < MAX_PAGES);

  return {
    payments: allPayments,
    pageCount,
    complete: cursor === null,
  };
}

// ============================================
// RECONCILIATION CHECK (Spec §4 / Point 4)
// ============================================
interface ReconciliationResult {
  passed: boolean;
  delta: number;
  threshold: number;
  ordersTotal: number;
  paymentsAmountTotal: number;
  paymentsTipTotal: number;
  paymentsGrandTotal: number;
  message: string;
}

function reconcile(
  ordersLayer: { gross: number; discounts: number; tax: number; refunds: number },
  paymentsLayer: { amountTotal: number; tipTotal: number; grandTotal: number }
): ReconciliationResult {
  // KEY INSIGHT: Square's Orders.line_items.gross_sales_money and
  // Payments.amount_money both reflect the ORIGINAL sale amount.
  // Refunds are separate objects — they don't reduce these fields.
  //
  // So the reconciliation is:
  //   Orders: gross - discounts + tax = what was originally charged
  //   Payments: amountTotal = what was originally paid (ex tips)
  //   These should match. Refunds are tracked separately as informational.
  //
  // If we subtracted refunds from one side but not the other, we'd get
  // false deltas every time there's a refund.
  const ordersExpected = ordersLayer.gross - ordersLayer.discounts + ordersLayer.tax;
  const delta = Math.abs(ordersExpected - paymentsLayer.amountTotal);
  const threshold = 1.0; // $1 tolerance for rounding

  return {
    passed: delta <= threshold,
    delta: Math.round(delta * 100) / 100,
    threshold,
    ordersTotal: Math.round(ordersExpected * 100) / 100,
    paymentsAmountTotal: Math.round(paymentsLayer.amountTotal * 100) / 100,
    paymentsTipTotal: Math.round(paymentsLayer.tipTotal * 100) / 100,
    paymentsGrandTotal: Math.round(paymentsLayer.grandTotal * 100) / 100,
    message: delta <= threshold
      ? "✅ Orders and Payments reconcile within tolerance"
      : `⚠️ Delta of $${delta.toFixed(2)} between Orders ($${ordersExpected.toFixed(2)}) and Payments ($${paymentsLayer.amountTotal.toFixed(2)})`,
  };
}

// ============================================
// MAIN ROUTE
// GET /api/square/daily?venue=newburgh&date=2026-02-10
// ============================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const venueSlug = searchParams.get("venue");
  const date = searchParams.get("date");

  if (!venueSlug || !date) {
    return NextResponse.json({ error: "venue and date required" }, { status: 400 });
  }

  if (!process.env.SQUARE_ACCESS_TOKEN) {
    return NextResponse.json({ error: "SQUARE_ACCESS_TOKEN not configured" }, { status: 500 });
  }

  const venue = await prisma.venue.findUnique({ where: { slug: venueSlug } });
  if (!venue || !venue.squareLocationId) {
    return NextResponse.json({ error: "Venue not found or no Square location ID" }, { status: 404 });
  }

  const runStartedAt = new Date();

  try {
    // 1. Compute night window with proper timezone
    const { startAt, endAt } = getNightWindow(date);

    // 2. Fetch all orders (paginated)
    const ordersResult = await fetchAllOrders(venue.squareLocationId, startAt, endAt);

    // 3. Fetch all payments (paginated)
    const paymentsResult = await fetchAllPayments(venue.squareLocationId, startAt, endAt);

    // 4. Aggregate ORDERS layer (what was sold)
    // IMPORTANT: Accumulate in integer cents to avoid floating-point drift.
    // Divide by 100 only when producing final dollar amounts.
    let grossCents = 0;
    let discountCents = 0;
    let taxCents = 0;
    let refundCents = 0;
    const itemSales: Record<
      string,
      { name: string; catalogId: string | null; quantity: number; grossCents: number }
    > = {};
    const orderIds: string[] = [];

    for (const order of ordersResult.orders) {
      orderIds.push(order.id);

      // Refunds show as returns — check for refund amounts
      if (order.refunds) {
        for (const refund of order.refunds) {
          refundCents += parseInt(refund.amount_money?.amount || "0");
        }
      }

      if (order.line_items) {
        for (const item of order.line_items) {
          const itemGrossCents = parseInt(item.gross_sales_money?.amount || "0");
          const itemDiscountCents = parseInt(item.total_discount_money?.amount || "0");
          const itemTaxCents = parseInt(item.total_tax_money?.amount || "0");

          grossCents += itemGrossCents;
          discountCents += itemDiscountCents;
          taxCents += itemTaxCents;

          const name = item.name || "Unknown Item";
          const catalogId = item.catalog_object_id || null;
          const key = catalogId || name; // prefer catalog ID as key

          if (!itemSales[key]) {
            itemSales[key] = { name, catalogId, quantity: 0, grossCents: 0 };
          }
          itemSales[key].quantity += parseInt(item.quantity || "1");
          itemSales[key].grossCents += itemGrossCents;
        }
      }
    }

    // Convert cents to dollars ONCE
    const grossSales = grossCents / 100;
    const totalDiscounts = discountCents / 100;
    const totalTax = taxCents / 100;
    const totalRefunds = refundCents / 100;

    // 5. Aggregate PAYMENTS layer (how guests paid) — also in cents
    let paymentsAmountCents = 0;
    let paymentsTipCents = 0;
    let paymentsGrandCents = 0;
    let processingFeeCents = 0;
    const tenderBreakdownCents: Record<string, number> = {};
    const paymentIds: string[] = [];

    for (const payment of paymentsResult.payments) {
      paymentIds.push(payment.id);

      const amountC = parseInt(payment.amount_money?.amount || "0");
      const tipC = parseInt(payment.tip_money?.amount || "0");
      const totalC = parseInt(payment.total_money?.amount || "0");

      paymentsAmountCents += amountC;
      paymentsTipCents += tipC;
      paymentsGrandCents += totalC;

      // Tender type
      const tenderType = payment.source_type || payment.card_details?.card?.card_brand || "OTHER";
      tenderBreakdownCents[tenderType] = (tenderBreakdownCents[tenderType] || 0) + totalC;

      // Processing fees
      if (payment.processing_fee) {
        for (const fee of payment.processing_fee) {
          processingFeeCents += parseInt(fee.amount_money?.amount || "0");
        }
      }
    }

    // Convert payments to dollars ONCE
    const paymentsAmountTotal = paymentsAmountCents / 100;
    const paymentsTipTotal = paymentsTipCents / 100;
    const paymentsGrandTotal = paymentsGrandCents / 100;
    const processingFees = processingFeeCents / 100;
    const tenderBreakdown: Record<string, number> = {};
    for (const [k, v] of Object.entries(tenderBreakdownCents)) {
      tenderBreakdown[k] = v / 100;
    }

    // 6. RECONCILIATION CHECK (Spec §4)
    const reconciliation = reconcile(
      { gross: grossSales, discounts: totalDiscounts, tax: totalTax, refunds: totalRefunds },
      { amountTotal: paymentsAmountTotal, tipTotal: paymentsTipTotal, grandTotal: paymentsGrandTotal }
    );

    // 7. Determine report status
    let status: "complete" | "partial" | "needs_review" = "complete";
    const warnings: string[] = [];

    if (!ordersResult.complete) {
      status = "partial";
      warnings.push(`Orders pagination incomplete: ${ordersResult.error || "cursor not exhausted"}`);
    }
    if (!paymentsResult.complete) {
      status = "partial";
      warnings.push(`Payments pagination incomplete: ${paymentsResult.error || "cursor not exhausted"}`);
    }
    if (!reconciliation.passed) {
      status = status === "partial" ? "partial" : "needs_review";
      warnings.push(reconciliation.message);
    }

    // Check: unmapped items (no catalog ID)
    const unmappedItems = Object.values(itemSales).filter((i) => !i.catalogId);
    if (unmappedItems.length > 0) {
      warnings.push(
        `${unmappedItems.length} items without catalog IDs (COGS mapping unreliable): ${unmappedItems.map((i) => i.name).join(", ")}`
      );
    }

    // Check: tender completeness
    const tenderSum = Object.values(tenderBreakdown).reduce((s, v) => s + v, 0);
    const tenderDelta = Math.abs(tenderSum - paymentsGrandTotal);
    if (tenderDelta > 0.01) {
      warnings.push(`Tender breakdown doesn't sum to payments total: delta $${tenderDelta.toFixed(2)}`);
    }

    const netSales = grossSales - totalDiscounts;

    // 8. Write audit log (Spec §7)
    try {
      await prisma.squareSyncLog.create({
        data: {
          venueId: venue.id,
          syncType: "transactions",
          periodStart: new Date(startAt),
          periodEnd: new Date(endAt),
          recordsSynced: ordersResult.orders.length + paymentsResult.payments.length,
          status: status === "complete" ? "success" : status === "partial" ? "partial" : "needs_review",
          errorMessage: warnings.length > 0 ? warnings.join(" | ") : null,
        },
      });
    } catch (logErr) {
      console.error("Failed to write sync log:", logErr);
      // Don't fail the request over a log write failure
    }

    // 9. Return full response with both layers visible
    return NextResponse.json({
      // Metadata
      date,
      venue: venueSlug,
      status,
      warnings,
      queryWindow: { startAt, endAt, timezone: "America/New_York" },
      runAt: runStartedAt.toISOString(),

      // Orders layer (what was sold)
      orders: {
        count: ordersResult.orders.length,
        pages: ordersResult.pageCount,
        paginationComplete: ordersResult.complete,
        gross: round(grossSales),
        discounts: round(totalDiscounts),
        tax: round(totalTax),
        refunds: round(totalRefunds),
        netSales: round(netSales),
        items: Object.values(itemSales)
          .map(i => ({ name: i.name, catalogId: i.catalogId, quantity: i.quantity, gross: i.grossCents / 100 }))
          .sort((a, b) => b.gross - a.gross),
      },

      // Payments layer (how guests paid)
      payments: {
        count: paymentsResult.payments.length,
        pages: paymentsResult.pageCount,
        paginationComplete: paymentsResult.complete,
        amountTotal: round(paymentsAmountTotal),
        tipTotal: round(paymentsTipTotal),
        grandTotal: round(paymentsGrandTotal),
        processingFees: round(processingFees),
        tenderBreakdown,
      },

      // Reconciliation
      reconciliation,

      // For P&L form auto-fill (backwards compatible with pullFromSquare)
      orderCount: ordersResult.orders.length,
      gross: round(grossSales),
      discounts: round(totalDiscounts),
      netSales: round(netSales),
      tips: round(paymentsTipTotal),
      tax: round(totalTax),
      processingFees: round(processingFees),
      items: Object.values(itemSales)
        .map(i => ({ name: i.name, catalogId: i.catalogId, quantity: i.quantity, gross: i.grossCents / 100 }))
        .sort((a, b) => b.gross - a.gross),
    });
  } catch (err: any) {
    // Log the failure
    try {
      await prisma.squareSyncLog.create({
        data: {
          venueId: venue.id,
          syncType: "transactions",
          periodStart: new Date(`${date}T00:00:00Z`),
          periodEnd: new Date(`${date}T23:59:59Z`),
          recordsSynced: 0,
          status: "failed",
          errorMessage: err.message,
        },
      });
    } catch (_) {}

    return NextResponse.json(
      { error: "Failed to fetch from Square", message: err.message },
      { status: 500 }
    );
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
