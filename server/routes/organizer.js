// backend/routes/organizer.js
import { Router } from "express";
import fetch from "node-fetch";
import pool from "../lib/db.js";
import { requireAuth, requireOrganizer } from "../middleware/auth.js";
import { fetchEventsWithTicketTypes } from "../lib/aggregate.js";

const router = Router();

router.use(requireAuth, requireOrganizer);

// ─── FLUTTERWAVE SUPPORTED COUNTRIES ────────────────────────────────
const FLUTTERWAVE_COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Uganda',
  'Tanzania', 'Rwanda', 'Zambia', 'Botswana', 'Mauritius',
  'Egypt', 'Morocco', 'Ivory Coast', 'Cameroon', 'Senegal',
  'Benin', 'Burkina Faso', 'Mali', 'Niger', 'Togo',
  'Angola', 'Ethiopia', 'Mozambique', 'Namibia', 'Zimbabwe',
  'Algeria', 'Tunisia', 'Libya', 'Sudan', 'South Sudan',
  'Eritrea', 'Djibouti', 'Somalia', 'Comoros', 'Seychelles',
  'Cape Verde', 'Mauritania', 'Gambia', 'Guinea', 'Guinea-Bissau',
  'Sierra Leone', 'Liberia', 'Central African Republic', 'Chad',
  'Congo', 'DR Congo', 'Equatorial Guinea', 'Gabon', 'Sao Tome',
  'United Kingdom', 'France', 'Germany', 'Spain', 'Italy',
  'Portugal', 'Netherlands', 'Belgium', 'Switzerland', 'Sweden',
  'Norway', 'Denmark', 'Finland', 'Ireland', 'Austria',
  'Greece', 'Poland', 'Czech Republic', 'Hungary', 'Romania',
  'Bulgaria', 'Croatia', 'Slovakia', 'Slovenia', 'Lithuania',
  'Latvia', 'Estonia', 'Luxembourg', 'Malta', 'Cyprus',
  'Iceland', 'Liechtenstein', 'Monaco', 'Andorra', 'San Marino',
  'United States', 'Canada', 'Mexico', 'Brazil', 'Argentina',
  'Chile', 'Colombia', 'Peru', 'Venezuela', 'Uruguay',
  'Paraguay', 'Bolivia', 'Ecuador', 'Guyana', 'Suriname',
  'Costa Rica', 'Panama', 'Guatemala', 'Honduras', 'El Salvador',
  'Nicaragua', 'Belize', 'Jamaica', 'Trinidad and Tobago',
  'Barbados', 'Bahamas', 'Dominican Republic', 'Puerto Rico',
  'India', 'China', 'Japan', 'South Korea', 'Singapore',
  'Malaysia', 'Thailand', 'Vietnam', 'Indonesia', 'Philippines',
  'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Hong Kong',
  'Taiwan', 'Saudi Arabia', 'United Arab Emirates', 'Israel',
  'Turkey', 'Lebanon', 'Jordan', 'Kuwait', 'Oman', 'Qatar',
  'Bahrain', 'Iraq', 'Yemen', 'Afghanistan', 'Myanmar',
  'Cambodia', 'Laos', 'Mongolia', 'Bhutan', 'Maldives',
  'Australia', 'New Zealand', 'Fiji', 'Papua New Guinea',
  'Solomon Islands', 'Vanuatu', 'Samoa', 'Tonga', 'Kiribati',
  'Micronesia', 'Palau', 'Marshall Islands', 'Tuvalu', 'Nauru'
];

// ─── LIST MY EVENTS WITH QUICK STATS ────────────────────────────────
router.get("/events", async (req, res) => {
  try {
    const [events] = await pool.query(
      `SELECT e.*
       FROM events e
       WHERE e.organizer_id = ?
       ORDER BY e.start_at ASC`,
      [req.user.id]
    );

    const withStats = await Promise.all(
      events.map(async (event) => {
        const [ticketRows] = await pool.query(
          `SELECT COUNT(t.id) as ticketsSold
           FROM tickets t
           JOIN orders o ON t.order_id = o.id
           WHERE t.event_id = ? AND o.status = 'paid'`,
          [event.id]
        );
        const ticketsSold = ticketRows[0]?.ticketsSold || 0;

        const [revenueRows] = await pool.query(
          `SELECT COALESCE(SUM(amount_total), 0) as revenue
           FROM orders
           WHERE event_id = ? AND status = 'paid'`,
          [event.id]
        );
        const revenue = revenueRows[0]?.revenue || 0;

        const [totalRows] = await pool.query(
          `SELECT COALESCE(SUM(quantity_total), 0) as total
           FROM ticket_types
           WHERE event_id = ?`,
          [event.id]
        );
        const ticketsTotal = totalRows[0]?.total || 0;

        const [orderRows] = await pool.query(
          `SELECT COUNT(*) as ordersCount
           FROM orders
           WHERE event_id = ? AND status = 'paid'`,
          [event.id]
        );
        const ordersCount = orderRows[0]?.ordersCount || 0;

        return {
          id: event.id,
          title: event.title,
          slug: event.slug,
          cover_image: event.cover_image,
          start_at: event.start_at,
          status: event.status,
          is_verified: event.is_verified,
          country: event.country,
          currency: event.currency,
          fee_bearer: event.fee_bearer,
          revenue,
          ticketsSold,
          ticketsTotal,
          ordersCount,
        };
      })
    );

    return res.json({ success: true, events: withStats });
  } catch (err) {
    console.error("❌ Error fetching organizer events:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch events",
    });
  }
});

// ─── SINGLE EVENT — FULL STATS ──────────────────────────────────────
router.get("/events/:eventId/stats", async (req, res) => {
  const { eventId } = req.params;

  try {
    // Fetch event and its ticket types (for total quantities)
    const sql = `
      SELECT e.*
      FROM events e
      WHERE e.id = ? AND e.organizer_id = ?
    `;
    const events = await fetchEventsWithTicketTypes(sql, [eventId, req.user.id]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    const event = events[0];

    // ---- Compute statistics from paid orders and tickets ----
    // 1) Total revenue and ticket count from orders
    const [orderStats] = await pool.query(
      `SELECT 
         COUNT(*) as ordersCount,
         COALESCE(SUM(amount_total), 0) as totalRevenue,
         SUM(amount_total) as revenueFromOrders
       FROM orders
       WHERE event_id = ? AND status = 'paid'`,
      [eventId]
    );
    const totalRevenue = orderStats[0]?.totalRevenue || 0;
    const ordersCount = orderStats[0]?.ordersCount || 0;

    // 2) Tickets issued (sold) – count from tickets table
    const [ticketStats] = await pool.query(
      `SELECT COUNT(*) as ticketsIssued
       FROM tickets
       WHERE event_id = ?`,
      [eventId]
    );
    const ticketsIssued = ticketStats[0]?.ticketsIssued || 0;

    // 3) Checked-in and transferred counts
    const [checkinStats] = await pool.query(
      `SELECT 
         SUM(checked_in) as checkedInCount,
         SUM(CASE WHEN transferred_at IS NOT NULL THEN 1 ELSE 0 END) as transferredCount
       FROM tickets
       WHERE event_id = ?`,
      [eventId]
    );
    const checkedInCount = checkinStats[0]?.checkedInCount || 0;
    const transferredCount = checkinStats[0]?.transferredCount || 0;

    // 4) Per-ticket-type breakdown from actual tickets (paid orders only)
    const [breakdown] = await pool.query(
      `SELECT 
         tt.id,
         tt.name,
         tt.price,
         COUNT(t.id) as sold,
         COALESCE(SUM(o.amount_total), 0) as revenue
       FROM ticket_types tt
       LEFT JOIN tickets t ON t.ticket_type_id = tt.id
       LEFT JOIN orders o ON t.order_id = o.id AND o.status = 'paid'
       WHERE tt.event_id = ?
       GROUP BY tt.id
       ORDER BY tt.created_at ASC`,
      [eventId]
    );
    // Merge with total from event.ticket_types
    const ticketTypesMap = new Map();
    (event.ticket_types || []).forEach((tt) => {
      ticketTypesMap.set(tt.id, { ...tt });
    });
    const finalBreakdown = breakdown.map((b) => {
      const tt = ticketTypesMap.get(b.id);
      return {
        id: b.id,
        name: b.name,
        price: b.price,
        sold: parseInt(b.sold) || 0,
        total: tt ? tt.quantity_total : 0,
        revenue: parseFloat(b.revenue) || 0,
      };
    });

    // Sales by day
    const [salesByDayRows] = await pool.query(
      `SELECT DATE(paid_at) as day, SUM(amount_total) as total
       FROM orders
       WHERE event_id = ? AND status = 'paid' AND paid_at IS NOT NULL
       GROUP BY DATE(paid_at)
       ORDER BY day ASC`,
      [eventId]
    );
    const salesByDay = {};
    salesByDayRows.forEach((row) => {
      salesByDay[row.day] = parseFloat(row.total) || 0;
    });

    // Orders list with items and tickets (existing code)
    const [orderRows] = await pool.query(
      `SELECT o.*
       FROM orders o
       WHERE o.event_id = ?
       ORDER BY o.created_at DESC`,
      [eventId]
    );
    const orderIds = orderRows.map((o) => o.id);
    let orderItems = [];
    let ticketsByOrder = {};
    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');
      const [itemRows] = await pool.query(
        `SELECT oi.*, tt.name as ticket_type_name
         FROM order_items oi
         LEFT JOIN ticket_types tt ON oi.ticket_type_id = tt.id
         WHERE oi.order_id IN (${placeholders})`,
        orderIds
      );
      orderItems = itemRows;
      const [ticketRows] = await pool.query(
        `SELECT t.*
         FROM tickets t
         WHERE t.order_id IN (${placeholders})`,
        orderIds
      );
      ticketsByOrder = {};
      for (const t of ticketRows) {
        if (!ticketsByOrder[t.order_id]) ticketsByOrder[t.order_id] = [];
        ticketsByOrder[t.order_id].push({
          id: t.id,
          holder_name: t.holder_name,
          checked_in: t.checked_in,
          transferred_at: t.transferred_at,
        });
      }
    }
    const itemsByOrder = {};
    for (const item of orderItems) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push({
        id: item.id,
        quantity: item.quantity,
        price: item.unit_price,
        subtotal: item.subtotal,
        ticket_type_name: item.ticket_type_name,
      });
    }
    const orders = orderRows.map((o) => ({
      ...o,
      order_items: itemsByOrder[o.id] || [],
      tickets: ticketsByOrder[o.id] || [],
    }));
    const paidOrders = orders.filter((o) => o.status === "paid");

    // Final response
    return res.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        start_at: event.start_at,
        venue_name: event.venue_name,
        status: event.status,
        country: event.country,
        currency: event.currency,
        fee_bearer: event.fee_bearer,
      },
      stats: {
        revenue: totalRevenue,
        ordersCount,
        ticketsIssued,
        checkedInCount,
        transferredCount,
        ticketTypeBreakdown: finalBreakdown,
        salesByDay,
      },
      orders: paidOrders.map((o) => ({
        id: o.id,
        buyer_name: o.buyer_name,
        buyer_email: o.buyer_email,
        buyer_phone: o.buyer_phone,
        amount_total: o.amount_total,
        currency_code: o.currency_code,
        payment_reference: o.payment_reference,
        paid_at: o.paid_at,
        items: (o.order_items || []).map((i) => ({
          ticketTypeName: i.ticket_type_name,
          quantity: i.quantity,
        })),
        tickets: (o.tickets || []).map((t) => ({
          id: t.id,
          holder_name: t.holder_name,
          checked_in: t.checked_in,
          transferred_at: t.transferred_at,
        })),
      })),
    });
  } catch (err) {
    console.error("❌ Error fetching event stats:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch event stats",
    });
  }
});

// ─── GUEST LIST — CSV EXPORT ──────────────────────────────────────
router.get("/events/:eventId/guest-list.csv", async (req, res) => {
  const { eventId } = req.params;

  try {
    const [eventRows] = await pool.query(
      `SELECT id, title FROM events WHERE id = ? AND organizer_id = ?`,
      [eventId, req.user.id]
    );
    if (eventRows.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    const event = eventRows[0];

    const [ticketRows] = await pool.query(
      `SELECT 
        t.holder_name, t.holder_email, t.code, t.checked_in, t.checked_in_at, t.transferred_at,
        tt.name as ticket_type_name,
        o.buyer_email, o.buyer_phone, o.payment_reference, o.currency_code, o.amount_total
       FROM tickets t
       LEFT JOIN ticket_types tt ON t.ticket_type_id = tt.id
       LEFT JOIN orders o ON t.order_id = o.id
       WHERE t.event_id = ?
       ORDER BY t.holder_name ASC`,
      [eventId]
    );

    const tickets = ticketRows || [];

    const rows = [
      [
        "Holder Name",
        "Holder Email",
        "Ticket Type",
        "Order Reference",
        "Buyer Phone",
        "Amount Paid",
        "Currency",
        "Checked In",
        "Checked In At",
        "Transferred",
        "Ticket Code",
      ],
      ...tickets.map((t) => [
        t.holder_name || "",
        t.holder_email || t.buyer_email || "",
        t.ticket_type_name || "",
        t.payment_reference || "",
        t.buyer_phone || "",
        t.amount_total ?? "",
        t.currency_code || "",
        t.checked_in ? "Yes" : "No",
        t.checked_in_at || "",
        t.transferred_at ? "Yes" : "No",
        t.code || "",
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const safeTitle = event.title.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}-guest-list.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error("❌ Error generating guest list:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to generate guest list" });
  }
});

// ============================================
// GET BANKS FOR A COUNTRY (Both Paystack & Flutterwave)
// ============================================
router.get("/banks", async (req, res) => {
  try {
    const { country, provider } = req.query;

    if (!country) {
      return res.status(400).json({
        success: false,
        message: "Country is required",
      });
    }

    let banks = [];
    let providerType = provider || (country === "Nigeria" ? "paystack" : "flutterwave");

    console.log(`📡 Fetching banks for country: ${country}, provider: ${providerType}`);

    // Check provider keys
    if (providerType === "paystack") {
      if (!process.env.PAYSTACK_SECRET_KEY) {
        console.error("❌ Paystack secret key not configured");
        return res.status(500).json({
          success: false,
          message: "Paystack is not configured. Please add PAYSTACK_SECRET_KEY to your environment variables.",
        });
      }
    } else if (providerType === "flutterwave") {
      if (!process.env.FLUTTERWAVE_SECRET_KEY) {
        console.error("❌ Flutterwave secret key not configured");
        return res.status(500).json({
          success: false,
          message: "Flutterwave is not configured. Please add FLUTTERWAVE_SECRET_KEY to your environment variables.",
        });
      }
    }

    // Try cache
    const [cachedRows] = await pool.query(
      `SELECT * FROM banks 
       WHERE country = ? AND provider = ? AND is_active = 1`,
      [country, providerType]
    );

    if (cachedRows && cachedRows.length > 0) {
      const lastUpdated = new Date(cachedRows[0]?.updated_at || 0);
      const now = new Date();
      const hoursDiff = (now - lastUpdated) / (1000 * 60 * 60);

      if (hoursDiff < 24) {
        banks = cachedRows.map((bank) => ({
          code: bank.code,
          name: bank.name,
          country: bank.country,
          type: bank.type || "Commercial",
        }));
        console.log(`✅ Returning ${banks.length} cached banks for ${country}`);
        return res.json({ success: true, banks });
      }
    }

    console.log(`🔄 Fetching fresh banks for ${country} from ${providerType}`);

    // Fetch from provider
    if (providerType === "paystack") {
      // Paystack only supports Nigeria
      if (country !== "Nigeria") {
        return res.status(400).json({
          success: false,
          message: "Paystack is only available for Nigeria. Please use Flutterwave for other countries.",
        });
      }

      const response = await fetch(`${process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co'}/bank`, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      });

      const data = await response.json();

      if (data.status) {
        banks = data.data.map((bank) => ({
          code: bank.code,
          name: bank.name,
          country: "Nigeria",
          type: bank.type || "Commercial",
        }));
        console.log(`✅ Found ${banks.length} banks from Paystack for Nigeria`);
      } else {
        throw new Error(data.message || "Failed to fetch banks from Paystack");
      }
    } else {
      // Flutterwave - supports multiple countries
      if (!FLUTTERWAVE_COUNTRIES.includes(country)) {
        console.warn(`⚠️ ${country} may not be supported by Flutterwave for bank listing`);
        return res.json({ success: true, banks: [] });
      }

      const response = await fetch(
        `${process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3'}/banks/${country}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.status === "success") {
        banks = data.data.map((bank) => ({
          code: bank.code,
          name: bank.name,
          country: country,
          type: bank.type || "Commercial",
        }));
        console.log(`✅ Found ${banks.length} banks from Flutterwave for ${country}`);
      } else {
        console.warn(`⚠️ No banks found for ${country} from Flutterwave:`, data.message);
        return res.json({ success: true, banks: [] });
      }
    }

    // Cache banks – use INSERT IGNORE to avoid duplicates
    if (banks.length > 0) {
      const insertValues = banks.map((bank) => [
        bank.code,
        bank.name,
        country,
        providerType,
        bank.type || "Commercial",
        1,
        new Date().toISOString(),
      ]);

      await pool.query(
        `INSERT IGNORE INTO banks (code, name, country, provider, type, is_active, updated_at)
         VALUES ?`,
        [insertValues]
      );
      console.log(`✅ Cached ${banks.length} banks for ${country} (${providerType})`);
    }

    res.json({ success: true, banks });
  } catch (error) {
    console.error("Error fetching banks:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch banks",
    });
  }
});

// ============================================
// VERIFY BANK ACCOUNT
// ============================================
router.post("/verify-account", async (req, res) => {
  try {
    const { bankCode, accountNumber, country, provider } = req.body;

    if (!bankCode || !accountNumber || !country) {
      return res.status(400).json({
        success: false,
        message: "Bank code, account number, and country are required",
      });
    }

    let accountName = "";
    let providerType = provider || (country === "Nigeria" ? "paystack" : "flutterwave");

    console.log(`🔍 Verifying account: ${accountNumber} at bank ${bankCode} via ${providerType}`);

    if (providerType === "paystack") {
      if (!process.env.PAYSTACK_SECRET_KEY) {
        return res.status(500).json({
          success: false,
          message: "Paystack is not configured",
        });
      }

      const response = await fetch(
        `${process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co'}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      const data = await response.json();

      if (data.status) {
        accountName = data.data.account_name;
      } else {
        throw new Error(data.message || "Account verification failed");
      }
    } else {
      if (!process.env.FLUTTERWAVE_SECRET_KEY) {
        return res.status(500).json({
          success: false,
          message: "Flutterwave is not configured",
        });
      }

      const response = await fetch(
        `${process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3'}/accounts/resolve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            account_number: accountNumber,
            account_bank: bankCode,
          }),
        }
      );

      const data = await response.json();

      if (data.status === "success") {
        accountName = data.data.account_name;
      } else {
        throw new Error(data.message || "Account verification failed");
      }
    }

    res.json({
      success: true,
      account_name: accountName,
    });
  } catch (error) {
    console.error("Error verifying account:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to verify account",
    });
  }
});

// ============================================
// CONNECT PAYOUT ACCOUNT
// ============================================
router.post("/connect-payout", async (req, res) => {
  const { bankCode, accountNumber, accountName, country, provider, currency } = req.body;

  if (!bankCode || !accountNumber || !accountName || !country || !provider) {
    return res.status(400).json({
      success: false,
      message: "Bank code, account number, account name, country, and provider are required",
    });
  }

  try {
    const userId = req.user.id;
    let subaccountCode = null;
    let subaccountId = null;
    let bankName = "";

    const [bankRows] = await pool.query(
      `SELECT name FROM banks WHERE code = ? AND country = ?`,
      [bankCode, country]
    );
    if (bankRows.length > 0) {
      bankName = bankRows[0].name;
    }

    const [feeRows] = await pool.query(
      `SELECT value FROM platform_settings WHERE \`key\` = 'platform_fee_percent'`
    );
    const platformFeePercent = Number(feeRows[0]?.value ?? 5);

    const [profileRows] = await pool.query(
      `SELECT full_name FROM profiles WHERE id = ?`,
      [userId]
    );
    const businessName = profileRows[0]?.full_name || "Sahm TicketHub Organizer";

    console.log(`🔗 Connecting payout account for ${country} via ${provider}`);

    if (provider === "paystack") {
      if (!process.env.PAYSTACK_SECRET_KEY) {
        return res.status(500).json({
          success: false,
          message: "Paystack is not configured",
        });
      }

      try {
        const psRes = await fetch("https://api.paystack.co/subaccount", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            business_name: businessName,
            settlement_bank: bankCode,
            account_number: accountNumber,
            percentage_charge: platformFeePercent,
          }),
        });
        const psJson = await psRes.json();
        if (psJson.status) {
          subaccountCode = psJson.data.subaccount_code;
          console.log(`✅ Paystack subaccount created: ${subaccountCode}`);
        } else {
          throw new Error(psJson.message || "Paystack subaccount creation failed");
        }
      } catch (err) {
        console.error("⚠️ Paystack subaccount error:", err);
        throw new Error(`Paystack: ${err.message}`);
      }
    } else {
      if (!process.env.FLUTTERWAVE_SECRET_KEY) {
        return res.status(500).json({
          success: false,
          message: "Flutterwave is not configured",
        });
      }

      try {
        const fwRes = await fetch("https://api.flutterwave.com/v3/subaccounts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            account_bank: bankCode,
            account_number: accountNumber,
            country: country,
            business_name: businessName,
            business_email: req.user.email,
            currency: currency || "USD",
            split_type: "percentage",
            split_value: platformFeePercent / 100,
          }),
        });
        const fwJson = await fwRes.json();
        if (fwJson.status === "success") {
          subaccountId = fwJson.data.subaccount_id || fwJson.data.id;
          console.log(`✅ Flutterwave subaccount created: ${subaccountId}`);
        } else {
          throw new Error(fwJson.message || "Flutterwave subaccount creation failed");
        }
      } catch (err) {
        console.error("⚠️ Flutterwave subaccount error:", err);
        throw new Error(`Flutterwave: ${err.message}`);
      }
    }

    // Save payout account to database
    const [result] = await pool.query(
      `INSERT INTO payout_accounts 
       (user_id, bank_code, bank_name, account_number, account_name, bank_country, bank_currency, provider, 
        paystack_subaccount_code, flutterwave_subaccount_id, flutterwave_subaccount_code, payout_setup_complete, is_active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE
       bank_code = VALUES(bank_code),
       bank_name = VALUES(bank_name),
       account_number = VALUES(account_number),
       account_name = VALUES(account_name),
       bank_country = VALUES(bank_country),
       bank_currency = VALUES(bank_currency),
       provider = VALUES(provider),
       paystack_subaccount_code = VALUES(paystack_subaccount_code),
       flutterwave_subaccount_id = VALUES(flutterwave_subaccount_id),
       flutterwave_subaccount_code = VALUES(flutterwave_subaccount_code),
       payout_setup_complete = VALUES(payout_setup_complete),
       is_active = 1,
       updated_at = NOW()`,
      [
        userId,
        bankCode,
        bankName,
        accountNumber,
        accountName,
        country,
        currency || (country === "Nigeria" ? "NGN" : "USD"),
        provider,
        subaccountCode,
        subaccountId,
        subaccountId,
        !!(subaccountCode || subaccountId),
      ]
    );

    const [savedRows] = await pool.query(
      `SELECT * FROM payout_accounts WHERE user_id = ?`,
      [userId]
    );
    const savedAccount = savedRows[0];

    await pool.query(
      `UPDATE profiles 
       SET bank_code = ?, bank_name = ?, account_number = ?, account_name = ?,
           paystack_subaccount_code = ?, flutterwave_subaccount_id = ?, payout_setup_complete = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        bankCode,
        bankName,
        accountNumber,
        accountName,
        subaccountCode,
        subaccountId,
        !!(subaccountCode || subaccountId),
        userId,
      ]
    );

    res.json({
      success: true,
      message: "Payout account connected successfully",
      payoutAccount: {
        paystack_subaccount_code: savedAccount.paystack_subaccount_code,
        flutterwave_subaccount_id: savedAccount.flutterwave_subaccount_id,
        payout_setup_complete: savedAccount.payout_setup_complete,
        bank_name: savedAccount.bank_name,
        account_name: savedAccount.account_name,
        account_number: savedAccount.account_number,
        country: savedAccount.bank_country,
        currency: savedAccount.bank_currency,
        provider: savedAccount.provider,
      },
    });
  } catch (err) {
    console.error("❌ Error connecting payout account:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to connect payout account",
    });
  }
});

// ============================================
// GET MY PAYOUT ACCOUNT STATUS
// ============================================
router.get("/payout-account", async (req, res) => {
  try {
    const userId = req.user.id;

    let [payoutRows] = await pool.query(
      `SELECT * FROM payout_accounts WHERE user_id = ?`,
      [userId]
    );
    let payoutAccount = payoutRows[0] || null;

    if (!payoutAccount) {
      const [profileRows] = await pool.query(
        `SELECT bank_code, bank_name, account_number, account_name, paystack_subaccount_code, flutterwave_subaccount_id, payout_setup_complete
         FROM profiles WHERE id = ?`,
        [userId]
      );
      if (profileRows.length > 0) {
        const p = profileRows[0];
        payoutAccount = {
          user_id: userId,
          bank_code: p.bank_code,
          bank_name: p.bank_name,
          account_number: p.account_number,
          account_name: p.account_name,
          paystack_subaccount_code: p.paystack_subaccount_code,
          flutterwave_subaccount_id: p.flutterwave_subaccount_id,
          payout_setup_complete: p.payout_setup_complete,
        };
      }
    }

    if (payoutAccount) {
      if (payoutAccount.paystack_subaccount_code) {
        payoutAccount.provider = "paystack";
      } else if (payoutAccount.flutterwave_subaccount_id) {
        payoutAccount.provider = "flutterwave";
      }
    }

    return res.json({
      success: true,
      payoutAccount: payoutAccount || {
        user_id: userId,
        paystack_subaccount_code: null,
        flutterwave_subaccount_id: null,
        payout_setup_complete: false,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching payout account:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch payout account",
    });
  }
});

// ============================================
// DISCONNECT PAYOUT ACCOUNT
// ============================================
router.post("/disconnect-payout", async (req, res) => {
  try {
    const userId = req.user.id;

    const [payoutRows] = await pool.query(
      `SELECT * FROM payout_accounts WHERE user_id = ?`,
      [userId]
    );
    const payoutAccount = payoutRows[0] || null;

    if (payoutAccount) {
      if (payoutAccount.paystack_subaccount_code) {
        try {
          await fetch(
            `${process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co'}/subaccount/${payoutAccount.paystack_subaccount_code}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ active: false }),
            }
          );
          console.log(`✅ Deactivated Paystack subaccount: ${payoutAccount.paystack_subaccount_code}`);
        } catch (err) {
          console.error("Error deactivating Paystack subaccount:", err);
        }
      }

      if (payoutAccount.flutterwave_subaccount_id) {
        try {
          await fetch(
            `${process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3'}/subaccounts/${payoutAccount.flutterwave_subaccount_id}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ status: "inactive" }),
            }
          );
          console.log(`✅ Deactivated Flutterwave subaccount: ${payoutAccount.flutterwave_subaccount_id}`);
        } catch (err) {
          console.error("Error deactivating Flutterwave subaccount:", err);
        }
      }

      await pool.query(`DELETE FROM payout_accounts WHERE user_id = ?`, [userId]);
    }

    await pool.query(
      `UPDATE profiles 
       SET bank_code = NULL, bank_name = NULL, account_number = NULL, account_name = NULL,
           paystack_subaccount_code = NULL, flutterwave_subaccount_id = NULL, payout_setup_complete = FALSE,
           updated_at = NOW()
       WHERE id = ?`,
      [userId]
    );

    res.json({
      success: true,
      message: "Payout account disconnected successfully",
    });
  } catch (err) {
    console.error("❌ Error disconnecting payout account:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to disconnect payout account",
    });
  }
});

// ============================================
// GET PAYOUT HISTORY
// ============================================
router.get("/payout-history", async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT * FROM payouts WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      history: rows || [],
    });
  } catch (err) {
    console.error("❌ Error fetching payout history:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch payout history",
    });
  }
});

// ============================================
// TEST FLUTTERWAVE CONNECTION (For debugging)
// ============================================
router.get("/test-flutterwave", async (req, res) => {
  try {
    const hasSecretKey = !!process.env.FLUTTERWAVE_SECRET_KEY;
    const hasPaystackKey = !!process.env.PAYSTACK_SECRET_KEY;

    let flutterwaveStatus = 'not_configured';
    let paystackStatus = 'not_configured';
    let flutterwaveBanks = [];
    let paystackBanks = [];

    if (hasSecretKey) {
      try {
        const response = await fetch(
          `${process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3'}/banks/Ghana`,
          {
            headers: {
              Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const data = await response.json();
        flutterwaveStatus = data.status === 'success' ? 'connected' : 'error';
        if (data.status === 'success') {
          flutterwaveBanks = data.data?.slice(0, 5) || [];
        }
      } catch (err) {
        flutterwaveStatus = 'error';
        console.error('Flutterwave test error:', err);
      }
    }

    if (hasPaystackKey) {
      try {
        const response = await fetch(
          `${process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co'}/bank`,
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            },
          }
        );
        const data = await response.json();
        paystackStatus = data.status ? 'connected' : 'error';
        if (data.status) {
          paystackBanks = data.data?.slice(0, 5) || [];
        }
      } catch (err) {
        paystackStatus = 'error';
        console.error('Paystack test error:', err);
      }
    }

    res.json({
      success: true,
      providers: {
        flutterwave: {
          configured: hasSecretKey,
          status: flutterwaveStatus,
          baseUrl: process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3',
          sampleBanks: flutterwaveBanks,
        },
        paystack: {
          configured: hasPaystackKey,
          status: paystackStatus,
          baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
          sampleBanks: paystackBanks,
        },
      },
      flutterwaveCountries: FLUTTERWAVE_COUNTRIES.slice(0, 10),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// UPDATE FEE BEARER FOR AN EVENT
// ============================================
router.patch("/events/:eventId/fee-bearer", async (req, res) => {
  const { eventId } = req.params;
  const { feeBearer } = req.body;

  if (!["organizer", "attendee"].includes(feeBearer)) {
    return res.status(400).json({
      success: false,
      message: "feeBearer must be 'organizer' or 'attendee'",
    });
  }

  try {
    const [result] = await pool.query(
      `UPDATE events SET fee_bearer = ? WHERE id = ? AND organizer_id = ?`,
      [feeBearer, eventId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const [rows] = await pool.query(`SELECT * FROM events WHERE id = ?`, [eventId]);
    return res.json({ success: true, event: rows[0] });
  } catch (err) {
    console.error("❌ Error updating fee bearer:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update fee bearer",
    });
  }
});

export default router;