import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout.js';
import { RotateCcw, Clock, AlertTriangle, ShieldCheck, Mail, Phone, CheckCircle2 } from 'lucide-react';

const sections = [
  { id: 'refund-processing', title: 'Refund Processing' },
  { id: 'refund-timeline', title: 'Refund Timeline' },
  { id: 'user-responsibility', title: 'User Responsibility' },
  { id: 'accommodation-changes', title: 'Accommodation Changes' },
  { id: 'refund-delay', title: 'Refund Delay' },
  { id: 'liability-limitation', title: 'Liability Limitation' },
  { id: 'contact-information', title: 'Contact Information' },
];

export const RefundsPage: React.FC = () => {
  return (
    <LegalPageLayout
      badge="CANCELLATION & REFUNDS"
      title="Refund and Returns Policy"
      lastUpdated="September 11, 2026"
      description="Clear, transparent refund procedures, supplier-contingent processing criteria, and realistic settlement timelines for pilgrimage bookings."
      sections={sections}
      activePath="/refunds"
    >
      {/* Policy Highlight Banner */}
      <div className="p-5 rounded-2xl bg-orange-50/70 border border-orange-200 text-slate-800 text-sm leading-relaxed flex items-start gap-3.5">
        <RotateCcw className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-[#0f294a]">Transparent &amp; Fair Refund Policy</p>
          <p className="text-xs text-slate-600 mt-1">
            We understand unforeseen emergencies, health fluctuations, or adverse weather may impact spiritual travel plans. This policy details how cancellations and refund claims are managed.
          </p>
        </div>
      </div>

      {/* 1. Refund Processing */}
      <section id="refund-processing" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">01</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Refund Processing</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            TirthYatraTrails facilitates pilgrimage bookings through direct inventory partnerships with verified hotels, ashrams, dharamshalas, vehicle fleet owners, and authorized shrine facilitators.
          </p>
          <p>
            <strong>All refund claims are supplier-contingent:</strong> Refunds are processed and approved strictly in accordance with the specific cancellation guidelines enforced by the underlying accommodation property or transport operator.
          </p>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <p className="font-bold text-[#0f294a]">General Cancellation Tier Reference:</p>
            <ul className="space-y-1 text-slate-600 list-disc list-inside">
              <li><strong>Cancellation 15+ days prior to travel:</strong> Eligible for refund minus bank transaction charges and a nominal administrative processing fee (typically ₹500 - ₹1,000 per booking).</li>
              <li><strong>Cancellation 7 to 14 days prior to travel:</strong> Up to 50% refund subject to hotel supplier retention charges.</li>
              <li><strong>Cancellation under 7 days or No-Show:</strong> Non-refundable as properties hold inventory exclusively for pilgrim arrivals during auspicious muhurats.</li>
              <li><strong>Peak Festival Dates (e.g. Kumbh Mela, Diwali in Ayodhya, Navratri, Shivratri):</strong> Strict 100% non-refundable retention applies across prime temple belt accommodations.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 2. Refund Timeline */}
      <section id="refund-timeline" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">02</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Refund Timeline</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex items-start gap-3 text-xs text-slate-700">
            <Clock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900">Standard Timeline: 7 to 15 Working Days</p>
              <p className="mt-0.5 text-slate-600">
                Once a cancellation request is formally approved by the supplier and our audit desk, the eligible refund amount is credited back to the original source method within <strong>7 to 15 working days</strong>.
              </p>
            </div>
          </div>
          <p>
            Refunds are credited directly to the original bank account, debit/credit card, or UPI VPA from which the advance payment originated.
          </p>
        </div>
      </section>

      {/* 3. User Responsibility */}
      <section id="user-responsibility" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">03</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">User Responsibility</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            To initiate an authorized cancellation and request refund consideration, the booking holder must:
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-xs sm:text-sm text-slate-700">
            <li>Submit a formal written cancellation request via email to <strong>tirthyatratrails@gmail.com</strong> or via registered WhatsApp message to <strong>+91 9068126203</strong>.</li>
            <li>Provide the original Booking ID, registered devotee name, and clear reason for cancellation.</li>
            <li>In cases of medical emergencies, provide valid medical documentation or doctor&apos;s certification for supplier compassionate waiver requests.</li>
            <li>Verbal or telephonic requests without written confirmation are not considered valid timestamps for calculating cancellation tiers.</li>
          </ul>
        </div>
      </section>

      {/* 4. Accommodation Changes */}
      <section id="accommodation-changes" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">04</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Accommodation Changes</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            If a devotee wishes to modify travel dates or change hotel room categories rather than cancel:
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-xs sm:text-sm text-slate-700">
            <li><strong>Date Rescheduling:</strong> Permitted subject to room availability at the destination hotel and tariff variance between seasonal slots.</li>
            <li><strong>Property Relocation:</strong> If a selected property encounters unexpected operational disruption, TirthYatraTrails will provide comparable or upgraded sanctum-proximity accommodation at zero additional fee.</li>
          </ul>
        </div>
      </section>

      {/* 5. Refund Delay */}
      <section id="refund-delay" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">05</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Refund Delay</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            If you have not received your approved refund after 15 business days:
          </p>
          <ol className="space-y-1.5 list-decimal list-inside text-xs sm:text-sm text-slate-700">
            <li>First inspect your bank account statement or UPI transaction history thoroughly.</li>
            <li>Contact your card issuer or banking branch, as processing and settlement clearance times between intermediary payment switches can take an additional 3 to 5 business days.</li>
            <li>If you have confirmed with your financial institution and the credit has not appeared, contact our dedicated accounts team at <strong>tirthyatratrails@gmail.com</strong> with your refund ARN (Acquirer Reference Number).</li>
          </ol>
        </div>
      </section>

      {/* 6. Liability Limitation */}
      <section id="liability-limitation" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">06</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Liability Limitation</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            TirthYatraTrails shall not be held financially responsible for missed flights, unused trains, personal expenses, or darshan ticket non-usage resulting from:
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-xs sm:text-sm text-slate-700">
            <li>Inclement weather conditions (fog, snow, landslides, cloudbursts) common to Himalayan or coastal pilgrimage shrines.</li>
            <li>Administrative closures, security lockdowns, or VIP movement mandated by District Magistrates or Temple Trust Boards.</li>
            <li>Personal health complications, flight cancellations, or transport strikes initiated by outside unions.</li>
          </ul>
        </div>
      </section>

      {/* 7. Contact Information */}
      <section id="contact-information" className="space-y-4 scroll-mt-28 pt-2">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">07</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Contact Information</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            For all inquiries regarding cancellations, refunds, or payment reconciliation, our travel desk is ready to support you:
          </p>

          <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <p className="font-extrabold text-[#0f294a] text-sm">TirthYatraTrails Accounts &amp; Refunds Desk</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <a
                href="mailto:tirthyatratrails@gmail.com"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-300 transition-colors"
              >
                <Mail className="w-4 h-4 text-orange-600" />
                <span className="font-medium">tirthyatratrails@gmail.com</span>
              </a>
              <a
                href="tel:9068126203"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-300 transition-colors"
              >
                <Phone className="w-4 h-4 text-orange-600" />
                <span className="font-medium">+91 9068126203</span>
              </a>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              Response Time: Refund requests received during business hours are reviewed within 24 hours.
            </p>
          </div>
        </div>
      </section>
    </LegalPageLayout>
  );
};
