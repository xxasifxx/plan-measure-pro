import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import {
  Wrench, MessageCircle, Calendar, Search, MapPin, Globe, Phone,
  CheckCircle2, ArrowRight, Mail, Star, ShieldCheck, Bot, Zap,
  Truck, Hammer, Construction, Layers, Clock, TrendingUp, Languages,
  Send, Check, AlertCircle, X,
} from 'lucide-react';

/* ─── tokens (page-local; dark warm engineering) ─────────────── */
const BG = 'bg-[hsl(220_28%_7%)]';
const PANEL = 'bg-[hsl(220_24%_11%)]';
const PANEL2 = 'bg-[hsl(220_22%_14%)]';
const BORDER = 'border-[hsl(220_18%_20%)]';
const INK = 'text-[hsl(35_25%_94%)]';
const MUTED = 'text-[hsl(35_10%_65%)]';
const AMBER = 'hsl(38 92% 55%)';
const WA = 'hsl(142 70% 45%)';
const RED = 'hsl(0 72% 55%)';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0, 0, 0.2, 1] as const } },
};

/* ─── data ───────────────────────────────────────────────────── */
const CATEGORIES = [
  { id: 'earth', label: 'Earthmoving', icon: Construction, units: ['CAT 320 #E-04', 'CAT 320 #E-05', 'JCB 3CX #E-12', 'Komatsu PC200 #E-07'] },
  { id: 'comp',  label: 'Compaction',  icon: Layers,       units: ['BOMAG BW 213 #C-01', 'BOMAG BW 213 #C-02', 'Hamm H11i #C-04'] },
  { id: 'crane', label: 'Cranes',      icon: Hammer,       units: ['Tadano GR-300 #K-01', 'Liebherr LTM 1050 #K-02'] },
  { id: 'lift',  label: 'Loading & Lifting', icon: Truck,  units: ['Manitou MT-1840 #L-03', 'JCB 540-170 #L-05', 'Toyota 7FG25 #L-09'] },
  { id: 'power', label: 'Power',       icon: Zap,          units: ['CAT XQ230 230kVA #P-01', 'FG Wilson 500kVA #P-04'] },
];

type Status = 'avail' | 'res' | 'maint';
const seed = (cat: string, unit: number, day: number): Status => {
  const h = (cat.charCodeAt(0) * 31 + unit * 17 + day * 7) % 11;
  if (h < 6) return 'avail';
  if (h < 9) return 'res';
  return 'maint';
};

/* ─── reusable bits ──────────────────────────────────────────── */
function StatusCell({ s, onClick }: { s: Status; onClick?: () => void }) {
  const map = {
    avail: { bg: 'hsl(142 60% 35% / 0.85)', label: 'A' },
    res:   { bg: 'hsl(0 65% 48% / 0.9)',   label: 'R' },
    maint: { bg: 'hsl(38 90% 50% / 0.9)',  label: 'M' },
  }[s];
  return (
    <button
      onClick={onClick}
      style={{ background: map.bg }}
      className="h-7 w-7 md:h-8 md:w-8 rounded-sm font-mono text-[10px] font-bold text-black/80 hover:scale-110 transition-transform shrink-0"
      aria-label={s}
    >{map.label}</button>
  );
}

function SectionHeader({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mb-10 max-w-3xl">
      <div className="font-mono text-xs tracking-[0.2em] mb-3" style={{ color: AMBER }}>{kicker}</div>
      <h2 className={`text-3xl md:text-5xl font-bold ${INK} mb-4 leading-tight`}>{title}</h2>
      {sub && <p className={`${MUTED} text-base md:text-lg leading-relaxed`}>{sub}</p>}
    </div>
  );
}

/* ─── animated fleet grid (hero) ─────────────────────────────── */
function HeroFleetGrid() {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1400); return () => clearInterval(t); }, []);
  const rows = ['CAT 320 #E-04', 'BOMAG BW 213 #C-01', 'Tadano GR-300 #K-01', 'Manitou MT-1840 #L-03', 'XQ230 #P-01'];
  const days = Array.from({ length: 7 }, (_, i) => i);
  return (
    <div className={`${PANEL} ${BORDER} border rounded-lg p-4 md:p-5 shadow-2xl`}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[11px] tracking-wider" style={{ color: AMBER }}>FLEET · LIVE</div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: WA }} />
          <span className={`font-mono text-[10px] ${MUTED}`}>synced</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="grid grid-cols-[140px_repeat(7,1fr)] gap-1 mb-1">
          <div />
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} className={`text-center font-mono text-[10px] ${MUTED}`}>{d}</div>
          ))}
        </div>
        {rows.map((r, ri) => (
          <div key={r} className="grid grid-cols-[140px_repeat(7,1fr)] gap-1 items-center">
            <div className={`font-mono text-[10px] ${INK} truncate`}>{r}</div>
            {days.map(d => {
              const s = seed(r, ri, d + tick);
              return <StatusCell key={d} s={s} />;
            })}
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-4 pt-3 border-t border-white/5 font-mono text-[10px]">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: 'hsl(142 60% 40%)' }} /><span className={MUTED}>Available</span></span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: 'hsl(0 65% 50%)' }} /><span className={MUTED}>Reserved</span></span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: AMBER }} /><span className={MUTED}>Maintenance</span></span>
      </div>
    </div>
  );
}

/* ─── interactive availability calendar ──────────────────────── */
function AvailabilityCalendar() {
  const [cat, setCat] = useState(CATEGORIES[0].id);
  const [popUnit, setPopUnit] = useState<string | null>(null);
  const cur = CATEGORIES.find(c => c.id === cat)!;
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i); return d;
  });

  return (
    <div className={`${PANEL} ${BORDER} border rounded-lg p-4 md:p-6`}>
      <Tabs value={cat} onValueChange={setCat}>
        <TabsList className={`${PANEL2} mb-4 flex flex-wrap h-auto`}>
          {CATEGORIES.map(c => (
            <TabsTrigger key={c.id} value={c.id} className={`gap-2 data-[state=active]:bg-[${AMBER}] data-[state=active]:text-black`}>
              <c.icon className="h-3.5 w-3.5" /> {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {CATEGORIES.map(c => (
          <TabsContent key={c.id} value={c.id} className="mt-0">
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-[180px_repeat(14,1fr)] gap-1 mb-2">
                  <div />
                  {days.map((d, i) => (
                    <div key={i} className="text-center">
                      <div className={`font-mono text-[9px] ${MUTED}`}>{d.toLocaleDateString('en', { weekday: 'narrow' })}</div>
                      <div className={`font-mono text-[10px] ${INK}`}>{d.getDate()}</div>
                    </div>
                  ))}
                </div>
                {c.units.map((u, ui) => (
                  <div key={u} className="grid grid-cols-[180px_repeat(14,1fr)] gap-1 items-center mb-1.5">
                    <div className={`font-mono text-[11px] ${INK} truncate pr-2`}>{u}</div>
                    {days.map((_, di) => {
                      const s = seed(c.id, ui, di);
                      return <StatusCell key={di} s={s} onClick={() => s === 'avail' && setPopUnit(u)} />;
                    })}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {popUnit && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className={`mt-4 ${PANEL2} ${BORDER} border rounded-md p-4 flex items-start justify-between gap-3`}
        >
          <div>
            <div className="font-mono text-[10px] mb-1" style={{ color: AMBER }}>RESERVE</div>
            <div className={`${INK} font-medium text-sm mb-1`}>{popUnit}</div>
            <div className={`${MUTED} text-xs`}>2-hour soft hold · payment link sent via WhatsApp · cancel free for 24h</div>
          </div>
          <button onClick={() => setPopUnit(null)} className={`${MUTED} hover:${INK} p-1`}><X className="h-4 w-4" /></button>
        </motion.div>
      )}

      <p className={`${MUTED} text-xs mt-4 italic`}>
        What your customers see — synced with your WhatsApp agent in real time. Click any green cell to preview the reservation flow.
      </p>
    </div>
  );
}

/* ─── animated WhatsApp phone mock ───────────────────────────── */
type ChatMsg = { from: 'them' | 'agent' | 'me'; body: string; meta?: string };

function PhoneMock({ title, sub, script, accent = WA }: { title: string; sub: string; script: ChatMsg[]; accent?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    setShown(0);
    const t = setInterval(() => setShown(s => (s >= script.length ? s : s + 1)), 1100);
    return () => clearInterval(t);
  }, [inView, script.length]);

  return (
    <div ref={ref} className="mx-auto w-full max-w-[320px]">
      <div className={`${PANEL} ${BORDER} border-2 rounded-[2rem] p-2 shadow-2xl`}>
        {/* header */}
        <div className="rounded-t-[1.6rem] px-4 py-3 flex items-center gap-3" style={{ background: accent }}>
          <div className="h-9 w-9 rounded-full bg-black/20 flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-semibold truncate">{title}</div>
            <div className="text-white/70 text-[10px] truncate">{sub}</div>
          </div>
          <Phone className="h-4 w-4 text-white/80" />
        </div>
        {/* messages */}
        <div className="bg-[hsl(40_15%_92%)] min-h-[360px] p-3 space-y-2 rounded-b-[1.6rem]">
          {script.slice(0, shown).map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.from === 'agent' || m.from === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-[12px] leading-snug shadow-sm ${
                  m.from === 'agent' ? 'bg-[hsl(140_55%_88%)] text-[hsl(140_30%_18%)]' :
                  m.from === 'me'    ? 'bg-[hsl(40_70%_88%)] text-[hsl(30_30%_20%)]' :
                                       'bg-white text-[hsl(220_20%_15%)]'
                }`}
              >
                {m.meta && (
                  <div className="font-mono text-[9px] opacity-60 mb-0.5 flex items-center gap-1">
                    {m.from === 'agent' && <Bot className="h-2.5 w-2.5" />} {m.meta}
                  </div>
                )}
                <div className="whitespace-pre-line">{m.body}</div>
              </div>
            </motion.div>
          ))}
          {shown < script.length && (
            <div className="flex justify-start">
              <div className="bg-white/80 rounded-lg px-3 py-2 flex gap-1">
                {[0,1,2].map(i => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-[hsl(220_10%_50%)] animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── SERP mock ──────────────────────────────────────────────── */
function SerpMock() {
  return (
    <div className="bg-[hsl(40_10%_97%)] rounded-lg p-4 md:p-6 shadow-xl border border-black/5">
      <div className="font-mono text-[10px] text-[hsl(220_10%_45%)] mb-1">google.ae</div>
      <div className="text-[12px] text-[hsl(220_10%_30%)] mb-3 flex items-center gap-2">
        <Search className="h-3 w-3" /> excavator rental dubai
      </div>
      <div className="bg-white border border-black/5 rounded-md p-3 space-y-1">
        <div className="text-[10px] text-[hsl(220_10%_45%)]">fajaralmustaqbal.ae › earthmoving › cat-320</div>
        <div className="text-[15px] text-[hsl(220_70%_38%)] font-medium leading-tight">CAT 320 Excavator Rental Dubai · From AED 1,800/day</div>
        <div className="text-[12px] text-[hsl(220_10%_30%)] leading-snug">
          Live availability · Same-day delivery across UAE · Operator included.
          Book online or via WhatsApp. Trusted by 200+ contractors since 2008.
        </div>
        <div className="flex flex-wrap gap-3 pt-1 text-[10px] text-[hsl(220_10%_40%)]">
          <span className="flex items-center gap-1"><Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> 4.8 (142)</span>
          <span className="flex items-center gap-1"><Check className="h-2.5 w-2.5" style={{ color: WA }} /> Available today</span>
          <span>AED 1,800–2,400/day</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px]" style={{ color: AMBER }}>
        <TrendingUp className="h-3 w-3" /> Rich snippet · Product schema · Local pack
      </div>
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────── */
export default function FajarPitch() {
  useEffect(() => {
    document.title = 'Proposal · Fleet Booking Platform + WhatsApp Agent — Fajar Al Mustaqbal';
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute('content', 'Custom rental booking platform, WhatsApp automation agent, and UAE-tuned SEO for Fajar Al Mustaqbal Equipment Rental.');
  }, []);

  const maintenanceScript: ChatMsg[] = [
    { from: 'them', body: 'CAT 320 #E-04 hydraulic leak at Jebel Ali site. Down for repair.', meta: 'Operator · Ahmed' },
    { from: 'agent', body: 'Acknowledged. CAT 320 #E-04 marked MAINTENANCE 14–21 Jun.\n\nWill auto-restore on your "back online" reply, or after 7 days.\n\nAffected booking #B-2841 (16 Jun) — offering customer Komatsu PC200 #E-07 as swap.', meta: 'Fajar Bot' },
    { from: 'them', body: 'Good. Proceed with swap.', meta: 'Operator · Ahmed' },
    { from: 'agent', body: '✓ Swap confirmed. Customer notified. Calendar updated.', meta: 'Fajar Bot' },
  ];

  const bookingScript: ChatMsg[] = [
    { from: 'them', body: 'Need a 10t roller next Monday for 3 days. Site at Jebel Ali.', meta: 'Customer · +971 50…' },
    { from: 'agent', body: 'BOMAG BW 213 #C-02 available 16–18 Jun.\nAED 4,500 total · operator + transport included.\n\nReply YES to hold for 2 hours.', meta: 'Fajar Bot' },
    { from: 'them', body: 'YES', meta: 'Customer · +971 50…' },
    { from: 'agent', body: '✓ Reservation #B-2847 held. Payment link: fajar.ae/pay/2847\nCalendar updated. Sales team notified.', meta: 'Fajar Bot' },
  ];

  const problems = [
    { icon: Calendar, title: "Customers can't see what's free", body: 'Your site shows categories but never says what is available this week. 76% of UAE B2B buyers research online before contacting a vendor — if your competitor shows availability and you don\'t, you lose the call before it happens.' },
    { icon: Wrench, title: 'Group-chat updates get buried', body: 'A machine breaks down on site, the operator messages the group, the message scrolls away. Sales books that broken unit anyway. The customer cancels. The slot stays vacant.' },
    { icon: Search, title: "You don't rank for 'excavator rental Dubai'", body: 'Static WordPress, no per-machine pages, no schema. Thinner fleets with better SEO take the bookings that should be yours — every search you lose is a vacant machine-day.' },
  ];

  const phases = [
    { tag: 'PHASE 1', weeks: 'Weeks 1–4', title: 'Get found.', items: ['Fast new site + fleet DB', 'Live availability calendar', 'Per-machine landing pages', 'Schema.org + Google Business Profile'] },
    { tag: 'PHASE 2', weeks: 'Weeks 5–8', title: 'Stop double-bookings.', items: ['WhatsApp Business API setup', 'Group-chat agent reads maintenance', 'Auto-lock with 7-day safety expiry', 'Admin dashboard you check on your phone'] },
    { tag: 'PHASE 3', weeks: 'Weeks 9–12', title: 'Book in your sleep.', items: ['Customer-DM booking agent', 'Soft holds + payment link', 'Full Arabic site (hreflang)', 'Monthly SEO content for sustained ranking'] },
  ];

  const faqs = [
    { q: "We're a small business — isn't this overkill?", a: "No. The Starter tier (AED 14,500 + AED 1,200/mo) is sized for an SMB rental shop on margin. At an average AED 1,800/day rental, the Growth plan pays for itself with roughly 1.5 extra rental-days per month. Anything above that is pure margin you're capturing today by phone tag." },
    { q: 'How long does WhatsApp Business API approval take?', a: 'Typically 5–10 business days through Meta\'s Business Solution Provider. We handle the application, template approvals, and number migration end-to-end.' },
    { q: 'What if the agent misreads a message?', a: 'Every action is reversible from the admin dashboard. Maintenance locks expire automatically after 7 days unless confirmed. Bookings stay as 2-hour soft holds until payment, never auto-charged. Low-confidence parses are routed to a human queue instead of acted on.' },
    { q: 'Where does the data live?', a: 'UAE-region hosting (AWS me-central-1 or equivalent). Database backups daily. You own all data and can export anytime in standard CSV / SQL formats.' },
    { q: 'Who owns the code?', a: 'You do. Source code is delivered to a Git repository under your account from day one. No vendor lock-in on the platform itself — only the WhatsApp number stays with Meta.' },
    { q: 'How does the human handoff work?', a: 'Any message containing pricing negotiation, complaints, or unrecognised intent is silently forwarded to your sales WhatsApp with full context. The agent never argues with a customer.' },
  ];

  return (
    <div className={`${BG} ${INK} min-h-screen font-sans`}>
      {/* sticky ribbon */}
      <div className={`sticky top-0 z-50 ${PANEL} ${BORDER} border-b backdrop-blur`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 rounded flex items-center justify-center font-mono text-[10px] font-bold text-black shrink-0" style={{ background: AMBER }}>FA</div>
            <span className={`font-mono text-[10px] md:text-xs ${MUTED} truncate`}>
              Prepared for Fajar Al Mustaqbal Equipment Rental · UAE
            </span>
          </div>
          <a href="mailto:hello@example.com?subject=Fajar%20rental%20platform%20discovery%20call" className="shrink-0">
            <Button size="sm" style={{ background: AMBER, color: 'black' }} className="hover:opacity-90 font-medium text-xs">
              Book intro call <ArrowRight className="h-3 w-3" />
            </Button>
          </a>
        </div>
      </div>

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pt-12 md:pt-20 pb-16 md:pb-24">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <div className="font-mono text-xs tracking-[0.2em] mb-4 flex items-center gap-2" style={{ color: AMBER }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: AMBER }} />
              EQUIPMENT RENTAL · UAE
            </div>
            <h1 className={`text-4xl md:text-6xl font-bold ${INK} leading-[1.05] mb-4`}>
              Stop losing rentals to <span style={{ color: AMBER }}>phone tag</span>.
            </h1>
            <div dir="rtl" lang="ar" className={`text-base md:text-lg ${MUTED} mb-6 font-medium`}>
              حلول حجز المعدات الذكية لشركة فجر المستقبل
            </div>
            <p className={`${MUTED} text-base md:text-lg leading-relaxed mb-8 max-w-xl`}>
              A new website for Fajar Al Mustaqbal that shows <span className={INK}>real-time fleet availability</span>,
              a <span style={{ color: WA }}>WhatsApp agent</span> that auto-flips machines to maintenance and books
              customers from a single message, and <span className={INK}>UAE-tuned SEO</span> built for
              "excavator rental Dubai" — not generic plant-hire fluff.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#demo">
                <Button size="lg" style={{ background: AMBER, color: 'black' }} className="hover:opacity-90 font-semibold">
                  See the live demo <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <a href="https://wa.me/971000000000" target="_blank" rel="noreferrer">
                <Button size="lg" variant="outline" className={`${BORDER} ${INK} hover:bg-white/5`} style={{ borderColor: WA, color: WA }}>
                  <MessageCircle className="h-4 w-4" /> WhatsApp us
                </Button>
              </a>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[
                { v: '24/7', l: 'Bookings open' },
                { v: '< 30s', l: 'Maintenance lock' },
                { v: 'AR + EN', l: 'Bilingual SEO' },
              ].map(s => (
                <div key={s.l}>
                  <div className={`text-xl md:text-2xl font-bold`} style={{ color: AMBER }}>{s.v}</div>
                  <div className={`font-mono text-[10px] ${MUTED} uppercase tracking-wider`}>{s.l}</div>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.15 }}>
            <HeroFleetGrid />
          </motion.div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className={`${PANEL} border-y ${BORDER}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
          <SectionHeader
            kicker="01 · WHAT WE OBSERVED"
            title="Three gaps costing you bookings every week."
            sub="A 20-minute audit of fajaralmustaqbal.ae and a sample search journey for UAE renters."
          />
          <div className="grid md:grid-cols-3 gap-4">
            {problems.map(p => (
              <Card key={p.title} className={`${PANEL2} ${BORDER} p-6`}>
                <p.icon className="h-6 w-6 mb-4" style={{ color: AMBER }} />
                <div className={`${INK} font-semibold mb-2`}>{p.title}</div>
                <div className={`${MUTED} text-sm leading-relaxed`}>{p.body}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO — calendar */}
      <section id="demo" className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
        <SectionHeader
          kicker="02 · LIVE FLEET AVAILABILITY"
          title="Customers see what's free — before they call."
          sub="Per-unit calendar across all five categories, updated in real time by the booking engine and your WhatsApp agent. Click any green cell to preview the reservation sheet."
        />
        <AvailabilityCalendar />
      </section>

      {/* WHATSAPP AGENT */}
      <section className={`${PANEL} border-y ${BORDER}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
          <SectionHeader
            kicker="03 · WHATSAPP AGENT"
            title="Your operations group chat becomes the control panel."
            sub="The agent reads your existing operations group and your sales DMs, parses intent, and updates the fleet database. No new app for your team to learn — just WhatsApp, the way they already use it."
          />

          <div className="grid md:grid-cols-2 gap-10 md:gap-6 mb-12">
            <div>
              <div className="text-center mb-4">
                <Badge variant="outline" className={`${BORDER}`} style={{ color: AMBER, borderColor: AMBER }}>
                  <Wrench className="h-3 w-3 mr-1" /> Maintenance flow
                </Badge>
                <div className={`${MUTED} text-xs mt-2`}>Operator group chat → auto fleet lock</div>
              </div>
              <PhoneMock title="Fajar · Operations" sub="6 members · agent active" script={maintenanceScript} accent={AMBER} />
            </div>
            <div>
              <div className="text-center mb-4">
                <Badge variant="outline" className={`${BORDER}`} style={{ color: WA, borderColor: WA }}>
                  <MessageCircle className="h-3 w-3 mr-1" /> Booking flow
                </Badge>
                <div className={`${MUTED} text-xs mt-2`}>Customer DM → soft-hold reservation</div>
              </div>
              <PhoneMock title="Fajar Sales" sub="online · agent active" script={bookingScript} />
            </div>
          </div>

          {/* how it works */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { i: MessageCircle, t: 'Listen', d: 'Group chat + sales DMs' },
              { i: Bot,           t: 'Parse',   d: 'Machine, dates, intent' },
              { i: Calendar,      t: 'Update',  d: 'Fleet DB in real time' },
              { i: Send,          t: 'Confirm', d: 'Reply + audit log' },
            ].map((s, i) => (
              <div key={s.t} className={`${PANEL2} ${BORDER} border rounded-md p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[10px]" style={{ color: AMBER }}>{String(i+1).padStart(2,'0')}</span>
                  <s.i className={`h-4 w-4 ${INK}`} />
                </div>
                <div className={`${INK} text-sm font-semibold`}>{s.t}</div>
                <div className={`${MUTED} text-xs`}>{s.d}</div>
              </div>
            ))}
          </div>

          <Card className={`${PANEL2} ${BORDER} p-5 flex items-start gap-3`}>
            <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0" style={{ color: WA }} />
            <div>
              <div className={`${INK} font-semibold text-sm mb-1`}>Safe by default</div>
              <div className={`${MUTED} text-sm leading-relaxed`}>
                Maintenance locks auto-expire after <span className={INK}>7 days max</span> unless your team confirms — no machine ever stays
                invisible because someone forgot to message. Customer holds are <span className={INK}>2-hour soft reservations</span>, never
                auto-charged. Every action is reversible from the admin dashboard with full audit log.
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* SEO */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
        <SectionHeader
          kicker="04 · SEO ENGINE"
          title="Rank for what UAE contractors actually type."
          sub="Per-machine landing pages, bilingual hreflang, and structured data so Google shows your availability and price right in the results."
        />
        <div className="grid lg:grid-cols-[1fr_1fr] gap-8 items-start">
          <div className="space-y-3">
            {[
              { en: 'excavator rental dubai', ar: 'تأجير حفارات دبي', vol: '2.4K/mo' },
              { en: 'crane hire abu dhabi', ar: 'تأجير رافعات أبوظبي', vol: '880/mo' },
              { en: 'compaction roller sharjah', ar: 'هراس تربة الشارقة', vol: '320/mo' },
              { en: 'plant hire UAE', ar: 'تأجير معدات ثقيلة الإمارات', vol: '1.6K/mo' },
              { en: 'generator rental jebel ali', ar: 'تأجير مولدات جبل علي', vol: '480/mo' },
            ].map(k => (
              <div key={k.en} className={`${PANEL2} ${BORDER} border rounded-md p-3 flex items-center justify-between gap-3`}>
                <div className="min-w-0">
                  <div className={`${INK} font-mono text-sm truncate`}>{k.en}</div>
                  <div dir="rtl" lang="ar" className={`${MUTED} text-xs truncate`}>{k.ar}</div>
                </div>
                <Badge variant="outline" className={`${BORDER} ${MUTED} font-mono text-[10px] shrink-0`}>{k.vol}</Badge>
              </div>
            ))}
            <div className={`${MUTED} text-xs italic mt-3 flex items-center gap-2`}>
              <Languages className="h-3.5 w-3.5" /> Each cluster gets a dedicated EN + AR landing page tied to live fleet data.
            </div>
          </div>
          <div className="space-y-4">
            <SerpMock />
            <div className="grid grid-cols-2 gap-3">
              {[
                { i: Globe,        t: 'hreflang AR/EN' },
                { i: TrendingUp,   t: 'Product schema' },
                { i: MapPin,       t: 'GBP integration' },
                { i: Zap,          t: 'Core Web Vitals' },
              ].map(x => (
                <div key={x.t} className={`${PANEL2} ${BORDER} border rounded-md p-3 flex items-center gap-2`}>
                  <x.i className="h-4 w-4 shrink-0" style={{ color: AMBER }} />
                  <span className={`${INK} text-xs font-mono`}>{x.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DELIVER */}
      <section className={`${PANEL} border-y ${BORDER}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
          <SectionHeader kicker="05 · WHAT WE DELIVER" title="Three layers, one platform." />
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { i: Globe, t: 'Platform', items: ['React + Next.js public site', 'Headless fleet & booking DB', 'Admin dashboard with audit log', 'UAE-region hosting'] },
              { i: MessageCircle, t: 'WhatsApp layer', items: ['WhatsApp Business Cloud API', 'Group-chat maintenance agent', 'Customer-DM booking agent', 'Human handoff queue'] },
              { i: Search, t: 'SEO + content', items: ['EN + AR keyword research', 'Per-machine landing pages', 'Schema, hreflang, GBP', '3 monthly content pieces'] },
            ].map(c => (
              <Card key={c.t} className={`${PANEL2} ${BORDER} p-6`}>
                <c.i className="h-6 w-6 mb-4" style={{ color: AMBER }} />
                <div className={`${INK} font-semibold mb-3`}>{c.t}</div>
                <ul className="space-y-2">
                  {c.items.map(x => (
                    <li key={x} className={`flex items-start gap-2 ${MUTED} text-sm`}>
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: WA }} /> {x}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
        <SectionHeader kicker="06 · ROADMAP" title="Twelve weeks to launch." sub="Phased so you see real value at week 4, not just at handover." />
        <div className="grid md:grid-cols-3 gap-4">
          {phases.map(p => (
            <Card key={p.tag} className={`${PANEL2} ${BORDER} p-6 relative overflow-hidden`}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: AMBER }} />
              <div className="font-mono text-[10px] tracking-wider mb-1" style={{ color: AMBER }}>{p.tag} · {p.weeks}</div>
              <div className={`${INK} text-lg font-bold mb-4`}>{p.title}</div>
              <ul className="space-y-2">
                {p.items.map(x => (
                  <li key={x} className={`flex items-start gap-2 ${MUTED} text-sm`}>
                    <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: AMBER }} /> {x}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* INVESTMENT */}
      <section className={`${PANEL} border-y ${BORDER}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
          <SectionHeader kicker="07 · INVESTMENT" title="Indicative ranges." sub="Final scope and AED figures locked after a 30-minute discovery call. No surprises." />
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
            <Card className={`${PANEL2} ${BORDER} p-6`}>
              <div className="font-mono text-[10px] tracking-wider mb-2" style={{ color: AMBER }}>ONE-TIME BUILD</div>
              <div className={`${INK} text-3xl md:text-4xl font-bold mb-2`}>AED 95K – 145K</div>
              <div className={`${MUTED} text-sm`}>12-week build · platform + WhatsApp agent + bilingual SEO foundation · source code delivered to your Git</div>
            </Card>
            <Card className={`${PANEL2} ${BORDER} p-6`}>
              <div className="font-mono text-[10px] tracking-wider mb-2" style={{ color: AMBER }}>MONTHLY RETAINER</div>
              <div className={`${INK} text-3xl md:text-4xl font-bold mb-2`}>AED 6K – 9K</div>
              <div className={`${MUTED} text-sm`}>Hosting, WhatsApp API costs, agent monitoring, 3 SEO content pieces, priority support</div>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 py-16 md:py-24">
        <SectionHeader kicker="08 · FAQ" title="The questions everyone asks." />
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`f-${i}`} className={BORDER}>
              <AccordionTrigger className={`${INK} text-left hover:no-underline`}>{f.q}</AccordionTrigger>
              <AccordionContent className={`${MUTED} leading-relaxed`}>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className={`${PANEL} border-t ${BORDER}`}>
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-16 md:py-24 text-center">
          <h3 className={`text-3xl md:text-5xl font-bold ${INK} mb-4 leading-tight`}>
            Ready to see your fleet <span style={{ color: AMBER }}>online</span>?
          </h3>
          <p className={`${MUTED} text-base md:text-lg mb-8 max-w-xl mx-auto`}>
            30-minute discovery call. No slides — we open the demo, walk through your current site, and sketch the rollout against your fleet.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="mailto:hello@example.com?subject=Fajar%20rental%20platform%20discovery%20call">
              <Button size="lg" style={{ background: AMBER, color: 'black' }} className="hover:opacity-90 font-semibold">
                <Mail className="h-4 w-4" /> Book discovery call
              </Button>
            </a>
            <a href="https://wa.me/971000000000" target="_blank" rel="noreferrer">
              <Button size="lg" variant="outline" style={{ borderColor: WA, color: WA }} className="hover:bg-white/5">
                <MessageCircle className="h-4 w-4" /> WhatsApp us
              </Button>
            </a>
          </div>
          <div className={`${MUTED} text-xs mt-10 font-mono`}>
            Prepared for Fajar Al Mustaqbal General Trading & Cont. LLC · UAE
          </div>
        </div>
      </section>
    </div>
  );
}
