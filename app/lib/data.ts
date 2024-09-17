import { sql } from '@vercel/postgres';
import { prisma } from './prisma';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';
import { Prisma } from '@prisma/client';


export async function fetchRevenue() {
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    // console.log('Fetching revenue data...');
    // await new Promise((resolve) => setTimeout(resolve, 3000));

    // const data = await sql<Revenue>`SELECT * FROM revenue`;
   
    const data = await prisma.revenue.findMany({
      select: {
        month: true,
        revenue: true
      }
    })
    // console.log('Data fetch completed after 3 seconds.');

    // return data.rows;
    return data
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    // const data = await sql<LatestInvoiceRaw>`
    //   SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
    //   FROM invoices
    //   JOIN customers ON invoices.customer_id = customers.id
    //   ORDER BY invoices.date DESC
    //   LIMIT 5`;
    const invoices = await prisma.invoices.findMany({
      select: {
        amount: true,
        id: true,
        customers: {
          select: {
            name: true,
            image_url: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 5,
    });

    const data = invoices.map((invoice) => ({
      amount: formatCurrency(invoice.amount),
      id: invoice.id,
      name: invoice.customers.name,
      image_url: invoice.customers.image_url,
      email: invoice.customers.email,
    }));
    
    return data;
    
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    // const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    const invoiceCountPromise = prisma.invoices.count();

    // const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const customerCountPromise = prisma.customers.count();

    // const invoiceStatusPromise = sqlSELECT
    //      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
    //      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
    //      FROM invoices;
    const invoiceStatusPromise = prisma.invoices.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        OR: [
          { status: 'paid' },
          { status: 'pending' }
        ]
      },
    });
    

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const paidAmount = data[2]._sum.amount || 0;
    const pendingAmount = data[2]._sum.amount || 0;

    const numberOfInvoices = Number(data[0] ?? '0');
    const numberOfCustomers = Number(data[1] ?? '0');
    const totalPaidInvoices = formatCurrency(paidAmount ?? '0');
    const totalPendingInvoices = formatCurrency(pendingAmount ?? '0');

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

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    // const invoices = await sql<InvoicesTable>`
    //   SELECT
    //     invoices.id,
    //     invoices.amount,
    //     invoices.date,
    //     invoices.status,
    //     customers.name,
    //     customers.email,
    //     customers.image_url
    //   FROM invoices
    //   JOIN customers ON invoices.customer_id = customers.id
    //   WHERE
    //     customers.name ILIKE ${`%${query}%`} OR
    //     customers.email ILIKE ${`%${query}%`} OR
    //     invoices.amount::text ILIKE ${`%${query}%`} OR
    //     invoices.date::text ILIKE ${`%${query}%`} OR
    //     invoices.status ILIKE ${`%${query}%`}
    //   ORDER BY invoices.date DESC
    //   LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    // `;
    

    const invoices = await prisma.invoices.findMany({
      where: {
        OR: [
          {
            customers: {
              name: {
                contains: query,
                mode: 'insensitive', // Case-insensitive search
              },
            },
          },
          {
            customers: {
              email: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
          // {
          //   amount: {
          //     equals: parseFloat(query), // Direct match for the amount
          //   },
          // },
          // {
          //   date: {
          //     equals: new Date(query).toISOString(), // Match against the date (requires valid date string)
          //   },
          // },
          {
            status: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        customers: {
          select: {
            name: true,
            email: true,
            image_url: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: ITEMS_PER_PAGE,
      skip: offset,
    });
    
    // Restructure the results
    const data = invoices.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount,
      date: String (invoice.date),
      status: invoice.status,
      name: invoice.customers.name,
      email: invoice.customers.email,
      image_url: invoice.customers.image_url,
    }));

    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
  //   const count = await sql`SELECT COUNT(*)
  //   FROM invoices
  //   JOIN customers ON invoices.customer_id = customers.id
  //   WHERE
  //     customers.name ILIKE ${`%${query}%`} OR
  //     customers.email ILIKE ${`%${query}%`} OR
  //     invoices.amount::text ILIKE ${`%${query}%`} OR
  //     invoices.date::text ILIKE ${`%${query}%`} OR
  //     invoices.status ILIKE ${`%${query}%`}
  // `;


  const count = await prisma.invoices.count({
    where: {
      OR: [
        {
          customers: {
            name: {
              contains: query,
              // mode: 'insensitive', // Case-insensitive search
            },
          },
        },
        {
          customers: {
            email: {
              contains: query,
              // mode: 'insensitive',
            },
          },
        },
        // {
        //   amount: {
        //     equals: parseFloat(query), // Attempt to match the amount if it's a valid number
        //   },
        // },
        // {
        //   date: {
        //     equals: new Date(query), // Attempt to match the date if it's a valid date string
        //   },
        // },
        {
          status: {
            contains: query,
            // mode: 'insensitive',
          },
        },
      ],
    },
  });

    const totalPages = Math.ceil(Number(count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    // const dat = await sql<InvoiceForm>`
    //   SELECT
    //     invoices.id,
    //     invoices.customer_id,
    //     invoices.amount,
    //     invoices.status
    //   FROM invoices
    //   WHERE invoices.id = ${id};
    // `;

    
    const data = await prisma.invoices.findMany({
      select:{
        id: true,
        customer_id: true,
        amount: true,
        status: true,
      },
      where:{
        id
      }

    })
    

    const invoice: InvoiceForm = {
      id: data[0].id,
      amount: data[0].amount/100,
      status: data[0].status,
      customer_id: data[0].customer_id
    }
    

    return invoice;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    // const data = await sql<CustomerField>`
    //   SELECT
    //     id,
    //     name
    //   FROM customers
    //   ORDER BY name ASC
    // `;

    const data = await prisma.customers.findMany({
      select:{
        id: true,
        name: true,
      },
      orderBy:{
        name: 'asc'
      }
    })

    
    return data;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    // const data = await sql<CustomersTableType>`
		// SELECT
		//   customers.id,
		//   customers.name,
		//   customers.email,
		//   customers.image_url,
		//   COUNT(invoices.id) AS total_invoices,
		//   SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		//   SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		// FROM customers
		// LEFT JOIN invoices ON customers.id = invoices.customer_id
		// WHERE
		//   customers.name ILIKE ${`%${query}%`} OR
    //     customers.email ILIKE ${`%${query}%`}
		// GROUP BY customers.id, customers.name, customers.email, customers.image_url
		// ORDER BY customers.name ASC
	  // `;

    // dat.rows[0].

    const customers = await prisma.customers.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive', // Case-insensitive search
            },
          },
          {
            email: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        invoices: true, // Include related invoices
      },
      orderBy: {
        name: 'asc',
      },
    });



    // Process each customer to calculate total_invoices, total_pending, and total_paid
    const data = customers.map((customer) => {
      const totalInvoices = customer.invoices.length;
      const { totalPending, totalPaid } = customer.invoices.reduce(
        (acc, invoice) => {
          if (invoice.status === 'pending') {
            acc.totalPending += invoice.amount;
          } else if (invoice.status === 'paid') {
            acc.totalPaid += invoice.amount;
          }
          return acc;
        },
        { totalPending: 0, totalPaid: 0 }
      )
      
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        image_url: customer.image_url,
        total_invoices: totalInvoices,
        total_pending: formatCurrency(totalPending),
        total_paid: formatCurrency(totalPaid),
      };

    })

    return data;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
