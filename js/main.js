// ===== Klar & Simple – Main JS =====

// ----- Year -----
document.getElementById('year').textContent = new Date().getFullYear();

// ----- Reveal-on-scroll -----
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));

// ----- Scroll-linked slide-in for [data-slide-in] -----
const slideEls = Array.from(document.querySelectorAll('[data-slide-in]'));

function updateSlideProgress() {
  const vh = window.innerHeight;
  // Start animating when top of element hits bottom of viewport,
  // finish when top of element reaches 55% of viewport height.
  const startAt = 1.15;  // element top at 115% of vh from top → progress 0 (starts earlier)
  const endAt   = 0.15;  // element top at 15% of vh → progress 1 (finishes later)
  slideEls.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const t = rect.top / vh;                         // 1 when just entering bottom
    const raw = (startAt - t) / (startAt - endAt);   // 0 → 1
    const p = Math.max(0, Math.min(1, raw));
    // Ease out cubic for a smooth finish
    const eased = 1 - Math.pow(1 - p, 3);
    el.style.setProperty('--p', eased.toFixed(3));
  });
}

let slideTicking = false;
function onScrollSlide() {
  if (slideTicking) return;
  slideTicking = true;
  requestAnimationFrame(() => {
    updateSlideProgress();
    slideTicking = false;
  });
}

updateSlideProgress();
window.addEventListener('scroll', onScrollSlide, { passive: true });
window.addEventListener('resize', onScrollSlide);

// ----- Number counters -----
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1800;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const value = Math.floor(target * eased);
      el.textContent = value.toLocaleString('de-DE') + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.6 });

document.querySelectorAll('[data-counter]').forEach((el) => counterObserver.observe(el));

// ----- Nav scrolled state -----
const nav = document.getElementById('nav');
const setNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 20);
setNav();
window.addEventListener('scroll', setNav, { passive: true });

// ----- YouTube video feed -----
const CHANNEL_ID = 'UCHsV70H6L1F6dsONYVjH6Tg'; // @klarundsimple
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const API = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;
const CACHE_KEY = 'ks-videos-cache-v1';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const track = document.getElementById('videos-track');
const skeletonTpl = document.getElementById('video-skeleton');

function renderSkeletons(n = 6) {
  track.innerHTML = '';
  for (let i = 0; i < n; i++) {
    track.appendChild(skeletonTpl.content.cloneNode(true));
  }
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function extractVideoId(link) {
  try {
    const url = new URL(link);
    return url.searchParams.get('v') || '';
  } catch { return ''; }
}

function buildCard(item) {
  const id = extractVideoId(item.link);
  const thumb = id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : (item.thumbnail || '');
  const card = document.createElement('a');
  card.className = 'video-card w-[280px] sm:w-[400px] lg:w-[500px] shrink-0';
  card.href = item.link;
  card.target = '_blank';
  card.rel = 'noopener';
  card.innerHTML = `
    <div class="thumb">
      ${thumb ? `<img src="${thumb}" alt="" loading="lazy" />` : ''}
      <div class="play-btn" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </div>
    </div>
    <div class="p-5">
      <h3 class="font-display font-bold text-lg leading-snug line-clamp-2">
        ${escapeHtml(item.title)}
      </h3>
      <div class="mt-3 flex items-center gap-3 text-xs text-white/50">
        <span>${formatDate(item.pubDate)}</span>
        <span class="w-1 h-1 rounded-full bg-white/30"></span>
        <span class="uppercase tracking-widest">Klar &amp; Simple</span>
      </div>
    </div>
  `;
  return card;
}

function renderVideos(items) {
  track.innerHTML = '';
  const list = items.slice(0, 10);
  // Original set
  list.forEach(item => track.appendChild(buildCard(item)));
  // Duplicate for seamless marquee loop
  list.forEach(item => {
    const clone = buildCard(item);
    clone.setAttribute('aria-hidden', 'true');
    clone.tabIndex = -1;
    track.appendChild(clone);
  });

  // Set animation duration based on number of cards (slow enough to read)
  const duration = Math.max(30, list.length * 6);
  track.style.setProperty('--marquee-duration', duration + 's');
  track.classList.add('is-scrolling');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

async function loadVideos() {
  // Try cache first
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      renderVideos(cached.items);
      return;
    }
  } catch {}

  renderSkeletons();

  try {
    const res = await fetch(API);
    const data = await res.json();
    if (data.status === 'ok' && data.items && data.items.length) {
      renderVideos(data.items);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items: data.items })); } catch {}
    } else {
      throw new Error('Feed leer');
    }
  } catch (err) {
    console.error('Video feed error:', err);
    // Fallback: show link to YouTube
    track.innerHTML = `
      <div class="w-full text-center py-16 rounded-2xl bg-ink-800/70 border border-white/10">
        <div class="text-white/60">Videos konnten nicht geladen werden.</div>
        <a href="https://www.youtube.com/@klarundsimple/videos" target="_blank" rel="noopener"
           class="mt-4 inline-block text-brand-400 hover:text-brand-300 font-semibold cursor-pointer">
          Direkt zu YouTube →
        </a>
      </div>
    `;
  }
}

loadVideos();

// ----- Testimonials marquee -----
const TESTIMONIALS = [
  {
    user: '@brigitteimmelda1954',
    text: 'Das beschreibt mich und meine Kindheit so vollständig, dass ich am Ende weinen musste.',
    color: 'blue'
  },
  {
    user: '@waldemartietz7510',
    text: 'Fragen über Fragen, 70 Jahre lang… Jetzt mit 71 endlich weiß ich es. Bin überrascht, die Wahrheit zu kennen. Danke.',
    color: 'yellow'
  },
  {
    user: '@Grausis',
    text: 'Wow, du hast ein so kompliziertes Thema so gut und verständlich heruntergebrochen. Bitte mach weiterhin Videos.',
    color: 'blue'
  },
  {
    user: '@chrism2027',
    text: 'Echt interessantes Video.',
    color: 'plain'
  },
  {
    user: '@SNACKC',
    text: 'Das ist so schön erklärt und hilft mir dabei mit dem, was ich gerade übe. 🥳',
    color: 'yellow'
  },
  {
    user: '@nelewiede2191',
    text: 'Vielen lieben Dank für deine Videos! Bitte mach weiter 🙏 Alles Gute für dich!',
    color: 'plain'
  },
  {
    user: '@KristinaReiche',
    text: 'Jetzt erst mit über 60 Jahren zu verstehen, wie komplex es ist, die Zusammenhänge zu begreifen — und dabei die Traurigkeit und Scham über sich selbst durch diese neuen Erkenntnisse loszulassen. Danke für den Beitrag, das hilft mir zu wachsen.',
    color: 'blue'
  },
  {
    user: '@ilonarichter3198',
    text: '100 % das bin ich. Danke ❤️',
    color: 'plain'
  },
  // ↓↓↓ Platzhalter – später gegen echte Kommentare austauschen ↓↓↓
  {
    user: '@marlene_h87',
    text: 'Ich schaue deine Videos meistens abends und komme danach total runter. Das ist wie eine kleine Therapie zwischendurch.',
    color: 'blue'
  },
  {
    user: '@dieterk1961',
    text: 'Endlich mal jemand, der nicht labert, sondern es auf den Punkt bringt. Weiter so!',
    color: 'plain'
  },
  {
    user: '@sofia.lindenberg',
    text: 'Habe deinen Kanal gestern entdeckt und schon 5 Videos hintereinander geschaut. Wo warst du die letzten Jahre?',
    color: 'yellow'
  },
  {
    user: '@jannis_schulz',
    text: 'Krass, wie treffend du das erklärst. Ich habe gerade wirklich Gänsehaut bekommen.',
    color: 'plain'
  },
  {
    user: '@petra_wolf72',
    text: 'Das Video hat mich zum Nachdenken gebracht. Nach Jahren der Therapie hast du in 15 Minuten etwas erklärt, was mir vorher niemand so klar gemacht hat.',
    color: 'blue'
  },
  {
    user: '@lukas.mendel',
    text: 'Bin hier durch Zufall gelandet und schon abonniert. Ganz großes Kino, was du hier machst.',
    color: 'plain'
  },
  {
    user: '@annakathrin_p',
    text: 'Deine ruhige Art zusammen mit der klaren Erklärung — genau das brauche ich gerade in meinem Leben. Vielen Dank!',
    color: 'yellow'
  },
  {
    user: '@thomasbergmann',
    text: 'Ich bin selbst Psychologe und finde deine Videos richtig gut aufbereitet. Empfehle sie sogar meinen Klienten.',
    color: 'blue'
  },
  {
    user: '@juliaschmitz_92',
    text: 'Das ist genau das Thema, mit dem ich mich seit Wochen beschäftige. Perfektes Timing! Danke ✨',
    color: 'plain'
  },
  {
    user: '@michael_hardt',
    text: 'Bitte mach unbedingt weiter mit dem Kanal. Deine Videos sind Gold wert in dieser Zeit.',
    color: 'plain'
  }
];

function buildTestimonial(t) {
  const colorClass = t.color === 'blue'   ? 'testi-blue'
                   : t.color === 'yellow' ? 'testi-yellow'
                   : 'testi-plain';
  const initial = t.user.replace('@','').charAt(0).toUpperCase();
  return `
    <article class="testi-card ${colorClass}">
      <svg class="testi-quote" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M12 8v6c0 4-2 7-6 8v-3c2-1 3-2 3-4H6V8h6zm14 0v6c0 4-2 7-6 8v-3c2-1 3-2 3-4h-3V8h6z"/></svg>
      <p class="testi-text">${t.text}</p>
      <div class="testi-user">
        <div class="testi-avatar">${initial}</div>
        <div>
          <div class="testi-name">${t.user}</div>
          <div class="testi-source">via YouTube</div>
        </div>
      </div>
    </article>
  `;
}

const track1 = document.querySelector('.testi-track-1');
const track2 = document.querySelector('.testi-track-2');
if (track1 && track2) {
  // Split roughly in half – odd-indexed to row 1, even to row 2 for variety
  const half1 = TESTIMONIALS.filter((_, i) => i % 2 === 0);
  const half2 = TESTIMONIALS.filter((_, i) => i % 2 === 1);
  const build = (arr) => arr.map(buildTestimonial).join('') + arr.map(buildTestimonial).join('');
  track1.innerHTML = build(half1);
  track2.innerHTML = build(half2);
}

// ----- Avatar video: play once when in view -----
const avatarVideo = document.getElementById('avatar-video');
if (avatarVideo) {
  let hasPlayed = false;
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !hasPlayed) {
        hasPlayed = true;
        avatarVideo.currentTime = 0;
        avatarVideo.play().catch(() => {});
        videoObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  videoObserver.observe(avatarVideo);
}

// ----- Mobile hamburger menu -----
const menuBtn = document.getElementById('mobile-menu-btn');
const menuPanel = document.getElementById('mobile-menu');
const iconOpen = document.getElementById('menu-icon-open');
const iconClose = document.getElementById('menu-icon-close');
if (menuBtn && menuPanel) {
  const toggle = (open) => {
    const isOpen = open !== undefined ? open : menuPanel.classList.contains('hidden');
    menuPanel.classList.toggle('hidden', !isOpen);
    iconOpen.classList.toggle('hidden', isOpen);
    iconClose.classList.toggle('hidden', !isOpen);
  };
  menuBtn.addEventListener('click', () => toggle());
  // close when clicking a link inside the menu
  menuPanel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggle(false)));
}

// ----- Flip cards: tap to flip on touch devices -----
if (matchMedia('(hover: none)').matches) {
  document.querySelectorAll('.flip-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      // If they clicked an actual link/button inside, let that action happen instead
      if (e.target.closest('a, button')) return;
      card.classList.toggle('is-flipped');
    });
  });
}

// ----- Scroll progress bar -----
const progressBar = document.getElementById('scroll-progress');
if (progressBar) {
  const updateProgress = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const p = docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0;
    progressBar.style.transform = `scaleX(${p})`;
  };
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
}

// ----- Smooth-scroll for anchor links (nav offset) -----
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href');
    if (href.length < 2) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});
