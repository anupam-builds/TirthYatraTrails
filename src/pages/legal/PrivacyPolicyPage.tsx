import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout.js';
import { ShieldCheck, Lock, Mail, Phone, Cookie, Shield, ExternalLink, Users, Sliders, RefreshCw, FileText } from 'lucide-react';

const sections = [
  { id: 'information-we-collect', title: '1. Information We Collect' },
  { id: 'how-we-use-information', title: '2. How We Use Your Information' },
  { id: 'sharing-of-information', title: '3. Sharing of Information' },
  { id: 'payment-information', title: '4. Payment Information' },
  { id: 'cookies', title: '5. Cookies' },
  { id: 'data-security', title: '6. Data Security' },
  { id: 'third-party-websites', title: '7. Third-Party Websites' },
  { id: 'childrens-privacy', title: "8. Children's Privacy" },
  { id: 'your-choices', title: '9. Your Choices' },
  { id: 'changes-to-policy', title: '10. Changes to This Privacy Policy' },
  { id: 'contact-us', title: '11. Contact Us' },
];

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <LegalPageLayout
      badge="PRIVACY & DATA PROTECTION"
      title="Privacy Policy"
      lastUpdated="September 11, 2026"
      description="At TirthYatraTrails, we respect your privacy and are committed to protecting the personal information you provide while using our website, booking our travel services, or communicating with us."
      sections={sections}
      activePath="/privacy"
    >
      {/* Introduction Statement */}
      <div className="p-6 rounded-2xl bg-orange-50/70 border border-orange-200 text-slate-800 text-sm leading-relaxed space-y-3">
        <div className="flex items-center gap-2 text-orange-700 font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-orange-600" />
          <span>Our Privacy Commitment</span>
        </div>
        <p className="text-slate-700 text-sm leading-relaxed">
          At <strong>TirthYatraTrails</strong>, we respect your privacy and are committed to protecting the personal information you provide while using our website, booking our travel services, or communicating with us.
        </p>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          This Privacy Policy explains what information we collect, how we use it, how we protect it, and the choices available to you.
        </p>
      </div>

      {/* 1. Information We Collect */}
      <section id="information-we-collect" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">01</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Information We Collect</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            When you use our website or services, we may collect information such as:
          </p>
          <ul className="space-y-2 list-disc list-inside pl-1 text-xs sm:text-sm text-slate-700">
            <li>Full name</li>
            <li>Mobile/contact number</li>
            <li>Email address</li>
            <li>Billing and communication address</li>
            <li>Travel and booking details</li>
            <li>Passenger information required for reservations</li>
            <li>Payment and transaction-related information</li>
            <li>Information you provide when contacting customer support</li>
            <li>Website usage, browser, device and technical information</li>
            <li>Cookies and similar technologies</li>
          </ul>
          <p className="pt-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            We only request information that is reasonably required to provide or improve our services.
          </p>
        </div>
      </section>

      {/* 2. How We Use Your Information */}
      <section id="how-we-use-information" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">02</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">How We Use Your Information</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>The information collected may be used to:</p>
          <ul className="space-y-2 list-disc list-inside pl-1 text-xs sm:text-sm text-slate-700">
            <li>Process and manage bookings</li>
            <li>Arrange hotels, transportation, tours and other travel services</li>
            <li>Communicate booking confirmations and updates</li>
            <li>Respond to customer enquiries and support requests</li>
            <li>Process payments and refunds</li>
            <li>Improve our website and services</li>
            <li>Prevent fraud, misuse or unauthorized activity</li>
            <li>Meet applicable legal and regulatory requirements</li>
            <li>Send promotional or service-related communications where permitted</li>
          </ul>
        </div>
      </section>

      {/* 3. Sharing of Information */}
      <section id="sharing-of-information" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">03</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Sharing of Information</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            TirthYatraTrails may share necessary information with trusted service providers such as hotels, transportation providers, tour operators, payment processors and other suppliers involved in fulfilling your booking.
          </p>
          <p>
            Information may also be disclosed when required by law, legal proceedings, government authorities, or to protect our rights, customers or services.
          </p>
          <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-200 text-xs sm:text-sm font-semibold text-slate-800">
            We do not intend to sell your personal information to third parties.
          </div>
        </div>
      </section>

      {/* 4. Payment Information */}
      <section id="payment-information" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">04</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Payment Information</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex items-start gap-3 text-xs sm:text-sm text-slate-700">
            <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <p>
              Payments may be processed through third-party payment gateways. TirthYatraTrails may not directly store complete debit card, credit card or banking credentials unless specifically required and lawfully permitted.
            </p>
          </div>
          <p>
            Customers should review the privacy and security policies of the payment provider used for their transaction.
          </p>
        </div>
      </section>

      {/* 5. Cookies */}
      <section id="cookies" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">05</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Cookies</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Our website may use cookies and similar technologies to improve functionality, remember preferences, understand website usage and enhance your experience.
          </p>
          <p>
            You may be able to control or disable cookies through your browser settings. Some website features may not function properly if cookies are disabled.
          </p>
        </div>
      </section>

      {/* 6. Data Security */}
      <section id="data-security" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">06</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Data Security</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            We take reasonable administrative, technical and organizational measures to protect personal information from unauthorized access, misuse, alteration or disclosure.
          </p>
          <p>
            However, no internet transmission or electronic storage system can be guaranteed to be completely secure.
          </p>
        </div>
      </section>

      {/* 7. Third-Party Websites */}
      <section id="third-party-websites" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">07</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Third-Party Websites</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Our website may contain links to third-party websites, payment services or travel providers. TirthYatraTrails is not responsible for the privacy practices or content of those third-party websites.
          </p>
          <p>
            Customers should review their respective privacy policies before providing personal information.
          </p>
        </div>
      </section>

      {/* 8. Children's Privacy */}
      <section id="childrens-privacy" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">08</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Children&apos;s Privacy</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Our services are not intentionally directed toward children under the age of 18. We do not knowingly collect personal information from children for independent use of our services.
          </p>
        </div>
      </section>

      {/* 9. Your Choices */}
      <section id="your-choices" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">09</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Your Choices</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            You may contact us to request clarification regarding personal information that you have provided to us, subject to applicable legal and operational requirements.
          </p>
          <p>
            You may also request to stop receiving promotional communications from us.
          </p>
        </div>
      </section>

      {/* 10. Changes to This Privacy Policy */}
      <section id="changes-to-policy" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">10</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Changes to This Privacy Policy</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            TirthYatraTrails may update this Privacy Policy from time to time. Any changes will be published on this page with an updated revision date.
          </p>
        </div>
      </section>

      {/* 11. Contact Us */}
      <section id="contact-us" className="space-y-4 scroll-mt-28 pt-2">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">11</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Contact Us</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            For questions, concerns or requests relating to this Privacy Policy, please contact:
          </p>

          <div className="mt-4 p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
            <div>
              <p className="font-extrabold text-[#0f294a] text-base font-serif">TirthYatraTrails</p>
              <p className="text-xs text-slate-500 mt-0.5">Official Privacy &amp; Data Support</p>
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
