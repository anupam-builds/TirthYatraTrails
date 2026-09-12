import React, { useState, useEffect } from 'react';
import { useRouter } from '../../context/RouterContext.js';
import {
  Calendar,
  ChevronRight,
  Phone,
  Mail,
  ShieldCheck,
  ArrowRight,
  ListOrdered,
  HelpCircle,
} from 'lucide-react';

export interface SectionItem {
  id: string;
  title: string;
}

interface LegalPageLayoutProps {
  badge?: string;
  title: string;
  lastUpdated?: string;
  description?: string;
  sections: SectionItem[];
  children: React.ReactNode;
  activePath: string;
}

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({
  badge = 'OFFICIAL POLICY & DISCLOSURES',
  title,
  lastUpdated = 'September 11, 2026',
  description,
  sections,
  children,
  activePath,
}) => {
  const { navigate } = useRouter();
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || '');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Scroll to top when page mounts
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [activePath]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection(id);
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="bg-[#fcfaf7] min-h-screen">
      {/* 1. DARK HEADER BANNER */}
      <section className="bg-[#0f294a] text-white pt-10 pb-12 sm:pt-14 sm:pb-16 px-4 sm:px-6 lg:px-8 border-b border-[#1a385f] relative overflow-hidden">
        {/* Subtle background ambient pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,88,12,0.12),transparent_50%)] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-5">
            <button
              onClick={() => navigate('/')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">Legal &amp; Policies</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-orange-400 font-semibold">{title}</span>
          </nav>

          {/* Badge & Title */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wider bg-white/10 border border-white/20 text-orange-300 uppercase shadow-xs mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
            <span>{badge}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight font-serif">
            {title}
          </h1>

          {description && (
            <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}

          {/* Last Updated Timestamp */}
          <div className="mt-5 flex items-center gap-2 text-xs text-slate-300 font-medium">
            <Calendar className="w-3.5 h-3.5 text-orange-400" />
            <span>Last updated: {lastUpdated}</span>
          </div>
        </div>
      </section>

      {/* 2. MAIN LAYOUT WITH "ON THIS PAGE" STICKY SIDEBAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        {/* Mobile "On This Page" Accordion Toggle */}
        <div className="lg:hidden mb-8">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs text-left"
          >
            <div className="flex items-center gap-2.5">
              <ListOrdered className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Jump to Section
              </span>
            </div>
            <span className="text-xs font-bold text-orange-600">
              {mobileMenuOpen ? 'Hide' : 'View All'}
            </span>
          </button>

          {mobileMenuOpen && (
            <div className="mt-2 bg-white rounded-2xl border border-slate-200 shadow-md p-3 space-y-1">
              {sections.map((sec, idx) => (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                    activeSection === sec.id
                      ? 'bg-orange-50 text-orange-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>
                    {idx + 1}. {sec.title}
                  </span>
                  {activeSection === sec.id && (
                    <ArrowRight className="w-3 h-3 text-orange-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">
          {/* DESKTOP SIDEBAR ("ON THIS PAGE") */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-24">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-600" />
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-900">
                    ON THIS PAGE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Navigate through policy sections
                </p>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                {sections.map((sec, idx) => {
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between group ${
                        isActive
                          ? 'bg-orange-50 text-orange-700 font-bold shadow-2xs border-l-3 border-orange-600'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">
                        <span className="text-[10px] text-slate-400 font-mono mr-1.5">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        {sec.title}
                      </span>
                      {isActive && (
                        <ArrowRight className="w-3 h-3 text-orange-600 shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Quick Contact & Assistance Box */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <HelpCircle className="w-3.5 h-3.5 text-orange-600" />
                  <span>Have questions?</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Our pilgrimage desk is available 24/7 to clarify terms and booking policies.
                </p>
                <div className="space-y-1.5 text-xs">
                  <a
                    href="mailto:tirthyatratrails@gmail.com"
                    className="flex items-center gap-2 text-slate-600 hover:text-orange-600 transition-colors font-medium text-[11px]"
                  >
                    <Mail className="w-3 h-3 text-orange-600 shrink-0" />
                    <span className="truncate">tirthyatratrails@gmail.com</span>
                  </a>
                  <a
                    href="tel:9068126203"
                    className="flex items-center gap-2 text-slate-600 hover:text-orange-600 transition-colors font-medium text-[11px]"
                  >
                    <Phone className="w-3 h-3 text-orange-600 shrink-0" />
                    <span>+91 9068126203</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Other Policy Shortcuts */}
            <div className="mt-4 p-4 rounded-2xl bg-[#0f294a]/5 border border-slate-200/80 text-xs space-y-2">
              <span className="font-bold text-slate-800 text-[11px] block uppercase tracking-wider">
                Related Policies
              </span>
              <ul className="space-y-1.5 text-[11px]">
                {activePath !== '/privacy' && (
                  <li>
                    <button
                      onClick={() => navigate('/privacy')}
                      className="text-slate-600 hover:text-orange-600 font-medium flex items-center gap-1"
                    >
                      <ChevronRight className="w-3 h-3 text-orange-500" />
                      <span>Privacy Policy</span>
                    </button>
                  </li>
                )}
                {activePath !== '/terms' && (
                  <li>
                    <button
                      onClick={() => navigate('/terms')}
                      className="text-slate-600 hover:text-orange-600 font-medium flex items-center gap-1"
                    >
                      <ChevronRight className="w-3 h-3 text-orange-500" />
                      <span>Terms &amp; Conditions</span>
                    </button>
                  </li>
                )}
                {activePath !== '/refunds' && (
                  <li>
                    <button
                      onClick={() => navigate('/refunds')}
                      className="text-slate-600 hover:text-orange-600 font-medium flex items-center gap-1"
                    >
                      <ChevronRight className="w-3 h-3 text-orange-500" />
                      <span>Cancellation &amp; Refund Policy</span>
                    </button>
                  </li>
                )}
                {activePath !== '/guarantee' && (
                  <li>
                    <button
                      onClick={() => navigate('/guarantee')}
                      className="text-slate-600 hover:text-orange-600 font-medium flex items-center gap-1"
                    >
                      <ChevronRight className="w-3 h-3 text-orange-500" />
                      <span>Spiritual Hospitality Guarantee</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </aside>

          {/* MAIN DOCUMENT BODY */}
          <main className="flex-1 min-w-0 max-w-4xl bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-10 lg:p-12 space-y-12">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
