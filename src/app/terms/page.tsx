import StaticPageLayout from "@/components/StaticPageLayout";
import { LEGAL_ENTITY_NAME, PAYMENT_METHODS, PICKUP_ADDRESS, SUPPORT_EMAIL } from "@/lib/config";

export const metadata = {
  title: "Terms of Service | Gyantex Enterprise",
  description: "Terms for shopping and ordering textile cloth from Gyantex Enterprise.",
};

export default function TermsPage() {
  return (
    <StaticPageLayout title="Terms of Service">
      <p>
        <strong>{LEGAL_ENTITY_NAME}</strong> (&quot;we&quot;, &quot;us&quot;) sells textile cloth through this website.
        These terms apply when you browse, add products to cart, place an order, or use our support paths.
        Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> before ordering if anything is unclear.
      </p>

      <h2>Products and Prices</h2>
      <p>
        The price shown for an item is the price used at checkout after you choose its available options and quantity.
        Check the product photo, name, color, size or piece option, and quantity before adding it to your cart.
      </p>

      <h2>Order Accuracy</h2>
      <p>
        You are responsible for checking your selected items, options, delivery details, and phone number before payment.
        Contact us promptly if you notice an error after placing an order.
      </p>

      <h2>Payment</h2>
      <p>
        We accept {PAYMENT_METHODS.join(", ")} through Paystack at checkout. Paystack processes card and mobile money details securely; we do not see or
        store your card number or mobile money PIN.
      </p>

      <h2>Pickup and Delivery</h2>
      <p>
        Pickup is available at {PICKUP_ADDRESS}. Available delivery options and their fees are shown at checkout.
        Delivery timelines depend on your location and courier availability.
      </p>

      <h2>Order Changes</h2>
      <p>
        Tell us as soon as possible if something changes. We will confirm whether an order can still be changed before
        it is prepared or dispatched.
      </p>

      <h2>Changes to These Terms</h2>
      <p>
        We may update these terms as the business grows. The version in effect when your order is confirmed applies to that order.
      </p>
    </StaticPageLayout>
  );
}
