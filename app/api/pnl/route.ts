export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET all P&L reports grouped by date for a venue
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const venueSlug = searchParams.get("venue");
  const period = searchParams.get("period"); // "week", "month", "all"

  if (!venueSlug) {
    return NextResponse.json({ error: "venue required" }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({ where: { slug: venueSlug } });
  if (!venue) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  // Date filter
  const where: any = { venueId: venue.id };
  if (period === "week") {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    where.periodStart = { gte: weekAgo };
  } else if (period === "month") {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    where.periodStart = { gte: monthAgo };
  }

  const lineItems = await prisma.pnlLineItem.findMany({
    where,
    orderBy: [{ periodStart: "desc" }, { category: "asc" }],
  });

  // Group by date
  const reportMap: Record<string, any> = {};
  for (const item of lineItems) {
    const dateKey = item.periodStart.toISOString().split("T")[0];
    if (!reportMap[dateKey]) {
      reportMap[dateKey] = {
        date: dateKey,
        venueId: venue.id,
        lineItems: [],
      };
    }
    reportMap[dateKey].lineItems.push({
      id: item.id,
      category: item.category,
      subcategory: item.subcategory,
      description: item.description,
      amount: Number(item.amount),
      source: item.source,
    });
  }

  // Build summary for each report
  const reports = Object.values(reportMap).map((report: any) => {
    const items = report.lineItems;
    const gross = items
      .filter((i: any) => i.category === "revenue" && i.subcategory === "gross")
      .reduce((s: number, i: any) => s + i.amount, 0);
    const discounts = items
      .filter((i: any) => i.category === "revenue" && i.subcategory === "discounts")
      .reduce((s: number, i: any) => s + Math.abs(i.amount), 0);
    const netSales = gross - discounts;
    const cogs = items
      .filter((i: any) => i.category === "cogs")
      .reduce((s: number, i: any) => s + Math.abs(i.amount), 0);
    const labor = items
      .filter((i: any) => i.category === "labor")
      .reduce((s: number, i: any) => s + Math.abs(i.amount), 0);
    const artistCap = items
      .filter((i: any) => i.category === "artist_compensation")
      .reduce((s: number, i: any) => s + Math.abs(i.amount), 0);
    const fees = items
      .filter((i: any) => i.category === "other_expense" && i.subcategory === "fees")
      .reduce((s: number, i: any) => s + Math.abs(i.amount), 0);
    const netProfit = netSales - cogs - labor - artistCap - fees;

    return {
      ...report,
      summary: { gross, discounts, netSales, cogs, labor, artistCap, fees, netProfit },
    };
  });

  // Sort descending by date
  reports.sort((a: any, b: any) => b.date.localeCompare(a.date));

  return NextResponse.json(reports);
}

// POST save a nightly P&L report
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    venueSlug,
    date,
    gross,
    discounts,
    cogs,
    labor,
    artistPresent,
    artistCapPercent,
    artistCap,
    fees,
    notes,
  } = body;

  if (!venueSlug || !date) {
    return NextResponse.json({ error: "venueSlug and date required" }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({ where: { slug: venueSlug } });
  if (!venue) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  const reportDate = new Date(date + "T00:00:00Z");

  // Delete existing line items for this date/venue
  await prisma.pnlLineItem.deleteMany({
    where: {
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
    },
  });

  // Create line items
  const lineItems = [];

  if (gross) {
    lineItems.push({
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
      category: "revenue" as const,
      subcategory: "gross",
      description: "Gross Sales",
      amount: gross,
      source: "manual" as const,
    });
  }

  if (discounts) {
    lineItems.push({
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
      category: "revenue" as const,
      subcategory: "discounts",
      description: "Discounts",
      amount: -Math.abs(discounts),
      source: "manual" as const,
    });
  }

  if (cogs) {
    lineItems.push({
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
      category: "cogs" as const,
      subcategory: null,
      description: "Drink COGS",
      amount: -Math.abs(cogs),
      source: "manual" as const,
    });
  }

  if (labor) {
    lineItems.push({
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
      category: "labor" as const,
      subcategory: null,
      description: "Labor",
      amount: -Math.abs(labor),
      source: "manual" as const,
    });
  }

  if (artistCap) {
    lineItems.push({
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
      category: "artist_compensation" as const,
      subcategory: artistPresent ? "present" : "absent",
      description: `Artist CAP (${artistCapPercent || (artistPresent ? 10 : 2)}%)`,
      amount: -Math.abs(artistCap),
      source: "calculated" as const,
    });
  }

  if (fees) {
    lineItems.push({
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
      category: "other_expense" as const,
      subcategory: "fees",
      description: "Processing Fees",
      amount: -Math.abs(fees),
      source: "manual" as const,
    });
  }

  if (lineItems.length > 0) {
    await prisma.pnlLineItem.createMany({ data: lineItems });
  }

  // Also record artist presence if there's an active exhibition
  if (artistPresent !== undefined) {
    const activeExhibition = await prisma.exhibition.findFirst({
      where: {
        venueId: venue.id,
        isActive: true,
        startDate: { lte: reportDate },
        endDate: { gte: reportDate },
      },
    });

    if (activeExhibition) {
      await prisma.artistPresence.upsert({
        where: {
          exhibitionId_date: {
            exhibitionId: activeExhibition.id,
            date: reportDate,
          },
        },
        update: { wasPresent: artistPresent },
        create: {
          exhibitionId: activeExhibition.id,
          date: reportDate,
          wasPresent: artistPresent,
        },
      });
    }
  }

  return NextResponse.json({ success: true, date });
}
