import { Link } from 'react-router-dom';
import { Mail, MapPin, Clock, ShieldCheck, Sprout, Truck, RotateCcw } from 'lucide-react';
import { STORE_INFO } from '../data/storeInfo';

function PageShell({ title, intro, icon: Icon, children }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div className="space-y-3">
        <div className="w-11 h-11 rounded-2xl bg-agro-100 text-agro-700 flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-black text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600 leading-relaxed">{intro}</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 text-sm text-slate-600 leading-relaxed">
        {children}
      </div>
      <p className="text-xs text-slate-500">
        Questions? Email{' '}
        <a href={`mailto:${STORE_INFO.email}`} className="font-bold text-agro-700 hover:underline">
          {STORE_INFO.email}
        </a>
        .
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

export function About() {
  return (
    <PageShell
      title={`About ${STORE_INFO.brand}`}
      intro="A farm-first store that pairs certified crop inputs with an AI plant doctor that speaks your language."
      icon={Sprout}
    >
      <Section title="What we do">
        <p>
          {STORE_INFO.legalName} sells fertilizers, bio-inputs, micronutrients and crop-protection products to
          farmers across {STORE_INFO.deliveryArea}. Every product page lists the pack size, dosage and the crops
          and problems it is meant for, so you know what you are buying before it reaches your field.
        </p>
      </Section>
      <Section title="The AI crop doctor">
        <p>
          The built-in plant doctor accepts a photo of a diseased leaf or a written description of the symptoms
          and answers in Telugu, Kannada, Hindi or English. It suggests one low-cost organic remedy and one
          product from this store, with the dosage. It is decision support, not a replacement for your local
          agriculture officer.
        </p>
      </Section>
      <Section title="Where we are">
        <p>{STORE_INFO.address}</p>
        <p>Support hours: {STORE_INFO.supportHours}.</p>
      </Section>
      <Section title="Licences and compliance">
        <p>
          We sell only products from licensed manufacturers. Our fertilizer and insecticide licence numbers
          {STORE_INFO.fertilizerLicense || STORE_INFO.insecticideLicense ? ' are printed on every invoice' : ' are shared on request and printed on invoices'}
          . Always follow the label and the recommended dose.
        </p>
      </Section>
      <Link
        to="/shop"
        className="inline-flex px-5 py-2.5 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-xs font-bold"
      >
        Browse the shop
      </Link>
    </PageShell>
  );
}

export function Contact() {
  return (
    <PageShell
      title="Contact us"
      intro="Questions about an order, a product or a dosage? Reach the store team directly."
      icon={Mail}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 border border-slate-200 rounded-2xl">
          <Mail className="w-5 h-5 text-agro-600 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-slate-900">Email</div>
            <a href={`mailto:${STORE_INFO.email}`} className="text-sm text-agro-700 font-semibold hover:underline">
              {STORE_INFO.email}
            </a>
            <p className="text-xs text-slate-500 mt-1">
              Include your order ID for order questions. We reply within one working day.
            </p>
          </div>
        </div>

        {STORE_INFO.phone && (
          <div className="flex items-start gap-3 p-4 border border-slate-200 rounded-2xl">
            <Clock className="w-5 h-5 text-agro-600 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-slate-900">Phone / WhatsApp</div>
              <a href={`tel:${STORE_INFO.phone}`} className="text-sm text-agro-700 font-semibold hover:underline">
                {STORE_INFO.phone}
              </a>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 p-4 border border-slate-200 rounded-2xl">
          <MapPin className="w-5 h-5 text-agro-600 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-slate-900">Store address</div>
            <p className="text-sm">{STORE_INFO.address}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 border border-slate-200 rounded-2xl">
          <Clock className="w-5 h-5 text-agro-600 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-slate-900">Support hours</div>
            <p className="text-sm">{STORE_INFO.supportHours}</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 border-t border-slate-100 pt-4">
        Payment or delivery complaint? Mention the order ID, the amount and the date so we can trace it quickly.
      </p>
    </PageShell>
  );
}

export function Shipping() {
  return (
    <PageShell
      title="Shipping & delivery"
      intro="How your fertilizer order reaches your field."
      icon={Truck}
    >
      <Section title="Where we deliver">
        <p>
          We currently deliver across {STORE_INFO.deliveryArea}. If your PIN code is outside this area, email us
          before ordering and we will confirm whether a courier can reach you.
        </p>
      </Section>
      <Section title="Delivery time and charges">
        <p>
          Orders are usually delivered in {STORE_INFO.deliveryTime}. {STORE_INFO.freeDeliveryNote} Large or
          restricted items may be sent by a regional transporter; we will call you first if that applies.
        </p>
      </Section>
      <Section title="Payment options">
        <p>
          <strong>Cash on delivery:</strong> pay the delivery person when the order arrives. Please keep the exact
          amount ready.
        </p>
        <p>
          <strong>UPI:</strong> place the order and the store team will contact you on your mobile number with the
          UPI ID or payment link. Orders are packed after payment is received. Never pay to a UPI ID that did not
          come from this store.
        </p>
      </Section>
      <Section title="Tracking">
        <p>
          You can follow the status (Confirmed → Packed → Shipped → Delivered) from your dashboard. We also email
          or call the mobile number on the order when the status changes.
        </p>
      </Section>
      <Section title="Receiving agrochemicals">
        <p>
          Check the pack seal, batch number and expiry date at delivery. If a pack is damaged or leaking, refuse it
          and contact us the same day.
        </p>
      </Section>
    </PageShell>
  );
}

export function Returns() {
  return (
    <PageShell
      title="Returns & refunds"
      intro={`A ${STORE_INFO.returnsWindowDays}-day window for damaged, wrong or expired products.`}
      icon={RotateCcw}
    >
      <Section title="What can be returned">
        <p>
          Contact us within {STORE_INFO.returnsWindowDays} days of delivery if the product is damaged, leaking,
          expired, or different from what you ordered. Keep the original pack, batch number and the invoice ready.
        </p>
      </Section>
      <Section title="What cannot be returned">
        <p>
          Opened or used fertilizer, pesticide or seed packets cannot be returned, because the contents can no
          longer be verified and resale is unsafe. This is a safety rule, not a convenience one.
        </p>
      </Section>
      <Section title="How to start a return">
        <p>
          Email {STORE_INFO.email} with your order ID, a photo of the pack and a short description of the problem.
          We will confirm pickup or ask you to send it back, and tell you the refund amount.
        </p>
      </Section>
      <Section title="Refunds">
        <p>
          Approved refunds are paid to the original payment method, or by UPI/bank transfer for cash-on-delivery
          orders, normally within 5 to 7 working days of approval. Delivery charges are refunded when the fault is
          ours.
        </p>
      </Section>
      <Section title="Cancellation">
        <p>
          You can cancel an order yourself while it is still Confirmed or Packed from the order page. After it is
          shipped, contact us and we will help with a return instead.
        </p>
      </Section>
    </PageShell>
  );
}

export function Privacy() {
  return (
    <PageShell
      title="Privacy policy"
      intro="What we collect, why we need it, and how to get it removed."
      icon={ShieldCheck}
    >
      <Section title="What we collect">
        <p>
          Account details (name, email, phone, farm location), delivery details (name, phone, address, PIN code),
          order history, and any leaf photo or symptom text you submit to the AI crop doctor.
        </p>
      </Section>
      <Section title="Why we need it">
        <p>
          To create your account, deliver orders, contact you about a delivery or payment, run the diagnosis, and
          keep the sales records required of a licensed agro-input dealer.
        </p>
      </Section>
      <Section title="Who sees it">
        <p>
          Store staff see order and delivery details in order to fulfil the order. We do not sell your data. Leaf
          photos may be sent to the configured AI provider to produce a diagnosis; if that provider is not
          configured, the diagnosis runs on the local knowledge base.
        </p>
      </Section>
      <Section title="Storage and security">
        <p>
          Passwords are stored as one-way hashes. Sessions use signed tokens. Cart and language preferences are
          stored in your browser, not on the server.
        </p>
      </Section>
      <Section title="Your choices">
        <p>
          Email {STORE_INFO.email} to ask for a copy of your data, a correction, or deletion of your account. Some
          order records must be kept for tax and licensing purposes even after an account is closed.
        </p>
      </Section>
    </PageShell>
  );
}

export function Terms() {
  return (
    <PageShell
      title="Terms of service"
      intro="The rules that apply when you order from this store."
      icon={ShieldCheck}
    >
      <Section title="Orders">
        <p>
          An order is an offer to buy. We confirm it only when stock is available and, for UPI orders, when payment
          is received. If a product runs out after you order, we will contact you and refund or replace it.
        </p>
      </Section>
      <Section title="Prices and stock">
        <p>
          Prices are in Indian Rupees and include applicable taxes unless stated otherwise. We may change prices
          and stock at any time, but the price shown on your confirmed order is the price you pay.
        </p>
      </Section>
      <Section title="Correct use of products">
        <p>
          Fertilizers and crop-protection chemicals must be used exactly as the label directs. We are not
          responsible for crop loss caused by wrong dosage, mixing, timing, weather, or use on a crop the product
          is not registered for. When in doubt, ask your local agriculture officer.
        </p>
      </Section>
      <Section title="AI diagnosis">
        <p>
          The crop doctor gives general guidance based on the photo or text you provide. It can be wrong. Confirm
          the diagnosis with a local expert before spending money on treatment, and never use a product on a food
          crop outside its label instructions.
        </p>
      </Section>
      <Section title="Accounts">
        <p>
          Keep your password private and give accurate delivery details. We may suspend an account used for
          fraudulent orders or abusive behaviour.
        </p>
      </Section>
      <Section title="Governing law">
        <p>
          These terms are governed by Indian law. Disputes are subject to the jurisdiction of the courts at
          Guntur, Andhra Pradesh.
        </p>
      </Section>
      <Section title="Store details">
        <p>{STORE_INFO.legalName}</p>
        <p>{STORE_INFO.address}</p>
        {STORE_INFO.gstin && <p>GSTIN: {STORE_INFO.gstin}</p>}
        {STORE_INFO.fertilizerLicense && <p>Fertilizer licence: {STORE_INFO.fertilizerLicense}</p>}
        {STORE_INFO.insecticideLicense && <p>Insecticide licence: {STORE_INFO.insecticideLicense}</p>}
        <p>{STORE_INFO.email}</p>
      </Section>
    </PageShell>
  );
}
