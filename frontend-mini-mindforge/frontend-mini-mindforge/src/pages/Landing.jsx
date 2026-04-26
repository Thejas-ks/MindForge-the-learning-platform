import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Landing.module.css';
import { MindForgeLogo, MindForgeLogoFull } from '../components/MindForgeLogo';

function TypeWriter({ texts }) {
  const [display, setDisplay] = useState('');
  const [tIdx, setTIdx] = useState(0);
  const [cIdx, setCIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const current = texts[tIdx];
    const timer = setTimeout(() => {
      if (!deleting) {
        setDisplay(current.slice(0, cIdx + 1));
        if (cIdx + 1 === current.length) setTimeout(() => setDeleting(true), 2000);
        else setCIdx(c => c + 1);
      } else {
        setDisplay(current.slice(0, cIdx - 1));
        if (cIdx - 1 === 0) { setDeleting(false); setTIdx(t => (t + 1) % texts.length); setCIdx(0); }
        else setCIdx(c => c - 1);
      }
    }, deleting ? 30 : 65);
    return () => clearTimeout(timer);
  }, [cIdx, deleting, tIdx, texts]);
  return <span>{display}<span className={styles.cursor}>|</span></span>;
}

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function FadeUp({ children, delay = 0 }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={`${styles.fadeUp} ${inView ? styles.fadeUpVisible : ''}`}
      style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

const ORBIT_NODES = [
  { icon: '🤖', label: 'AI Chat',       tip: 'Ask anything instantly',     color: '#6366f1', ring: 0, angle: 0   },
  { icon: '📝', label: 'Quiz',          tip: 'Test your knowledge',        color: '#a855f7', ring: 0, angle: 180 },
  { icon: '🃏', label: 'Flashcards',    tip: 'Deep memory retention',      color: '#38bdf8', ring: 1, angle: 60  },
  { icon: '🧠', label: 'Brain Workout', tip: 'Daily challenges',           color: '#10b981', ring: 1, angle: 200 },
  { icon: '📄', label: 'Upload Notes',  tip: 'Notes → quizzes instantly',  color: '#f59e0b', ring: 1, angle: 310 },
  { icon: '📊', label: 'Analytics',    tip: 'Track your progress',        color: '#06b6d4', ring: 2, angle: 130 },
];

const RINGS = [
  { r: 110, duration: 28, dir: 1  },
  { r: 175, duration: 42, dir: -1 },
  { r: 235, duration: 60, dir: 1  },
];

function HeroVisual() {
  const [hovered, setHovered] = useState(null);

  return (
    <div className={styles.orbitSystem}>
      <div className={styles.orbitGlow} />

      {/* Orbit rings */}
      {RINGS.map((ring, i) => (
        <div key={i} className={styles.orbitRingWrap}
          style={{
            width: ring.r * 2,
            height: ring.r * 2,
            animationDuration: `${ring.duration}s`,
            animationDirection: ring.dir === 1 ? 'normal' : 'reverse',
          }}>
          <div className={styles.orbitRingLine} />
          {ORBIT_NODES.filter(n => n.ring === i).map(node => (
            <div key={node.label}
              className={styles.orbitNodeWrap}
              style={{ '--angle': `${node.angle}deg`, '--r': `${ring.r}px` }}>
              <div
                className={`${styles.orbitNode} ${hovered === node.label ? styles.orbitNodeHovered : ''}`}
                style={{ '--color': node.color }}
                onMouseEnter={() => setHovered(node.label)}
                onMouseLeave={() => setHovered(null)}>
                <span className={styles.orbitNodeIcon}>{node.icon}</span>
                <div className={styles.orbitTooltip}>
                  <strong>{node.label}</strong>
                  <span>{node.tip}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Center core */}
      <div className={styles.orbitCenter}>
        <div className={styles.orbitCenterGlow} />
        <div className={styles.orbitCenterInner}>
          <MindForgeLogo size={42} />
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: '🤖', title: 'Ask MindForge AI',    tag: 'AI Chat',      color: '#6366f1', glow: 'rgba(99,102,241,0.3)',  desc: 'Ask anything — concepts, code, theory. Get instant AI-powered explanations with follow-up quizzes and flashcards.' },
  { icon: '📝', title: 'Smart Quizzes',        tag: 'Quiz Engine',  color: '#a855f7', glow: 'rgba(168,85,247,0.3)',  desc: 'Auto-generate MCQ quizzes from your topics or any custom subject. Track scores and master every concept.' },
  { icon: '🃏', title: 'Flashcards',           tag: 'Memory',       color: '#38bdf8', glow: 'rgba(56,189,248,0.3)',  desc: 'Flip through AI-generated flashcards. Beautiful design meets spaced repetition for deep retention.' },
  { icon: '🧠', title: 'Brain Workout',        tag: 'Daily',        color: '#10b981', glow: 'rgba(16,185,129,0.3)',  desc: 'Daily logic, aptitude, and coding challenges with progressive difficulty. Keep your streak alive.' },
  { icon: '📄', title: 'Upload Notes',         tag: 'Smart Import', color: '#f59e0b', glow: 'rgba(245,158,11,0.3)',  desc: 'Drop your PDF or TXT notes. MindForge instantly converts them into quizzes and flashcards.' },
  { icon: '📊', title: 'Performance Tracker', tag: 'Analytics',    color: '#06b6d4', glow: 'rgba(6,182,212,0.3)',   desc: 'Visual streaks, accuracy charts, and topic mastery scores. See your growth in real time.' },
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const featureRefs = useRef([]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = featureRefs.current.indexOf(e.target);
          if (idx !== -1) setActiveFeature(idx);
        }
      }),
      { threshold: 0.45, rootMargin: '-5% 0px -5% 0px' }
    );
    featureRefs.current.forEach(r => r && obs.observe(r));
    return () => obs.disconnect();
  }, []);

  return (
    <div className={styles.page}>

      {/* NAVBAR */}
      <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <div className={styles.navInner}>
          <Link to="/" className={styles.navLogo}>
            <MindForgeLogoFull size={34} />
          </Link>
          <nav className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#cta">Get Started</a>
          </nav>
          <div className={styles.navActions}>
            <Link to="/login" className={styles.navLogin}>Sign In</Link>
            <Link to="/register" className={styles.navCta}>Start Free →</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden>
          <div className={styles.grid} />
          <div className={styles.blob1} />
          <div className={styles.blob2} />
          <div className={styles.blob3} />
        </div>

        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <span className={styles.badgeDot} />
              AI-Powered Learning Platform
            </div>
            <h1 className={styles.heroTitle}>
              Study Smarter<br />
              with <span className={styles.heroGradient}>MindForge</span>
            </h1>
            <p className={styles.heroSub}>
              <TypeWriter texts={[
                'Generate quizzes from any topic instantly.',
                'Flip through AI flashcards for deep retention.',
                'Daily brain workouts to stay sharp.',
                'Upload notes → get quizzes in seconds.',
                'Your AI study companion, always ready.',
              ]} />
            </p>
            <div className={styles.heroCtas}>
              <Link to="/register" className={styles.ctaPrimary}>
                <span className={styles.ctaShine} />
                ⚡ Start Learning Free
              </Link>
              <a href="#features" className={styles.ctaSecondary}>Explore Features ↓</a>
            </div>
            <div className={styles.heroStats}>
              {[['10K+','Students'],['50+','Topics'],['99%','Accuracy'],['24/7','AI Ready']].map(([n,l]) => (
                <div key={l} className={styles.stat}>
                  <span className={styles.statNum}>{n}</span>
                  <span className={styles.statLabel}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          <HeroVisual />
        </div>

        <div className={styles.scrollHint}>
          <div className={styles.scrollMouse}><div className={styles.scrollDot} /></div>
          <span>Scroll to explore</span>
        </div>
      </section>

      {/* FEATURES */}
      <section className={styles.featuresSection} id="features">
        <div className={styles.sectionWrap}>
          <FadeUp>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTag}>Everything you need</span>
              <h2 className={styles.sectionTitle}>
                One platform.<br />
                <span className={styles.heroGradient}>Infinite learning.</span>
              </h2>
              <p className={styles.sectionSub}>
                MindForge combines AI, quizzes, flashcards, and brain training into one seamless experience.
              </p>
            </div>
          </FadeUp>

          <div className={styles.featureLayout} id="how">
            <div className={styles.progressRail}>
              <div className={styles.railTrack}>
                <div className={styles.railFill} style={{ height: `${(activeFeature / (FEATURES.length - 1)) * 100}%` }} />
              </div>
              {FEATURES.map((f, i) => (
                <button key={f.title}
                  className={`${styles.railDot} ${activeFeature === i ? styles.railDotActive : ''}`}
                  style={{ '--color': f.color }}
                  onClick={() => featureRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                  <span className={styles.railTooltip}>{f.title}</span>
                </button>
              ))}
            </div>

            <div className={styles.featureCards}>
              {FEATURES.map((f, i) => (
                <div key={f.title}
                  ref={el => featureRefs.current[i] = el}
                  className={`${styles.featureCard} ${activeFeature === i ? styles.featureCardActive : ''}`}
                  style={{ '--color': f.color, '--glow': f.glow }}>
                  <div className={styles.featureCardInner}>
                    <div className={styles.featureTop}>
                      <div className={styles.featureIconWrap}
                        style={{ background: `${f.color}18`, border: `1.5px solid ${f.color}35` }}>
                        <span className={styles.featureIcon}>{f.icon}</span>
                      </div>
                      <span className={styles.featureTag} style={{ color: f.color, background: `${f.color}15` }}>{f.tag}</span>
                    </div>
                    <h3 className={styles.featureTitle}>{f.title}</h3>
                    <p className={styles.featureDesc}>{f.desc}</p>
                    <Link to="/register" className={styles.featureLink} style={{ color: f.color }}>Try it free →</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.howSection}>
        <div className={styles.sectionWrap}>
          <FadeUp>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTag}>Simple by design</span>
              <h2 className={styles.sectionTitle}>
                Up and running<br />
                <span className={styles.heroGradient}>in 3 steps</span>
              </h2>
            </div>
          </FadeUp>
          <div className={styles.steps}>
            {[
              { n: '01', icon: '🔐', title: 'Create your account',           desc: 'Sign up free in seconds. No credit card required.' },
              { n: '02', icon: '💬', title: 'Ask, upload, or choose a topic', desc: 'Type a question, upload your notes, or pick from your history.' },
              { n: '03', icon: '🚀', title: 'Learn, quiz, and grow',          desc: 'Generate quizzes, flip flashcards, and track your progress daily.' },
            ].map((s, i) => (
              <FadeUp key={i} delay={i * 100}>
                <div className={styles.step}>
                  <div className={styles.stepNum}>{s.n}</div>
                  <div className={styles.stepIcon}>{s.icon}</div>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className={styles.ctaSection} id="cta">
        <div className={styles.ctaBg} aria-hidden>
          <div className={styles.ctaBlob1} />
          <div className={styles.ctaBlob2} />
        </div>
        <FadeUp>
          <div className={styles.ctaContent}>
            <div className={styles.ctaBadge}>🔥 Join thousands of learners</div>
            <h2 className={styles.ctaTitle}>
              Your brain deserves<br />
              <span className={styles.heroGradient}>better tools.</span>
            </h2>
            <p className={styles.ctaSub}>MindForge is free to start. No limits on curiosity.</p>
            <div className={styles.ctaButtons}>
              <Link to="/register" className={styles.ctaPrimary}>
                <span className={styles.ctaShine} />
                ⚡ Open MindForge Free
              </Link>
              <Link to="/login" className={styles.ctaSecondary}>Already have an account →</Link>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <MindForgeLogoFull size={26} />
        </div>
        <p className={styles.footerText}>© 2025 MindForge. Built for curious minds.</p>
        <div className={styles.footerLinks}>
          <Link to="/login">Sign In</Link>
          <Link to="/register">Register</Link>
        </div>
      </footer>
    </div>
  );
}
