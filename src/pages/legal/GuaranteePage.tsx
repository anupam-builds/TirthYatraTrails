import React from 'react';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout.js';
import { Sparkles, CheckCircle2, ShieldCheck, HeartHandshake, MapPin, Phone, Building2, Clock, Mail } from 'lucide-react';

const sections = [
  { id: 'our-promise', title: 'Our Promise' },
  { id: 'direct-rates', title: 'Direct Rates' },
  { id: 'verified-stays', title: 'Verified Stays' },
  { id: 'temple-proximity', title: 'Temple Proximity' },
  { id: 'pilgrim-support', title: '24/7 Pilgrim Support' },
];

export const GuaranteePage: React.FC = () => {
  return (
    <LegalPageLayout
      badge="DEVOTEE SERVICE COMMITMENT"
      title="Spiritual Hospitality Guarantee"
      lastUpdated="September 11, 2026"
      description="Our sacred pledge ensuring authentic wholesale pricing, strictly audited sacred accommodations, honest walking distances to the sanctum, and uninterrupted 24/7 travel desk care."
      sections={sections}
      activePath="/guarantee"
    >
      {/* Guarantee Hero Card */}
      <div className="p-6 rounded-3xl bg-linear-to-br from-[#0f294a] to-[#153a65] text-white space-y-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-orange-400 border border-white/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>The TirthYatraTrails Standard</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white font-serif">
          Travel with Peace of Mind &amp; Divine Focus
        </h2>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-2xl">
          A pilgrimage is an offering of faith, devotion, and reverence. We built TirthYatraTrails to eliminate deceptive middleman markups, misleading proximity claims, and unhygienic rooms so you can immerse in prayer without logistical anxiety.
        </p>
      </div>

      {/* 1. Our Promise */}
      <section id="our-promise" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">01</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Our Promise</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            At <strong>TirthYatraTrails</strong>, we regard our service not as a commercial transactional platform, but as a spiritual service (*Seva*). Every package, hotel reservation, and transport transfer facilitated through our desk carries our binding Spiritual Hospitality Guarantee.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200 text-center space-y-1.5">
              <CheckCircle2 className="w-5 h-5 text-orange-600 mx-auto" />
              <p className="font-extrabold text-xs text-[#0f294a]">100% Verified</p>
              <p className="text-[11px] text-slate-500">Physical field audits of rooms, water heating, and linen cleanliness.</p>
            </div>
            <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200 text-center space-y-1.5">
              <ShieldCheck className="w-5 h-5 text-orange-600 mx-auto" />
              <p className="font-extrabold text-xs text-[#0f294a]">True Sanctum Steps</p>
              <p className="text-[11px] text-slate-500">Accurately mapped walking distances to temple entry gates.</p>
            </div>
            <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200 text-center space-y-1.5">
              <HeartHandshake className="w-5 h-5 text-orange-600 mx-auto" />
              <p className="font-extrabold text-xs text-[#0f294a]">Zero Hidden Fees</p>
              <p className="text-[11px] text-slate-500">Transparent wholesale pricing without OTA commission bloat.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Direct Rates */}
      <section id="direct-rates" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">02</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Direct Rates &amp; Zero Aggregator Markups</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Mainstream travel aggregators and online travel agencies (OTAs) routinely add 18% to 30% platform commissions on sacred temple stays. In contrast, TirthYatraTrails operates on a <strong>Direct B2B Wholesale Inventory Model</strong>:
          </p>
          <ul className="space-y-2 list-disc list-inside text-xs sm:text-sm text-slate-700">
            <li><strong>Contracted Hotel Rates:</strong> We negotiate annual block allocations directly with hotel owners and ashram trusts, passing true base tariffs to pilgrims.</li>
            <li><strong>WhatsApp No-Cost Desk:</strong> Devotees can browse, customize, and receive itemized quotations without booking fee surcharges.</li>
            <li><strong>Transparent Group Discounts:</strong> Families and community groups traveling together for rituals (*mundan, shraddh, vivah, or parikrama*) receive genuine bulk pricing.</li>
          </ul>
        </div>
      </section>

      {/* 3. Verified Stays */}
      <section id="verified-stays" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">03</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Verified Stays &amp; Devotee Comfort</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Properties listed under the TirthYatraTrails verified badge must satisfy our 4-Pillar Spiritual Hospitality Audit:
          </p>
          <div className="space-y-2.5 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs text-[#0f294a]">1. Pure Satvik &amp; Vegetarian Environment</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Strict adherence to pure vegetarian kitchen standards, with onion-and-garlic-free (Jain/Satvik) dining on request.</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs text-[#0f294a]">2. Guaranteed Hot Water &amp; Morning Aarti Reliability</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Functional geysers or scheduled boilers ensuring hot water is guaranteed for pre-dawn holy bathing (*Brahma Muhurta snan*).</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs text-[#0f294a]">3. Senior Citizen &amp; Accessibility Support</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Prioritized ground floor rooms or elevator access, with wheelchair assistance arranged upon request.</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs text-[#0f294a]">4. Fresh Sanitized Bedding &amp; Clean Bathrooms</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Rigorous housekeeping standards, inspected linens, and sanitized private bathrooms.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Temple Proximity */}
      <section id="temple-proximity" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">04</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">Temple Proximity &amp; Transfer Assistance</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Too often, online listings advertise properties &ldquo;near the temple&rdquo; that turn out to be miles away across congested streets.
          </p>
          <p>
            Under our guarantee:
          </p>
          <ul className="space-y-2 list-disc list-inside text-xs sm:text-sm text-slate-700">
            <li><strong>True Walking Times:</strong> We publish real walking times and step distances to specific entry gates (e.g. Kedarnath Temple Outer Compound, Kashi Vishwanath Gate 4, Jagannath Temple Lion Gate, Ayodhya Ram Janmabhoomi Path).</li>
            <li><strong>Early Morning Temple Shuttles:</strong> For properties located slightly outside pedestrian zones, early morning electric rickshaws or private shuttle transfers are coordinated so devotees never miss Mangala Aarti or Suprabhatam.</li>
          </ul>
        </div>
      </section>

      {/* 5. 24/7 Pilgrim Support */}
      <section id="pilgrim-support" className="space-y-4 scroll-mt-28 pt-2">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">05</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f294a] font-serif">24/7 Pilgrim Support &amp; Travel Desk</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
          <p>
            Our travel desk does not sign off once your voucher is issued. We accompany you virtually throughout your entire spiritual journey:
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-xs sm:text-sm text-slate-700">
            <li><strong>Live Chauffeur &amp; Check-In Coordination:</strong> Advance driver contact details shared 12 hours prior to arrival; hotel reception notified of arrival times.</li>
            <li><strong>Real-Time Weather &amp; Route Advisories:</strong> Immediate notifications regarding mountain landslides, highway closures, or VIP temple restrictions with prompt alternative itineraries.</li>
            <li><strong>Direct Support Escalation:</strong> In the rare event a booked room fails to meet our cleanliness standards, our travel desk immediately intervenes to re-clean or relocate you at zero cost.</li>
          </ul>

          <div className="mt-5 p-5 rounded-2xl bg-orange-50/70 border border-orange-200/90 space-y-3">
            <p className="font-extrabold text-[#0f294a] text-sm">Experience the TirthYatraTrails Difference</p>
            <p className="text-xs text-slate-600">
              Speak directly with our pilgrimage travel coordinators on WhatsApp or phone for immediate advice:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <a
                href="https://wa.me/919068126203?text=Namaste%2C%20I%20would%20like%20to%20know%20more%20about%20your%20Spiritual%20Hospitality%20Guarantee"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-300 transition-colors"
              >
                <Phone className="w-4 h-4 text-orange-600" />
                <span className="font-medium">+91 9068126203 (WhatsApp / Call)</span>
              </a>
              <a
                href="mailto:tirthyatratrails@gmail.com"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-300 transition-colors"
              >
                <Mail className="w-4 h-4 text-orange-600" />
                <span className="font-medium">tirthyatratrails@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </LegalPageLayout>
  );
};
