import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout.js';
import { FileText, ShieldAlert, CheckCircle2, Phone, Mail, Clock, Compass } from 'lucide-react';

const sections = [
  { id: 'about-our-services', title: 'About Our Services' },
  { id: 'booking-and-confirmation', title: 'Booking and Confirmation' },
  { id: 'payment', title: 'Payment' },
  { id: 'travel-documents', title: 'Travel Documents' },
  { id: 'hotels-and-accommodation', title: 'Hotels and Accommodation' },
  { id: 'transportation', title: 'Transportation' },
  { id: 'itinerary-changes', title: 'Itinerary Changes' },
  { id: 'third-party-suppliers', title: 'Third-Party Suppliers' },
  { id: 'delays-and-cancellations', title: 'Delays & Cancellations' },
  { id: 'customer-responsibilities', title: 'Customer Responsibilities' },
  { id: 'personal-belongings', title: 'Personal Belongings' },
  { id: 'limitation-of-liability', title: 'Limitation of Liability' },
  { id: 'force-majeure', title: 'Force Majeure' },
  { id: 'website-information', title: 'Website Information' },
  { id: 'intellectual-property', title: 'Intellectual Property' },
  { id: 'amendments', title: 'Amendments' },
  { id: 'contact-us', title: 'Contact Us' },
];

export const TermsPage: React.FC = () => {
  return (
    <LegalPageLayout
      badge="LEGAL AGREEMENT"
      title="Terms & Conditions"
      lastUpdated="September 11, 2026"
      description="Please read these Terms and Conditions carefully before reserving holy accommodations, pilgrimage packages, or travel desk assistance through TirthYatraTrails.in."
      sections={sections}
      activePath="/terms"
    >
      {/* Introduction Card */}
      <div className="p-5 rounded-2xl bg-orange-50/70 border border-orange-200 text-slate-800 text-sm leading-relaxed flex items-start gap-3.5">
        <FileText className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-[#0f294a]">Devotee Travel &amp; Facilitation Agreement</p>
          <p className="text-xs text-slate-600 mt-1">
            By inquiring, requesting quotations, confirming bookings, or utilizing services facilitated by TirthYatraTrails, you agree to be bound by these Terms and Conditions.
          </p>
        </div>
      </div>

      {/* 1. About Our Services */}
      <section id="about-our-services" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">01</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">About Our Services</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            <strong>TirthYatraTrails</strong> operates as a specialized spiritual travel facilitation desk, B2B pilgrim inventory partner, and tour coordinator connecting devotees with sanctum-facing hotels, accredited dharamshalas, licensed chauffeurs, and local temple guides.
          </p>
          <p>
            We curate verified spiritual stays, facilitate early morning aarti transfers, organize pure satvik catering, and coordinate customized yatras (including Char Dham, 12 Jyotirlingas, Navagraha Circuits, South India Temple circuits, and Shaktipeeth pilgrimages).
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
            Inquiries submitted via our digital portal or WhatsApp desk represent booking requests. A reservation is officially confirmed <strong>only</strong> when:
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-xs sm:text-sm text-slate-700">
            <li>The agreed advance token or booking deposit is verified by our accounts desk.</li>
            <li>An official TirthYatraTrails Booking Confirmation Voucher with unique Reservation ID is issued to your email or WhatsApp number.</li>
            <li>Verification of devotee identification has been completed where required by shrine board regulations.</li>
          </ul>
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
            All tariffs, rates, and package totals are quoted in Indian Rupees (₹ INR) inclusive or exclusive of GST as explicitly specified on the quotation invoice.
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-xs sm:text-sm text-slate-700">
            <li><strong>Advance Payment:</strong> A booking deposit (typically 30% to 50% depending on peak festival season) is required to block rooms and transport.</li>
            <li><strong>Balance Settlement:</strong> The remaining balance must be cleared either prior to arrival or at hotel check-in as defined in your booking voucher.</li>
            <li><strong>Payment Modes:</strong> Payments are accepted via official UPI, NEFT/RTGS direct corporate bank transfers, or secure payment gateway links. Cash transactions without an official receipt are strictly unauthorized.</li>
          </ul>
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
            It is the sole responsibility of the customer to carry valid original government identity proofs (Aadhaar Card, Passport, Voter ID, or Driver&apos;s License) for all travelers, including children and senior citizens.
          </p>
          <p>
            Shrine boards (such as Kedarnath biometric registration, Vaishno Devi RFID Yatra Parchi, or Tirumala SED tickets) strictly deny entry without physical or authorized digital ID verification. TirthYatraTrails cannot be held responsible for entry denial resulting from missing or invalid devotee credentials.
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
            Standard check-in time across most pilgrimage properties is 12:00 PM or 2:00 PM, and check-out is 10:00 AM or 11:00 AM. Early check-in or late check-out is subject to room availability and property discretion.
          </p>
          <p>
            Pilgrimage towns occasionally operate under basic municipal infrastructure (such as limited hot water hours, occasional power load shedding, or rustic Himalayan plumbing). While TirthYatraTrails rigorously audits and verifies properties for hygiene and hot water availability, local constraints must be appreciated by devotees.
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
            Vehicles provided for pilgrimage transfers (Sedans, SUVs, Tempo Travellers) are commercially registered with experienced local chauffeurs familiar with mountain ghats and pilgrimage traffic corridors.
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-xs sm:text-sm text-slate-700">
            <li>Air conditioning may be switched off while climbing steep ghat sections (such as Joshimath, Badrinath, or Tirumala hills) to maintain engine torque and safety.</li>
            <li>Vehicle usage is bounded by the agreed pilgrimage itinerary; additional off-route sightseeing or night driving beyond legal limits will incur extra per-kilometer charges payable directly.</li>
          </ul>
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
            While every endeavor is made to execute the pilgrimage exactly as scheduled, shrine timings, VIP protocol closures, unannounced aarti timing shifts, or hill road repairs may necessitate real-time adjustments. Our travel desk will always propose the best alternative sequence to ensure sacred darshan is maximized.
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
            TirthYatraTrails acts as a coordinator and facilitator. Independent third parties provide hotels, helicopter shuttle operators, local ponies/palkis, and temple priests. Each supplier operates under their own service standards and insurance norms.
          </p>
        </div>
      </section>

      {/* 9. Delays & Cancellations */}
      <section id="delays-and-cancellations" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">09</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Delays &amp; Cancellations</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            In the event of flight delays, train cancellations, roadblocks, or sudden temple trust closures, TirthYatraTrails will provide assistance in re-booking or adjusting ground arrangements. Refund eligibility for unused hotel nights or services will be processed in accordance with our <strong>Refund and Returns Policy</strong>.
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
          <p>
            Devotees are expected to observe sacred decorum, dress codes (e.g. traditional dhotis/saris at Tirupati, Guruvayur, or Rameshwaram), and follow temple shrine protocols. Devotees undertaking high-altitude treks (such as Kedarnath, Yamunotri, or Amarnath) must ensure medical fitness and acclimatization.
          </p>
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
            Devotees are solely responsible for their personal baggage, sacred items, cash, jewellery, and electronic devices. TirthYatraTrails is not liable for loss or damage to belongings inside vehicles, hotel cloakrooms, or temple lockers.
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
            To the maximum extent permitted by applicable law, TirthYatraTrails shall not be held liable for indirect, consequential, punitive, or special damages, including personal injury, emotional distress, or missed darshan resulting from external factors beyond our direct control. In all events, our total cumulative liability shall not exceed the net service facilitation fee received for the specific booking.
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
            Neither party shall be liable for non-performance or delay caused by events of <em>Force Majeure</em>, including natural disasters (landslides, flash floods, earthquakes, cloudbursts), extreme weather, epidemics, government curfews, military lockdowns, border closures, or emergency shrine closures.
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
            We strive to provide accurate hotel photographs, room distances from sanctums, and temple opening schedules. However, hotel renovations, temporary shrine board route diversions, or local infrastructure works may occasionally alter amenities or walking distances.
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
            The brand name <strong>TirthYatraTrails</strong>, logo, digital interface, curated itineraries, proprietary algorithms, and brand trademarks belong exclusively to TirthYatraTrails Pvt. Ltd. Unauthorized reproduction or scraping is prohibited.
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
            TirthYatraTrails reserves the right to modify or replace these Terms and Conditions at any time. Continued use of our portal or booking services following revisions constitutes acceptance of the modified Terms.
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
            For legal notices, contract clarifications, or booking arbitration, please contact our Legal &amp; Compliance Team:
          </p>

          <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <p className="font-extrabold text-[#0f294a] text-sm">TirthYatraTrails Legal &amp; Operations Desk</p>
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
              Jurisdiction: All disputes shall be subject to the exclusive jurisdiction of competent courts in India.
            </p>
          </div>
        </div>
      </section>
    </LegalPageLayout>
  );
};
