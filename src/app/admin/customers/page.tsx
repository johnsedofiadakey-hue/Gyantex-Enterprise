"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdminRole } from "@/hooks/useAdminRole";

interface Order {
  customer: { firstName: string; lastName: string; phone: string; email?: string; marketingOptIn?: boolean };
  totalAmount: number;
  status: string;
  createdAt?: { toDate: () => Date };
}

interface CustomerRow {
  key: string;
  name: string;
  phone: string;
  email?: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: Date | null;
  marketingOptIn: boolean;
}

export default function AdminCustomersPage() {
  const { role } = useAdminRole();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Capped, not paginated — see src/app/admin/page.tsx for why. Note this
    // one trades a little correctness for the cost ceiling: a customer's
    // lifetime total only reflects their most recent 1000 orders across the
    // whole business, not literally every order ever. Fine at this
    // business's realistic scale for a long time yet.
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(1000));
    const unsubscribe = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => d.data() as Order));
      setLoading(false);
    }, () => setLoading(false));
    return unsubscribe;
  }, []);

  const customers = useMemo(() => {
    // "Orders" and "Last Order" only count orders that were actually paid
    // for — an abandoned or failed checkout attempt isn't an order a
    // customer placed, and counting it made someone who tried three times
    // before succeeding look like a 3-order customer.
    const byPhone = new Map<string, CustomerRow>();
    for (const order of orders) {
      const phone = order.customer?.phone || "unknown";
      const paid = order.status === "paid";
      const orderDate = order.createdAt?.toDate?.() ?? null;
      const existing = byPhone.get(phone);
      if (existing) {
        if (paid) {
          existing.orderCount += 1;
          existing.totalSpent += order.totalAmount || 0;
          if (orderDate && (!existing.lastOrderAt || orderDate > existing.lastOrderAt)) existing.lastOrderAt = orderDate;
        }
        if (order.customer?.marketingOptIn) existing.marketingOptIn = true;
      } else {
        byPhone.set(phone, {
          key: phone,
          name: `${order.customer?.firstName || ""} ${order.customer?.lastName || ""}`.trim() || "—",
          phone,
          email: order.customer?.email,
          orderCount: paid ? 1 : 0,
          totalSpent: paid ? order.totalAmount || 0 : 0,
          lastOrderAt: paid ? orderDate : null,
          marketingOptIn: Boolean(order.customer?.marketingOptIn),
        });
      }
    }
    return Array.from(byPhone.values()).sort((a, b) => (b.lastOrderAt?.getTime() ?? 0) - (a.lastOrderAt?.getTime() ?? 0));
  }, [orders]);

  if (role === "staff") {
    return (
      <div className="bg-white p-12 text-center text-charcoal/50 shadow-sm">
        This page is only available to the business owner.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-charcoal/60">
        {customers.length} customer{customers.length === 1 ? "" : "s"} — derived from quote and order history (there are no customer accounts yet).
      </p>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center text-charcoal/50">Loading customers…</div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center text-charcoal/50">No customers yet.</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-soft-grey text-left text-charcoal/50 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Orders</th>
                <th className="px-6 py-3 font-medium">Total Spent</th>
                <th className="px-6 py-3 font-medium">Last Order</th>
                <th className="px-6 py-3 font-medium">Marketing</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.key} className="border-b border-soft-grey last:border-0">
                  <td className="px-6 py-3 font-medium">{c.name}</td>
                  <td className="px-6 py-3 text-charcoal/70">
                    <div>{c.phone}</div>
                    {c.email && <div className="text-xs text-charcoal/50">{c.email}</div>}
                  </td>
                  <td className="px-6 py-3">{c.orderCount}</td>
                  <td className="px-6 py-3 font-medium">GHS {c.totalSpent.toFixed(2)}</td>
                  <td className="px-6 py-3 text-charcoal/60">{c.lastOrderAt ? c.lastOrderAt.toLocaleDateString() : "—"}</td>
                  <td className="px-6 py-3">
                    {c.marketingOptIn ? (
                      <span className="inline-flex items-center rounded-full bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal">Opted in</span>
                    ) : (
                      <span className="text-xs text-charcoal/40">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
