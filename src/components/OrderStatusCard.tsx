"use client";

import { CheckCircle2, Clock, Home, Package, Truck, XCircle } from "lucide-react";

export interface OrderStatusData {
  orderId: string;
  orderNumber?: string | null;
  status: "pending_payment" | "paid" | "expired" | "failed" | "whatsapp_pending" | "quote_requested";
  fulfillmentStatus?: "pending" | "processing" | "shipped" | "delivered";
  totalAmount: number;
  deliveryFee?: number;
  deliveryZone?: string;
  items: Array<{ name: string; quantity: number; price: number; priceMode?: "fixed" | "quote" }>;
  customerFirstName?: string;
}

const FULFILLMENT_STEPS: Array<{ key: OrderStatusData["fulfillmentStatus"]; label: string; icon: typeof Package }> = [
  { key: "pending", label: "Received", icon: CheckCircle2 },
  { key: "processing", label: "Preparing", icon: Package },
  { key: "shipped", label: "On the Way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

function FulfillmentTracker({ current }: { current: OrderStatusData["fulfillmentStatus"] }) {
  const currentIndex = FULFILLMENT_STEPS.findIndex((step) => step.key === current);

  return (
    <div className="my-8 flex items-center justify-between">
      {FULFILLMENT_STEPS.map((step, index) => {
        const Icon = step.icon;
        const done = index <= currentIndex;
        return (
          <div key={step.key} className="relative flex flex-1 flex-col items-center">
            {index > 0 && (
              <div
                className={`absolute right-1/2 top-4 -z-0 h-0.5 w-full ${index <= currentIndex ? "bg-olive" : "bg-soft-grey"}`}
              />
            )}
            <div
              className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                done ? "bg-olive text-white" : "bg-soft-grey text-charcoal/30"
              }`}
            >
              <Icon size={15} />
            </div>
            <span className={`mt-2 text-center text-[11px] font-medium ${done ? "text-charcoal" : "text-charcoal/40"}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// item.price is already the fully-resolved price at order time (base price,
// or a priced Customer-choices selection) — item.priceMode is just a stale
// copy of the product's base-price mode and can say "quote" even when the
// item resolved to a real price via an option value.
function isQuoteOrder(order: OrderStatusData) {
  return order.status === "quote_requested" || order.items?.some((item) => item.price <= 0);
}

function itemPriceLabel(item: OrderStatusData["items"][number]) {
  if (item.price <= 0) return "Price not set yet";
  return `GHS ${(item.price * item.quantity).toFixed(2)}`;
}

export default function OrderStatusCard({ order }: { order: OrderStatusData }) {
  const quoteOrder = isQuoteOrder(order);

  return (
    <div className="w-full max-w-md bg-white p-8 text-center shadow-sm">
      {order.status === "paid" ? (
        <CheckCircle2 className="mx-auto mb-6 text-olive" size={48} />
      ) : order.status === "failed" || order.status === "expired" ? (
        <XCircle className="mx-auto mb-6 text-terracotta" size={48} />
      ) : (
        <Clock className="mx-auto mb-6 text-sand" size={48} />
      )}

      <h1 className="mb-2 font-serif text-2xl font-semibold">
        {order.status === "paid" && `Thank you, ${order.customerFirstName || "friend"}!`}
        {order.status === "pending_payment" && "Payment still processing"}
        {order.status === "failed" && "Payment didn't go through"}
        {order.status === "expired" && "This order has expired"}
        {order.status === "whatsapp_pending" && "WhatsApp order received"}
        {order.status === "quote_requested" && "Quote request received"}
      </h1>
      <p className="mb-2 text-sm leading-6 text-charcoal/60">
        {order.status === "paid" && "Your payment is confirmed and Gyantex is preparing your order."}
        {order.status === "pending_payment" && "Paystack has not confirmed payment yet. No fulfillment starts until payment is confirmed."}
        {order.status === "failed" && "Your card or MoMo payment was not completed, so nothing was charged."}
        {order.status === "expired" && "This order expired before payment completed."}
        {order.status === "whatsapp_pending" && "Gyantex will confirm this order with you on WhatsApp shortly."}
        {order.status === "quote_requested" && "Gyantex will review the brief and confirm fabric, quantity, pricing, delivery, and timeline on WhatsApp."}
      </p>

      {order.status === "paid" && <FulfillmentTracker current={order.fulfillmentStatus ?? "pending"} />}

      <div className="mb-6 mt-6 space-y-2 border-t border-soft-grey pt-4 text-left">
        {order.items?.map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex justify-between gap-4 text-sm">
            <span className="text-charcoal/70">
              {item.quantity}x {item.name}
            </span>
            <span className="shrink-0 font-medium">{itemPriceLabel(item)}</span>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t border-soft-grey pt-2 text-sm font-semibold">
          <span>{quoteOrder ? "Pricing" : "Total"}</span>
          <span>{quoteOrder && !order.totalAmount ? "After quote" : `GHS ${order.totalAmount?.toFixed(2)}`}</span>
        </div>
      </div>

      <p className="text-xs text-charcoal/40">Order {order.orderNumber || order.orderId}</p>
    </div>
  );
}
