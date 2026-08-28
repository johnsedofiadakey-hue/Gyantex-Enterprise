import StaticPageLayout from "@/components/StaticPageLayout";
import { LEGAL_ENTITY_NAME, SUPPORT_EMAIL } from "@/lib/config";

export const metadata = {
  title: "Privacy Policy | Gyantex Enterprise",
  description: "How Gyantex Enterprise collects, uses, and protects quote and order information.",
};

export default function PrivacyPage() {
  return (
    <StaticPageLayout title="Privacy Policy">
      <p>
        This explains what information <strong>{LEGAL_ENTITY_NAME}</strong> collects when you request a quote, place an order,
        track a request, or contact us. We collect only what we need to quote, design, print, fulfill, and support your order.
      </p>

      <h2>What We Collect</h2>
      <ul>
        <li>Your name, phone number, and delivery or pickup preference</li>
        <li>Your email address, if you provide one</li>
        <li>Event, organization, deadline, quantity, color, wording, and brief details</li>
        <li>Artwork references you send separately, such as logos, portraits, crests, and sample images</li>
        <li>Order history, payment status, fulfillment status, and basic site usage information</li>
      </ul>
      <p>We do not collect or store your card number, MoMo PIN, or other payment credentials. Paystack handles those details directly.</p>

      <h2>How We Use It</h2>
      <ul>
        <li>To prepare quotes and design direction</li>
        <li>To process payments and fulfill confirmed orders</li>
        <li>To send order updates by SMS, email, WhatsApp, or phone</li>
        <li>To improve the website and prevent fraud or misuse</li>
      </ul>

      <h2>Who We Share It With</h2>
      <p>
        We share only what is needed with payment processors such as Paystack, SMS providers such as Arkesel, delivery
        partners, and Gyantex staff working on your quote or order. We do not sell customer information.
      </p>

      <h2>Your Rights</h2>
      <p>
        You can ask what information we hold about you, ask us to correct it, or ask us to delete it, subject to records
        we may be legally required to keep for completed transactions. Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> to make a request.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or how your data is handled: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </StaticPageLayout>
  );
}
