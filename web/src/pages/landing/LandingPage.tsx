import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import {
  ToolOutlined,
  ScheduleOutlined,
  DollarOutlined,
  MobileOutlined,
  CheckCircleFilled,
  TeamOutlined,
  FileTextOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  CloudOutlined,
  BarChartOutlined,
  GlobalOutlined,
  CustomerServiceOutlined,
  MenuOutlined,
  CloseOutlined,
  StarFilled,
  RightOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  AimOutlined,
  SyncOutlined,
  BellOutlined,
  MailOutlined,
  EyeOutlined,
  FundOutlined,
  CrownOutlined,
  ApartmentOutlined,
  BranchesOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { ReactLenis } from 'lenis/react';
import './LandingPage.css';

// ─── Scroll-reveal hook using IntersectionObserver ───
function useScrollReveal(threshold = 0.15) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const elements = root.querySelectorAll('.lp-reveal');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // animate only once
          }
        });
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [threshold]);

  return containerRef;
}

// ─── Animated counter hook ───
function useCountUp(end: number, duration = 1800) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * end));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return { ref, value };
}

// ─── Scroll parallax hook — drives CSS custom properties ───
function useScrollParallax() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const hero = heroRef.current;
        if (hero) {
          hero.style.setProperty('--scroll-y', String(y));
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return heroRef;
}

// ─── Mouse glow tracker on a section ───
function useMouseGlow() {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--glow-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--glow-y', `${e.clientY - rect.top}px`);
  }, []);

  return { ref, handleMove };
}

export default function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDark, setIsDark] = useState(() => {
    // If user has explicitly chosen a theme, respect it
    const saved = localStorage.getItem('lp-theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    // Otherwise, follow Chrome / OS system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const revealRef = useScrollReveal();
  const heroParallax = useScrollParallax();
  const featuresGlow = useMouseGlow();

  // Counters for hero stats
  const stat1 = useCountUp(40);
  const stat2 = useCountUp(95);
  const stat3 = useCountUp(3);
  const stat4 = useCountUp(60);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
      // Scroll progress for navbar indicator
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docH > 0 ? Math.min(window.scrollY / docH, 1) : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync with system theme changes (e.g., Chrome switching dark mode)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      // Only auto-follow system if user hasn't manually overridden
      const saved = localStorage.getItem('lp-theme');
      if (!saved) {
        setIsDark(e.matches);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Dark mode toggle — persists to localStorage
  useEffect(() => {
    const el = document.querySelector('.landing-page');
    if (el) {
      el.classList.toggle('dark', isDark);
    }
    localStorage.setItem('lp-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const scrollToSection = (id: string) => {
    setMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <ReactLenis root>
      <div className={`landing-page${isDark ? ' dark' : ''}`} ref={revealRef}>
        {/* ========== Navbar ========== */}
        <nav className={`lp-navbar ${scrolled ? 'scrolled' : ''}`}>
          <div className="lp-scroll-progress" style={{ transform: `scaleX(${scrollProgress})` }} />
          <div className="lp-navbar-inner">
            <a href="#" className="lp-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <div className="lp-logo-icon" aria-label="FieldForce Pro icon">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  {/* Hexagon outline */}
                  <path
                    d="M11 1L20.124 6V16L11 21L1.876 16V6L11 1Z"
                    fill="none"
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth="0.8"
                  />
                  {/* Lightning bolt */}
                  <path
                    d="M12.5 4L7 11.5H11L9.5 18L15 10.5H11.5L12.5 4Z"
                    fill="white"
                    fillOpacity="0.95"
                  />
                </svg>
              </div>
              FieldForce Pro
            </a>

            <ul className="lp-nav-links">
              <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a></li>
              <li><a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works'); }}>How It Works</a></li>
              <li><a href="#solutions" onClick={(e) => { e.preventDefault(); scrollToSection('solutions'); }}>Solutions</a></li>
              <li><a href="#testimonials" onClick={(e) => { e.preventDefault(); scrollToSection('testimonials'); }}>Testimonials</a></li>
              <li><a href="#pricing" onClick={(e) => { e.preventDefault(); scrollToSection('pricing'); }}>Pricing</a></li>
            </ul>

            <div className="lp-nav-actions">
              {/* Dark mode toggle */}
              <button
                id="lp-theme-toggle"
                className="lp-theme-toggle"
                onClick={() => setIsDark((d) => !d)}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? <SunOutlined /> : <MoonOutlined />}
              </button>

              {isAuthenticated ? (
                <button
                  className="lp-user-avatar-btn"
                  onClick={() => navigate('/dashboard')}
                  title={user ? `${user.first_name} ${user.last_name}` : 'Dashboard'}
                >
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="avatar" className="lp-user-avatar-img" />
                  ) : (
                    <span className="lp-user-avatar-initials">
                      {user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : 'U'}
                    </span>
                  )}
                </button>
              ) : (
                <>
                  <button className="lp-btn lp-btn-ghost" onClick={() => navigate('/login')}>Log In</button>
                  <button className="lp-btn lp-btn-demo" onClick={() => navigate('/register')}>
                    Get Demo
                  </button>
                </>
              )}
            </div>

            <button className="lp-mobile-toggle" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
              {mobileNavOpen ? <CloseOutlined /> : <MenuOutlined />}
            </button>
          </div>
        </nav>

        {/* Mobile Nav Drawer */}
        <div className={`lp-mobile-nav ${mobileNavOpen ? 'open' : ''}`}>
          <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a>
          <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works'); }}>How It Works</a>
          <a href="#solutions" onClick={(e) => { e.preventDefault(); scrollToSection('solutions'); }}>Solutions</a>
          <a href="#testimonials" onClick={(e) => { e.preventDefault(); scrollToSection('testimonials'); }}>Testimonials</a>
          <a href="#pricing" onClick={(e) => { e.preventDefault(); scrollToSection('pricing'); }}>Pricing</a>
          <div className="lp-mobile-nav-actions">
            {isAuthenticated ? (
              <button className="lp-btn lp-btn-primary" onClick={() => navigate('/dashboard')} style={{ width: '100%' }}>
                Go to Dashboard
              </button>
            ) : (
              <>
                <button className="lp-btn lp-btn-outline" onClick={() => navigate('/login')} style={{ width: '100%' }}>Log In</button>
              </>
            )}
          </div>
        </div>

        {/* ========== Hero Section ========== */}
        <section className="lp-hero" ref={heroParallax}>
          {/* Fluid gradient mesh blobs */}
          <div className="lp-hero-blobs" aria-hidden="true">
            <div className="lp-blob lp-blob-1" />
            <div className="lp-blob lp-blob-2" />
          </div>
          {/* Decorative elements from reference */}
          <div className="lp-hero-decor" aria-hidden="true">
            <span className="lp-decor-bracket lp-bracket-tl">{'┌ ┐'}</span>
            <span className="lp-decor-bracket lp-bracket-bl">{'└ ┘'}</span>
            <span className="lp-decor-bracket lp-bracket-tr">{'┌ ┐'}</span>
            <span className="lp-decor-bracket lp-bracket-br">{'└ ┘'}</span>
            <span className="lp-decor-plus lp-plus-1">+</span>
            <span className="lp-decor-plus lp-plus-2">+</span>
            <span className="lp-decor-plus lp-plus-3">+</span>
            <span className="lp-decor-plus lp-plus-4">+</span>
            <span className="lp-decor-plus lp-plus-5">+</span>
            <span className="lp-decor-plus lp-plus-6">+</span>
            <span className="lp-decor-vtext lp-vtext-left">FieldForce</span>
            <span className="lp-decor-vtext lp-vtext-right">Pro</span>
            <div className="lp-decor-shapes">
              <span className="lp-shape lp-shape-circle" />
              <span className="lp-shape lp-shape-triangle" />
              <span className="lp-shape lp-shape-square" />
            </div>
            <div className="lp-decor-qr" />
            <div className="lp-decor-rings" />
          </div>
          <div className="lp-container">
            <div className="lp-hero-content lp-parallax-content">
              <div className="lp-hero-badge">
                <span className="lp-badge-dot" />
                <RocketOutlined /> AI-Powered Field Service Management
              </div>
              <h1 className="lp-text-reveal">
                Seamless Field Operations.{' '}
                <span>Exceptional Service.</span>
              </h1>
              <p className="lp-hero-subtitle">
                Manage work orders, dispatch teams, track field agents in real-time, and delight
                customers — all from one powerful AI-driven platform.
              </p>
              <div className="lp-hero-actions">
                <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => navigate('/register')}>
                  Get Started <RightOutlined />
                </button>
                <button className="lp-btn lp-btn-outline lp-btn-lg" onClick={() => scrollToSection('how-it-works')}>
                  <PlayCircleOutlined /> Learn More
                </button>
              </div>
              <div className="lp-hero-stats">
                <div className="lp-hero-stat">
                  <span className="lp-hero-stat-value" ref={stat1.ref}>{stat1.value}%</span>
                  <span className="lp-hero-stat-label">Faster Dispatching</span>
                </div>
                <div className="lp-hero-stat">
                  <span className="lp-hero-stat-value" ref={stat2.ref}>{stat2.value}%</span>
                  <span className="lp-hero-stat-label">First-Time Fix Rate</span>
                </div>
                <div className="lp-hero-stat">
                  <span className="lp-hero-stat-value" ref={stat3.ref}>{stat3.value}x</span>
                  <span className="lp-hero-stat-label">Productivity Boost</span>
                </div>
                <div className="lp-hero-stat">
                  <span className="lp-hero-stat-value" ref={stat4.ref}>{stat4.value}%</span>
                  <span className="lp-hero-stat-label">Less Paperwork</span>
                </div>
              </div>
            </div>

            {/* Dashboard Mockup */}
            <div className="lp-hero-image lp-parallax-image">
              <div className="lp-hero-screenshot">
                <div className="lp-dashboard-mockup">
                  <div className="lp-mockup-topbar">
                    <div className="lp-mockup-dot" />
                    <div className="lp-mockup-dot" />
                    <div className="lp-mockup-dot" />
                  </div>
                  <div className="lp-mockup-body">
                    <div className="lp-mockup-sidebar">
                      <div className="lp-mockup-sidebar-item active">
                        <div className="lp-mockup-sidebar-icon" /> Dashboard
                      </div>
                      <div className="lp-mockup-sidebar-item">
                        <div className="lp-mockup-sidebar-icon" /> Work Orders
                      </div>
                      <div className="lp-mockup-sidebar-item">
                        <div className="lp-mockup-sidebar-icon" /> Dispatch
                      </div>
                      <div className="lp-mockup-sidebar-item">
                        <div className="lp-mockup-sidebar-icon" /> Invoices
                      </div>
                      <div className="lp-mockup-sidebar-item">
                        <div className="lp-mockup-sidebar-icon" /> Reports
                      </div>
                      <div className="lp-mockup-sidebar-item">
                        <div className="lp-mockup-sidebar-icon" /> Contacts
                      </div>
                    </div>
                    <div className="lp-mockup-content">
                      <div className="lp-mockup-header-bar">
                        <span className="lp-mockup-title">Dashboard Overview</span>
                        <span className="lp-mockup-btn-sm">+ New Work Order</span>
                      </div>
                      <div className="lp-mockup-stats-row">
                        <div className="lp-mockup-stat-card">
                          <div className="lp-mockup-stat-label">Active Jobs</div>
                          <div className="lp-mockup-stat-value" style={{ color: '#2563eb' }}>24</div>
                        </div>
                        <div className="lp-mockup-stat-card">
                          <div className="lp-mockup-stat-label">Completed</div>
                          <div className="lp-mockup-stat-value" style={{ color: '#10b981' }}>156</div>
                        </div>
                        <div className="lp-mockup-stat-card">
                          <div className="lp-mockup-stat-label">Revenue</div>
                          <div className="lp-mockup-stat-value" style={{ color: '#f59e0b' }}>$48K</div>
                        </div>
                        <div className="lp-mockup-stat-card">
                          <div className="lp-mockup-stat-label">Technicians</div>
                          <div className="lp-mockup-stat-value" style={{ color: '#8b5cf6' }}>18</div>
                        </div>
                      </div>
                      <div className="lp-mockup-chart">
                        <div className="lp-mockup-chart-title">Weekly Performance</div>
                        <div className="lp-mockup-chart-bars">
                          <div className="lp-mockup-bar" style={{ height: '60%' }} />
                          <div className="lp-mockup-bar" style={{ height: '80%' }} />
                          <div className="lp-mockup-bar" style={{ height: '45%' }} />
                          <div className="lp-mockup-bar" style={{ height: '90%' }} />
                          <div className="lp-mockup-bar" style={{ height: '70%' }} />
                          <div className="lp-mockup-bar" style={{ height: '55%' }} />
                          <div className="lp-mockup-bar" style={{ height: '85%' }} />
                          <div className="lp-mockup-bar" style={{ height: '65%' }} />
                          <div className="lp-mockup-bar" style={{ height: '75%' }} />
                          <div className="lp-mockup-bar" style={{ height: '95%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== Trusted By ========== */}
        <section className="lp-trusted">
          <div className="lp-container">
            <p className="lp-trusted-title lp-reveal lp-reveal-up">Trusted by service businesses worldwide</p>
            <div className="lp-trusted-logos">
              <div className="lp-trusted-logos-track">
                {[...Array(2)].flatMap((_, dupeIdx) =>
                  [
                    { name: 'TechServ', color: '#2563eb' },
                    { name: 'AirFlow', color: '#06b6d4' },
                    { name: 'ProFix', color: '#10b981' },
                    { name: 'ElectraCo', color: '#f59e0b' },
                    { name: 'CleanPro', color: '#8b5cf6' },
                    { name: 'SolarEdge', color: '#ef4444' },
                    { name: 'PipeMaster', color: '#ec4899' },
                    { name: 'BuildRight', color: '#14b8a6' },
                  ].map((company) => (
                    <div key={`${company.name}-${dupeIdx}`} className="lp-trusted-logo">
                      <div className="lp-trusted-logo-dot" style={{ background: company.color }}>
                        {company.name[0]}
                      </div>
                      {company.name}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ========== Core Features (4 Pillars) ========== */}
        <section id="features" className="lp-section lp-section-alt lp-glow-section" ref={featuresGlow.ref} onMouseMove={featuresGlow.handleMove}>
          <div className="lp-glow-blob" />
          <div className="lp-container">
            <div className="lp-section-header lp-reveal lp-reveal-up">
              <span className="lp-section-tag">Features</span>
              <h2 className="lp-section-title">Everything You Need to Run Your Field Operations</h2>
              <p className="lp-section-subtitle">
                From service requests to invoicing, FieldForce Pro gives your team the tools to deliver outstanding field service at scale.
              </p>
            </div>

            <div className="lp-features-grid">
              {[
                {
                  icon: <CustomerServiceOutlined />, color: 'blue',
                  title: 'AI‑Powered Customer Chatbot',
                  desc: '24/7 intelligent support that creates tickets, answers FAQs, and generates estimates automatically.',
                  bullets: ['Ticket creation from chat', 'FAQ knowledge base', 'AI estimate generation', 'Multi-language support'],
                },
                {
                  icon: <ScheduleOutlined />, color: 'cyan',
                  title: 'Autonomous Scheduling & Dispatch',
                  desc: 'AI-driven job assignment that optimises routes, skills, and availability — reducing travel time by 30%.',
                  bullets: ['Skill-based auto-assign', 'AI route optimisation', 'Drag-and-drop board', 'Real-time GPS tracking'],
                },
                {
                  icon: <SyncOutlined />, color: 'green',
                  title: 'Predictive Maintenance (IoT + LSTM)',
                  desc: 'IoT sensor data combined with LSTM models to forecast equipment failures before they happen.',
                  bullets: ['Sensor data ingestion', 'LSTM failure prediction', 'Automated work order creation', 'Asset health dashboards'],
                },
                {
                  icon: <EyeOutlined />, color: 'amber',
                  title: 'Computer‑Vision Quality Assurance',
                  desc: 'YOLOv8-powered visual inspection that detects defects, verifies job completion, and flags anomalies.',
                  bullets: ['YOLOv8 object detection', 'Defect classification', 'Photo-based job verification', 'Compliance photo audit'],
                },
                {
                  icon: <FileTextOutlined />, color: 'blue',
                  title: 'Document AI (OCR + LLM)',
                  desc: 'Extract and structure data from invoices, contracts, and job sheets with OCR and large language models.',
                  bullets: ['Invoice OCR extraction', 'Contract parsing', 'Auto-fill from documents', 'LLM-powered summaries'],
                },
                {
                  icon: <BarChartOutlined />, color: 'cyan',
                  title: 'Natural‑Language Analytics',
                  desc: 'Ask questions in plain English and get instant charts, reports, and operational insights.',
                  bullets: ['Plain-English queries', 'Auto-generated charts', 'KPI trend analysis', 'Exportable reports'],
                },
                {
                  icon: <FundOutlined />, color: 'green',
                  title: 'Churn & Demand Forecasting',
                  desc: 'Gradient-boosting + Prophet models predict customer churn and future service demand to keep you ahead.',
                  bullets: ['Churn risk scoring', 'Demand forecasting', 'Revenue projections', 'Seasonal trend detection'],
                },
                {
                  icon: <CrownOutlined />, color: 'amber',
                  title: 'Super‑Admin Dashboard',
                  desc: 'Full-platform oversight with audit logs, API-key management, health monitoring, and billing analytics.',
                  bullets: ['Complete audit logs', 'API key management', 'System health monitoring', 'Billing analytics'],
                },
                {
                  icon: <ApartmentOutlined />, color: 'blue',
                  title: 'Full‑Stack FSM Modules',
                  desc: 'Every module you need: Contacts, Assets, Service Requests, Estimates, Work Orders, Inventory, SLA, Reviews.',
                  bullets: ['Asset registry & IoT', 'SLA management', 'Inventory tracking', 'Reviews & ratings'],
                },
                {
                  icon: <MailOutlined />, color: 'cyan',
                  title: 'Multi‑Channel Intake',
                  desc: 'Capture service requests via email, web form, WhatsApp, SMS, AI chat, and REST API — all in one inbox.',
                  bullets: ['Email & web form', 'WhatsApp & SMS', 'AI chat intake', 'REST API ingestion'],
                },
                {
                  icon: <BranchesOutlined />, color: 'green',
                  title: 'Blueprint Workflow Editor',
                  desc: 'Visual drag-and-drop state-machine editor to design and customise your own service workflows.',
                  bullets: ['Visual state-machine editor', 'Custom status transitions', 'Conditional logic rules', 'Template library'],
                },
                {
                  icon: <MobileOutlined />, color: 'amber',
                  title: 'Offline‑First Mobile App',
                  desc: 'WatermelonDB-powered sync gives field techs full functionality even without internet connectivity.',
                  bullets: ['WatermelonDB sync engine', 'Offline job management', 'Photo & signature capture', 'Voice notes & AI assist'],
                },
                {
                  icon: <SafetyCertificateOutlined />, color: 'blue',
                  title: 'Enterprise‑Grade Security',
                  desc: 'JWT + 2FA authentication, unlimited custom RBAC, full audit trails, and SOC-2-ready infrastructure.',
                  bullets: ['JWT + 2FA auth', 'Unlimited custom RBAC', 'Full audit trails', 'SOC-2-ready'],
                },
                {
                  icon: <GlobalOutlined />, color: 'cyan',
                  title: 'Internationalisation (25+ Languages)',
                  desc: 'Locale-aware UI with RTL support and 25+ languages so your global team works in their own language.',
                  bullets: ['25+ languages', 'RTL layout support', 'Locale-aware formatting', 'Per-user language setting'],
                },
                {
                  icon: <ApiOutlined />, color: 'green',
                  title: 'Extensible API Marketplace',
                  desc: 'REST, GraphQL, and Webhooks give partners and developers a first-class integration platform.',
                  bullets: ['REST & GraphQL APIs', 'Webhooks engine', 'OAuth 2.0 apps', 'Developer sandbox'],
                },
              ].map((feat, idx) => (
                <div key={idx} className={`lp-feature-card lp-reveal lp-reveal-up lp-stagger-${(idx % 4) + 1}`}>
                  <div className={`lp-feature-icon lp-feature-icon-${feat.color}`}>{feat.icon}</div>
                  <h3>{feat.title}</h3>
                  <p>{feat.desc}</p>
                  <ul className="lp-feature-list">
                    {feat.bullets.map((b) => (
                      <li key={b}><CheckCircleFilled className="lp-check" /> {b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== How It Works ========== */}
        <section id="how-it-works" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-header lp-reveal lp-reveal-up">
              <span className="lp-section-tag">How It Works</span>
              <h2 className="lp-section-title">Get Up and Running in Minutes</h2>
              <p className="lp-section-subtitle">
                FieldForce Pro streamlines your entire field service workflow from start to finish.
              </p>
            </div>

            <div className="lp-hiw">
              {[
                { num: '01', icon: <MailOutlined />, title: 'Receive Request', desc: 'Capture service requests from web forms, phone calls, or email — all funneled into one unified inbox.', color: '#818cf8', bg: 'rgba(99,102,241,0.12)' },
                { num: '02', icon: <FileTextOutlined />, title: 'Create & Estimate', desc: 'Build detailed estimates with your pricebook and get instant customer approval with digital signatures.', color: '#22d3ee', bg: 'rgba(6,182,212,0.12)' },
                { num: '03', icon: <AimOutlined />, title: 'Dispatch & Execute', desc: 'AI assigns the best-matched technician, optimizes routes, and tracks progress in real-time.', color: '#34d399', bg: 'rgba(16,185,129,0.12)' },
                { num: '04', icon: <DollarOutlined />, title: 'Invoice & Get Paid', desc: 'Auto-generate invoices from completed work orders, collect payments on-site, and close jobs instantly.', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
              ].map((step, idx) => (
                <div key={step.num} className={`lp-hiw-card lp-reveal lp-reveal-up lp-stagger-${idx + 1}`}>
                  <div className="lp-hiw-card-top">
                    <div className="lp-hiw-icon" style={{ background: step.bg, color: step.color }}>{step.icon}</div>
                    <span className="lp-hiw-num" style={{ color: step.color }}>{step.num}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== Feature Highlights (Alternating) ========== */}
        <section id="solutions" className="lp-section lp-section-alt">
          <div className="lp-container">
            <div className="lp-section-header lp-reveal lp-reveal-up">
              <span className="lp-section-tag">Solutions</span>
              <h2 className="lp-section-title">Built for Every Aspect of Field Service</h2>
              <p className="lp-section-subtitle">
                Deep-dive into the features that make FieldForce Pro the most complete FSM platform.
              </p>
            </div>

            {/* Highlight 1 — Work Orders */}
            <div className="lp-highlight">
              <div className="lp-highlight-content lp-reveal lp-reveal-right">
                <span className="lp-section-tag">Work Orders</span>
                <h3>End-to-End Work Order Management</h3>
                <p>
                  Track every job from initial request to completion with our comprehensive work order
                  system. Automate status transitions, enforce SLA compliance, and keep your team
                  aligned at every step.
                </p>
                <div className="lp-highlight-features">
                  <div className="lp-highlight-feature">
                    <div className="lp-highlight-feature-icon"><AimOutlined /></div>
                    <div className="lp-highlight-feature-text">
                      <h4>Status Workflow Engine</h4>
                      <p>Configurable workflows: New, Estimated, Approved, Scheduled, In Progress, Completed</p>
                    </div>
                  </div>
                  <div className="lp-highlight-feature">
                    <div className="lp-highlight-feature-icon"><FileTextOutlined /></div>
                    <div className="lp-highlight-feature-text">
                      <h4>Job Sheets & Checklists</h4>
                      <p>Custom templates ensure consistent service delivery every time</p>
                    </div>
                  </div>
                  <div className="lp-highlight-feature">
                    <div className="lp-highlight-feature-icon"><SyncOutlined /></div>
                    <div className="lp-highlight-feature-text">
                      <h4>Automated Maintenance</h4>
                      <p>Schedule recurring jobs and preventive maintenance plans</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lp-highlight-visual lp-reveal lp-reveal-left">
                <div className="lp-highlight-image">
                  <div className="lp-highlight-placeholder" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(6,182,212,0.06) 100%)' }}>
                    <div className="lp-mock-card-grid">
                      <div className="lp-mock-card">
                        <div className="lp-mock-card-header">
                          <span className="lp-mock-card-title">WO-1024</span>
                          <span className="lp-mock-badge lp-mock-badge-blue">In Progress</span>
                        </div>
                        <div className="lp-mock-card-meta">HVAC Repair - Building A</div>
                        <div className="lp-mock-progress"><div className="lp-mock-progress-bar" style={{ width: '70%' }} /></div>
                      </div>
                      <div className="lp-mock-card">
                        <div className="lp-mock-card-header">
                          <span className="lp-mock-card-title">WO-1025</span>
                          <span className="lp-mock-badge lp-mock-badge-green">Completed</span>
                        </div>
                        <div className="lp-mock-card-meta">Electrical Inspection</div>
                        <div className="lp-mock-progress"><div className="lp-mock-progress-bar" style={{ width: '100%', background: '#10b981' }} /></div>
                      </div>
                      <div className="lp-mock-card">
                        <div className="lp-mock-card-header">
                          <span className="lp-mock-card-title">WO-1026</span>
                          <span className="lp-mock-badge lp-mock-badge-amber">Scheduled</span>
                        </div>
                        <div className="lp-mock-card-meta">Plumbing Maintenance</div>
                        <div className="lp-mock-progress"><div className="lp-mock-progress-bar" style={{ width: '30%', background: '#f59e0b' }} /></div>
                      </div>
                      <div className="lp-mock-card">
                        <div className="lp-mock-card-header">
                          <span className="lp-mock-card-title">WO-1027</span>
                          <span className="lp-mock-badge lp-mock-badge-red">Urgent</span>
                        </div>
                        <div className="lp-mock-card-meta">Emergency Generator Fix</div>
                        <div className="lp-mock-progress"><div className="lp-mock-progress-bar" style={{ width: '10%', background: '#ef4444' }} /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Highlight 2 — Scheduling */}
            <div className="lp-highlight reverse">
              <div className="lp-highlight-content lp-reveal lp-reveal-left">
                <span className="lp-section-tag">Scheduling</span>
                <h3>AI-Powered Smart Dispatch</h3>
                <p>
                  Let our AI engine optimize technician assignments based on skills, location,
                  availability, and job priority. See everything on a real-time dispatch board
                  with drag-and-drop simplicity.
                </p>
                <div className="lp-highlight-features">
                  <div className="lp-highlight-feature">
                    <div className="lp-highlight-feature-icon"><TeamOutlined /></div>
                    <div className="lp-highlight-feature-text">
                      <h4>Skill-Based Matching</h4>
                      <p>Auto-assign technicians based on certifications and expertise</p>
                    </div>
                  </div>
                  <div className="lp-highlight-feature">
                    <div className="lp-highlight-feature-icon"><GlobalOutlined /></div>
                    <div className="lp-highlight-feature-text">
                      <h4>Live GPS Tracking</h4>
                      <p>Track your field team in real-time on an interactive map</p>
                    </div>
                  </div>
                  <div className="lp-highlight-feature">
                    <div className="lp-highlight-feature-icon"><BellOutlined /></div>
                    <div className="lp-highlight-feature-text">
                      <h4>Automated Notifications</h4>
                      <p>Keep customers informed with real-time ETAs and status updates</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lp-highlight-visual lp-reveal lp-reveal-right">
                <div className="lp-highlight-image">
                  <div className="lp-highlight-placeholder" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(16,185,129,0.06) 100%)' }}>
                    <div className="lp-mock-dispatch">
                      <div className="lp-mock-timeline">
                        {[
                          { name: 'Alex M.', color: '#2563eb', task: 'HVAC Repair — Tower B', time: '9:00 AM' },
                          { name: 'Sarah K.', color: '#10b981', task: 'Electrical Inspection — Block C', time: '10:30 AM' },
                          { name: 'James L.', color: '#f59e0b', task: 'Plumbing Fix — Unit 14', time: '11:00 AM' },
                          { name: 'Rita P.', color: '#8b5cf6', task: 'Generator Maintenance — HQ', time: '1:00 PM' },
                          { name: 'Dave C.', color: '#ef4444', task: 'Fire Safety Check — Warehouse', time: '2:30 PM' },
                        ].map((item) => (
                          <div key={item.name} className="lp-mock-timeline-item">
                            <div className="lp-mock-avatar" style={{ background: item.color }}>{item.name.split(' ').map(n => n[0]).join('')}</div>
                            <div className="lp-mock-timeline-info">
                              <div className="lp-mock-timeline-name">{item.name}</div>
                              <div className="lp-mock-timeline-task">{item.task}</div>
                            </div>
                            <div className="lp-mock-timeline-time">{item.time}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Highlight 3 — Invoicing */}
            <div className="lp-highlight">
              <div className="lp-highlight-content lp-reveal lp-reveal-right">
                <span className="lp-section-tag">Invoicing</span>
                <h3>Get Paid Faster with Automated Invoicing</h3>
                <p>
                  Convert completed work orders into invoices with a single click. Support for
                  multi-currency, tax calculation, online payments, and customizable PDF templates.
                </p>
                <div className="lp-highlight-features">
                  <div className="lp-highlight-feature">
                    <div className="lp-highlight-feature-icon"><DollarOutlined /></div>
                    <div className="lp-highlight-feature-text">
                      <h4>One-Click Invoicing</h4>
                      <p>Auto-populate from work orders with labor, parts, and expenses</p>
                    </div>
                  </div>
                  <div className="lp-highlight-feature">
                    <div className="lp-highlight-feature-icon"><SafetyCertificateOutlined /></div>
                    <div className="lp-highlight-feature-text">
                      <h4>Secure Online Payments</h4>
                      <p>Accept credit cards, bank transfers, and digital wallets</p>
                    </div>
                  </div>
                  <div className="lp-highlight-feature">
                    <div className="lp-highlight-feature-icon"><BarChartOutlined /></div>
                    <div className="lp-highlight-feature-text">
                      <h4>Revenue Dashboard</h4>
                      <p>Track earnings, overdue invoices, and financial health at a glance</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lp-highlight-visual lp-reveal lp-reveal-left">
                <div className="lp-highlight-image">
                  <div className="lp-highlight-placeholder" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(245,158,11,0.06) 100%)' }}>
                    <div className="lp-mock-invoice">
                      <div className="lp-mock-invoice-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Invoice #INV-2024-089</span>
                          <span className="lp-mock-badge lp-mock-badge-green">Paid</span>
                        </div>
                        <div className="lp-mock-invoice-row">
                          <span className="lp-mock-invoice-label">HVAC System Repair</span>
                          <span className="lp-mock-invoice-value">$1,200.00</span>
                        </div>
                        <div className="lp-mock-invoice-row">
                          <span className="lp-mock-invoice-label">Parts — Compressor Unit</span>
                          <span className="lp-mock-invoice-value">$850.00</span>
                        </div>
                        <div className="lp-mock-invoice-row">
                          <span className="lp-mock-invoice-label">Labor (4 hrs)</span>
                          <span className="lp-mock-invoice-value">$480.00</span>
                        </div>
                        <div className="lp-mock-invoice-row">
                          <span className="lp-mock-invoice-label">Tax (8%)</span>
                          <span className="lp-mock-invoice-value">$202.40</span>
                        </div>
                        <div className="lp-mock-invoice-row" style={{ borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 4 }}>
                          <span className="lp-mock-invoice-label" style={{ fontWeight: 700, color: '#e2e8f0' }}>Total</span>
                          <span className="lp-mock-invoice-value" style={{ fontSize: 18, color: '#10b981' }}>$2,732.40</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Highlight 4 — Mobile App */}
            <div className="lp-highlight reverse">
              <div className="lp-highlight-content lp-reveal lp-reveal-left">
                <span className="lp-section-tag">Mobile App</span>
                <h3>Your Office in Your Pocket</h3>
                <p>
                  Give your field technicians everything they need on the go. The FieldForce Pro mobile
                  app works offline, syncs automatically, and puts the full power of the platform
                  in their hands.
                </p>
                <div className="lp-highlight-features">
                  <div className="lp-highlight-feature">
                    <div className="lp-highlight-feature-icon"><CloudOutlined /></div>
                    <div className="lp-highlight-feature-text">
                      <h4>Offline-First Architecture</h4>
                      <p>Full functionality even without internet — syncs when back online</p>
                    </div>
                  </div>
                  <div className="lp-highlight-feature">
                    <div className="lp-highlight-feature-icon"><ThunderboltOutlined /></div>
                    <div className="lp-highlight-feature-text">
                      <h4>Vision AI</h4>
                      <p>Snap photos of equipment for instant AI-powered diagnostics</p>
                    </div>
                  </div>
                  <div className="lp-highlight-feature">
                    <div className="lp-highlight-feature-icon"><CustomerServiceOutlined /></div>
                    <div className="lp-highlight-feature-text">
                      <h4>Voice Notes</h4>
                      <p>Record voice notes that are auto-transcribed and attached to jobs</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lp-highlight-visual lp-reveal lp-reveal-right" style={{ display: 'flex', justifyContent: 'center' }}>
                <div className="lp-mock-mobile">
                  <div className="lp-mock-mobile-screen">
                    <div className="lp-mock-mobile-status">
                      <span>9:41</span>
                      <span>100%</span>
                    </div>
                    <div className="lp-mock-mobile-header">My Jobs Today</div>
                    <div className="lp-mock-mobile-body">
                      {[
                        { title: 'HVAC Repair', sub: 'Tower B, Floor 3 — 9:00 AM', badge: 'In Transit', color: 'rgba(59,130,246,0.2)' },
                        { title: 'Electrical Check', sub: 'Block C — 10:30 AM', badge: 'Upcoming', color: 'rgba(245,158,11,0.2)' },
                        { title: 'Plumbing Fix', sub: 'Unit 14 — 11:00 AM', badge: 'Upcoming', color: 'rgba(245,158,11,0.2)' },
                        { title: 'Generator Service', sub: 'HQ — 1:00 PM', badge: 'Upcoming', color: 'rgba(245,158,11,0.2)' },
                      ].map((job) => (
                        <div key={job.title} className="lp-mock-mobile-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="lp-mock-mobile-card-title">{job.title}</span>
                            <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 100, background: job.color, fontWeight: 600 }}>{job.badge}</span>
                          </div>
                          <div className="lp-mock-mobile-card-sub">{job.sub}</div>
                        </div>
                      ))}
                    </div>
                    <div className="lp-mock-mobile-nav">
                      <div className="lp-mock-mobile-nav-item active" />
                      <div className="lp-mock-mobile-nav-item" />
                      <div className="lp-mock-mobile-nav-item" />
                      <div className="lp-mock-mobile-nav-item" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== Testimonials ========== */}
        <section id="testimonials" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-header lp-reveal lp-reveal-up">
              <span className="lp-section-tag">Testimonials</span>
              <h2 className="lp-section-title">Loved by Service Teams Worldwide</h2>
              <p className="lp-section-subtitle">
                See how businesses like yours are transforming their field operations with FieldForce Pro.
              </p>
            </div>

            <div className="lp-testimonials-grid">
              <div className="lp-testimonial lp-reveal lp-reveal-up lp-stagger-1">
                <div className="lp-testimonial-stars">
                  <StarFilled /><StarFilled /><StarFilled /><StarFilled /><StarFilled />
                </div>
                <p className="lp-testimonial-text">
                  &ldquo;FieldForce Pro transformed how we manage our 50+ technicians. The AI-powered
                  dispatching alone saved us 12 hours per week on scheduling. The real-time tracking
                  gives us full visibility.&rdquo;
                </p>
                <div className="lp-testimonial-author">
                  <div className="lp-testimonial-avatar" style={{ background: '#2563eb' }}>MR</div>
                  <div className="lp-testimonial-info">
                    <h4>Michael Rodriguez</h4>
                    <p>Operations Director, TechServ Solutions</p>
                  </div>
                </div>
              </div>

              <div className="lp-testimonial lp-reveal lp-reveal-up lp-stagger-2">
                <div className="lp-testimonial-stars">
                  <StarFilled /><StarFilled /><StarFilled /><StarFilled /><StarFilled />
                </div>
                <p className="lp-testimonial-text">
                  &ldquo;The mobile app is a game-changer for our field team. They can access job details,
                  capture photos, and get customer signatures — even offline. Our first-time fix
                  rate jumped to 94%.&rdquo;
                </p>
                <div className="lp-testimonial-author">
                  <div className="lp-testimonial-avatar" style={{ background: '#10b981' }}>SC</div>
                  <div className="lp-testimonial-info">
                    <h4>Sarah Chen</h4>
                    <p>VP of Service, AirFlow HVAC</p>
                  </div>
                </div>
              </div>

              <div className="lp-testimonial lp-reveal lp-reveal-up lp-stagger-3">
                <div className="lp-testimonial-stars">
                  <StarFilled /><StarFilled /><StarFilled /><StarFilled /><StarFilled />
                </div>
                <p className="lp-testimonial-text">
                  &ldquo;We went from Excel spreadsheets to a fully automated FSM system in just two weeks.
                  The invoicing integration means we get paid 3x faster. Best investment we&apos;ve made
                  this year.&rdquo;
                </p>
                <div className="lp-testimonial-author">
                  <div className="lp-testimonial-avatar" style={{ background: '#f59e0b' }}>DK</div>
                  <div className="lp-testimonial-info">
                    <h4>David Kim</h4>
                    <p>CEO, ProFix Maintenance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== Integrations ========== */}
        <section id="integrations" className="lp-section lp-section-alt">
          <div className="lp-container">
            <div className="lp-section-header lp-reveal lp-reveal-up">
              <span className="lp-section-tag">Integrations</span>
              <h2 className="lp-section-title">Connect with Your Favorite Tools</h2>
              <p className="lp-section-subtitle">
                FieldForce Pro integrates seamlessly with the tools you already use, so you can work smarter without switching platforms.
              </p>
            </div>

            <div className="lp-integrations-grid">
              {[
                { name: 'QuickBooks', icon: <DollarOutlined />, bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
                { name: 'Stripe', icon: <SafetyCertificateOutlined />, bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
                { name: 'Google Maps', icon: <GlobalOutlined />, bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
                { name: 'Slack', icon: <CustomerServiceOutlined />, bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
                { name: 'REST API', icon: <ApiOutlined />, bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
                { name: 'Webhooks', icon: <ThunderboltOutlined />, bg: 'rgba(236,72,153,0.15)', color: '#f472b6' },
              ].map((integration, idx) => (
                <div key={integration.name} className={`lp-integration-card lp-reveal lp-reveal-scale lp-stagger-${idx + 1}`}>
                  <div className="lp-integration-icon" style={{ background: integration.bg, color: integration.color }}>
                    {integration.icon}
                  </div>
                  <h4>{integration.name}</h4>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== Pricing CTA ========== */}
        <section id="pricing" className="lp-pricing-section">
          <div className="lp-container">
            <div className="lp-pricing-content lp-reveal lp-reveal-up">
              <h2>Simple, Transparent Pricing</h2>
              <p>
                Scale as you grow. No hidden fees, no long-term contracts.
                Choose the plan that fits your team.
              </p>
            </div>

            <div className="lp-pricing-cards">
              <div className="lp-price-card lp-reveal lp-reveal-up lp-stagger-1">
                <h3>Starter</h3>
                <div className="lp-price">$29<span>/user/mo</span></div>
                <p className="lp-price-desc">Perfect for small teams</p>
                <ul className="lp-price-features">
                  <li><CheckCircleFilled className="lp-check" /> Up to 10 users</li>
                  <li><CheckCircleFilled className="lp-check" /> Work order management</li>
                  <li><CheckCircleFilled className="lp-check" /> Basic scheduling</li>
                  <li><CheckCircleFilled className="lp-check" /> Mobile app access</li>
                  <li><CheckCircleFilled className="lp-check" /> Email support</li>
                </ul>
                <button className="lp-btn lp-btn-outline" style={{ width: '100%', borderColor: 'rgba(255,255,255,0.3)', color: 'white' }} onClick={() => navigate('/register')}>
                  Get Started
                </button>
              </div>

              <div className="lp-price-card featured lp-reveal lp-reveal-up lp-stagger-2">
                <h3>Professional</h3>
                <div className="lp-price">$59<span>/user/mo</span></div>
                <p className="lp-price-desc">Most popular for growing teams</p>
                <ul className="lp-price-features">
                  <li><CheckCircleFilled className="lp-check" /> Unlimited users</li>
                  <li><CheckCircleFilled className="lp-check" /> AI-powered dispatching</li>
                  <li><CheckCircleFilled className="lp-check" /> Invoicing & payments</li>
                  <li><CheckCircleFilled className="lp-check" /> Custom workflows</li>
                  <li><CheckCircleFilled className="lp-check" /> API access</li>
                  <li><CheckCircleFilled className="lp-check" /> Priority support</li>
                </ul>
                <button className="lp-btn lp-btn-primary" style={{ width: '100%' }} onClick={() => navigate('/register')}>
                  Get Started
                </button>
              </div>

              <div className="lp-price-card lp-reveal lp-reveal-up lp-stagger-3">
                <h3>Enterprise</h3>
                <div className="lp-price">Custom</div>
                <p className="lp-price-desc">For large organizations</p>
                <ul className="lp-price-features">
                  <li><CheckCircleFilled className="lp-check" /> Everything in Professional</li>
                  <li><CheckCircleFilled className="lp-check" /> Dedicated account manager</li>
                  <li><CheckCircleFilled className="lp-check" /> Custom integrations</li>
                  <li><CheckCircleFilled className="lp-check" /> SLA guarantees</li>
                  <li><CheckCircleFilled className="lp-check" /> On-premise deployment</li>
                  <li><CheckCircleFilled className="lp-check" /> 24/7 phone support</li>
                </ul>
                <button className="lp-btn lp-btn-outline" style={{ width: '100%', borderColor: 'rgba(255,255,255,0.3)', color: 'white' }} onClick={() => navigate('/register')}>
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========== Footer ========== */}
        <footer className="lp-footer">
          <div className="lp-container">
            <div className="lp-footer-grid">
              <div className="lp-footer-brand">
                <h3>
                  <div className="lp-logo-icon" style={{ width: 32, height: 32, fontSize: 14, borderRadius: 8 }}>FF</div>
                  FieldForce Pro
                </h3>
                <p>
                  AI-powered field service management platform that helps service businesses
                  manage operations, dispatch teams, and delight customers.
                </p>
                <div className="lp-footer-social">
                  <a href="#" className="lp-footer-social-link" aria-label="Twitter">
                    <GlobalOutlined />
                  </a>
                  <a href="#" className="lp-footer-social-link" aria-label="Team">
                    <TeamOutlined />
                  </a>
                  <a href="#" className="lp-footer-social-link" aria-label="GitHub">
                    <ApiOutlined />
                  </a>
                </div>
              </div>

              <div className="lp-footer-column">
                <h4>Product</h4>
                <ul className="lp-footer-links">
                  <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a></li>
                  <li><a href="#pricing" onClick={(e) => { e.preventDefault(); scrollToSection('pricing'); }}>Pricing</a></li>
                  <li><a href="#integrations">Integrations</a></li>
                  <li><a href="#" onClick={(e) => e.preventDefault()}>API Docs</a></li>
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Changelog</a></li>
                </ul>
              </div>

              <div className="lp-footer-column">
                <h4>Solutions</h4>
                <ul className="lp-footer-links">
                  <li><a href="#" onClick={(e) => e.preventDefault()}>HVAC</a></li>
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Electrical</a></li>
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Plumbing</a></li>
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Cleaning</a></li>
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Property Mgmt</a></li>
                </ul>
              </div>

              <div className="lp-footer-column">
                <h4>Company</h4>
                <ul className="lp-footer-links">
                  <li><a href="#" onClick={(e) => e.preventDefault()}>About Us</a></li>
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Careers</a></li>
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Blog</a></li>
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Contact</a></li>
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Partners</a></li>
                </ul>
              </div>

              <div className="lp-footer-column">
                <h4>Support</h4>
                <ul className="lp-footer-links">
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Help Center</a></li>
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Documentation</a></li>
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Community</a></li>
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Status Page</a></li>
                  <li><a href="#" onClick={(e) => e.preventDefault()}>Training</a></li>
                </ul>
              </div>
            </div>

            <div className="lp-footer-bottom">
              <span>&copy; {new Date().getFullYear()} FieldForce Pro. All rights reserved.</span>
              <div className="lp-footer-bottom-links">
                <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
                <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>
                <a href="#" onClick={(e) => e.preventDefault()}>Cookie Policy</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ReactLenis>
  );
}
