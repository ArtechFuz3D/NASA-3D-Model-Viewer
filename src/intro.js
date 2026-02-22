// ─────────────────────────────────────────────────────────────────
// INTRO SEQUENCE — fully self-contained, removes itself when done
// Drop your airlock video as: public/airlock.webm
// Change AIRLOCK_SRC below if you rename the file
// ─────────────────────────────────────────────────────────────────

const AIRLOCK_SRC   = './airlockc1.webm'
const TITLE_TEXT    = 'NASA 3D MODEL VIEWER'
const AUTHOR_TEXT   = 'ArtechFuz3D'
const BAR_DURATION  = 3500  // ms — cinematic progress bar fill time
const TYPEWRITER_DELAY = 40 // ms per character

// ── Inject styles ────────────────────────────────────────────────
const style = document.createElement('style')
style.textContent = `
#intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'Rajdhani', sans-serif;
  overflow: hidden;
  pointer-events: all;
}

#intro-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 1.2s ease;
}
#intro-video.visible { opacity: 0.45; }

#intro-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.8s ease, transform 0.8s ease;
}
#intro-content.visible {
  opacity: 1;
  transform: translateY(0);
}

#intro-logo {
  margin-bottom: 28px;
  opacity: 0;
  animation: introPulse 3s ease-in-out infinite;
  filter: drop-shadow(0 0 18px rgba(112,193,255,0.5));
}
@keyframes introPulse {
  0%, 100% { filter: drop-shadow(0 0 12px rgba(112,193,255,0.4)); }
  50%       { filter: drop-shadow(0 0 28px rgba(112,193,255,0.9)); }
}
#intro-logo.visible { opacity: 1; transition: opacity 1s ease; }

#intro-title {
  font-size: clamp(18px, 3vw, 28px);
  font-weight: 700;
  letter-spacing: 0.28em;
  color: #d0e8ff;
  text-transform: uppercase;
  min-height: 1.4em;
  text-align: center;
  margin-bottom: 8px;
}
#intro-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: #70c1ff;
  margin-left: 3px;
  vertical-align: middle;
  animation: introBlink 0.7s step-end infinite;
}
@keyframes introBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

#intro-author {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.2em;
  color: #70c1ff;
  opacity: 0;
  margin-bottom: 36px;
  text-transform: uppercase;
  transition: opacity 0.6s ease;
}
#intro-author.visible { opacity: 0.6; }

#intro-bar-wrap {
  width: clamp(200px, 30vw, 340px);
  display: flex;
  flex-direction: column;
  gap: 7px;
  opacity: 0;
  transition: opacity 0.5s ease;
}
#intro-bar-wrap.visible { opacity: 1; }

#intro-bar-track {
  width: 100%;
  height: 2px;
  background: rgba(112,193,255,0.15);
  border-radius: 1px;
  overflow: hidden;
}
#intro-bar-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #3a8fbf, #70c1ff, #a8d8ff);
  border-radius: 1px;
  box-shadow: 0 0 8px rgba(112,193,255,0.6);
  transition: width 0.1s linear;
}

#intro-bar-label {
  display: flex;
  justify-content: space-between;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.12em;
  color: rgba(112,193,255,0.5);
  text-transform: uppercase;
}

#intro-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,0,0,0.08) 2px,
    rgba(0,0,0,0.08) 4px
  );
  z-index: 3;
}

/* Fade out the whole overlay */
#intro-overlay.fade-out {
  opacity: 0;
  transition: opacity 1s ease;
  pointer-events: none;
}

#intro-enter {
  margin-top: 32px;
  padding: 9px 32px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #70c1ff;
  background: transparent;
  border: 1px solid rgba(112,193,255,0.4);
  border-radius: 3px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.6s ease, border-color 0.2s, color 0.2s, box-shadow 0.2s;
  animation: enterPulse 2s ease-in-out infinite;
}
#intro-enter.visible { opacity: 1; }
#intro-enter:hover {
  color: #fff;
  border-color: #70c1ff;
  box-shadow: 0 0 16px rgba(112,193,255,0.3);
  animation: none;
}
@keyframes enterPulse {
  0%, 100% { border-color: rgba(112,193,255,0.25); box-shadow: none; }
  50%       { border-color: rgba(112,193,255,0.6);  box-shadow: 0 0 12px rgba(112,193,255,0.2); }
}
`
document.head.appendChild(style)

// ── Build DOM ────────────────────────────────────────────────────
const overlay = document.getElementById('intro-overlay')
if (!overlay) {
  console.warn('intro.js: #intro-overlay not found in HTML')
  // Bail gracefully — app runs without intro
} else {
  overlay.innerHTML = `
    <video id="intro-video" src="${AIRLOCK_SRC}" autoplay muted loop playsinline></video>
    <div id="intro-scanlines"></div>
    <div id="intro-content">
      <svg id="intro-logo" width="72" height="72" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="#70c1ff" stroke-width="1.5"/>
        <ellipse cx="10" cy="10" rx="8" ry="3.5" stroke="#70c1ff" stroke-width="1.5"/>
        <line x1="10" y1="2" x2="10" y2="18" stroke="#70c1ff" stroke-width="1.5"/>
      </svg>
      <div id="intro-title"><span id="intro-title-text"></span><span id="intro-cursor"></span></div>
      <div id="intro-author">${AUTHOR_TEXT}</div>
      <div id="intro-bar-wrap">
        <div id="intro-bar-track"><div id="intro-bar-fill"></div></div>
        <div id="intro-bar-label">
          <span id="intro-status">INITIALISING</span>
          <span id="intro-pct">0%</span>
        </div>
      </div>
      <button id="intro-enter">[ ENTER ]</button>
    </div>
  `

  // ── Element refs ──────────────────────────────────────────────
  const video     = document.getElementById('intro-video')
  const content   = document.getElementById('intro-content')
  const logo      = document.getElementById('intro-logo')
  const titleEl   = document.getElementById('intro-title-text')
  const cursor    = document.getElementById('intro-cursor')
  const author    = document.getElementById('intro-author')
  const barWrap   = document.getElementById('intro-bar-wrap')
  const barFill   = document.getElementById('intro-bar-fill')
  const statusEl  = document.getElementById('intro-status')
  const pctEl     = document.getElementById('intro-pct')
  const enterBtn  = document.getElementById('intro-enter')

  // ── Status messages tied to progress ─────────────────────────
  const statuses = [
    { at: 0,   label: 'INITIALISING' },
    { at: 15,  label: 'LOADING ASSETS' },
    { at: 35,  label: 'COMPILING SHADERS' },
    { at: 55,  label: 'BUILDING SCENE' },
    { at: 78,  label: 'CALIBRATING' },
    { at: 92,  label: 'READY' },
  ]

  // ── Typewriter ────────────────────────────────────────────────
  function typewriter(text, el, delay, onDone) {
    let i = 0
    const tick = () => {
      el.textContent = text.slice(0, ++i)
      if (i < text.length) setTimeout(tick, delay)
      else onDone?.()
    }
    setTimeout(tick, delay)
  }

  // ── Progress bar (cinematic eased) ───────────────────────────
  function runBar(duration, onDone) {
    const start  = performance.now()
    let lastPct  = 0

    const tick = (now) => {
      const raw     = Math.min((now - start) / duration, 1)
      // Ease: fast start, slow finish — feels like real loading
      const eased   = raw < 0.5
        ? 2 * raw * raw
        : 1 - Math.pow(-2 * raw + 2, 2) / 2
      const pct     = Math.round(eased * 100)

      if (pct !== lastPct) {
        barFill.style.width = pct + '%'
        pctEl.textContent   = pct + '%'
        // Update status label at thresholds
        for (const s of statuses) {
          if (pct >= s.at) statusEl.textContent = s.label
        }
        lastPct = pct
      }

      if (raw < 1) requestAnimationFrame(tick)
      else onDone?.()
    }
    requestAnimationFrame(tick)
  }

  // ── Sequence ──────────────────────────────────────────────────
  function dismiss() {
    overlay.classList.add('fade-out')
    setTimeout(() => overlay.remove(), 1100)
  }

  // Step 1 — video fades in immediately
  requestAnimationFrame(() => video.classList.add('visible'))

  // Step 2 — content fades in after 400ms, logo first
  setTimeout(() => {
    logo.classList.add('visible')
    content.classList.add('visible')
  }, 400)

  // Step 3 — typewriter title after 800ms
  setTimeout(() => {
    typewriter(TITLE_TEXT, titleEl, TYPEWRITER_DELAY, () => {
      // Hide cursor when typing done
      setTimeout(() => { cursor.style.display = 'none' }, 500)
      // Author line
      author.classList.add('visible')
      // Bar appears
      setTimeout(() => {
        barWrap.classList.add('visible')
        // Run the cinematic bar
        setTimeout(() => {
          runBar(BAR_DURATION, () => {
            // Bar done — show enter button, wait for user
            setTimeout(() => {
              statusEl.textContent = 'READY'
              enterBtn.classList.add('visible')
              // Click or Enter key to dismiss
              const go = () => {
                enterBtn.removeEventListener('click', go)
                document.removeEventListener('keydown', onKey)
                dismiss()
              }
              const onKey = (e) => { if (e.key === 'Enter') go() }
              enterBtn.addEventListener('click', go)
              document.addEventListener('keydown', onKey)
            }, 300)
          })
        }, 200)
      }, 300)
    })
  }, 800)
}