/* Nivesh: KYC onboarding concept (Vritti Khetan)
   One continuous journey. Plain JavaScript, no build step.
   Edit screen text inside SCREENS below. */

const $ = (s) => document.querySelector(s)
const app = $('#app')
const notifEl = $('#notif')
const sheetEl = $('#sheet')

// ---------- State ----------
let ctx, history, currentKey, currentParams, timers
function freshState() {
  ctx = { lang: 'en', reminder: '', resumeTo: 'pan', notify: true, file: false, signed: false, retake: false, fixed: false, otpFilled: false }
  history = []
  currentKey = null
  currentParams = {}
  timers = []
}
const later = (fn, ms) => timers.push(setTimeout(fn, ms))
const clearTimers = () => { timers.forEach(clearTimeout); timers = [] }

// ---------- HTML helpers ----------
const btn = (label, attrs, kind = 'primary', disabled = false) => `<button class="btn ${kind}" ${attrs} ${disabled ? 'disabled' : ''}>${label}</button>`
const field = (label, value, source) => `<div class="field"><div class="f-label">${label}</div><div class="f-value">${value}</div>${source ? `<div class="f-src">✓ ${source}</div>` : ''}</div>`
const banner = (type, title, body = '') => `<div class="banner ${type}">${title ? `<strong>${title}</strong>` : ''}${body ? `<div>${body}</div>` : ''}</div>`
const option = (title, sub, attrs, extra = '') => `<button class="option ${extra}" ${attrs}><span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span><i>›</i>${extra.includes('rec') ? '<em class="pill">Recommended</em>' : ''}</button>`
const NEW = (name, html) => `<div class="nw" data-new="${name}">${html}</div>`
const timeline = (items) => `<ol class="tl">${items.map(([t, n, s]) => `<li class="${s}"><span class="dot">${s === 'done' ? '✓' : s === 'warn' ? '!' : ''}</span><div><b>${t}</b>${n ? `<small>${n}</small>` : ''}</div></li>`).join('')}</ol>`
const eta = (label, value) => `<div class="eta"><small>${label}</small><b>${value}</b><span class="who">Waiting on: our partners, not you</span></div>`

// Simple inline illustrations
const ART = {
  grow: `<svg viewBox="0 0 200 140" class="art"><rect x="20" y="90" width="26" height="40" rx="5" fill="#cdeee3"/><rect x="58" y="70" width="26" height="60" rx="5" fill="#9fe0c9"/><rect x="96" y="50" width="26" height="80" rx="5" fill="#5ccaa5"/><rect x="134" y="25" width="26" height="105" rx="5" fill="#0fa47a"/><path d="M25 80 L70 58 L108 40 L150 14" stroke="#0b7d5d" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="150" cy="14" r="7" fill="#0b7d5d"/></svg>`,
  bell: `<svg viewBox="0 0 120 120" class="art sm"><circle cx="60" cy="60" r="52" fill="#e8f6f0"/><path d="M60 30c-13 0-22 10-22 23v15l-7 9h58l-7-9V53c0-13-9-23-22-23z" fill="#0fa47a"/><circle cx="60" cy="84" r="7" fill="#0b7d5d"/></svg>`,
  check: `<svg viewBox="0 0 120 120" class="art sm"><circle cx="60" cy="60" r="52" fill="#e8f6f0"/><circle cx="60" cy="60" r="36" fill="#0fa47a"/><path d="M44 61l11 11 22-24" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  face: `<svg viewBox="0 0 120 120" class="art sm"><circle cx="60" cy="60" r="52" fill="#e8f6f0"/><circle cx="60" cy="50" r="18" fill="#0fa47a"/><path d="M28 96c4-17 17-26 32-26s28 9 32 26" fill="#0fa47a"/></svg>`,
  party: `<svg viewBox="0 0 160 120" class="art"><circle cx="80" cy="62" r="42" fill="#0fa47a"/><path d="M62 63l12 12 24-26" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22" cy="30" r="5" fill="#f5b43c"/><circle cx="140" cy="24" r="4" fill="#e8607a"/><rect x="128" y="88" width="9" height="9" rx="2" fill="#6c8cf5" transform="rotate(20 132 92)"/><rect x="18" y="86" width="8" height="8" rx="2" fill="#e8607a" transform="rotate(-15 22 90)"/><circle cx="150" cy="64" r="3" fill="#f5b43c"/><circle cx="10" cy="60" r="3" fill="#6c8cf5"/></svg>`,
  mail: `<svg viewBox="0 0 120 120" class="art sm"><circle cx="60" cy="60" r="52" fill="#e8f6f0"/><rect x="28" y="38" width="64" height="44" rx="6" fill="#0fa47a"/><path d="M30 42l30 22 30-22" stroke="#fff" stroke-width="4" fill="none" stroke-linejoin="round"/></svg>`,
}

const FIX_TEXT = {
  en: {
    title: 'One thing to fix',
    what: 'What happened',
    whatText: 'Your bank account says <b>RIYA MEHTA</b>, but your PAN says <b>RIYA MANOJ MEHTA</b>. Because the middle name is missing, the names can’t be matched automatically.',
    how: 'How to fix it',
    o1: 'Upload a bank statement or cheque', o1s: 'Showing your full name · about 2 min',
    o2: 'Use a different bank account', o2s: 'One that has your full name',
    o3: 'Talk to us', o3s: 'We can already see this issue, no need to explain',
    saved: 'Only this step needs fixing. Everything else is saved.',
  },
  hi: {
    title: 'एक चीज़ ठीक करनी है',
    what: 'क्या हुआ',
    whatText: 'आपके बैंक खाते में नाम <b>RIYA MEHTA</b> है, पर PAN पर <b>RIYA MANOJ MEHTA</b> लिखा है। बीच का नाम न होने से दोनों नाम अपने-आप मिलाए नहीं जा सके।',
    how: 'कैसे ठीक करें',
    o1: 'बैंक स्टेटमेंट या चेक अपलोड करें', o1s: 'जिसमें आपका पूरा नाम हो · लगभग 2 मिनट',
    o2: 'दूसरा बैंक खाता जोड़ें', o2s: 'जिसमें आपका पूरा नाम हो',
    o3: 'हमसे बात करें', o3s: 'हमें यह समस्या दिख रही है, दोबारा समझाने की ज़रूरत नहीं',
    saved: 'सिर्फ़ यही एक कदम ठीक करना है। बाकी सब सेव है।',
  },
}

// ---------- Screens ----------
const SCREENS = {
  welcome: () => ({
    back: false,
    body: `<div class="hero-art">${ART.grow}</div><h1 class="big">Start investing in minutes</h1><p class="sub">Stocks, mutual funds and more. Open your free account.</p>`,
    footer: btn('Open my account', 'data-go="checklist"'),
  }),

  checklist: () => ({
    title: 'Before you start',
    sub: 'It takes about 6 minutes. Keep these handy:',
    body: NEW('Before-you-start checklist', `<ul class="check">
      <li><span class="ic">🪪</span><div><b>PAN card</b><small>Or skip it, and fetch it from DigiLocker</small></div></li>
      <li><span class="ic">📱</span><div><b>Phone linked to Aadhaar</b><small>For the final signing OTP</small></div></li>
      <li><span class="ic">🏦</span><div><b>Bank account in your name</b><small>To add and withdraw money</small></div></li></ul>`),
    footer: btn('I’m ready', 'data-go="pan"') + btn('Not now, remind me later', 'data-act="laterFrom" data-to="pan"', 'ghost'),
  }),

  later: () => ({
    title: 'When should we remind you?',
    sub: 'Your progress is saved. You’ll continue right where you left off.',
    body: NEW('Save & resume',
      option('Tonight, 8:00 pm', '', 'data-act="remind" data-when="tonight at 8:00 pm"') +
      option('Tomorrow, 10:00 am', '', 'data-act="remind" data-when="tomorrow at 10:00 am"') +
      option('This weekend', '', 'data-act="remind" data-when="this weekend"')),
  }),

  saved: () => ({
    body: `<div class="center">${ART.bell}<h2 class="mid">Saved. We’ll remind you ${ctx.reminder}.</h2><p class="sub">You’ll come back exactly where you left off, with nothing to redo.</p></div>`,
    footer: btn('Actually, continue now', 'data-act="resume"', 'ghost'),
  }),

  pan: () => ({
    step: 1, stepName: 'Identity',
    title: 'Add your PAN',
    sub: 'Choose the easiest way.',
    body: NEW('DigiLocker fetch', option('Fetch from DigiLocker', 'No card, no typing · about 20 seconds', 'data-sheet="digi"', 'rec')) +
      option('Enter PAN manually', 'You’ll need your PAN card', 'data-go="panType"'),
    footer: btn('I don’t have my PAN right now', 'data-act="laterFrom" data-to="pan"', 'text'),
  }),

  panType: () => ({
    step: 1, stepName: 'Identity',
    title: 'Enter your PAN',
    body: `<label class="inp"><span>PAN number</span><input id="panInput" value="ABCPM1234K" maxlength="10" autocomplete="off" /></label>`,
    footer: btn('Continue', 'data-act="load" data-text="Verifying your PAN…" data-next="found"'),
  }),

  found: () => ({
    step: 1, stepName: 'Identity',
    title: 'Is this you?',
    sub: 'We found these details. Tap any field to edit.',
    body: NEW('Where this came from',
      field('Full name', 'RIYA MANOJ MEHTA', 'From your PAN record') +
      field('PAN', 'ABCPM••••K', 'Fetched from DigiLocker') +
      field('Date of birth', '14 Mar 2001', 'From your PAN record') +
      field('Address', 'Flat 12, Kothrud, Pune 411038', 'From your Aadhaar via DigiLocker')),
    footer: btn('Yes, that’s me', 'data-act="load" data-text="Finding your bank account…" data-next="bank"'),
  }),

  bank: () => ({
    step: 2, stepName: 'Bank',
    title: 'Confirm your bank account',
    body: field('Account holder name', 'RIYA MEHTA', 'Verified with a ₹1 test deposit') + field('Bank account', 'HDFC Bank · XXXX 4417') +
      NEW('Pre-check', banner('warn', 'Your name looks slightly different', 'PAN: <b>RIYA MANOJ MEHTA</b><br>Bank: <b>RIYA MEHTA</b><br>This can delay approval by a day or two. Fixing it now takes about 2 minutes.')),
    footer: btn('Fix it now', 'data-go="fix"') + btn('Continue anyway', 'data-go="selfie"', 'ghost'),
  }),

  fix: () => {
    const T = FIX_TEXT[ctx.lang]
    return {
      step: 2, stepName: 'Bank',
      title: T.title,
      body: NEW('Hindi messages', `<div class="lang"><button class="${ctx.lang === 'en' ? 'on' : ''}" data-act="lang" data-l="en">English</button><button class="${ctx.lang === 'hi' ? 'on' : ''}" data-act="lang" data-l="hi">हिंदी</button></div>`) +
        NEW('Fix-it screen', `<div class="what"><small>${T.what}</small><p>${T.whatText}</p></div><div class="lbl">${T.how}</div>` +
          option(T.o1, T.o1s, 'data-go="upload"') + option(T.o2, T.o2s, 'data-go="otherBank"') + option(T.o3, T.o3s, 'data-sheet="support"') +
          banner('success', '', T.saved)),
    }
  },

  upload: () => ({
    step: 2, stepName: 'Bank',
    title: 'Upload bank proof',
    sub: 'A statement or cancelled cheque showing your full name, account number and bank logo.',
    body: ctx.file
      ? `<div class="file"><span class="fi">PDF</span><div><b>hdfc_statement_nov.pdf</b><small>240 KB · ready to submit</small></div><button class="x" data-act="unfile">✕</button></div>`
      : `<button class="drop" data-act="pickFile"><b>Tap to choose a file</b><small>PDF, JPG or PNG · up to 5 MB</small></button>`,
    footer: btn('Submit', 'data-act="load" data-text="Checking your document…" data-next="bankDone"', 'primary', !ctx.file),
  }),

  otherBank: () => ({
    step: 2, stepName: 'Bank',
    title: 'Add another bank account',
    body: `<label class="inp"><span>Account number</span><input value="30219845902" /></label><label class="inp"><span>IFSC</span><input value="SBIN0001842" /></label>` +
      banner('success', 'Name on this account: RIYA MANOJ MEHTA', 'Matches your PAN ✓'),
    footer: btn('Verify account', 'data-act="load" data-text="Sending ₹1 to verify your account…" data-next="bankDone"'),
  }),

  bankDone: () => ({
    step: 2, stepName: 'Bank', back: false,
    body: `<div class="center">${ART.check}<h2 class="mid">Bank account linked</h2><p class="sub">Your name now matches your PAN. Nothing else to redo.</p></div>`,
    footer: btn('Continue', 'data-go="selfie"'),
  }),

  selfie: () => ({
    step: 3, stepName: 'Photo',
    title: 'Take a quick selfie',
    sub: 'This confirms it’s really you.',
    body: `<div class="center">${ART.face}</div><ul class="tips"><li>Face a window or a light</li><li>Remove glasses, cap or mask</li><li>Keep your face inside the circle</li></ul>`,
    footer: btn('Open camera', 'data-go="camera"'),
  }),

  camera: () => ({
    dark: true, step: ctx.retake ? null : 3, stepName: 'Photo',
    body: `<div class="cam"><div class="ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="40" r="17" fill="#3b3f4a"/><path d="M18 92c3-18 16-28 32-28s29 10 32 28" fill="#3b3f4a"/></svg></div><p>${ctx.retake ? 'Good light this time. Hold still…' : 'Hold still…'}</p></div>`,
    footer: `<button class="shutter" data-act="capture" aria-label="Capture"></button>`,
  }),

  sign: () => ({
    step: 4, stepName: 'Signature',
    title: 'Sign below',
    body: `<div class="pad-wrap"><canvas id="pad"></canvas><span class="pad-hint" id="padHint">Sign here with your finger</span></div>` +
      NEW('Explains why', `<p class="why">Why sign here <i>and</i> eSign? This signature goes on your account form, and the eSign confirms the form with Aadhaar. Rules require both.</p>`),
    footer: `<div class="row">${btn('Clear', 'data-act="clearPad"', 'ghost')}${btn('Save', 'data-go="esign" id="saveSig"', 'primary', !ctx.signed)}</div>`,
  }),

  esign: () => ({
    step: 5, stepName: 'eSign',
    title: 'eSign your application',
    sub: 'The last step: sign your form with an Aadhaar OTP.',
    body: NEW('No re-typing', field('Aadhaar', 'XXXX XXXX 4821', 'Taken from your DigiLocker, no need to type it again')) +
      `<div class="doc"><span class="fi">PDF</span><div><b>Account opening form</b><small>6 pages · <u>Preview</u></small></div></div>`,
    footer: btn('Send OTP', 'data-go="otp"'),
  }),

  otp: () => ({
    step: 5, stepName: 'eSign',
    title: 'Enter the OTP',
    body: NEW('Smart OTP help', `<p class="sub">Sent to <b>******4821</b>, the number registered with your Aadhaar. <b>It may not be the phone you’re using.</b></p>`) +
      `<div class="otp" id="otpBoxes">${'<span></span>'.repeat(6)}</div><p class="tiny" id="otpHint">Waiting for SMS…</p>` +
      `<button class="link" data-sheet="otpHelp">Didn’t get the OTP?</button>`,
    footer: btn('Verify & sign', 'data-act="load" data-text="Signing your application…" data-next="submitted" data-reset="1" id="verifyBtn"', 'primary', !ctx.otpFilled),
  }),

  notMine: () => ({
    step: 5, stepName: 'eSign',
    title: 'The OTP goes to your Aadhaar number',
    sub: 'For your safety, it can only be sent to the number registered with Aadhaar (******4821).',
    body: banner('info', 'How to fix it', 'Update your mobile number at any Aadhaar Seva Kendra. It usually takes a few days.') +
      NEW('Save & resume', banner('success', 'Your progress is saved', 'When you’re back, you’ll start right here at eSign, not from the beginning.')),
    footer: btn('Remind me in 3 days', 'data-act="remind" data-when="in 3 days" data-to="otp"'),
  }),

  submitted: () => ({
    back: false,
    body: `<div class="center">${ART.mail}<h2 class="mid">Application submitted</h2></div>` +
      NEW('Honest ending', eta('Your account should be ready by', 'Tomorrow, 6:00 pm') + `<p class="sub center-t">Nothing else is needed from you. We’ll notify you the moment it’s ready.</p>`),
    footer: btn('See my status', 'data-go="status"'),
  }),

  status: () => ({
    back: false, home: true,
    title: 'Your account is being opened',
    body: NEW('Live status card',
      (ctx.fixed ? eta('Now expected', 'Within 4 hours') : eta('Expected ready by', 'Tomorrow, 6:00 pm')) +
      timeline(ctx.fixed ? [
        ['Your details checked', 'Done · 8:04 pm', 'done'],
        ['Photo re-checked', 'Done · just now', 'done'],
        ['Opening your demat account', 'By NSDL/CDSL, the official record-keepers for shares', 'now'],
        ['Approval from stock exchanges', 'NSE and BSE', 'todo'],
        ['Ready to invest', '', 'todo'],
      ] : [
        ['Your details checked', 'Done · 8:04 pm', 'done'],
        ['Opening your demat account', 'By NSDL/CDSL, the official record-keepers for shares · usually 2–12 hours', 'now'],
        ['Approval from stock exchanges', 'NSE and BSE · usually a few hours', 'todo'],
        ['Ready to invest', '', 'todo'],
      ]) +
      `<button class="switch-row" data-act="notify"><span>Notify me by SMS & push</span><span class="sw ${ctx.notify ? 'on' : ''}"></span></button>`),
  }),

  statusFix: () => ({
    title: '1 thing needs you',
    body: NEW('Fix-it screen', banner('warn', 'Your selfie was too dark to verify', 'Please retake it in good light. <b>Only this step</b>: your other details are saved.') +
      timeline([
        ['Your details checked', 'Done · 8:04 pm', 'done'],
        ['Photo check', 'Selfie too dark to verify', 'warn'],
        ['Opening your demat account', 'Continues after the fix', 'todo'],
        ['Ready to invest', '', 'todo'],
      ])),
    footer: btn('Retake selfie · 30 sec', 'data-act="retake"'),
  }),

  ready: () => ({
    back: false,
    body: `<div class="center">${ART.party}<h1 class="big">You’re ready to invest!</h1><p class="sub">Your account was opened in 14 hours.</p></div>`,
    footer: btn('Add money', 'data-act="noop"') + btn('Explore stocks', 'data-act="noop"', 'ghost'),
  }),

  loading: (p) => ({
    back: false, step: p.step, stepName: p.stepName,
    body: `<div class="loading"><div class="spinner"></div><p>${p.text}</p></div>`,
  }),
}

// ---------- Sheets ----------
const SHEETS = {
  digi: () => `
    <h4>Share from DigiLocker?</h4>
    <p class="sub">Nivesh will only read:</p>
    <ul class="tips"><li>PAN: name, number, date of birth</li><li>Aadhaar: address (the number stays masked)</li></ul>
    ${btn('Allow', 'data-act="digiAllow"')}${btn('Cancel', 'data-close', 'ghost')}`,
  support: () => `
    <h4>Chat with us</h4>
    <div class="bubble">Hi Riya, we can see your bank name is missing your middle name (MANOJ). Your PAN and bank details are attached to ticket #K-2041.</div>
    <div class="bubble">An agent will reply here within 2 hours. No need to email or explain again.</div>
    ${btn('OK', 'data-close')}`,
  otpHelp: () => `
    <h4>Didn’t get the OTP?</h4>
    ${NEW('Smart OTP help', `<ul class="tips">
      <li>Check messages on the phone ending <b>4821</b>. That’s where it’s sent.</li>
      <li>Networks can be slow at busy times. Waiting 1–2 minutes often helps.</li>
      <li>Your progress is saved either way.</li></ul>`)}
    ${btn('Resend OTP', 'data-act="resend"')}${btn('That’s not my number anymore', 'data-act="notMine"', 'ghost')}`,
}

// ---------- Rendering & navigation ----------
function build(key, params = {}) {
  const s = SCREENS[key](params)
  const showBack = s.back !== false && history.length > 0
  const el = document.createElement('div')
  el.className = `screen${s.dark ? ' dark' : ''}`
  el.innerHTML = `
    <div class="topbar">
      ${showBack ? '<button class="back" data-back aria-label="Back">‹</button>' : '<span class="brand"><span class="mark">n</span>Nivesh</span>'}
      ${s.step ? `<span class="stepname">Step ${s.step} of 5 · ${s.stepName}</span>` : ''}
    </div>
    ${s.step ? `<div class="progress"><span style="width:${(s.step / 5) * 100}%"></span></div>` : '<div class="progress empty"></div>'}
    <div class="content">
      ${s.title ? `<h2 class="title">${s.title}</h2>` : ''}
      ${s.sub ? `<p class="sub">${s.sub}</p>` : ''}
      ${s.body || ''}
    </div>
    ${s.footer ? `<div class="footer">${s.footer}</div>` : ''}`
  return el
}

function show(key, params = {}, dir = 'fwd') {
  clearTimers()
  hideNotif()
  closeSheet()
  currentKey = key
  currentParams = params
  const next = build(key, params)
  const prev = app.querySelector('.screen.active')
  if (!prev || dir === 'none') {
    app.innerHTML = ''
    next.classList.add('active')
    app.appendChild(next)
  } else {
    next.classList.add(dir === 'fwd' ? 'from-right' : 'from-left')
    app.appendChild(next)
    void next.offsetWidth
    next.classList.remove('from-right', 'from-left')
    next.classList.add('active')
    prev.classList.remove('active')
    prev.classList.add(dir === 'fwd' ? 'to-left' : 'to-right')
    setTimeout(() => prev.remove(), 360)
  }
  onEnter(key, params)
}

function go(key, params = {}, opts = {}) {
  if (opts.reset) history = []
  else if (currentKey && currentKey !== 'loading' && !opts.replace) history.push([currentKey, currentParams])
  show(key, params, 'fwd')
}

function back() {
  const prev = history.pop()
  if (prev) show(prev[0], prev[1], 'back')
}

// Re-render the current screen in place (no slide), e.g. language switch
function refresh() {
  const cur = app.querySelector('.screen.active')
  const next = build(currentKey, currentParams)
  next.classList.add('active', 'instant')
  cur.replaceWith(next)
  onEnter(currentKey, currentParams, true)
}

// ---------- Screen side effects ----------
function onEnter(key, p, isRefresh) {
  if (key === 'loading') later(() => { if (p.onDone) p.onDone(); go(p.next, {}, { replace: true, reset: p.reset }) }, p.ms || 1300)
  if (key === 'sign') setupPad()
  if (key === 'otp' && !isRefresh) fillOtp()
  if (key === 'status' && !isRefresh) {
    if (!ctx.fixed) later(() => showNotif('1 thing needs you', 'Your selfie was too dark to verify. Tap to fix, it takes 30 sec.', 'statusFix'), 3200)
    else later(() => showNotif('You’re ready to invest 🎉', 'Your Nivesh account is now active. Tap to start.', 'ready'), 3200)
  }
}

function fillOtp() {
  ctx.otpFilled = false
  const digits = '582916'
  const boxes = () => document.querySelectorAll('.screen.active #otpBoxes span')
  later(() => {
    const hint = document.querySelector('.screen.active #otpHint')
    if (hint) hint.textContent = 'OTP received · filled automatically'
    digits.split('').forEach((d, i) => later(() => {
      const b = boxes()[i]; if (b) { b.textContent = d; b.classList.add('on') }
      if (i === 5) {
        ctx.otpFilled = true
        const v = document.querySelector('.screen.active #verifyBtn'); if (v) v.disabled = false
      }
    }, i * 120))
  }, 1400)
}

function setupPad() {
  const c = document.querySelector('.screen.active #pad')
  if (!c) return
  const r = c.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  c.width = r.width * dpr; c.height = r.height * dpr
  const g = c.getContext('2d')
  g.scale(dpr, dpr); g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#1f2a5a'
  let drawing = false, last = null
  const pt = (e) => { const b = c.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top] }
  c.addEventListener('pointerdown', (e) => { drawing = true; last = pt(e); c.setPointerCapture(e.pointerId) })
  c.addEventListener('pointermove', (e) => {
    if (!drawing) return
    const p = pt(e)
    g.beginPath(); g.moveTo(...last); g.lineTo(...p); g.stroke(); last = p
    if (!ctx.signed) {
      ctx.signed = true
      const h = document.querySelector('.screen.active #padHint'); if (h) h.style.opacity = 0
      const s = document.querySelector('.screen.active #saveSig'); if (s) s.disabled = false
    }
  })
  const stop = () => { drawing = false }
  c.addEventListener('pointerup', stop); c.addEventListener('pointerleave', stop)
}

// ---------- Notification & sheet ----------
function showNotif(title, text, target) {
  notifEl.innerHTML = `<span class="n-icon">n</span><div><div class="n-top"><b>Nivesh</b><span>now</span></div><b class="n-title">${title}</b><p>${text}</p></div>`
  notifEl.dataset.target = target
  notifEl.hidden = false
  void notifEl.offsetWidth
  notifEl.classList.add('in')
}
function hideNotif() { notifEl.classList.remove('in'); notifEl.hidden = true }
notifEl.addEventListener('click', () => { const t = notifEl.dataset.target; hideNotif(); go(t) })

function openSheet(key) {
  sheetEl.innerHTML = `<div class="backdrop" data-close></div><div class="panel"><div class="handle"></div>${SHEETS[key]()}</div>`
  sheetEl.hidden = false
  void sheetEl.offsetWidth
  sheetEl.classList.add('in')
}
function closeSheet() {
  if (sheetEl.hidden) return
  sheetEl.classList.remove('in')
  setTimeout(() => { if (!sheetEl.classList.contains('in')) sheetEl.hidden = true }, 250)
}

function toast(text) {
  const t = document.createElement('div')
  t.className = 'toast'; t.textContent = text
  $('.phone').appendChild(t)
  setTimeout(() => t.classList.add('out'), 2200)
  setTimeout(() => t.remove(), 2600)
}

// ---------- Actions ----------
const ACTS = {
  load: (el) => { const s = SCREENS[currentKey](currentParams); go('loading', { text: el.dataset.text, next: el.dataset.next, reset: !!el.dataset.reset, step: s.step, stepName: s.stepName }) },
  laterFrom: (el) => { ctx.resumeTo = el.dataset.to; go('later') },
  remind: (el) => { ctx.reminder = el.dataset.when; if (el.dataset.to) ctx.resumeTo = el.dataset.to; go('saved') },
  resume: () => go(ctx.resumeTo, {}, { reset: true }),
  digiAllow: () => { closeSheet(); go('loading', { text: 'Fetching from DigiLocker…', next: 'found', step: 1, stepName: 'Identity', ms: 1500 }) },
  lang: (el) => { ctx.lang = el.dataset.l; refresh() },
  pickFile: () => { ctx.file = true; refresh() },
  unfile: () => { ctx.file = false; refresh() },
  clearPad: () => { ctx.signed = false; refresh() },
  capture: () => {
    const flash = document.createElement('div'); flash.className = 'flash'; app.appendChild(flash); setTimeout(() => flash.remove(), 400)
    if (ctx.retake) go('loading', { text: 'Checking your photo…', next: 'status', reset: true, onDone: () => { ctx.fixed = true } })
    else go('loading', { text: 'Checking your photo…', next: 'sign', step: 3, stepName: 'Photo' })
  },
  retake: () => { ctx.retake = true; go('camera') },
  notify: () => { ctx.notify = !ctx.notify; refresh() },
  resend: () => { closeSheet(); toast('New OTP sent to ******4821'); document.querySelectorAll('.screen.active #otpBoxes span').forEach((b) => { b.textContent = ''; b.classList.remove('on') }); const v = document.querySelector('.screen.active #verifyBtn'); if (v) v.disabled = true; const h = document.querySelector('.screen.active #otpHint'); if (h) h.textContent = 'Waiting for SMS…'; fillOtp() },
  notMine: () => { closeSheet(); go('notMine') },
  noop: () => toast('This is where the prototype ends. Tap Restart to try another path.'),
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-go],[data-back],[data-sheet],[data-close],[data-act]')
  if (!el || el.disabled) return
  if (el.closest('.controls')) return
  if (el.hasAttribute('data-go')) go(el.dataset.go)
  else if (el.hasAttribute('data-back')) back()
  else if (el.hasAttribute('data-sheet')) openSheet(el.dataset.sheet)
  else if (el.hasAttribute('data-close')) closeSheet()
  else if (el.dataset.act && ACTS[el.dataset.act]) ACTS[el.dataset.act](el)
})

// ---------- Controls ----------
const showNew = $('#showNew')
showNew.addEventListener('change', () => document.body.classList.toggle('show-new', showNew.checked))
$('#restart').addEventListener('click', () => { clearTimers(); hideNotif(); sheetEl.hidden = true; sheetEl.classList.remove('in'); freshState(); show('welcome', {}, 'none') })

freshState()
show('welcome', {}, 'none')
