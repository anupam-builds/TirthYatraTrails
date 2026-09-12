import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout.js';
import { RotateCcw, Clock, AlertTriangle, ShieldCheck, Mail, Phone, Calendar, CheckCircle2, FileText } from 'lucide-react';

const sections = [
  { id: 'cancellation-request', title: '1. Cancellation Request' },
  { id: 'tour-cancellation-charges', title: '2. Tour Package Cancellation Charges' },
  { id: 'supplier-cancellation-charges', title: '3. Supplier Cancellation Charges' },
  { id: 'no-show', title: '4. No-Show' },
  { id: 'partial-use-of-services', title: '5. Partial Use of Services' },
  { id: 'refund-processing', title: '6. Refund Processing' },
  { id: 'non-refundable-services', title: '7. Non-Refundable Services' },
  { id: 'changes-to-booking', title: '8. Changes to Booking' },
  { id: 'refund-method', title: '9. Refund Method' },
  { id: 'cancellation-by-us', title: '10. Cancellation by TirthYatraTrails' },
  { id: 'force-majeure', title: '11. Force Majeure' },
  { id: 'contact-us', title: '12. Contact Us' },
];

export const RefundsPage: React.FC = () => {
  return (
    <LegalPageLayout
      badge="CANCELLATION & REFUNDS"
      title="Cancellation & Refund Policy"
      lastUpdated="September 11, 2026"
      description="At TirthYatraTrails, we understand that travel plans may change. Our cancellation and refund rules are designed to clearly explain the process applicable to tour bookings and travel services."
      sections={sections}
      activePath="/refunds"
    >
      {/* Policy Introduction Card */}
      <div className="p-6 rounded-2xl bg-orange-50/70 border border-orange-200 text-slate-800 text-sm leading-relaxed space-y-3">
        <div className="flex items-center gap-2 text-orange-700 font-bold text-xs uppercase tracking-wider">
          <RotateCcw className="w-4 h-4 text-orange-600" />
          <span>Cancellation &amp; Refund Policy</span>
        </div>
        <p className="text-slate-700 text-sm leading-relaxed">
          At <strong>TirthYatraTrails</strong>, we understand that travel plans may change. Our cancellation and refund rules are designed to clearly explain the process applicable to tour bookings and travel services.
        </p>
      </div>

      {/* 1. Cancellation Request */}
      <section id="cancellation-request" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">01</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Cancellation Request</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Customers wishing to cancel a booking should contact TirthYatraTrails as soon as possible.
          </p>
          <p>
            Cancellation requests should be submitted through our official contact details:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <a
              href="mailto:tirthyatratrails@gmail.com"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-300 transition-colors text-xs"
            >
              <Mail className="w-4 h-4 text-orange-600 shrink-0" />
              <span className="font-medium">Email: tirthyatratrails@gmail.com</span>
            </a>
            <a
              href="tel:9068126203"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-300 transition-colors text-xs"
            >
              <Phone className="w-4 h-4 text-orange-600 shrink-0" />
              <span className="font-medium">Phone: 9068126203</span>
            </a>
          </div>
          <p className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-700">
            The applicable cancellation date will generally be considered the date on which TirthYatraTrails receives the cancellation request.
          </p>
        </div>
      </section>

      {/* 2. Tour Package Cancellation Charges */}
      <section id="tour-cancellation-charges" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">02</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Tour Package Cancellation Charges</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Unless a specific tour package states different cancellation terms, the following cancellation structure may apply:
          </p>

          {/* Structured Cancellation Tier Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#0f294a] text-white">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6 font-bold uppercase tracking-wider text-[11px]">
                    Cancellation Period
                  </th>
                  <th className="py-3.5 px-4 sm:px-6 font-bold uppercase tracking-wider text-[11px] text-right sm:text-left">
                    Cancellation Charge
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-800">
                    30 days or more before departure
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-700 text-right sm:text-left">
                    10% of booking amount
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-800">
                    15–29 days before departure
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-700 text-right sm:text-left">
                    25% of booking amount
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-800">
                    7–14 days before departure
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-bold text-orange-700 text-right sm:text-left">
                    50% of booking amount
                  </td>
                </tr>
                <tr className="bg-red-50/30 hover:bg-red-50/50 transition-colors">
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-900">
                    Less than 7 days before departure
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-bold text-red-600 text-right sm:text-left">
                    No refund
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 pt-1">
            Specific tour packages may have different cancellation rules because hotels, transport providers, airlines or other suppliers may impose their own charges. The cancellation conditions communicated with the particular booking will prevail.
          </p>
        </div>
      </section>

      {/* 3. Supplier Cancellation Charges */}
      <section id="supplier-cancellation-charges" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">03</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Supplier Cancellation Charges</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Where a booking includes hotels, flights, transportation, activities or other third-party services, the refund will be subject to the cancellation and refund rules of the respective supplier.
          </p>
          <p>
            Any non-refundable amount charged by a supplier may be deducted from the customer&apos;s refund.
          </p>
        </div>
      </section>

      {/* 4. No-Show */}
      <section id="no-show" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">04</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">No-Show</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            If a customer does not arrive for a confirmed service without providing an approved cancellation request, the booking may be treated as a No-Show.
          </p>
          <p>
            No-show bookings may be non-refundable depending on the applicable supplier or package terms.
          </p>
        </div>
      </section>

      {/* 5. Partial Use of Services */}
      <section id="partial-use-of-services" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">05</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Partial Use of Services</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            If a customer voluntarily chooses not to use part of a confirmed tour, hotel stay, transportation service, sightseeing activity or other travel service, a refund will not automatically be available.
          </p>
          <p>
            Any refund will depend on the terms of the relevant supplier and the particular booking.
          </p>
        </div>
      </section>

      {/* 6. Refund Processing */}
      <section id="refund-processing" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">06</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Refund Processing</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Once a refund has been approved, TirthYatraTrails will initiate the refund according to the applicable payment and supplier process.
          </p>
          <p>
            Where the amount has to be received from a third-party supplier first, the refund timeline may depend on that supplier.
          </p>
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex items-start gap-3 text-xs sm:text-sm text-slate-700">
            <Clock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <p>
              After the refundable amount is received and processed by TirthYatraTrails, the amount may generally take <strong>7–15 working days</strong> to reach the customer&apos;s original payment method, depending on the payment provider or bank.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Non-Refundable Services */}
      <section id="non-refundable-services" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">07</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Non-Refundable Services</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Certain bookings may be completely or partially non-refundable. Customers will be informed of applicable terms wherever reasonably possible before confirmation.
          </p>
          <p>Examples may include:</p>
          <ul className="space-y-1.5 list-disc list-inside pl-1 text-xs sm:text-sm text-slate-700">
            <li>Non-refundable hotel bookings</li>
            <li>Special promotional fares</li>
            <li>Certain transportation tickets</li>
            <li>Activity or attraction tickets</li>
            <li>Peak-season bookings</li>
            <li>Last-minute bookings</li>
            <li>Services specifically marked as non-refundable</li>
          </ul>
        </div>
      </section>

      {/* 8. Changes to Booking */}
      <section id="changes-to-booking" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">08</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Changes to Booking</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Changes to travel dates, passenger details, hotels, transportation or other services may be subject to availability and additional charges.
          </p>
          <p>
            Any supplier change fee or fare difference may be payable by the customer.
          </p>
        </div>
      </section>

      {/* 9. Refund Method */}
      <section id="refund-method" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">09</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Refund Method</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Approved refunds will normally be returned through the original payment method used for the booking, where technically and operationally possible.
          </p>
        </div>
      </section>

      {/* 10. Cancellation by TirthYatraTrails */}
      <section id="cancellation-by-us" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">10</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Cancellation by TirthYatraTrails</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            In exceptional circumstances, TirthYatraTrails may need to cancel or modify a booking due to operational, safety, supplier, governmental or force majeure circumstances.
          </p>
          <p>
            Where applicable, customers will be informed about available alternatives or refunds according to the relevant booking and supplier terms.
          </p>
        </div>
      </section>

      {/* 11. Force Majeure */}
      <section id="force-majeure" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">11</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Force Majeure</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            No refund or compensation shall be assumed solely because a journey is affected by circumstances beyond reasonable control. Any refund will depend on amounts recovered from suppliers and applicable booking conditions, subject to applicable law.
          </p>
        </div>
      </section>

      {/* 12. Contact Us */}
      <section id="contact-us" className="space-y-4 scroll-mt-28 pt-2">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">12</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Contact Us</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            For cancellation or refund-related assistance, please contact:
          </p>

          <div className="mt-4 p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
            <div>
              <p className="font-extrabold text-[#0f294a] text-base font-serif">TirthYatraTrails</p>
              <p className="text-xs text-slate-500 mt-0.5">Cancellation &amp; Refund Assistance Desk</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <a
                href="mailto:tirthyatratrails@gmail.com"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-300 transition-colors"
              >
                <Mail className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="font-medium">Email: tirthyatratrails@gmail.com</span>
              </a>
              <a
                href="tel:9068126203"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-300 transition-colors"
              >
                <Phone className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="font-medium">Phone: 9068126203</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </LegalPageLayout>
  );
};
