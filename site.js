'use strict';

// Analytics: the same GA4 events as before (download_click, contact_click, releases_click,
// navigation_click, demo_interaction, section_view, faq_open).
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
function trackEvent(name, parameters) { window.gtag('event', name, parameters); }

function trackLinkClick(event) {
  const link = event.target.closest('a[data-analytics]');
  if (!link || event.defaultPrevented) return;
  const parameters = { cta_location: link.dataset.location };
  if (link.dataset.analytics === 'navigation_click') {
    parameters.nav_target = link.dataset.target;
  } else {
    parameters.link_url = link.href;
    parameters.link_domain = new URL(link.href).hostname;
  }
  if (link.dataset.analytics === 'download_click') {
    parameters.file_name = link.dataset.file;
    parameters.file_extension = link.dataset.file.split('.').pop();
    parameters.platform = link.dataset.platform;
  }
  if (link.dataset.analytics === 'contact_click') parameters.contact_method = 'telegram';
  trackEvent(link.dataset.analytics, parameters);
}
document.addEventListener('click', trackLinkClick);
document.addEventListener('auxclick', event => { if (event.button === 1) trackLinkClick(event); });
document.querySelectorAll('.faq details').forEach(item => {
  item.addEventListener('toggle', () => { if (item.open) trackEvent('faq_open', { faq_question: item.dataset.question }); });
});
if ('IntersectionObserver' in window) {
  const viewed = new Set();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || document.visibilityState !== 'visible' || viewed.has(entry.target)) return;
      viewed.add(entry.target);
      trackEvent('section_view', { section_name: entry.target.dataset.section });
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.25 });
  document.querySelectorAll('[data-section]').forEach(section => observer.observe(section));
}

// The system was detected in <head> (html[data-os]); downloads and screenshots follow it.
document.addEventListener('click', event => {
  const link = event.target.closest('a.download');
  if (link) document.querySelectorAll(`.hint[data-hint="${link.dataset.platform}"]`).forEach(hint => { hint.hidden = false; });
});

// Mac demo: Svitlyk's panel under the menu bar. The bulb opens and closes it; the switch shows both states.
const macDemo = document.querySelector('.mac-demo');
if (macDemo) {
  const panel = macDemo.querySelector('#mac-panel');
  const bulb = macDemo.querySelector('#mac-bulb');
  const sw = macDemo.querySelector('#mac-switch');
  const field = name => macDemo.querySelector(`[data-mac="${name}"]`);
  // Today: on 00–07, off 07–10:30, on 10:30–16, off 16–19:30, on 19:30–24 (hours).
  const day = [[0, 7, 'on'], [7, 10.5, 'off'], [10.5, 16, 'on'], [16, 19.5, 'off'], [19.5, 24, 'on']];
  const states = {
    on: { now: 12.55, title: 'Світло є', end: 16, caption: 'До вимкнення о 16:00', clock: 'Пн 16 лист. 12:33',
      nextLabel: 'Наступне вимкнення', next: '16:00 — 19:30 · 3 год 30 хв',
      source: 'Від мережі', volt: '229 В', soc: 86, row1: ['До повного заряду', '18 хв'], row2: ['Бере з мережі', '900 Вт'] },
    off: { now: 16.83, title: 'Світла немає', end: 19.5, caption: 'До ввімкнення о 19:30', clock: 'Пн 16 лист. 16:50',
      nextLabel: 'Потім світло є', next: '19:30 — 24:00 · 4 год 30 хв',
      source: 'Від батареї', volt: '230 В', soc: 64, row1: ['Вистачить приблизно на', '5 год 40 хв'], row2: ['Навантаження', '320 Вт'] },
  };
  const hours = h => `${Number.isInteger(h) ? h : h.toString().replace('.', ',')} год`;
  let mode = 'on';
  let started = Date.now();
  function paint() {
    const st = states[mode];
    macDemo.dataset.light = mode;
    field('title').textContent = st.title;
    field('caption').textContent = st.caption;
    field('next-label').textContent = st.nextLabel;
    field('next').textContent = st.next;
    field('source').textContent = st.source;
    field('volt').textContent = st.volt;
    field('soc').textContent = `${st.soc}%`;
    field('soc-bar').style.width = `${st.soc}%`;
    field('row1').textContent = st.row1[0]; field('row1v').textContent = st.row1[1];
    field('row2').textContent = st.row2[0]; field('row2v').textContent = st.row2[1];
    macDemo.querySelector('#mac-clock').textContent = st.clock;
    field('pills').innerHTML = day.map(([from, to, kind]) => {
      const now = st.now >= from && st.now < to ? ' is-now' : '';
      return `<i class="${kind}${now}" style="--d:${to - from}">${hours(to - from)}</i>`;
    }).join('');
    started = Date.now();
    tick();
  }
  // The countdown runs like the app's: seconds tick down to the next change.
  function tick() {
    const st = states[mode];
    const left = Math.max(0, Math.round((st.end - st.now) * 3600 - (Date.now() - started) / 1000));
    field('h').textContent = Math.floor(left / 3600);
    field('m').textContent = Math.floor(left / 60) % 60;
    field('s').textContent = `${String(left % 60).padStart(2, '0')} с`;
  }
  setInterval(tick, 1000);
  bulb.addEventListener('click', () => {
    const open = panel.classList.toggle('is-closed') === false;
    bulb.setAttribute('aria-expanded', String(open));
    bulb.setAttribute('aria-label', open ? 'Сховати приклад Світлика' : 'Відкрити приклад Світлика');
    trackEvent('demo_interaction', { demo_action: open ? 'tray_open' : 'tray_close', demo_platform: 'mac' });
  });
  sw.addEventListener('click', () => {
    mode = mode === 'on' ? 'off' : 'on';
    sw.setAttribute('aria-pressed', String(mode === 'off'));
    sw.querySelector('.button-label').textContent = mode === 'off' ? 'Показати зі світлом' : 'Показати без світла';
    panel.classList.remove('is-closed');
    bulb.setAttribute('aria-expanded', 'true');
    paint();
    trackEvent('demo_interaction', { demo_action: 'state_change', demo_state: mode, demo_platform: 'mac' });
  });
  paint();
}

// Copy the Terminal command in one press.
document.querySelectorAll('.copy').forEach(button => {
  button.addEventListener('click', async () => {
    const text = document.querySelector(button.dataset.copy).textContent;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector(button.dataset.copy));
      getSelection().removeAllRanges(); getSelection().addRange(range);
    }
    button.textContent = 'Скопійовано';
    setTimeout(() => { button.textContent = 'Скопіювати'; }, 2500);
    trackEvent('demo_interaction', { demo_action: 'copy_command' });
  });
});
