"use client";

import { Fragment, useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToastStore } from "@/store/useToastStore";
import { useAdminRole } from "@/hooks/useAdminRole";
import { ChevronDown, MessageCircle, Store } from "lucide-react";
import ProductImage from "@/components/ProductImage";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  priceMode?: "fixed" | "quote";
  minimumOrder?: string;
  category?: string;
  color: string;
  image?: string;
  selections?: Record<string, string>;
  purchaseType: "full" | "half";
}

interface Order {
  id: string;
  orderId: string;
  orderNumber?: string;
  customer: { firstName: string; lastName?: string; phone: string; email?: string };
  items: OrderItem[];
  deliveryZone: string;
  deliveryFee?: number;
  deliveryDetails?: { label?: string; address?: string; notes?: string; pickupAddress?: string };
  projectDetails?: { organization?: string; neededBy?: string; brief?: string };
  totalAmount: number;
  status: "pending_payment" | "paid" | "expired" | "failed" | "whatsapp_pending" | "quote_requested";
  fulfillmentStatus: "pending" | "processing" | "delivered";
  channel: "paystack" | "whatsapp" | "pos";
  paymentMethod?: "cash" | "mobile_money";
  staffEmail?: string;
  amountTendered?: number;
  changeDue?: number | null;
  notes?: string;
  createdAt?: { toDate: () => Date };
}

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "quote_requested", label: "Quotes" },
  { key: "paid", label: "Paid" },
  { key: "whatsapp_pending", label: "WhatsApp" },
  { key: "pending_payment", label: "Pending Payment" },
  { key: "failed", label: "Failed / Expired" },
];

const PAYMENT_BADGE: Record<Order["status"], { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-olive/10 text-olive" },
  pending_payment: { label: "Awaiting Payment", className: "bg-sand text-charcoal" },
  whatsapp_pending: { label: "WhatsApp Order", className: "bg-[#25D366]/10 text-[#128C7E]" },
  quote_requested: { label: "Quote Requested", className: "bg-charcoal text-white" },
  failed: { label: "Failed", className: "bg-terracotta/10 text-terracotta" },
  expired: { label: "Expired", className: "bg-charcoal/10 text-charcoal/60" },
};

const FULFILLMENT_OPTIONS: Order["fulfillmentStatus"][] = ["pending", "processing", "delivered"];

// "Delivered" reads as "Picked Up" for pickup orders — same underlying
// status, just the label a pickup order actually earns.
function fulfillmentLabel(status: Order["fulfillmentStatus"], isPickup: boolean) {
  if (status === "delivered" && isPickup) return "Picked Up";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AdminOrdersPage() {
  const { role } = useAdminRole();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toast = useToastStore((s) => s.show);

  useEffect(() => {
    // Capped, not paginated — see src/app/admin/page.tsx for why.
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(1000));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setOrders(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load orders", error);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const visible = orders.filter((o) => {
    if (tab === "all") return true;
    if (tab === "failed") return o.status === "failed" || o.status === "expired";
    return o.status === tab;
  });

  const updateFulfillment = async (orderId: string, fulfillmentStatus: Order["fulfillmentStatus"]) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { fulfillmentStatus });
      toast("Order updated.", "success");
    } catch (error) {
      console.error(error);
      toast("Couldn't update this order. Please try again.", "error");
    }
  };

  // item.price is already the fully-resolved price at order time (base
  // price, or a priced Customer-choices selection) — item.priceMode is just
  // a stale copy of the product's base-price mode and can say "quote" even
  // when the item resolved to a real price via an option value.
  const priceLabel = (item: OrderItem) => {
    if (item.price <= 0) return "Price not set yet";
    return `GHS ${(item.price * item.quantity).toFixed(2)}`;
  };

  const totalLabel = (order: Order) => {
    const hasQuoteItems = order.status === "quote_requested" || order.items?.some((item) => item.price <= 0);
    if (hasQuoteItems && !order.totalAmount) return "After quote";
    return `GHS ${order.totalAmount?.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? "bg-olive text-white" : "bg-white border border-charcoal/10 text-charcoal hover:border-olive/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center text-charcoal/50">Loading orders…</div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center text-charcoal/50">No orders in this view yet.</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-soft-grey text-left text-charcoal/50 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-medium">Order</th>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Pricing</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Fulfillment</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => {
                const badge = PAYMENT_BADGE[order.status];
                const isExpanded = expandedId === order.id;
                return (
                  <Fragment key={order.id}>
                    <tr
                      className="border-b border-soft-grey last:border-0 hover:bg-soft-grey/40 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-soft-grey">
                            <ProductImage src={order.items?.[0]?.image} alt="" sizes="40px" className="object-cover" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-olive">{order.orderNumber || `#${order.id.slice(0, 8)}`}</span>
                              {order.channel === "pos" && (
                                <span className="flex items-center gap-1 rounded bg-charcoal/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-charcoal/60">
                                  <Store size={10} /> In-Store
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-charcoal/50">
                              {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{order.customer?.firstName} {order.customer?.lastName}</div>
                        <div className="text-xs text-charcoal/50">{order.customer?.phone}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold">{totalLabel(order)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {order.status !== "paid" ? (
                          <span className="text-charcoal/30 text-xs">—</span>
                        ) : role === "owner" ? (
                          <select
                            value={order.fulfillmentStatus}
                            onChange={(e) => updateFulfillment(order.id, e.target.value as Order["fulfillmentStatus"])}
                            className="border border-charcoal/20 rounded-md px-2 py-1.5 text-sm bg-white outline-none focus:border-olive"
                          >
                            {FULFILLMENT_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{fulfillmentLabel(opt, order.deliveryZone === "pickup")}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-charcoal/70">
                            {fulfillmentLabel(order.fulfillmentStatus, order.deliveryZone === "pickup")}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronDown size={16} className={`text-charcoal/40 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-soft-grey/30">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="mb-4 space-y-3">
                            {order.items?.map((item, i) => {
                              const selectionText = item.selections
                                ? Object.entries(item.selections).map(([label, value]) => `${label}: ${value}`).join(", ")
                                : "";
                              return (
                                <div key={i} className="flex items-center gap-3">
                                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-white">
                                    <ProductImage src={item.image} alt={item.name} sizes="48px" className="object-cover" />
                                  </div>
                                  <div className="flex flex-1 items-center justify-between gap-4 text-sm">
                                    <span>
                                      {item.quantity}x {item.name} ({item.category || item.color || "custom"}, {item.purchaseType === "full" ? "Full" : "Half"})
                                      {selectionText && <span className="block text-xs text-charcoal/50">{selectionText}</span>}
                                    </span>
                                    <span className="shrink-0 font-medium">{priceLabel(item)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {order.projectDetails?.brief && (
                            <div className="mb-3 rounded-md bg-white p-3 text-xs leading-5 text-charcoal/65">
                              <div className="mb-1 font-semibold text-charcoal">Brief</div>
                              {order.projectDetails.organization && <div>Event/organization: {order.projectDetails.organization}</div>}
                              {order.projectDetails.neededBy && <div>Needed by: {order.projectDetails.neededBy}</div>}
                              <div>{order.projectDetails.brief}</div>
                            </div>
                          )}

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-md bg-white p-3 text-xs leading-5 text-charcoal/65">
                              <div className="mb-1 font-semibold text-charcoal">
                                {order.deliveryZone === "pickup" ? "Pickup" : "Delivery"}
                              </div>
                              <div>Method: {order.deliveryDetails?.label || order.deliveryZone?.replace(/_/g, " ")}</div>
                              {(order.deliveryDetails?.address || order.deliveryDetails?.pickupAddress) && (
                                <div>Address: {order.deliveryDetails.address || order.deliveryDetails.pickupAddress}</div>
                              )}
                              {order.deliveryDetails?.notes && <div>Notes: {order.deliveryDetails.notes}</div>}
                              <div>Fee: {order.deliveryFee ? `GHS ${order.deliveryFee.toFixed(2)}` : "Free"}</div>
                            </div>

                            <div className="rounded-md bg-white p-3 text-xs leading-5 text-charcoal/65">
                              <div className="mb-1 font-semibold text-charcoal">Customer</div>
                              {order.customer?.email && <div>Email: {order.customer.email}</div>}
                              {order.customer?.phone && <div className="mb-1.5">Phone: {order.customer.phone}</div>}
                              {order.customer?.phone && (
                                <a
                                  href={`https://wa.me/${order.customer.phone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 font-medium text-[#128C7E] hover:underline"
                                >
                                  <MessageCircle size={14} /> Message on WhatsApp
                                </a>
                              )}
                            </div>

                            {order.channel === "pos" && (
                              <div className="rounded-md bg-white p-3 text-xs leading-5 text-charcoal/65 sm:col-span-2">
                                <div className="mb-1 font-semibold text-charcoal">In-Store Sale</div>
                                <div className="capitalize">Payment: {order.paymentMethod?.replace("_", " ")}</div>
                                {order.staffEmail && <div>Rung up by: {order.staffEmail}</div>}
                                {typeof order.changeDue === "number" && order.changeDue > 0 && (
                                  <div>Change given: GHS {order.changeDue.toFixed(2)}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
