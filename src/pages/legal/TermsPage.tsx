import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout.js';
import { FileText, ShieldCheck, CheckCircle2, Phone, Mail, Clock, AlertTriangle, Building2, Car, Compass, HelpCircle } from 'lucide-react';

const sections = [
  { id: 'about-our-services', title: '1. About Our Services' },
  { id: 'booking-and-confirmation', title: '2. Booking and Confirmation' },
  { id: 'payment', title: '3. Payment' },
  { id: 'travel-documents', title: '4. Travel Documents' },
  { id: 'hotels-and-accommodation', title: '5. Hotels and Accommodation' },
  { id: 'transportation', title: '6. Transportation' },
  { id: 'itinerary-changes', title: '7. Itinerary Changes' },
  { id: 'third-party-suppliers', title: '8. Third-Party Suppliers' },
  { id: 'delays-and-cancellations', title: '9. Delays & Cancellations' },
  { id: 'customer-responsibilities', title: '10. Customer Responsibilities' },
  { id: 'personal-belongings', title: '11. Personal Belongings' },
  { id: 'limitation-of-liability', title: '12. Limitation of Liability' },
  { id: 'force-majeure', title: '13. Force Majeure' },
  { id: 'website-information', title: '14. Website Information' },
  { id: 'intellectual-property', title: '15. Intellectual Property' },
  { id: 'amendments', title: '16. Amendments' },
  { id: 'contact-us', title: '17. Contact Us' },
];

export const TermsPage: React.FC = () => {
  return (
    <LegalPageLayout
      badge="LEGAL AGREEMENT"
      title="Terms & Conditions"
      lastUpdated="September 11, 2026"
      description="Welcome to TirthYatraTrails. By accessing our website, making a booking, or using our travel-related services, you agree to these Terms & Conditions."
      sections={sections}
      activePath="/terms"
    >
      {/* Introduction Card */}
      <div className="p-6 rounded-2xl bg-orange-50/70 border border-orange-200 text-slate-800 text-sm leading-relaxed space-y-3">
        <div className="flex items-center gap-2 text-orange-700 font-bold text-xs uppercase tracking-wider">
          <FileText className="w-4 h-4 text-orange-600" />
          <span>Agreement Overview</span>
        </div>
        <p className="text-slate-700 text-sm leading-relaxed">
          Welcome to <strong>TirthYatraTrails</strong>. By accessing our website, making a booking, or using our travel-related services, you agree to these Terms &amp; Conditions.
        </p>
        <p className="text-slate-600 text-xs sm:text-sm font-semibold">
          Please read these terms carefully before making any booking.
        </p>
      </div>

      {/* 1. About Our Services */}
      <section id="about-our-services" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">01</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">About Our Services</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            TirthYatraTrails provides travel-related services including tour packages, accommodation arrangements, transportation, sightseeing and other travel assistance.
          </p>
          <p>
            Depending on the service booked, TirthYatraTrails may act as a travel service provider, booking facilitator or intermediary between customers and third-party travel suppliers.
          </p>
        </div>
      </section>

      {/* 2. Booking and Confirmation */}
      <section id="booking-and-confirmation" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">02</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Booking and Confirmation</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            A booking is considered confirmed only after the required payment has been received and confirmation has been issued by TirthYatraTrails.
          </p>
          <p>
            Availability, prices and travel arrangements may change until the booking is confirmed.
          </p>
          <p>
            Customers are responsible for providing correct passenger names, contact details, travel dates and other required information.
          </p>
        </div>
      </section>

      {/* 3. Payment */}
      <section id="payment" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">03</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Payment</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            The customer must make the payment according to the amount and schedule communicated at the time of booking.
          </p>
          <p>
            Some services may require full payment before confirmation, while others may be subject to advance payment and balance-payment conditions.
          </p>
          <p className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-700">
            Failure to make the required payment within the specified period may result in cancellation of the booking.
          </p>
        </div>
      </section>

      {/* 4. Travel Documents */}
      <section id="travel-documents" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">04</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Travel Documents</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Customers are responsible for carrying valid identification, tickets, permits, visas, passports and other documents required for their journey.
          </p>
          <p>
            TirthYatraTrails shall not be responsible for loss, inconvenience or expenses resulting from incorrect, expired or missing travel documents.
          </p>
        </div>
      </section>

      {/* 5. Hotels and Accommodation */}
      <section id="hotels-and-accommodation" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">05</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Hotels and Accommodation</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Hotel properties, room categories and facilities are subject to availability and supplier confirmation.
          </p>
          <p>
            Hotel images, descriptions and facilities displayed on our website may be provided by the respective property or supplier.
          </p>
          <p>
            In certain circumstances, accommodation may be changed to another property of similar category due to operational or availability issues.
          </p>
        </div>
      </section>

      {/* 6. Transportation */}
      <section id="transportation" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">06</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Transportation</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Transportation services are subject to availability and supplier schedules.
          </p>
          <p>
            Vehicle type, seating capacity and other transportation arrangements may vary depending on the confirmed itinerary and local operating conditions.
          </p>
        </div>
      </section>

      {/* 7. Itinerary Changes */}
      <section id="itinerary-changes" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">07</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Itinerary Changes</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            TirthYatraTrails may make reasonable changes to an itinerary where necessary because of weather, traffic, government restrictions, supplier availability, operational issues, safety concerns or other circumstances beyond our reasonable control.
          </p>
          <p>
            Where possible, we will inform customers of significant changes and provide suitable alternatives.
          </p>
        </div>
      </section>

      {/* 8. Third-Party Suppliers */}
      <section id="third-party-suppliers" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">08</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Third-Party Suppliers</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Certain services are provided by independent third-party suppliers. Their own terms, conditions, cancellation rules and operational policies may apply.
          </p>
          <p>
            TirthYatraTrails will assist customers where reasonably possible but cannot be held responsible for circumstances directly caused by an independent supplier beyond our control.
          </p>
        </div>
      </section>

      {/* 9. Delays and Cancellations by Airlines or Suppliers */}
      <section id="delays-and-cancellations" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">09</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Delays and Cancellations by Airlines or Suppliers</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Airline cancellations, delays, schedule changes, hotel closures, transportation disruptions and other supplier-related issues are generally governed by the applicable supplier&apos;s policies.
          </p>
          <p>
            Any refund or compensation will be subject to the amount actually approved or received from the relevant supplier, where applicable.
          </p>
        </div>
      </section>

      {/* 10. Customer Responsibilities */}
      <section id="customer-responsibilities" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">10</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Customer Responsibilities</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>Customers must:</p>
          <ul className="space-y-2 list-disc list-inside pl-1 text-xs sm:text-sm text-slate-700">
            <li>Provide accurate booking information</li>
            <li>Follow the rules of hotels, transport providers and other suppliers</li>
            <li>Carry required travel documents</li>
            <li>Arrive at designated departure points on time</li>
            <li>Follow applicable local laws and regulations</li>
            <li>Inform TirthYatraTrails promptly about any booking-related issue</li>
          </ul>
        </div>
      </section>

      {/* 11. Personal Belongings */}
      <section id="personal-belongings" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">11</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Personal Belongings</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Customers are responsible for their personal belongings, valuables, documents and luggage during travel.
          </p>
          <p>
            TirthYatraTrails shall not be responsible for loss, theft or damage to personal belongings unless such responsibility is imposed by applicable law.
          </p>
        </div>
      </section>

      {/* 12. Limitation of Liability */}
      <section id="limitation-of-liability" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">12</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Limitation of Liability</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            TirthYatraTrails will make reasonable efforts to provide the services described in the confirmed booking.
          </p>
          <p>
            However, we shall not be responsible for losses arising from circumstances outside our reasonable control, including natural disasters, severe weather, government restrictions, strikes, accidents, traffic conditions, supplier failures, delays or other force majeure events, subject to applicable law.
          </p>
        </div>
      </section>

      {/* 13. Force Majeure */}
      <section id="force-majeure" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">13</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Force Majeure</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            TirthYatraTrails shall not be considered in breach of its obligations where performance is prevented or materially affected by circumstances beyond reasonable control.
          </p>
          <p>
            Such circumstances may include natural disasters, epidemics, pandemics, war, civil unrest, government restrictions, strikes, transportation disruptions, extreme weather and similar events.
          </p>
        </div>
      </section>

      {/* 14. Website Information */}
      <section id="website-information" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">14</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Website Information</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            We make reasonable efforts to keep information on our website accurate and updated. However, prices, availability, schedules, facilities and travel information may change without prior notice.
          </p>
        </div>
      </section>

      {/* 15. Intellectual Property */}
      <section id="intellectual-property" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">15</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Intellectual Property</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            The content, branding, design, text, graphics and other material created or published by TirthYatraTrails on its website may not be copied, reproduced, modified or commercially used without prior written permission, except where permitted by law.
          </p>
        </div>
      </section>

      {/* 16. Amendments */}
      <section id="amendments" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">16</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Amendments</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            TirthYatraTrails reserves the right to modify these Terms &amp; Conditions when necessary. Updated terms will be published on the website.
          </p>
        </div>
      </section>

      {/* 17. Contact Us */}
      <section id="contact-us" className="space-y-4 scroll-mt-28 pt-2">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">17</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Contact Us</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            For any questions regarding these Terms &amp; Conditions:
          </p>

          <div className="mt-4 p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
            <div>
              <p className="font-extrabold text-[#0f294a] text-base font-serif">TirthYatraTrails</p>
              <p className="text-xs text-slate-500 mt-0.5">Customer &amp; Legal Support Desk</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <a
                href="mailto:tirthyatratrails@gmail.com"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-300 transition-colors"
              >
                <Mail className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="font-medium">tirthyatratrails@gmail.com</span>
              </a>
              <a
                href="tel:9068126203"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-300 transition-colors"
              >
                <Phone className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="font-medium">+91 9068126203</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </LegalPageLayout>
  );
};
