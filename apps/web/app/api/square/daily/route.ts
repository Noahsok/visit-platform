import { prisma } from "@visit/db";
import { NextRequest, NextResponse } from "next/server";

const SQUARE_BASE_URL = "https://connect.squareup.com/v2";

function squareHeaders() {
  return {
    Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "Square-Version": "2024-01-18",
  };
}

// GET /api/square/daily?venue=newburgh&date=2026-02-05
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

  try {
    // Build time range: 6pm on selected date to 5am next day (overnight service)
    const startAt = `${date}T18:00:00-05:00`;
    const nextDay = new Date(date + "T00:00:00");
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split("T")[0];
    const endAt = `${nextDayStr}T05:00:00-05:00`;

    // Pull orders from Square
    const ordersResponse = await fetch(`${SQUARE_BASE_URL}/orders/search`, {
      method: "POST",
      headers: squareHeaders(),
      body: JSON.stringify({
        location_ids: [venue.squareLocationId],
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
            sort_order: "DESC",
          },
        },
        limit: 500,
      }),
    });

    if (!ordersResponse.ok) {
      const err = await ordersResponse.json();
      return NextResponse.json(
        { error: "Square API error", details: err },
        { status: ordersResponse.status }
      );
    }

    const ordersData = await ordersResponse.json();
    const orders = ordersData.orders || [];

    // Aggregate totals
    let grossSales = 0;
    let totalDiscounts = 0;
    let totalTips = 0;
    let totalFees = 0;
    const itemSales: Record<string, { name: string; quantity: number; gross: number }> = {};

    for (const order of orders) {
      // Line items
      if (order.line_items) {
        for (const item of order.line_items) {
          const itemGross = parseInt(item.gross_sales_money?.amount || "0") / 100;
          const itemDiscount = parseInt(item.total_discount_money?.amount || "0") / 100;
          
          grossSales += itemGross;
          totalDiscounts += itemDiscount;

          const name = item.name || "Unknown Item";
          if (!itemSales[name]) {
            itemSales[name] = { name, quantity: 0, gross: 0 };
          }
          itemSales[name].quantity += parseInt(item.quantity || "1");
          itemSales[name].gross += itemGross;
        }
      }

      // Tips
      if (order.tenders) {
        for (const tender of order.tenders) {
          totalTips += parseInt(tender.tip_money?.amount || "0") / 100;
        }
      }

      // Service charges (fees)
      if (order.service_charges) {
        for (const charge of order.service_charges) {
          totalFees += parseInt(charge.amount_money?.amount || "0") / 100;
        }
      }
    }

    // Also pull processing fees from payments
    const paymentsResponse = await fetch(`${SQUARE_BASE_URL}/payments?` + new URLSearchParams({
      begin_time: startAt,
      end_time: endAt,
      location_id: venue.squareLocationId,
      limit: "100",
    }), {
      headers: squareHeaders(),
    });

    let processingFees = 0;
    if (paymentsResponse.ok) {
      const paymentsData = await paymentsResponse.json();
      for (const payment of paymentsData.payments || []) {
        if (payment.processing_fee) {
          for (const fee of payment.processing_fee) {
            processingFees += parseInt(fee.amount_money?.amount || "0") / 100;
          }
        }
      }
    }

    const netSales = grossSales - totalDiscounts;

    return NextResponse.json({
      date,
      venue: venueSlug,
      orderCount: orders.length,
      gross: Math.round(grossSales * 100) / 100,
      discounts: Math.round(totalDiscounts * 100) / 100,
      netSales: Math.round(netSales * 100) / 100,
      tips: Math.round(totalTips * 100) / 100,
      processingFees: Math.round(processingFees * 100) / 100,
      items: Object.values(itemSales).sort((a, b) => b.gross - a.gross),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch from Square", message: err.message },
      { status: 500 }
    );
  }
}
