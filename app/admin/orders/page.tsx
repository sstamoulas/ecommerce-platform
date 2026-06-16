import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { requireAdminPage } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function AdminOrdersPage() {
  await requireAdminPage("/admin/orders");

  const repo = getRepository();
  const orders = await repo.listOrders();

  return (
    <div className="page-shell">
      <section className="page-hero">
        <span className="eyebrow">Orders</span>
        <h1>Review order status, payment state, and routing in one table.</h1>
        <p>Use this screen to spot delayed, allocated, or exception orders before customers ask.</p>
      </section>

      <section className="panel">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Created</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Partner</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>
                        <Link href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link>
                      </strong>
                    </td>
                    <td>{order.customerName}</td>
                  <td>{formatDateTime(order.createdAt)}</td>
                  <td>
                    <StatusPill status={order.status} />
                  </td>
                  <td>
                    <StatusPill status={order.paymentStatus} />
                  </td>
                  <td>{order.fulfillmentPartnerName}</td>
                  <td>{formatCurrency(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
