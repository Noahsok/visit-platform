export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET all P&L reports grouped by date for a venue
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const venueSlug = searchParams.get("venue");
  const period = searchParams.get("period");

  if (!venueSlug) {
    return NextResponse.json({ error: "venue required" }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({ where: { slug: venueSlug } });
  if (!venue) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

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
      .filter((i: any) => i.category === "labor" && i.subcategory !== "tips")
      .reduce((s: number, i: any) => s + Math.abs(i.amount), 0);
    const tips = items
      .filter((i: any) => i.category === "labor" && i.subcategory === "tips")
      .reduce((s: number, i: any) => s + Math.abs(i.amount), 0);
    const taxCollected = items
      .filter((i: any) => i.category === "liability" && i.subcategory === "tax")
      .reduce((s: number, i: any) => s + Math.abs(i.amount), 0);
    const artistCap = items
      .filter((i: any) => i.category === "artist_compensation")
      .reduce((s: number, i: any) => s + Math.abs(i.amount), 0);
    const fees = items
      .filter((i: any) => i.category === "other_expense" && i.subcategory === "fees")
      .reduce((s: number, i: any) => s + Math.abs(i.amount), 0);
    const netProfit = netSales - cogs - labor - tips - artistCap - fees;

    // Extract night type from metadata line item
    const nightTypeItem = items.find(
      (i: any) => i.category === "other_expense" && i.subcategory === "night_type"
    );
    const nightType = nightTypeItem?.description || "regular";

    return {
      ...report,
      nightType,
      summary: { gross, discounts, netSales, cogs, labor, tips, taxCollected, artistCap, fees, netProfit },
    };
  });

  reports.sort((a: any, b: any) => b.date.localeCompare(a.date));

  return NextResponse.json(reports);
}

// POST save a nightly P&L report
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    venueSlug,
    date,
    nightType,
    gross,
    discounts,
    cogs,
    labor,
    tips,
    taxCollected,
    artistPresent,
    artistCapPercent,
    artistCap,
    fees,
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
  const lineItems: any[] = [];

  // Night type metadata
  if (nightType && nightType !== "regular") {
    lineItems.push({
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
      category: "other_expense",
      subcategory: "night_type",
      description: nightType,
      amount: 0,
      source: "manual",
    });
  }

  if (gross) {
    lineItems.push({
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
      category: "revenue",
      subcategory: "gross",
      description: "Gross Sales",
      amount: gross,
      source: "manual",
    });
  }

  if (discounts) {
    lineItems.push({
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
      category: "revenue",
      subcategory: "discounts",
      description: "Discounts",
      amount: -Math.abs(discounts),
      source: "manual",
    });
  }

  if (cogs) {
    lineItems.push({
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
      category: "cogs",
      subcategory: null,
      description: "Drink COGS",
      amount: -Math.abs(cogs),
      source: "manual",
    });
  }

  if (labor) {
    lineItems.push({
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
      category: "labor",
      subcategory: "hourly",
      description: "Hourly Labor",
      amount: -Math.abs(labor),
      source: "manual",
    });
  }

  if (tips) {
    lineItems.push({
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
      category: "labor",
      subcategory: "tips",
      description: "Tips Payout",
      amount: -Math.abs(tips),
      source: "square",
    });
  }

  if (taxCollected) {
    lineItems.push({
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
      category: "liability",
      subcategory: "tax",
      description: "Tax Collected",
      amount: taxCollected,
      source: "square",
    });
  }

  if (artistCap) {
    lineItems.push({
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
      category: "artist_compensation",
      subcategory: artistPresent ? "present" : "absent",
      description: `Artist CAP (${artistCapPercent || (artistPresent ? 10 : 2)}%)`,
      amount: -Math.abs(artistCap),
      source: "calculated",
    });
  }

  if (fees) {
    lineItems.push({
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
      category: "other_expense",
      subcategory: "fees",
      description: "Processing Fees",
      amount: -Math.abs(fees),
      source: "manual",
    });
  }

  if (lineItems.length > 0) {
    await prisma.pnlLineItem.createMany({ data: lineItems });
  }

  // Record artist presence if there's an active exhibition
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
