interface NightlyPresence {
  date: Date;
  wasPresent: boolean;
}

interface NightlyRevenue {
  date: Date;
  revenue: number;
}

interface CompensationResult {
  totalOwed: number;
  nightsPresent: number;
  nightsAbsent: number;
  breakdown: {
    date: Date;
    wasPresent: boolean;
    revenue: number;
    compensation: number;
  }[];
}

const PRESENT_RATE = 0.10;
const ABSENT_RATE = 0.02;

/**
 * Calculate artist compensation for an exhibition period.
 * Artist gets 10% of bar revenue on nights they're present,
 * 2% on nights they're absent.
 */
export function calculateArtistCompensation(
  presence: NightlyPresence[],
  revenue: NightlyRevenue[]
): CompensationResult {
  const revenueByDate = new Map(
    revenue.map((r) => [r.date.toISOString().split("T")[0], r.revenue])
  );

  const breakdown = presence.map((p) => {
    const dateKey = p.date.toISOString().split("T")[0];
    const nightRevenue = revenueByDate.get(dateKey) ?? 0;
    const rate = p.wasPresent ? PRESENT_RATE : ABSENT_RATE;
    const compensation = nightRevenue * rate;

    return {
      date: p.date,
      wasPresent: p.wasPresent,
      revenue: nightRevenue,
      compensation,
    };
  });

  return {
    totalOwed: breakdown.reduce((sum, b) => sum + b.compensation, 0),
    nightsPresent: breakdown.filter((b) => b.wasPresent).length,
    nightsAbsent: breakdown.filter((b) => !b.wasPresent).length,
    breakdown,
  };
}
