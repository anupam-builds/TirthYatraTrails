import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext.js';
import { InquiryModal } from '../components/common/InquiryModal.js';
import {
  Plane,
  Calendar,
  Users,
  MapPin,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Phone,
  Clock,
  Compass,
} from 'lucide-react';

const SACRED_AIRPORTS = [
  { code: 'AYJ', city: 'Ayodhya', name: 'Maharishi Valmiki International Airport', temple: 'Shri Ram Janmabhoomi (12km)' },
  { code: 'VNS', city: 'Varanasi', name: 'Lal Bahadur Shastri International Airport', temple: 'Kashi Vishwanath Corridor (24km)' },
  { code: 'DED', city: 'Dehradun', name: 'Jolly Grant Airport (Char Dham Gateway)', temple: 'Rishikesh (18km) & Kedarnath Helipads' },
  { code: 'TIR', city: 'Tirupati', name: 'Tirupati International Airport (Renigunta)', temple: 'Sri Venkateswara Temple (38km)' },
  { code: 'IXM', city: 'Madurai', name: 'Madurai Airport (South Temple Hub)', temple: 'Meenakshi Amman Temple (12km)' },
  { code: 'GAY', city: 'Gaya', name: 'Gaya International Airport', temple: 'Vishnupad & Mahabodhi Temple (10km)' },
  { code: 'ATQ', city: 'Amritsar', name: 'Sri Guru Ram Dass Jee International Airport', temple: 'Golden Temple (11km)' },
  { code: 'RAJ', city: 'Rajkot / Hirasar', name: 'Rajkot International Airport', temple: 'Somnath & Dwarka Gateway' },
];

export const FlightsPage: React.FC = () => {
  const { navigate } = useRouter();
  const [fromCity, setFromCity] = useState('New Delhi (DEL)');
  const [toAirport, setToAirport] = useState('Ayodhya (AYJ)');
  const [flightDate, setFlightDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });
  const [passengers, setPassengers] = useState(2);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);

  return (
    <div id="flights-page" className="min-h-screen bg-[#faf8f5] pb-24">
      {/* Hero Header */}
      <section className="bg-[#0f294a] text-white pt-12 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-400/30 text-orange-300 text-xs font-bold uppercase tracking-wider">
            <Plane className="w-3.5 h-3.5 text-orange-400" />
            <span>Spiritual Air Corridor</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-serif text-white">
            Pilgrim Flights &amp; Sacred <span className="text-orange-400">Transfers</span>
          </h1>

          <p className="text-slate-300 text-sm max-w-xl mx-auto">
            Direct charter &amp; commercial flights to Ayodhya, Varanasi, Dehradun, and temple hubs with synchronized airport-to-temple VIP transfers.
          </p>

          {/* Quick Search Widget */}
          <div className="pt-6 max-w-4xl mx-auto">
            <div className="bg-white text-[#0f294a] p-4 sm:p-6 rounded-3xl shadow-2xl border border-orange-200/60 grid grid-cols-1 sm:grid-cols-4 gap-4 text-left">
              
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">From</label>
                <div className="relative">
                  <input
                    type="text"
                    value={fromCity}
                    onChange={(e) => setFromCity(e.target.value)}
                    className="w-full text-xs font-bold p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="Departure city"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Holy Destination</label>
                <select
                  value={toAirport}
                  onChange={(e) => setToAirport(e.target.value)}
                  className="w-full text-xs font-bold p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {SACRED_AIRPORTS.map((a) => (
                    <option key={a.code} value={`${a.city} (${a.code})`}>
                      {a.city} ({a.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Travel Date</label>
                <input
                  type="date"
                  value={flightDate}
                  onChange={(e) => setFlightDate(e.target.value)}
                  className="w-full text-xs font-bold p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => setInquiryModalOpen(true)}
                  className="w-full py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Get Flight Quote</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Direct Temple Airport Hubs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-[#0f294a]">Direct Sacred Temple Airports</h2>
          <p className="text-xs text-slate-500">Fastest aerial connectivity with immediate temple corridor taxis</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SACRED_AIRPORTS.map((hub) => (
            <div
              key={hub.code}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-extrabold text-[#ea580c] bg-orange-50 px-2.5 py-1 rounded-xl">
                    {hub.code}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{hub.city}</span>
                </div>
                <h3 className="font-bold text-sm text-[#0f294a]">{hub.name}</h3>
                <p className="text-xs text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>{hub.temple}</span>
                </p>
              </div>

              <button
                onClick={() => {
                  setToAirport(`${hub.city} (${hub.code})`);
                  setInquiryModalOpen(true);
                }}
                className="w-full mt-4 py-2 bg-slate-50 hover:bg-orange-50 hover:text-[#ea580c] text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
              >
                Inquire Flight + Cab
              </button>
            </div>
          ))}
        </div>
      </section>

      <InquiryModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        title={`Pilgrim Flight Package: ${fromCity} to ${toAirport}`}
        type="PACKAGE"
        referenceId="flight-inquiry"
        defaultPlan="Flight + VIP Temple Transfer"
      />
    </div>
  );
};
