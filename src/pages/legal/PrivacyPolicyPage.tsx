import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout.js';
import { ShieldCheck, Lock, Mail, Phone, Eye, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

const sections = [
  { id: 'who-we-are', title: 'Who We Are' },
  { id: 'information-we-collect', title: 'Information We Collect' },
  { id: 'how-we-use-information', title: 'How We Use Your Information' },
  { id: 'sharing-of-information', title: 'Sharing of Information' },
  { id: 'payment-information', title: 'Payment Information' },
  { id: 'cookies', title: 'Cookies' },
  { id: 'data-security', title: 'Data Security' },
  { id: 'third-party-websites', title: 'Third-Party Websites' },
  { id: 'childrens-privacy', title: "Children's Privacy" },
  { id: 'your-choices', title: 'Your Choices' },
  { id: 'policy-changes', title: 'Policy Changes' },
  { id: 'contact-us', title: 'Contact Us' },
];

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <LegalPageLayout
      badge="PRIVACY & DATA PROTECTION"
      title="Privacy Policy"
      lastUpdated="September 11, 2026"
      description="At TirthYatraTrails.in, we honor your spiritual journey and treat your personal information with sacred confidentiality and uncompromising data security."
      sections={sections}
      activePath="/privacy"
    >
      {/* Introduction Callout */}
      <div className="p-5 rounded-2xl bg-orange-50/70 border border-orange-200 text-slate-800 text-sm leading-relaxed flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-[#0f294a]">Sacred Trust &amp; Privacy Commitment</p>
          <p className="text-xs text-slate-600 mt-1">
            This Privacy Policy outlines how TirthYatraTrails collects, stores, processes, and safeguards pilgrim details when utilizing our website, mobile interface, or WhatsApp Travel Desk services.
          </p>
        </div>
      </div>

      {/* 1. Who We Are */}
      <section id="who-we-are" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">01</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Who We Are</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            <strong>TirthYatraTrails</strong> (accessible via <span className="text-orange-600 font-semibold">TirthYatraTrails.in</span>) operates as a dedicated pilgrimage travel facilitation service, B2B wholesale accommodations desk, and sacred tour coordinator across prominent pilgrimage destinations in India.
          </p>
          <p>
            We curate verified sanctum-facing hotels, dharamshalas, VIP darshan passes, puja coordination, and spiritual yatra itineraries. In facilitating these divine journeys, we respect your rights to privacy and handle every piece of personal data under applicable Indian information technology and digital personal data protection laws.
          </p>
        </div>
      </section>

      {/* 2. Information We Collect */}
      <section id="information-we-collect" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">02</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Information We Collect</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            When you inquire, plan, or book a spiritual tour, stay, or transportation with us, we collect only the necessary details required to provide seamless travel desk assistance:
          </p>
          <ul className="space-y-2 list-disc list-inside pl-1 text-xs sm:text-sm text-slate-700">
            <li><strong>Personal Contact Information:</strong> Full legal name, email address, WhatsApp/mobile phone number, and residential city.</li>
            <li><strong>Pilgrim Identification Details:</strong> Government-issued ID numbers (Aadhaar, Passport, or Voter ID) when required strictly for official temple shrine board darshan passes, helicopter tickets, or hotel check-in compliance.</li>
            <li><strong>Travel Preferences:</strong> Number of devotees (adults, senior citizens, children), dates of travel, preferred meal type (satvik/pure vegetarian), mobility requirements (wheelchair assistance), and target temple sanctum visits.</li>
            <li><strong>Communications Records:</strong> Interaction history via WhatsApp chats, customer service calls, contact forms, or email messages to maintain consistent itinerary updates.</li>
            <li><strong>Technical Device Data:</strong> IP address, browser type, operating system, and approximate geographical location recorded through analytics to optimize website performance.</li>
          </ul>
        </div>
      </section>

      {/* 3. How We Use Your Information */}
      <section id="how-we-use-information" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">03</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">How We Use Your Information</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            All pilgrim data collected is processed strictly for legitimate operational purposes:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold text-xs text-[#0f294a]">Booking Execution</p>
              <p className="text-[11px] text-slate-500 mt-1">Securing confirmed hotel vouchers, local cab transfers, and temple darshan slots on your behalf.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold text-xs text-[#0f294a]">Itinerary Communications</p>
              <p className="text-[11px] text-slate-500 mt-1">Sending vouchers, driver details, morning aarti timings, and status notifications via WhatsApp and email.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold text-xs text-[#0f294a]">Customer Desk Support</p>
              <p className="text-[11px] text-slate-500 mt-1">Assisting with customized modifications, special dietary requests, and emergency pilgrimage guidance.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-bold text-xs text-[#0f294a]">Regulatory Compliance</p>
              <p className="text-[11px] text-slate-500 mt-1">Adhering to mandatory state tourism guest registrations and shrine board security guidelines.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Sharing of Information */}
      <section id="sharing-of-information" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">04</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Sharing of Information</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            <strong>We never sell, rent, trade, or monetize your personal information to third-party advertisers.</strong>
          </p>
          <p>
            Information is only shared under the following limited operational circumstances:
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-xs sm:text-sm text-slate-700">
            <li><strong>Verified Hospitality &amp; Transport Partners:</strong> Partner hotels, ashrams, cab operators, and local guides receive devotee names and contact numbers strictly to welcome you and manage check-ins.</li>
            <li><strong>Temple Shrine Boards &amp; Authorities:</strong> Registered government trust boards (such as Shri Mata Vaishno Devi Shrine Board, Tirumala Tirupati Devasthanams, or Char Dham Devasthanam Board) where authorized VIP token verification is mandated.</li>
            <li><strong>Legal &amp; Law Enforcement:</strong> If required by court order, law enforcement investigation, or mandatory statutory requirements under Indian law.</li>
          </ul>
        </div>
      </section>

      {/* 5. Payment Information */}
      <section id="payment-information" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">05</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Payment Information</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex items-start gap-3 text-xs text-slate-700">
            <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900">Zero Storage of Credit / Debit Card Numbers</p>
              <p className="mt-0.5 text-slate-600">
                TirthYatraTrails does not store or process sensitive cardholder credit numbers, CVV codes, or net banking passwords on our local servers.
              </p>
            </div>
          </div>
          <p>
            All financial transactions, deposit advances, and invoice settlements are handled through RBI-regulated payment gateways, official UPI QR identifiers, or direct verified corporate bank accounts using 256-bit SSL encryption.
          </p>
        </div>
      </section>

      {/* 6. Cookies */}
      <section id="cookies" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">06</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Cookies</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Our website uses basic session cookies and functional web storage to improve user experience, memorize search parameters (such as selected holy city, check-in dates, and guest counts), and analyze aggregate anonymous traffic metrics.
          </p>
          <p>
            You can configure your browser to reject cookies or alert you when cookies are sent; however, certain portal features (such as saved custom inquiries) may require session state to function smoothly.
          </p>
        </div>
      </section>

      {/* 7. Data Security */}
      <section id="data-security" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">07</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Data Security</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            We implement comprehensive technical, organizational, and physical safeguards to prevent unauthorized access, accidental alteration, disclosure, or destruction of pilgrim records.
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-xs sm:text-sm text-slate-700">
            <li>End-to-end encrypted HTTPS data transmission across all portal endpoints.</li>
            <li>Role-based access controls ensuring only authorized travel desk staff can view pilgrim contact dossiers.</li>
            <li>Periodic administrative audit logs and routine database security scans.</li>
          </ul>
        </div>
      </section>

      {/* 8. Third-Party Websites */}
      <section id="third-party-websites" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">08</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Third-Party Websites</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Our platform may contain links or redirects to external resources, such as state government darshan booking boards, IRCTC railway portals, or regional weather advisories. We do not exercise control over external platforms and encourage you to review their independent privacy declarations prior to submitting sensitive credentials.
          </p>
        </div>
      </section>

      {/* 9. Children's Privacy */}
      <section id="childrens-privacy" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">09</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Children&apos;s Privacy</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Pilgrimages frequently unite multi-generational families. While we arrange accommodations and darshan slots for children and infants accompanying parents or guardians, our digital platform does not knowingly collect personal information directly from individuals under the age of 18 without parental consent.
          </p>
        </div>
      </section>

      {/* 10. Your Choices */}
      <section id="your-choices" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">10</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Your Choices</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            You maintain full sovereignty over your personal data:
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-xs sm:text-sm text-slate-700">
            <li><strong>Access &amp; Review:</strong> Request a summary of your personal information retained on our desk servers.</li>
            <li><strong>Correction:</strong> Update inaccurate contact coordinates, misspelt names, or modified travel dates.</li>
            <li><strong>Erasure / Deletion:</strong> Request deletion of historical booking inquiries once travel itineraries have concluded, subject to statutory tax record retention requirements.</li>
            <li><strong>Opt-Out:</strong> Unsubscribe at any time from promotional WhatsApp alerts or seasonal festival newsletters.</li>
          </ul>
        </div>
      </section>

      {/* 11. Policy Changes */}
      <section id="policy-changes" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">11</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Policy Changes</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            We may periodically revise this Privacy Policy to reflect operational enhancements, new spiritual corridors, or statutory regulations. Any updates will be published on this page with an amended &ldquo;Last updated&rdquo; timestamp. Continued engagement with our travel desk constitutes acceptance of the modified terms.
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
            If you have questions, privacy inquiries, or wish to exercise data rights regarding your personal records, please reach out directly to our Grievance Officer:
          </p>

          <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <p className="font-extrabold text-[#0f294a] text-sm">TirthYatraTrails Privacy &amp; Data Desk</p>
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
              Pilgrim Support Hours: 24 hours daily, 7 days a week for active travelers and devotee inquiries.
            </p>
          </div>
        </div>
      </section>
    </LegalPageLayout>
  );
};
