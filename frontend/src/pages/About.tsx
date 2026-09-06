// frontend/src/pages/About.tsx
import { 
  ShieldCheck, Zap, MapPin, Heart, Users, Sparkles, Globe, Award, 
  Target, Rocket, Lightbulb, Plane, Train, Building2, ArrowRight, 
  Linkedin, Twitter, Instagram, Mail, Clock, ChevronRight, 
  Calendar, Music, Star, TrendingUp, CheckCircle, Quote, 
  Coffee, Compass, Briefcase, GraduationCap, Cpu,
  Wallet, RefreshCw, CreditCard, Headset, Gift, BadgeCheck
} from "lucide-react";
import { Link } from "react-router-dom";

// ─── Import local images ───────────────────────────────────────────
import samuelImg from "../assets/samuel.jpg";
import rachaelImg from "../assets/rachael.jpg";
import susanImg from "../assets/susan.jpg";
import ohasonuImg from "../assets/ohanosu.jpg";

// ============================================
// Core Values
// ============================================
const coreValues = [
  {
    icon: ShieldCheck,
    title: "Trust & Transparency",
    body: "Every event and organizer is verified. No hidden fees, no fake tickets. What you see is what you get.",
  },
  {
    icon: Zap,
    title: "Speed & Simplicity",
    body: "Book in seconds with inline payments. No redirects, no friction — just a seamless experience.",
  },
  {
    icon: MapPin,
    title: "Accessibility",
    body: "We make every experience easy to reach, with built-in transport integrations and location-aware discovery.",
  },
  {
    icon: Heart,
    title: "Community First",
    body: "We're built for the people who make the nightlife — the organizers, the attendees, the dreamers.",
  },
];

// ============================================
// Why Sahm
// ============================================
const whySahm = [
  {
    icon: ShieldCheck,
    title: "Verified Organizers",
    body: "Every organizer is vetted before they can sell tickets. No scams, no ghost events.",
  },
  {
    icon: Sparkles,
    title: "Instant Checkout",
    body: "Pay with Paystack or Flutterwave inline — no redirects, no hassles.",
  },
  {
    icon: Wallet,
    title: "Built‑in Wallet",
    body: "Your wallet holds funds for instant purchases, refunds, and quick checkouts. No need to re‑enter payment details.",
  },
  {
    icon: RefreshCw,
    title: "Hassle‑free Refunds",
    body: "If an event is cancelled, your money is automatically refunded to your wallet — no forms, no waiting.",
  },
  {
    icon: CreditCard,
    title: "Installment Payments",
    body: "Buy tickets now, pay later. Spread the cost with flexible installment plans for select events.",
  },
  {
    icon: Headset,
    title: "24/7 Support",
    body: "Our team is always here to help. Reach out any time, we'll get back to you in minutes.",
  },
];

// ============================================
// TEAM – with imported images
// ============================================
const teamMembers = [
  {
    name: "Samuel Obute",
    role: "Founder, CTO & Lead Full‑Stack Developer",
    bio: "Samuel built Sahm TicketHub from scratch – backend, frontend, and everything in between. He’s a full‑stack engineer who turned a frustrating ticket experience into a mission to fix Nigeria's ticketing chaos.",
    image: samuelImg,
    social: { twitter: "#", linkedin: "#", instagram: "#", email: "samuel@sahmtickethub.com" },
    funFact: "Built the entire platform alone – no external funding, no team.",
  },
  {
    name: "Rachael Benjamin",
    role: "Financial Secretary",
    bio: "Rachael manages the numbers – keeping the platform financially healthy, tracking revenue, and making sure we're always moving in the right direction.",
    image: rachaelImg,
    social: { twitter: "#", linkedin: "#", instagram: "#", email: "rachael@sahmtickethub.online" },
    funFact: "Loves spreadsheets and making sure every naira is accounted for. Peace of mind is my new luxury",
  },
  {
    name: "Susan Agbonika",
    role: "Project Manager",
    bio: "Susan keeps everything running – from planning to execution. She makes sure the team stays on track and nothing falls through the cracks.",
    image: susanImg,
    social: { twitter: "#", linkedin: "#", instagram: "#", email: "susan@sahmtickethub.online" },
    funFact: "Plans everything – even her weekends. A Project Manager that loves her job.",
  },
  {
    name: "Ohasonu Chikezie Pascal",
    role: "Graphic Designer",
    bio: "Ohasonu brings Sahm TicketHub events to life visually – designing stunning posters, flyers, social media graphics, and marketing materials that make every event look as good as it sounds.",
    image: ohasonuImg,
    social: { twitter: "#", linkedin: "#", instagram: "#", email: "ohasonu@sahmtickethub.online" },
    funFact: "Designs event posters so good, people want to attend just for the artwork.",
  },
  {
    name: "Ebere Nwachukwu",
    role: "Customer Support",
    bio: "Ebere is the friendly voice and helping hand behind Sahm TicketHub – handling inquiries, resolving issues, and making sure every user feels heard and supported.",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=400&fit=crop&crop=face",
    social: { twitter: "#", linkedin: "#", instagram: "#", email: "ebere@sahmtickethub.online" },
    funFact: "Can turn a frustrated user into a happy one with just one message.",
  },
];

// ============================================
// Founder detailed bio
// ============================================
const founderDetailedBio = `
  Samuel is the sole engineer behind Sahm TicketHub — from the first line of code to the final deployment. 
  He built the entire platform from scratch, handling both the backend (Node.js, Paystack/Flutterwave integrations) 
  and the frontend (React, Tailwind CSS, TypeScript). With no external funding and no team, 
  he designed the database, architected the payment system, and crafted the user experience, 
  all while ensuring security and scalability.
  Born and raised in Kaduna, he attended many events and saw firsthand how difficult it was 
  to buy legitimate tickets and trust the process. That frustration, combined with his full‑stack expertise, 
  led him to build Sahm TicketHub — a platform designed to make every experience discoverable, bookable, and seamless.
`;

// ============================================
// Future Vision
// ============================================
const futureVision = [
  {
    icon: Plane,
    title: "Flight Bookings",
    description: "Book domestic and international flights with the same seamless checkout you love.",
    eta: "Q3 2026",
  },
  {
    icon: Train,
    title: "Train Tickets",
    description: "Secure train tickets for long‑distance travel across Nigeria and beyond.",
    eta: "Q1 2027",
  },
  {
    icon: Building2,
    title: "Hotel & Accommodation",
    description: "Find and book hotels, lodges, and short‑let apartments for your trips.",
    eta: "Q2 2027",
  },
  {
    icon: Globe,
    title: "Global Events",
    description: "Discover and book events anywhere in the world — from Kaduna to London.",
    eta: "Q4 2027",
  },
];

// ============================================
// Timeline
// ============================================
const milestones = [
  { date: "Nov 2025", title: "Idea Conceived", description: "The vision for Sahm was born after a failed concert ticket experience in Kaduna." },
  { date: "Jan 2026", title: "MVP Launched", description: "First version went live, focusing on secure ticketing for local events." },
  { date: "Mar 2026", title: "First Tickets Sold", description: "We processed our first batch of ticket sales — a major milestone." },
  { date: "May 2026", title: "Flutterwave Integration", description: "Expanded payment options to serve users across Africa." },
  { date: "Aug 2026", title: "New Vision", description: "Announced the evolution into a full ticketing ecosystem — flights, trains, hotels, and more." },
];

// ============================================
// Stats
// ============================================
const stats = [
  { value: "50+", label: "Events listed" },
  { value: "10K+", label: "Happy attendees" },
  { value: "100%", label: "Verified organizers" },
  { value: "4.9★", label: "Average rating" },
  { value: "6", label: "Countries (coming soon)" },
  { value: "24/7", label: "Customer support" },
];

export default function About() {
  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 pb-24">
      
      {/* ============================================
          HERO SECTION
      ============================================ */}
      <div className="text-center max-w-3xl mx-auto mb-20">
        <span className="inline-block bg-gold/10 text-gold text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mb-4">
          About Sahm TicketHub
        </span>
        <h1 className="font-display text-5xl sm:text-6xl tracking-wide mb-6">
          One platform for <br />every experience.
        </h1>
        <p className="text-smoke text-lg leading-relaxed">
          We started with concerts and parties in Kaduna. We're building the future of ticketing — flights, trains, hotels, and events — all in one place.
          <br /><br />
          <span className="text-bone font-semibold">Nigeria's first complete ticketing ecosystem.</span>
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-6 py-3 rounded-full transition-all hover:scale-105"
          >
            Explore Events
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/get-started"
            className="inline-flex items-center gap-2 bg-panel border border-line hover:border-gold/40 text-bone font-semibold px-6 py-3 rounded-full transition-all"
          >
            List Your Event
          </Link>
        </div>
      </div>

      {/* ============================================
          OUR STORY
      ============================================ */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl tracking-wide mb-2">Our Story</h2>
          <p className="text-smoke max-w-xl mx-auto">From a simple idea to a movement.</p>
        </div>
        <div className="max-w-3xl mx-auto bg-panel border border-line rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="shrink-0 mt-1">
              <Quote className="w-8 h-8 text-gold/40" />
            </div>
            <p className="text-sm text-smoke leading-relaxed">
              <span className="font-semibold text-bone">Sahm TicketHub</span> was born in late 2025 in <span className="text-bone font-semibold">Kaduna</span> – 
              after our founder bought a fake ticket to a sold‑out concert and realized the system was broken. 
              That moment sparked a question: <span className="text-bone italic">"Why is buying a ticket still this hard?"</span>
              <br /><br />
              By <span className="text-bone font-semibold">January 2026</span>, the MVP was live, and within two months we sold our first tickets. 
              In <span className="text-bone font-semibold">May 2026</span>, we integrated Flutterwave to accept payments across Africa, 
              and by <span className="text-bone font-semibold">August 2026</span> we announced our new vision: 
              a complete ecosystem for events, flights, trains, and hotels – all in one place.
              <br /><br />
              We're still early, but the momentum is real. Every day, more organizers trust us, and more attendees 
              find their next experience through Sahm.
            </p>
          </div>
        </div>
      </div>

      {/* ============================================
          MISSION, VISION, VALUES
      ============================================ */}
      <div className="grid md:grid-cols-3 gap-6 mb-20">
        <div className="bg-panel border border-line rounded-2xl p-6 text-center hover:border-gold/40 transition-all">
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
            <Target className="w-6 h-6 text-gold" />
          </div>
          <h3 className="font-bold text-lg mb-2 text-bone">Mission</h3>
          <p className="text-sm text-smoke leading-relaxed">
            To make every experience — from a concert in Kaduna to a flight to London — discoverable, bookable, and seamless.
          </p>
        </div>

        <div className="bg-panel border border-line rounded-2xl p-6 text-center hover:border-gold/40 transition-all">
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
            <Rocket className="w-6 h-6 text-gold" />
          </div>
          <h3 className="font-bold text-lg mb-2 text-bone">Vision</h3>
          <p className="text-sm text-smoke leading-relaxed">
            Become Africa's leading ticketing super‑app — connecting people to events, travel, and experiences across the continent and beyond.
          </p>
        </div>

        <div className="bg-panel border border-line rounded-2xl p-6 text-center hover:border-gold/40 transition-all">
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-6 h-6 text-gold" />
          </div>
          <h3 className="font-bold text-lg mb-2 text-bone">Core Values</h3>
          <p className="text-sm text-smoke leading-relaxed">
            Trust, speed, accessibility, and community — the principles that guide every decision we make.
          </p>
        </div>
      </div>

      {/* ============================================
          DETAILED CORE VALUES
      ============================================ */}
      <div className="mb-20">
        <h2 className="font-display text-3xl sm:text-4xl tracking-wide mb-2 text-center">Our Core Values</h2>
        <p className="text-smoke text-center max-w-xl mx-auto mb-12">The foundation of everything we build.</p>
        <div className="grid sm:grid-cols-2 gap-6">
          {coreValues.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-panel border border-line rounded-2xl p-6 hover:border-gold/40 transition-all hover:-translate-y-1">
              <Icon className="w-6 h-6 text-gold mb-4" />
              <h3 className="font-bold text-lg mb-2 text-bone">{title}</h3>
              <p className="text-sm text-smoke leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================
          WHY SAHM
      ============================================ */}
      <div className="mb-20">
        <h2 className="font-display text-3xl sm:text-4xl tracking-wide mb-2 text-center">What Makes Us Different</h2>
        <p className="text-smoke text-center max-w-xl mx-auto mb-12">Six reasons why Sahm TicketHub is the smartest way to book.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {whySahm.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-panel border border-line rounded-2xl p-6 hover:border-gold/40 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-gold" />
              </div>
              <h3 className="font-bold text-sm mb-1 text-bone">{title}</h3>
              <p className="text-sm text-smoke leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================
          FOUNDER SECTION
      ============================================ */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl tracking-wide mb-2">Meet the Founder</h2>
          <p className="text-smoke max-w-xl mx-auto">One person, one vision — building the future of ticketing.</p>
        </div>
        <div className="max-w-3xl mx-auto bg-panel border border-line rounded-2xl overflow-hidden hover:border-gold/40 transition-all">
          <div className="grid sm:grid-cols-3 gap-0">
            <div className="sm:col-span-1 bg-ink/30 flex items-center justify-center p-6">
              <div className="w-48 h-48 rounded-full overflow-hidden border-2 border-gold/20">
                <img
                  src={samuelImg}
                  alt="Samuel Obute"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="sm:col-span-2 p-6 flex flex-col justify-center">
              <h3 className="font-bold text-2xl text-bone">Samuel Obute</h3>
              <p className="text-gold font-semibold text-sm uppercase tracking-wider">Founder, CTO & Lead Full‑Stack Developer</p>
              <p className="text-sm text-smoke mt-3 leading-relaxed">
                {founderDetailedBio}
              </p>
              <div className="flex items-center gap-4 mt-4">
                <a href="#" className="text-smoke hover:text-gold transition-colors"><Twitter className="w-4 h-4" /></a>
                <a href="#" className="text-smoke hover:text-gold transition-colors"><Linkedin className="w-4 h-4" /></a>
                <a href="#" className="text-smoke hover:text-gold transition-colors"><Instagram className="w-4 h-4" /></a>
                <a href="mailto:samuel@sahmtickethub.online" className="text-smoke hover:text-gold transition-colors"><Mail className="w-4 h-4" /></a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================
          TEAM SECTION – with local images
      ============================================ */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl tracking-wide mb-2">The Team</h2>
          <p className="text-smoke max-w-xl mx-auto">The people behind Sahm TicketHub, working to make every experience unforgettable.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member) => (
            <div key={member.name} className="bg-panel border border-line rounded-2xl overflow-hidden hover:border-gold/40 transition-all hover:-translate-y-1">
              <img
                src={member.image}
                alt={member.name}
                className="w-full h-56 object-cover"
              />
              <div className="p-5">
                <h3 className="font-bold text-bone text-lg">{member.name}</h3>
                <p className="text-xs text-gold font-semibold uppercase tracking-wider">{member.role}</p>
                <p className="text-sm text-smoke mt-2 leading-relaxed">{member.bio}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] text-smoke/60 bg-ink/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Coffee className="w-3 h-3 text-gold" />
                    {member.funFact}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  {member.social.twitter && (
                    <a href={member.social.twitter} target="_blank" rel="noopener noreferrer" className="text-smoke hover:text-gold transition-colors">
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {member.social.linkedin && (
                    <a href={member.social.linkedin} target="_blank" rel="noopener noreferrer" className="text-smoke hover:text-gold transition-colors">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                  {member.social.instagram && (
                    <a href={member.social.instagram} target="_blank" rel="noopener noreferrer" className="text-smoke hover:text-gold transition-colors">
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  <a href={`mailto:${member.social.email}`} className="text-smoke hover:text-gold transition-colors ml-auto">
                    <Mail className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <p className="text-sm text-smoke/60">
            We're hiring! Check our <Link to="/careers" className="text-gold hover:text-gold-bright">careers page</Link> for open roles.
          </p>
        </div>
      </div>

      {/* ============================================
          OUR JOURNEY – TIMELINE
      ============================================ */}
      <div className="mb-20">
        <h2 className="font-display text-3xl sm:text-4xl tracking-wide mb-2 text-center">Our Journey</h2>
        <p className="text-smoke text-center max-w-xl mx-auto mb-12">From idea to impact – our timeline.</p>
        <div className="relative">
          <div className="absolute left-1/2 transform -translate-x-1/2 w-px h-full bg-line hidden md:block" />
          <div className="space-y-8 md:space-y-0">
            {milestones.map((milestone, index) => (
              <div key={index} className={`flex flex-col md:flex-row items-start md:items-center gap-4 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                  <div className="bg-panel border border-line rounded-2xl p-5 hover:border-gold/40 transition-all">
                    <p className="text-xs text-gold font-semibold">{milestone.date}</p>
                    <h4 className="font-bold text-bone">{milestone.title}</h4>
                    <p className="text-sm text-smoke">{milestone.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gold/10 border border-gold/30 z-10 shrink-0">
                  <Calendar className="w-4 h-4 text-gold" />
                </div>
                <div className="flex-1 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================
          FUTURE VISION
      ============================================ */}
      <div className="mb-20">
        <h2 className="font-display text-3xl sm:text-4xl tracking-wide mb-2 text-center">Where we're going</h2>
        <p className="text-smoke text-center max-w-xl mx-auto mb-12">From events to everything.</p>
        <div className="grid sm:grid-cols-2 gap-6">
          {futureVision.map(({ icon: Icon, title, description, eta }) => (
            <div key={title} className="bg-panel border border-line rounded-2xl p-6 hover:border-gold/40 transition-all hover:-translate-y-1">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6 text-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1 text-bone">{title}</h3>
                  <p className="text-sm text-smoke leading-relaxed">{description}</p>
                  <p className="text-xs text-gold mt-2 font-semibold">ETA: {eta}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <p className="text-sm text-smoke/60 italic">And we're just getting started.</p>
        </div>
      </div>

      {/* ============================================
          STATS
      ============================================ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-20">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-panel border border-line rounded-2xl p-4 text-center hover:border-gold/40 transition-all">
            <p className="text-2xl font-display text-gold">{stat.value}</p>
            <p className="text-[10px] text-smoke mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ============================================
          JOIN US / CAREERS
      ============================================ */}
      <div className="rounded-3xl border border-gold/20 bg-gradient-to-br from-panel to-ink px-8 py-14 sm:px-16 text-center mb-20">
        <h2 className="font-display text-3xl sm:text-4xl tracking-wide mb-4">Join the team</h2>
        <p className="text-smoke max-w-md mx-auto mb-8">
          We're always looking for talented people who love events and want to build the future of ticketing in Africa.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="mailto:careers@sahmtickethub.online"
            className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-7 py-4 rounded-full transition-all hover:scale-105"
          >
            <Sparkles className="w-4 h-4" />
            View open positions
          </a>
          <a
            href="mailto:partners@sahmtickethub.online"
            className="inline-flex items-center gap-2 bg-panel border border-line hover:border-gold/40 text-bone font-semibold px-7 py-4 rounded-full transition-all"
          >
            Partner with us
          </a>
        </div>
      </div>

      {/* ============================================
          CTA FOR ORGANIZERS
      ============================================ */}
      <div className="rounded-3xl border border-gold/20 bg-gradient-to-br from-panel to-ink px-8 py-14 sm:px-16 text-center">
        <h2 className="font-display text-3xl sm:text-4xl tracking-wide mb-4">
          Running an event?
        </h2>
        <p className="text-smoke max-w-md mx-auto mb-8">
          Join organizers already selling out shows on Sahm TicketHub. Whether it's a concert, comedy night, or festival — we've got you covered.
        </p>
        <Link
          to="/get-started"
          className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-7 py-4 rounded-full transition-all hover:scale-105 group"
        >
          Create your event
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
        <p className="text-xs text-smoke/60 mt-4">
          Already on board? <Link to="/organizer" className="text-gold hover:text-gold-bright">Go to dashboard →</Link>
        </p>
      </div>
    </div>
  );
}