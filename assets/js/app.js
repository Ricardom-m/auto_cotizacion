// ─────────────────────────────────────────
// CONFIGURACIÓN — reemplaza estos valores
// ─────────────────────────────────────────
const WORKER_URL          = 'https://auto-cotizacion-proxy.autocotizacion.workers.dev';
const EMAILJS_PUBLIC_KEY  = 'TU_PUBLIC_KEY';
const EMAILJS_SERVICE_ID  = 'TU_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'TU_TEMPLATE_ID';
const MI_EMAIL            = 'tu@correo.com';
// ─────────────────────────────────────────

emailjs.init(EMAILJS_PUBLIC_KEY);

let selectedBiz = '';
let selectedChips = [];
let videoOpen = false;
let generatedContent = null;

const loadMsgs = [
  'Analizando tu negocio...',
  'Identificando oportunidades de mejora...',
  'Generando propuesta personalizada...',
  'Casi listo...'
];

function selectBiz(el, val) {
  document.querySelectorAll('.biz-card').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedBiz = val;
  document.getElementById('btn1').disabled = false;
}

function toggleChip(el, val) {
  el.classList.toggle('selected');
  if (el.classList.contains('selected')) {
    selectedChips.push(val);
  } else {
    selectedChips = selectedChips.filter(v => v !== val);
  }
}

function goStep(n) {
  if (n === 3) {
    const name  = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    if (!name || !email) { showToast('Por favor ingresa tu nombre y correo'); return; }
    if (selectedChips.length === 0) selectedChips = ['responder llamadas constantemente'];
  }
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('s' + n).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (n === 3) startGeneration();
}

let msgTimer;
function startGeneration() {
  let i = 0;
  const el = document.getElementById('loadMsg');
  el.textContent = loadMsgs[0];
  msgTimer = setInterval(() => {
    i = (i + 1) % loadMsgs.length;
    el.textContent = loadMsgs[i];
  }, 2000);
  generateContent();
}

async function generateContent() {
  const clients = document.getElementById('clientCount').value || '10';
  const name    = document.getElementById('contactName').value.trim();
  const email   = document.getElementById('contactEmail').value.trim();

  const prompt = `Eres experto en automatización de negocios con IA. Crea contenido para una landing page minimalista y convincente en español.

Negocio: ${selectedBiz}
Retos: ${selectedChips.join(', ')}
Clientes por día: ${clients}

Responde SOLO con JSON válido, sin texto adicional ni bloques de código markdown:
{
  "tag": "frase corta en mayúsculas (máx 5 palabras, ej: AUTOMATIZACIÓN PARA ÓPTICAS)",
  "headline": "título impactante máx 10 palabras, directo al dolor",
  "subheadline": "2 oraciones que expliquen el valor, conversacional, sin tecnicismos",
  "pains": [
    {"title": "nombre del problema", "desc": "consecuencia real en 1 oración corta"},
    {"title": "nombre del problema", "desc": "consecuencia real en 1 oración corta"},
    {"title": "nombre del problema", "desc": "consecuencia real en 1 oración corta"}
  ],
  "stats": [
    {"num": "número o %", "label": "qué representa en máx 5 palabras"},
    {"num": "número o %", "label": "qué representa en máx 5 palabras"}
  ],
  "videoTitle": "título del resumen en máx 8 palabras",
  "videoPoints": ["beneficio concreto 1", "beneficio concreto 2", "beneficio concreto 3"],
  "ctaTitle": "pregunta o afirmación que invite a actuar en máx 8 palabras",
  "ctaSub": "1 oración corta que baje la fricción"
}`;

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    clearInterval(msgTimer);
    const data = await res.json();
    if (!res.ok || !data.content) throw new Error('error');

    const raw = data.content.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();
    const d = JSON.parse(raw);
    generatedContent = d;

    renderLanding(d);
    showStep4();

    sendLeadEmail(name, email, clients);

  } catch (e) {
    clearInterval(msgTimer);
    showStep4();
    showToast('Ocurrió un error. Intenta de nuevo.');
  }
}

function renderLanding(d) {
  document.getElementById('lpTag').textContent      = d.tag || '';
  document.getElementById('lpHeadline').textContent = d.headline || '';
  document.getElementById('lpSub').textContent      = d.subheadline || '';

  const pl = document.getElementById('painList');
  pl.innerHTML = '';
  (d.pains || []).forEach((p, i) => {
    pl.innerHTML += `<div class="pain-item">
      <span class="pain-num">0${i + 1}</span>
      <div><p class="pain-title">${p.title}</p><p class="pain-desc">${p.desc}</p></div>
    </div>`;
  });

  const sg = document.getElementById('statsGrid');
  sg.innerHTML = '';
  (d.stats || []).forEach(s => {
    sg.innerHTML += `<div class="stat-card">
      <p class="stat-num">${s.num}</p>
      <p class="stat-lbl">${s.label}</p>
    </div>`;
  });

  document.getElementById('vcTitle').textContent = d.videoTitle || '';
  const vp = document.getElementById('vcPoints');
  vp.innerHTML = '';
  (d.videoPoints || []).forEach(pt => {
    vp.innerHTML += `<div class="ve-point"><div class="ve-dot"></div><p class="ve-text">${pt}</p></div>`;
  });

  document.getElementById('ctaTitle').textContent = d.ctaTitle || '';
  document.getElementById('ctaSub').textContent   = d.ctaSub || '';
}

function showStep4() {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('s4').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleVideo() {
  videoOpen = !videoOpen;
  const exp   = document.getElementById('videoExpand');
  const thumb = document.getElementById('videoThumb');
  const arrow = document.getElementById('videoArrow');
  exp.style.display   = videoOpen ? 'block' : 'none';
  thumb.style.display = videoOpen ? 'none'  : 'flex';
  arrow.textContent   = videoOpen ? '▴' : '▾';
}

function openModal() {
  const name  = document.getElementById('contactName').value;
  const email = document.getElementById('contactEmail').value;
  document.getElementById('modalName').value  = name;
  document.getElementById('modalEmail').value = email;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

async function submitContact() {
  const name  = document.getElementById('modalName').value.trim();
  const phone = document.getElementById('modalPhone').value.trim();
  const email = document.getElementById('modalEmail').value.trim();

  if (!name || !email) { showToast('Completa nombre y correo'); return; }

  closeModal();
  showToast('Enviando tu solicitud...');

  await sendDemoRequest(name, phone, email);

  document.getElementById('sentBox').style.display = 'block';
  showToast('¡Solicitud enviada! Pronto te contactamos.');
}

// ── EMAIL FUNCTIONS ──────────────────────────────────────────────

async function sendLeadEmail(name, email, clients) {
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email:     MI_EMAIL,
      subject:      `Nuevo lead: ${selectedBiz}`,
      from_name:    name,
      from_email:   email,
      negocio:      selectedBiz,
      retos:        selectedChips.join(', '),
      clientes_dia: clients,
      tipo:         'Completó cuestionario'
    });
  } catch (e) {
    console.log('Email error:', e);
  }
}

async function sendDemoRequest(name, phone, email) {
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email:     MI_EMAIL,
      subject:      `Demo solicitada: ${name}`,
      from_name:    name,
      from_email:   email,
      negocio:      selectedBiz,
      retos:        selectedChips.join(', '),
      clientes_dia: document.getElementById('clientCount').value || '?',
      telefono:     phone,
      tipo:         'Solicitud de demo'
    });
  } catch (e) {
    console.log('Email error:', e);
  }
}

// ── UTILS ───────────────────────────────────────────────────────

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function restart() {
  selectedBiz = '';
  selectedChips = [];
  videoOpen = false;
  generatedContent = null;
  document.querySelectorAll('.biz-card').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
  ['clientCount', 'contactName', 'contactEmail', 'modalName', 'modalPhone', 'modalEmail']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('btn1').disabled = true;
  document.getElementById('sentBox').style.display = 'none';
  document.getElementById('videoExpand').style.display = 'none';
  document.getElementById('videoThumb').style.display  = 'flex';
  document.getElementById('videoArrow').textContent    = '▾';
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('s1').classList.add('active');
  window.scrollTo({ top: 0 });
}
