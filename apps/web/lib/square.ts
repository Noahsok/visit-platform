import { Client } from "square/legacy";

export const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: "production",
});

/**
 * Search Square customers by name, email, or phone
 */
export async function searchSquareCustomers(query: string) {
  const allCustomers: any[] = [];
  let cursor: string | undefined;

  while (true) {
    const { result } = await squareClient.customersApi.listCustomers(cursor);

    const customers = result.customers || [];
    allCustomers.push(...customers);

    cursor = result.cursor || undefined;
    if (!cursor) break;
  }

  const q = query.toLowerCase();
  const matched = allCustomers
    .filter((c) => {
      const first = c.givenName || "";
      const last = c.familyName || "";
      const email = c.emailAddress || "";
      const phone = (c.phoneNumber || "").replace(/[-\s]/g, "");
      const fullName = `${first} ${last}`.toLowerCase();

      return (
        fullName.includes(q) ||
        email.toLowerCase().includes(q) ||
        phone.includes(q)
      );
    })
    .slice(0, 20)
    .map((c) => ({
      squareId: c.id,
      firstName: c.givenName || "",
      lastName: c.familyName || "",
      email: c.emailAddress || "",
      phone: c.phoneNumber || "",
    }));

  return matched;
}

/**
 * Get full member details from Square including tier and expiration
 */
export async function getSquareMemberDetails(customerId: string) {
  const { result } = await squareClient.customersApi.retrieveCustomer(
    customerId
  );

  const customer = result.customer;
  if (!customer) return null;

  let tier: "Classic" | "Enthusiast" = "Classic";
  let expiration: string | null = null;

  const groupIds = customer.groupIds || [];
  if (groupIds.length > 0) {
    try {
      const { result: groupsResult } =
        await squareClient.customerGroupsApi.listCustomerGroups();
      const groups = groupsResult.groups || [];
      const groupMap = new Map(groups.map((g) => [g.id, g.name || ""]));

      for (const gid of groupIds) {
        const groupName = (groupMap.get(gid) || "").toLowerCase();
        if (groupName.includes("enthusiast")) {
          tier = "Enthusiast";
          break;
        }
      }
    } catch (e) {
      console.error("Error fetching groups:", e);
    }
  }

  try {
    const { result: defsResult } =
      await squareClient.customerCustomAttributesApi.listCustomerCustomAttributeDefinitions();
    const definitions = defsResult.customAttributeDefinitions || [];

    let expirationKey: string | null = null;
    for (const def of definitions) {
      const name = (def.name || "").toLowerCase();
      if (name.includes("expir") || name.includes("expiration")) {
        expirationKey = def.key || null;
        break;
      }
    }

    if (expirationKey) {
      try {
        const { result: attrResult } =
          await squareClient.customerCustomAttributesApi.retrieveCustomerCustomAttribute(
            customerId,
            expirationKey
          );
        const value = attrResult.customAttribute?.value;

        if (typeof value === "string" && value) {
          const isoMatch = value.match(/(\d{4}-\d{2}-\d{2})/);
          if (isoMatch) {
            expiration = isoMatch[1];
          } else {
            const parsed = new Date(value.trim());
            if (!isNaN(parsed.getTime())) {
              expiration = parsed.toISOString().split("T")[0];
            }
          }
        }
      } catch (e) {
        // Attribute might not exist for this customer
      }
    }
  } catch (e) {
    console.error("Error fetching custom attributes:", e);
  }

  if (!expiration) {
    const note = customer.note || "";
    const match = note.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) expiration = match[1];
  }

  return {
    squareId: customer.id,
    firstName: customer.givenName || "",
    lastName: customer.familyName || "",
    email: customer.emailAddress || "",
    phone: customer.phoneNumber || "",
    tier,
    expiration,
  };
}

/**
 * Get all customers with expiration dates
 */
export async function getAllCustomersWithExpiration() {
  const allCustomers: any[] = [];
  let cursor: string | undefined;

  while (true) {
    const { result } = await squareClient.customersApi.listCustomers(cursor);
    allCustomers.push(...(result.customers || []));
    cursor = result.cursor || undefined;
    if (!cursor) break;
  }

  return allCustomers
    .map((c) => {
      const note = c.note || "";
      const match = note.match(/(\d{4}-\d{2}-\d{2})/);
      if (!match) return null;

      return {
        squareId: c.id,
        firstName: c.givenName || "",
        lastName: c.familyName || "",
        email: c.emailAddress || "",
        expiration: match[1],
      };
    })
    .filter(Boolean) as Array<{
    squareId: string;
    firstName: string;
    lastName: string;
    email: string;
    expiration: string;
  }>;
}
