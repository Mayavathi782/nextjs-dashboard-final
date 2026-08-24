import postgres from 'postgres';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

const sql = postgres(process.env.POSTGRES_URL!, {
  ssl: 'require',
});

/* =========================
   REVENUE
========================= */

export async function fetchRevenue() {
  try {
    const data = await sql<Revenue[]>`
      SELECT *
      FROM revenue
      ORDER BY month ASC
    `;

    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

/* =========================
   LATEST INVOICES
========================= */

export async function fetchLatestInvoices() {
  try {
    const data = await sql<LatestInvoiceRaw[]>`
      SELECT
        invoices.amount,
        customers.name,
        customers.image_url,
        customers.email,
        invoices.id
      FROM invoices
      JOIN customers
        ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5
    `;

    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));

    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

/* =========================
   DASHBOARD CARD DATA
========================= */

export async function fetchCardData() {
  try {
    const invoiceCountPromise = sql`
      SELECT COUNT(*) AS count
      FROM invoices
    `;

    const customerCountPromise = sql`
      SELECT COUNT(*) AS count
      FROM customers
    `;

    const invoiceStatusPromise = sql`
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN status = 'paid' THEN amount
              ELSE 0
            END
          ),
          0
        ) AS paid,

        COALESCE(
          SUM(
            CASE
              WHEN status = 'pending' THEN amount
              ELSE 0
            END
          ),
          0
        ) AS pending

      FROM invoices
    `;

    const [
      invoiceCount,
      customerCount,
      invoiceStatus,
    ] = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(
      invoiceCount[0]?.count ?? 0
    );

    const numberOfCustomers = Number(
      customerCount[0]?.count ?? 0
    );

    const totalPaidInvoices = formatCurrency(
      invoiceStatus[0]?.paid ?? 0
    );

    const totalPendingInvoices = formatCurrency(
      invoiceStatus[0]?.pending ?? 0
    );

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

/* =========================
   FILTERED INVOICES
========================= */

const ITEMS_PER_PAGE = 6;

export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await sql<InvoicesTable[]>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers
        ON invoices.customer_id = customers.id

      WHERE
        customers.name ILIKE ${`%${query}%`}
        OR customers.email ILIKE ${`%${query}%`}
        OR invoices.amount::text ILIKE ${`%${query}%`}
        OR invoices.date::text ILIKE ${`%${query}%`}
        OR invoices.status ILIKE ${`%${query}%`}

      ORDER BY invoices.date DESC

      LIMIT ${ITEMS_PER_PAGE}
      OFFSET ${offset}
    `;

    return invoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

/* =========================
   INVOICE PAGES
========================= */

export async function fetchInvoicesPages(query: string) {
  try {
    const data = await sql`
      SELECT COUNT(*) AS count
      FROM invoices
      JOIN customers
        ON invoices.customer_id = customers.id

      WHERE
        customers.name ILIKE ${`%${query}%`}
        OR customers.email ILIKE ${`%${query}%`}
        OR invoices.amount::text ILIKE ${`%${query}%`}
        OR invoices.date::text ILIKE ${`%${query}%`}
        OR invoices.status ILIKE ${`%${query}%`}
    `;

    const totalPages = Math.ceil(
      Number(data[0]?.count ?? 0) / ITEMS_PER_PAGE
    );

    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error(
      'Failed to fetch total number of invoices.'
    );
  }
}

/* =========================
   SINGLE INVOICE
========================= */

export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql<InvoiceForm[]>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id}
    `;

    const invoice = data.map((invoice) => ({
      ...invoice,

      // PostgreSQL stores amount in cents
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

/* =========================
   ALL CUSTOMERS
========================= */

export async function fetchCustomers() {
  try {
    const customers = await sql<CustomerField[]>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    return customers;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch all customers.');
  }
}

/* =========================
   FILTERED CUSTOMERS
========================= */

export async function fetchFilteredCustomers(
  query: string,
) {
  try {
    const data = await sql<CustomersTableType[]>`
      SELECT
        customers.id,
        customers.name,
        customers.email,
        customers.image_url,

        COUNT(invoices.id) AS total_invoices,

        COALESCE(
          SUM(
            CASE
              WHEN invoices.status = 'pending'
              THEN invoices.amount
              ELSE 0
            END
          ),
          0
        ) AS total_pending,

        COALESCE(
          SUM(
            CASE
              WHEN invoices.status = 'paid'
              THEN invoices.amount
              ELSE 0
            END
          ),
          0
        ) AS total_paid

      FROM customers

      LEFT JOIN invoices
        ON customers.id = invoices.customer_id

      WHERE
        customers.name ILIKE ${`%${query}%`}
        OR customers.email ILIKE ${`%${query}%`}

      GROUP BY
        customers.id,
        customers.name,
        customers.email,
        customers.image_url

      ORDER BY customers.name ASC
    `;

    const customers = data.map((customer) => ({
      ...customer,

      total_pending: formatCurrency(
        customer.total_pending
      ),

      total_paid: formatCurrency(
        customer.total_paid
      ),
    }));

    return customers;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error(
      'Failed to fetch customer table.'
    );
  }
}