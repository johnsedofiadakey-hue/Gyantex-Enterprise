import StaticPageLayout from "@/components/StaticPageLayout";
import { LEGAL_ENTITY_NAME, PAYMENT_METHODS, PICKUP_ADDRESS, SUPPORT_EMAIL } from "@/lib/config";

export const metadata = {
  title: "Terms of Service | Gyantex Enterprise",
  description: "Terms for using the Gyantex Enterprise custom textile design and printing website.",
};

export default function TermsPage() {
  return (
    <StaticPageLayout title="Terms of Service">
      <p>
        <strong>{LEGAL_ENTITY_NAME}</strong> (&quot;we&quot;, &quot;us&quot;) designs and prints custom textile cloth.
        These terms apply when you browse the website, send a quote request, place an order, or use our support paths.
        Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> before ordering if anything is unclear.
      </p>

      <h2>Quote Requests</h2>
      <p>
        Most Gyantex work is quoted after we review your event type, artwork, wording, quantity, fabric preference,
        deadline, pickup or delivery preference, and any sample references. Website catalog paths are starting points,
        not automatic fixed-price commitments unless a product is clearly marked with a fixed price.
      </p>

      <h2>Design Approval</h2>
      <p>
        You are responsible for checking names, dates, photos, logos, spelling, quantities, and color direction before
        approving a design for print. Production begins only after the quote, design direction, and payment arrangement
        are confirmed.
      </p>

      <h2>Payment</h2>
      <p>
        We may accept {PAYMENT_METHODS.join(", ")} through Paystack for fixed-price or confirmed orders, and we also
        coordinate orders through WhatsApp. Paystack processes card and mobile money details securely; we do not see or
        store your card number or mobile money PIN.
      </p>

      <h2>Pickup and Delivery</h2>
      <p>
        Pickup is available at {PICKUP_ADDRESS}. Kumasi delivery and delivery outside Kumasi can be arranged after the
        quote is confirmed. Delivery fees and timelines depend on location, quantity, production schedule, and courier availability.
      </p>

      <h2>Order Changes</h2>
      <p>
        Tell us as soon as possible if something changes. Changes requested after approval or after printing has started
        may require a new quote or additional production time.
      </p>

      <h2>Changes to These Terms</h2>
      <p>
        We may update these terms as the business grows. The version in effect when your order is confirmed applies to that order.
      </p>
    </StaticPageLayout>
  );
}
