import StaticPageLayout from "@/components/StaticPageLayout";
import { PICKUP_ADDRESS, SUPPORT_EMAIL, WHATSAPP_NUMBER } from "@/lib/config";

export const metadata = {
  title: "Corrections & Refunds | Gyantex Enterprise",
  description: "Correction and refund guidance for Gyantex Enterprise custom textile orders.",
};

export default function ReturnsPage() {
  return (
    <StaticPageLayout title="Corrections & Refunds">
      <p>
        Gyantex Enterprise produces custom textile work after a quote and design confirmation. Because most orders are
        made for a specific family, church, school, institution, or event, returns are handled differently from ordinary retail items.
      </p>

      <h2>Before Printing</h2>
      <p>
        Review names, dates, portraits, logos, spelling, colors, and quantity carefully before approval. Once artwork
        is approved for printing, changes may affect the timeline and final cost.
      </p>

      <h2>What Qualifies</h2>
      <ul>
        <li>The delivered cloth is materially different from the approved design</li>
        <li>The print has a production fault that was not present in the approved proof</li>
        <li>The quantity delivered does not match the confirmed paid order</li>
      </ul>

      <h2>What Usually Does Not Qualify</h2>
      <ul>
        <li>Approved spelling, date, portrait, or logo errors that were visible in the proof</li>
        <li>Color differences caused by phone screen previews or uncalibrated reference images</li>
        <li>Timeline changes caused by late artwork, late payment, or late approval</li>
      </ul>

      <h2>How to Report a Problem</h2>
      <p>
        Message us on{" "}
        <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">WhatsApp</a>{" "}
        or email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your request reference, photos of the issue,
        and the approved design proof. We may ask you to bring the cloth to {PICKUP_ADDRESS} for inspection.
      </p>

      <h2>Refunds or Corrections</h2>
      <p>
        If the issue is confirmed, Gyantex may correct the order, reprint the affected portion, or refund an agreed
        amount depending on the fault and production stage.
      </p>
    </StaticPageLayout>
  );
}
