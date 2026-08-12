/**
 * ─────────────────────────────────────────────────────────────────────────
 *  animations.js — presentation-only enhancement layer (anime.js)
 * ─────────────────────────────────────────────────────────────────────────
 *  Adds page-load, on-scroll and hover animations on top of the existing
 *  markup/behavior. Deliberately does NOT touch main.js, product-details.js
 *  or any of the lib/*.js files, and never changes layout, colors, fonts,
 *  or element order — only opacity/transform, which are reset to a neutral
 *  state once each animation finishes.
 *
 *  Fully optional / non-blocking:
 *  - If the anime.js CDN fails to load, this file no-ops and the page
 *    behaves exactly as it did before (no hidden content, nothing broken).
 *  - If the visitor has "prefers-reduced-motion" enabled, this file no-ops.
 *  - Runs in its own DOMContentLoaded handler *after* main.js's handler
 *    (script order in index.html), so it only ever animates content that
 *    main.js has already filled in — never placeholder/empty elements.
 * ─────────────────────────────────────────────────────────────────────────
 */
document.addEventListener('DOMContentLoaded', () => {

  if (typeof anime === 'undefined') return; // CDN blocked/offline — do nothing
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const EASE = 'easeOutCubic';

  // Clears any inline style anime.js left behind so elements return to
  // being fully controlled by the stylesheet again (important for the
  // sticky gallery / sticky header, which rely on CSS for positioning).
  function clearInlineStyle(el, props) {
    if (!el) return;
    props.forEach(p => { el.style[p] = ''; });
  }

  // ── 1) Page-load entrance: hero content fades/slides in, staggered ──
  (function heroEntrance() {
    const targets = [
      document.querySelector('.gallery--desktop'),
      document.querySelector('.gallery--mobile'),
      document.querySelector('.product-title'),
      document.querySelector('.product-description'),
      document.querySelector('.price-row'),
      document.querySelector('.order-box'),
    ].filter(Boolean);

    if (!targets.length) return;

    anime.set(targets, { opacity: 0, translateY: 14 });

    anime.timeline({ easing: EASE })
      .add({
        targets,
        opacity: [0, 1],
        translateY: [14, 0],
        duration: 550,
        delay: anime.stagger(80),
        complete: () => targets.forEach(el => clearInlineStyle(el, ['opacity', 'transform'])),
      });
  })();

  // ── 2) Sticky mobile buy bar: slide up once, shortly after load ─────
  (function buybarEntrance() {
    const bar = document.querySelector('.mobile-buybar');
    if (!bar) return;
    anime.set(bar, { translateY: 20, opacity: 0 });
    anime({
      targets: bar,
      translateY: [20, 0],
      opacity: [0, 1],
      duration: 500,
      delay: 300,
      easing: EASE,
      complete: () => clearInlineStyle(bar, ['transform', 'opacity']),
    });
  })();

  // ── 3) On-scroll reveal: testimonial images fade/slide in as they ───
  //     enter the viewport (each one animates once, independently).
  (function testimonialsOnScroll() {
    const heading = document.querySelector('.testimonials__heading');
    const grid = document.getElementById('testimonials-grid');
    if (!grid) return;

    const revealEl = (el, index = 0) => {
      anime.set(el, { opacity: 0, translateY: 24 });
      anime({
        targets: el,
        opacity: [0, 1],
        translateY: [24, 0],
        duration: 600,
        delay: index * 60,
        easing: EASE,
        complete: () => clearInlineStyle(el, ['opacity', 'transform']),
      });
    };

    if (!('IntersectionObserver' in window)) {
      // Fallback: just show them, no animation.
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        revealEl(el, Number(el.dataset.revealIndex || 0));
        obs.unobserve(el);
      });
    }, { threshold: 0.15 });

    function observeCards() {
      const imgs = grid.querySelectorAll('img');
      imgs.forEach((img, i) => {
        img.dataset.revealIndex = i;
        observer.observe(img);
      });
    }

    if (heading) {
      const headingObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          revealEl(entry.target);
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.4 });
      headingObserver.observe(heading);
    }

    // Testimonials are rendered synchronously by main.js before this file's
    // DOMContentLoaded handler runs, but guard with a small retry in case a
    // future edit makes that async.
    if (grid.querySelector('img')) {
      observeCards();
    } else {
      const mo = new MutationObserver(() => {
        if (grid.querySelector('img')) {
          observeCards();
          mo.disconnect();
        }
      });
      mo.observe(grid, { childList: true });
    }
  })();

  // ── 4) Hover micro-interactions (desktop pointer only) ──────────────
  const hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (hasHover) {
    const hoverPop = (el, scale = 1.02) => {
      if (!el) return;
      el.addEventListener('mouseenter', () => {
        anime({ targets: el, scale, duration: 180, easing: 'easeOutQuad' });
      });
      el.addEventListener('mouseleave', () => {
        anime({
          targets: el,
          scale: 1,
          duration: 180,
          easing: 'easeOutQuad',
          complete: () => clearInlineStyle(el, ['transform']),
        });
      });
    };

    document.querySelectorAll('.package').forEach(el => hoverPop(el, 1.015));
    document.querySelectorAll('.delivery-card').forEach(el => hoverPop(el, 1.02));
    hoverPop(document.querySelector('.buy-btn'), 1.02);
  }

  // ── 5) Tiny "confirm" pulse when a package/delivery option is picked ─
  //     (purely visual — the actual selection logic still lives in main.js)
  function attachSelectPulse(selector) {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener('click', () => {
        anime({
          targets: el,
          scale: [1, 1.04, 1],
          duration: 260,
          easing: 'easeOutQuad',
          complete: () => clearInlineStyle(el, ['transform']),
        });
      });
    });
  }
  attachSelectPulse('.package');
  attachSelectPulse('.delivery-card');

  // ── 6) Discount badges: playful pop-in + gentle idle "breathing" pulse ─
  (function discountBadgePop() {
    const badges = document.querySelectorAll('.discount-badge, .package__discount');
    if (!badges.length) return;

    badges.forEach((badge, i) => {
      if (!badge.textContent.trim()) return; // nothing to show — skip
      anime.set(badge, { scale: 0, rotate: -8 });
      anime({
        targets: badge,
        scale: [0, 1.15, 1],
        rotate: [-8, 0],
        duration: 650,
        delay: 500 + i * 90,
        easing: 'easeOutElastic(1, .6)',
        complete: () => {
          clearInlineStyle(badge, ['transform']);
          // Subtle, youthful "breathing" loop once it has landed
          anime({
            targets: badge,
            scale: [1, 1.06, 1],
            duration: 1400,
            easing: 'easeInOutSine',
            loop: true,
          });
        },
      });
    });
  })();

  // ── 7) Floating WhatsApp button: pop in, then a soft radar-style ping ─
  (function whatsappFab() {
    const fab = document.querySelector('.whatsapp-fab');
    if (!fab) return;

    anime.set(fab, { scale: 0 });
    anime({
      targets: fab,
      scale: [0, 1],
      duration: 500,
      delay: 900,
      easing: 'easeOutBack',
      complete: () => {
        clearInlineStyle(fab, ['transform']);

        // Radar "ping" ring — a temporary element, purely decorative,
        // removed from the DOM after each pulse (never affects layout).
        const ring = document.createElement('span');
        ring.setAttribute('aria-hidden', 'true');
        ring.style.cssText = 'position:absolute;inset:0;border-radius:50%;background:#25d366;pointer-events:none;';
        fab.style.position = 'fixed'; // already fixed via CSS; keep JS in sync
        fab.appendChild(ring);

        anime({
          targets: ring,
          scale: [1, 1.9],
          opacity: [0.55, 0],
          duration: 1600,
          easing: 'easeOutSine',
          loop: true,
        });
      },
    });
  })();

  // ── 8) On-scroll reveal for the delivery options and details/summary ─
  (function sectionsOnScroll() {
    if (!('IntersectionObserver' in window)) return;
    const targets = [
      document.querySelector('.delivery-section'),
      document.querySelector('.summary'),
    ].filter(Boolean);
    if (!targets.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        anime.set(el, { opacity: 0, translateY: 20 });
        anime({
          targets: el,
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 600,
          easing: EASE,
          complete: () => clearInlineStyle(el, ['opacity', 'transform']),
        });
        obs.unobserve(el);
      });
    }, { threshold: 0.2 });

    targets.forEach(el => observer.observe(el));
  })();

  // ── 9) Animated price count-up whenever the selected package changes ─
  //     (purely visual — main.js still owns which package is selected)
  (function priceCountUp() {
    const priceTargets = [
      document.getElementById('product-price'),
      document.getElementById('sticky-product-price'),
      document.getElementById('mobile-buy-price'),
    ].filter(Boolean);
    if (!priceTargets.length) return;

    priceTargets.forEach(el => {
      let lastValue = parseInt(el.textContent, 10) || 0;
      const mo = new MutationObserver(() => {
        const text = el.textContent || '';
        const newValue = parseInt(text, 10);
        if (!Number.isFinite(newValue) || newValue === lastValue) return;
        const suffix = text.replace(/^[0-9]+/, ''); // e.g. " دج" / "دج"
        const from = { val: lastValue };
        lastValue = newValue;
        mo.disconnect(); // avoid reacting to our own writes below
        anime({
          targets: from,
          val: newValue,
          duration: 450,
          easing: 'easeOutCubic',
          round: 1,
          update: () => { el.textContent = `${from.val}${suffix}`; },
          complete: () => mo.observe(el, { childList: true, characterData: true, subtree: true }),
        });
      });
      mo.observe(el, { childList: true, characterData: true, subtree: true });
    });
  })();

  // ── 10) Buy button: subtle periodic "shine" sweep to draw the eye ────
  (function buyButtonShine() {
    const btn = document.querySelector('.buy-btn');
    if (!btn) return;

    // A clipping mask sized to the button (so the sweep stays inside its
    // rounded shape) — kept separate from .buy-btn's own overflow, which
    // must stay visible for the price-tag ribbon to poke outside it.
    const clip = document.createElement('span');
    clip.setAttribute('aria-hidden', 'true');
    clip.style.cssText = 'position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none;';

    const shine = document.createElement('span');
    shine.style.cssText = [
      'position:absolute', 'top:0', 'bottom:0', 'left:-40%', 'width:35%',
      'background:linear-gradient(115deg, transparent, rgba(255,255,255,.35), transparent)',
    ].join(';');

    clip.appendChild(shine);
    btn.appendChild(clip);

    anime({
      targets: shine,
      translateX: ['0%', '260%'],
      duration: 1300,
      easing: 'easeInOutSine',
      loop: true,
      delay: 2000,
      endDelay: 2600, // pause between sweeps so it stays subtle, not gimmicky
    });
  })();
});
