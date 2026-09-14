import StaticPageLayout from "@/components/StaticPageLayout";
import { PICKUP_ADDRESS, SUPPORT_EMAIL, WHATSAPP_NUMBER } from "@/lib/config";

export const metadata = {
  title: "Corrections & Refunds | Gyantex Enterprise",
  description: "Correction and refund guidance for Gyantex Enterprise orders.",
};

export default function ReturnsPage() {
  return (
    <StaticPageLayout title="Corrections & Refunds">
      <p>
        Gyantex Enterprise sells textile cloth through this website. If there is a problem with an item you receive,
        contact us quickly so we can inspect the order and help.
      </p>

      <h2>Before Payment</h2>
      <p>
        Check the item, color, piece option, quantity, delivery choice, and phone number carefully before payment.
      </p>

      <h2>What Qualifies</h2>
      <ul>
        <li>The delivered item is materially different from the product ordered</li>
        <li>The item has a production fault</li>
        <li>The quantity delivered does not match the paid order</li>
      </ul>

      <h2>What Usually Does Not Qualify</h2>
      <ul>
        <li>A change of mind after the item has been prepared or dispatched</li>
        <li>Color differences caused by phone screen settings</li>
        <li>Delays caused by an incomplete delivery address or unavailable recipient</li>
      </ul>

      <h2>How to Report a Problem</h2>
      <p>
        Message us on{" "}
        <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">WhatsApp</a>{" "}
        or email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your order number and photos of the issue.
        We may ask you to bring the cloth to {PICKUP_ADDRESS} for inspection.
      </p>

      <h2>Refunds or Corrections</h2>
      <p>
        If the issue is confirmed, Gyantex may replace the affected item or refund an agreed amount depending on the fault.
      </p>
    </StaticPageLayout>
  );
}
