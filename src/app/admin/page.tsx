"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlertTriangle } from "lucide-react";

interface Order {
  id: string;
  orderId: string;
  customer: { firstName: string; lastName: string };
  totalAmount: number;
  status: "pending_payment" | "paid" | "expired" | "failed" | "whatsapp_pending" | "quote_requested";
  fulfillmentStatus: "pending" | "processing" | "shipped" | "delivered";
  createdAt?: { toDate: () => Date };
}

interface Product {
  id: string;
  name: string;
  priceMode?: "fixed" | "quote";
  trackInventory?: boolean;
  stockUnits?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rangeDays, setRangeDays] = useState(7);

  useEffect(() => {
    // Capped, not paginated — a safety ceiling against unbounded Firestore
    // read costs if order volume ever grows large, not a real pagination
    // solution. Fine indefinitely at this business's realistic scale; worth
    // revisiting with real pagination if order count ever nears this.
    const unsubOrders = onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(1000)), (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
    });
    const unsubProducts = onSnapshot(collection(db, "products"), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
    });
    return () => { unsubOrders(); unsubProducts(); };
  }, []);

  // Date.now() here is a deliberate "as of render" read for a manual date-range
  // filter, not a ticking clock — safe since this project doesn't enable the
  // React Compiler (see next.config.ts), which is what this rule guards against.
  // eslint-disable-next-line react-hooks/purity
  const cutoff = Date.now() - rangeDays * DAY_MS;
  const inRange = useMemo(
    () => orders.filter((o) => (o.createdAt?.toDate?.().getTime() ?? 0) >= cutoff),
    [orders, cutoff]
  );

  const paidInRange = inRange.filter((o) => o.status === "paid");
  const totalSales = paidInRange.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const quoteRequests = orders.filter((o) => o.status === "quote_requested").length;
  const pendingOrders = orders.filter((o) => o.status === "paid" && o.fulfillmentStatus === "pending").length;
  const stockProducts = products.filter((p) => p.trackInventory !== false && p.priceMode !== "quote" && typeof p.stockUnits === "number");
  const lowStock = stockProducts.filter((p) => (p.stockUnits ?? 0) > 0 && (p.stockUnits ?? 0) <= 4);
  const outOfStock = stockProducts.filter((p) => (p.stockUnits ?? 0) <= 0);

  const stats = [
    { name: "Total Sales", value: `GHS ${totalSales.toFixed(2)}` },
    { name: "Orders", value: String(inRange.length) },
    { name: "Quote Requests", value: String(quoteRequests), alert: quoteRequests > 0 },
    { name: "Pending Fulfillment", value: String(pendingOrders) },
    { name: "Low Stock Items", value: String(lowStock.length), alert: lowStock.length > 0 },
  ];

  const recentOrders = orders.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <select
          value={rangeDays}
          onChange={(e) => setRangeDays(Number(e.target.value))}
          className="border border-charcoal/20 rounded-md px-3 py-1.5 text-sm bg-white outline-none focus:border-olive"
        >
          <option value={1}>Today</option>
          <option value={7}>This Week</option>
          <option value={30}>This Month</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-5 rounded-lg shadow-sm border border-soft-grey flex flex-col">
            <span className="text-sm font-medium text-charcoal/60 mb-2">{stat.name}</span>
            <span className={`text-2xl font-bold ${stat.alert ? "text-terracotta" : "text-charcoal"}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Low stock callout */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-soft-grey">
          <h3 className="font-semibold mb-4">Needs Attention</h3>
          {lowStock.length === 0 && outOfStock.length === 0 ? (
            <p className="text-sm text-charcoal/50">No stock issues right now.</p>
          ) : (
            <div className="space-y-3">
              {outOfStock.map((p) => (
                <div key={p.id} className="flex items-center gap-3 text-sm">
                  <AlertTriangle size={16} className="text-terracotta shrink-0" />
                  <span className="flex-1">{p.name}</span>
                  <span className="text-terracotta font-medium">Out of stock</span>
                </div>
              ))}
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center gap-3 text-sm">
                  <AlertTriangle size={16} className="text-[#a9761f] shrink-0" />
                  <span className="flex-1">{p.name}</span>
                  <span className="text-[#a9761f] font-medium">{p.stockUnits} unit{p.stockUnits === 1 ? "" : "s"} left</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/admin/products" className="inline-block text-sm text-olive font-medium mt-6 hover:underline">
            Manage products →
          </Link>
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-soft-grey">
          <h3 className="font-semibold mb-6">Recent Orders</h3>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-charcoal/50">No orders yet.</p>
          ) : (
            <div className="space-y-5">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex justify-between items-center text-sm">
                  <div>
                    <div className="font-medium text-olive">#{order.id.slice(0, 8)}</div>
                    <div className="text-charcoal/60">{order.customer?.firstName} {order.customer?.lastName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">GHS {order.totalAmount?.toFixed(2)}</div>
                    <div className="flex gap-2 justify-end mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        order.status === 'paid' ? 'bg-olive/10 text-olive' : order.status === 'quote_requested' ? 'bg-charcoal text-white' : 'bg-terracotta/10 text-terracotta'
                      }`}>
                        {order.status === "paid" ? "Paid" : order.status === "quote_requested" ? "Quote" : order.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/admin/orders" className="block text-center text-sm text-olive font-medium mt-6 hover:underline">
            View all orders →
          </Link>
        </div>
      </div>
    </div>
  );
}
