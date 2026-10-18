const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const esc = s => s.replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

const uuid = () =>
  window.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 3 | 8)).toString(16);
      });

let LANG = 'ar';

try {
  if (localStorage.getItem('banan-language') === 'en') LANG = 'en';
} catch (e) {}

const bi = (ar, en) =>
  `<span data-lang="ar">${esc(String(ar))}</span><span data-lang="en">${esc(String(en))}</span>`;

const bh = (ar, en) =>
  `<span data-lang="ar">${ar}</span><span data-lang="en">${en}</span>`;

function applyLanguage(root = document) {
  root.querySelectorAll('[data-lang]').forEach(el => {
    el.hidden = el.dataset.lang !== LANG;
  });

  root.querySelectorAll('[data-ar-label]').forEach(el => {
    el.setAttribute('aria-label', el.dataset[LANG + 'Label']);
  });

  root.querySelectorAll('[data-ar-title]').forEach(el => {
    el.title = el.dataset[LANG + 'Title'];
  });

  root.querySelectorAll('[data-ar-placeholder]').forEach(el => {
    el.placeholder = el.dataset[LANG + 'Placeholder'];
  });

  root.querySelectorAll('[data-language-toggle]').forEach(el => {
    el.textContent = LANG === 'ar' ? '🌐 English' : '🌐 Arabic';
    el.setAttribute(
      'aria-label',
      LANG === 'ar' ? 'تغيير اللغة إلى الإنجليزية' : 'Switch to Arabic'
    );
    el.setAttribute('aria-pressed', String(LANG === 'en'));
  });
}

function setLanguage(lang) {
  LANG = lang === 'en' ? 'en' : 'ar';
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === 'en' ? 'ltr' : 'rtl';
  document.title = LANG === 'en' ? 'Banan Survey' : 'استبيان بنان';

  applyLanguage();
  tick();

  try {
    localStorage.setItem('banan-language', LANG);
  } catch (e) {}
}

const toggleLanguage = () => setLanguage(LANG === 'ar' ? 'en' : 'ar');

let busy = 0;
let saving = 0;
let C;
let mute = 0;
let z = 10;
let N = '';
let AGE = 0;
let G = '';
let cur = 0;
let reach = 0;
let SW;
let T0;
let ID = uuid();
let tabTimers = [];

const snd = (f, d = .12, t = 'square', g = .06, f2) => {
  if (mute || !C) return;

  const T = C.currentTime;
  const o = C.createOscillator();
  const v = C.createGain();

  o.type = t;
  o.frequency.setValueAtTime(f, T);

  if (f2) o.frequency.exponentialRampToValueAtTime(f2, T + d);

  v.gain.setValueAtTime(g, T);
  v.gain.exponentialRampToValueAtTime(.001, T + d);

  o.connect(v);
  v.connect(C.destination);

  o.start();
  o.stop(T + d);
};

const pop = () => snd(500, .1, 'square', .06, 900);
const ok = () => snd(700, .08, 'triangle');

const err = () => {
  snd(200, .25, 'sawtooth', .08, 120);
  setTimeout(() => snd(160, .3, 'sawtooth', .08, 90), 180);
};

const yay = () => [523, 659, 784, 1047].forEach((f, i) => {
  setTimeout(() => snd(f, .2, 'triangle', .07), i * 120);
});

const Q = [
  [
    101,
    "s",
    "ما الذي يصف وضعك الحالي بشكل أفضل؟|Which best describes your current situation?",
    "طالب (مدرسة أو جامعة)|Student (school or university);معلم أو معلمة|Teacher;أعمل في المجال الصحي (طبيب، ممرض، أخصائي، فني، إداري في منشأة صحية)|I work in healthcare (doctor, nurse, specialist, technician, or administrative staff);أعمل في خدمة العملاء (بنك، مطار، متجر، مركز اتصال...)|I work in customer service (bank, airport, store, call center...);لا أدرس ولا أعمل حاليًا|I am currently neither studying nor working;أخرى (حدد)|Other (please specify)|o"
  ],
  [
    102,
    "s",
    "هل سبق لك التعامل أو التواصل مع شخص أصم أو ضعيف السمع؟|Have you ever interacted or communicated with a Deaf or hard-of-hearing person?",
    "لا، لم يسبق لي|No, never;نعم، نادرًا|Yes, rarely;نعم، أحيانًا|Yes, sometimes;نعم، بشكل منتظم|Yes, regularly"
  ],
  [
    103,
    "m",
    "عند تواصلك مع شخص أصم أو ضعيف السمع، ما الطرق التي استخدمتها للتواصل؟|When communicating with a Deaf or hard-of-hearing person, which methods have you used?",
    "أستطيع التواصل بطلاقة باستخدام لغة الإشارة|I can communicate fluently using sign language;استخدام ما أعرفه من لغة الإشارة|Using the sign language I know;الاستعانة بشخص يعرف لغة الإشارة|Asking someone who knows sign language for help;استخدام تطبيق للترجمة|Using a translation app;الكتابة على الجوال أو الورق|Writing on a phone or paper;استخدام الإيماءات|Using gestures;لم أعرف كيف أتصرف|I did not know how to communicate;أخرى (حدد)|Other (please specify)|o"
  ],
  [
    104,
    "s",
    "هل سبق لك تعلم أو محاولة تعلم لغة الإشارة السعودية؟|Have you ever learned or tried to learn Saudi Sign Language?",
    "نعم، واستفدت جدًا|Yes, and I benefited greatly;نعم، ولكن واجهتني صعوبات|Yes, but I faced difficulties;لا، ولكن أود التعلم|No, but I would like to learn;لا، ولا أهتم|No, and I am not interested"
  ],
  [
    105,
    "m",
    "ما المصادر أو الطرق التي استخدمتها لتعلم لغة الإشارة السعودية؟|Which sources or methods have you used to learn Saudi Sign Language?",
    "مقاطع فيديو تعليمية|Educational videos;دورة أو مركز تدريبي|A course or training center;تطبيق لتعلم لغة الإشارة|A sign language learning app;شخص يعرف لغة الإشارة|Someone who knows sign language;مواقع أو مصادر إلكترونية|Websites or online resources;أخرى (حدد)|Other (please specify)|o"
  ],
  [
    106,
    "m",
    "ما الصعوبات التي واجهتك أثناء تعلم لغة الإشارة السعودية؟|What difficulties did you face while learning Saudi Sign Language?",
    "قلة الوقت للتعلم والممارسة|Not enough time to learn and practice;صعوبة معرفة من أين أبدأ|Difficulty knowing where to start;صعوبة التعلم دون توجيه|Difficulty learning without guidance;قلة المصادر الخاصة بلغة الإشارة السعودية|Limited Saudi Sign Language resources;عدم الثقة في أداء الإشارات بشكل صحيح|Lack of confidence in performing signs correctly;اختلاف الإشارات بين المصادر|Differences in signs across sources;لم أواجه أي صعوبات|I did not face any difficulties;أخرى (حدد)|Other (please specify)|o"
  ],
  [
    107,
    "m",
    "ما الأسباب التي قد تدفعك لتعلم لغة الإشارة السعودية؟|What reasons might motivate you to learn Saudi Sign Language?",
    "التواصل مع صديق أو قريب أصم أو ضعيف السمع|Communicating with a Deaf or hard-of-hearing friend or relative;احتياج مرتبط بالعمل|A work-related need;الدراسة|Study;خدمة المجتمع والتطوع|Community service and volunteering;اكتساب مهارة جديدة|Learning a new skill;فضول أو اهتمام شخصي|Curiosity and personal interest;أخرى (حدد)|Other (please specify)|o"
  ],
  [
    108,
    "m",
    "كيف تفضل تعلم لغة الإشارة السعودية؟|How would you prefer to learn Saudi Sign Language?",
    "مقاطع فيديو تعليمية|Educational videos;تطبيق تعليمي تفاعلي|An interactive learning app;دروس مباشرة مع مدرب|Live lessons with an instructor;ممارسة الإشارات باستخدام الكاميرا مع الحصول على تقييم|Practicing signs using a camera with performance feedback;التعلم مع صديق أو مجموعة|Learning with a friend or group;أخرى (حدد)|Other (please specify)|o"
  ],
  [
    109,
    "s",
    "كم من الوقت تفضل تخصيصه لجلسة تعلم واحدة؟|How much time would you prefer to spend on one learning session?",
    "أقل من 10 دقائق|Less than 10 minutes;10–20 دقيقة|10–20 minutes;أكثر من 20 دقيقة|More than 20 minutes"
  ],
  [
    110,
    "r",
    "إذا توفر تطبيق تعليمي تفاعلي لتعلم لغة الإشارة السعودية، ما مدى احتمالية استخدامك له؟|If an interactive Saudi Sign Language learning app were available, how likely would you be to use it?",
    "غير محتمل إطلاقًا|Not at all likely;محتمل جدًا|Very likely"
  ],
  [
    111,
    "t",
    "هل لديك أي ملاحظات أو اقتراحات حول تعلم لغة الإشارة السعودية؟|Do you have any comments or suggestions about learning Saudi Sign Language?",
    ""
  ],
  [
    207,
    "m",
    "ما الأسباب التي تجعلك غير مهتم بتعلم لغة الإشارة السعودية؟|Why are you not interested in learning Saudi Sign Language?",
    "لا أعرف أشخاصًا صمًا أو ضعاف سمع|I do not know any Deaf or hard-of-hearing people;لا أملك الوقت الكافي لتعلمها|I do not have enough time to learn it;أعتقد أن تعلمها صعب|I think it would be difficult to learn;أفضل استخدام وسائل أخرى للتواصل|I prefer other ways of communicating;لا أرى أنها ضرورية بالنسبة لي|I do not think it is necessary for me;أخرى (حدد)|Other (please specify)|o"
  ],
  [
    208,
    "m",
    "تخيل أنك في أحد المواقف التالية، في أي منها قد تشعر بأهمية معرفة لغة الإشارة السعودية؟|Imagine being in the following situations. In which of them might knowing Saudi Sign Language feel important to you?",
    "مساعدة شخص أصم أو ضعيف السمع في حالة طارئة|Helping a Deaf or hard-of-hearing person in an emergency;التواصل مع زميل أصم أو ضعيف السمع في العمل أو الدراسة|Communicating with a Deaf or hard-of-hearing colleague or classmate;مساعدة عميل أصم أو ضعيف السمع يحتاج إلى خدمة|Helping a Deaf or hard-of-hearing customer who needs assistance;التواصل مع صديق أو فرد من العائلة يستخدم لغة الإشارة|Communicating with a friend or family member who uses sign language;لا أعتقد أنني سأحتاج إليها في أي من هذه المواقف|I do not think I would need it in any of these situations"
  ],
  [
    209,
    "s",
    "بعد التفكير في هذه المواقف، هل تغير مدى اهتمامك بتعلم لغة الإشارة السعودية؟|After considering these situations, has your interest in learning Saudi Sign Language changed?",
    "نعم، أصبحت مهتمًا بتعلمها|Yes, I am now interested in learning it;أصبحت أكثر تقبلًا للفكرة، لكنني غير متأكد من رغبتي في التعلم|I am more open to the idea, but I am not sure I want to learn;لا، ما زلت غير مهتم|No, I am still not interested"
  ],
  [
    210,
    "r",
    "إذا توفر تطبيق مجاني وتفاعلي لتعلم لغة الإشارة السعودية، يقدم دروسًا قصيرة ويساعدك على ممارسة الإشارات، ما مدى احتمالية تجربتك له؟|If a free, interactive Saudi Sign Language learning app offered short lessons and sign practice, how likely would you be to try it?",
    "غير محتمل إطلاقًا|Not at all likely;محتمل جدًا|Very likely"
  ],
  [
    301,
    "m",
    "كيف تتواصل غالبًا مع الأشخاص الذين لا يعرفون لغة الإشارة؟|How do you usually communicate with people who do not know sign language?",
    "لغة الإشارة|Sign language;الكتابة على الجوال أو الورق|Writing on a phone or paper;قراءة الشفاه والكلام|Lip-reading and speech;الاستعانة بشخص للترجمة|Asking someone to interpret;الرسائل أو تطبيقات التواصل|Messages or communication apps;الإيماءات|Gestures;أخرى (حدد)|Other (please specify)|o"
  ],
  [
    302,
    "s",
    "إلى أي مدى يعرف الأشخاص من حولك لغة الإشارة؟|To what extent do the people around you know sign language?",
    "لا أحد تقريبًا|Almost no one;عدد قليل منهم|A few of them;بعضهم|Some of them;أغلبهم|Most of them"
  ],
  [
    303,
    "s",
    "كم مرة تحتاج إلى التواصل مع أشخاص لا يعرفون لغة الإشارة؟|How often do you need to communicate with people who do not know sign language?",
    "يوميًا|Daily;عدة مرات في الأسبوع|Several times a week;أحيانًا|Sometimes;نادرًا|Rarely"
  ],
  [
    304,
    "m",
    "في أي المواقف تواجه أكبر صعوبة في التواصل مع أشخاص لا يعرفون لغة الإشارة؟|In which situations do you face the greatest difficulty communicating with people who do not know sign language?",
    "المستشفيات والعيادات|Hospitals and clinics;البنوك والخدمات الحكومية|Banks and government services;المطارات والسفر|Airports and travel;المدارس والجامعات|Schools and universities;العمل|Work;المطاعم والمتاجر|Restaurants and stores;حالات الطوارئ|Emergency situations;مع الأقارب|With relatives;لا أواجه صعوبة|I do not face any difficulties;أخرى (حدد)|Other (please specify)|o"
  ],
  [
    305,
    "s",
    "هل سبق أن أجلت أو تركت الحصول على خدمة بسبب صعوبة التواصل؟|Have you ever postponed or decided not to use a service because of communication difficulties?",
    "لا|No;نعم، مرة أو مرتين|Yes, once or twice;نعم، عدة مرات|Yes, several times"
  ],
  [
    306,
    "r",
    "هل ترى أنه من المهم أن يتعلم أفراد المجتمع لغة الإشارة؟|How important do you think it is for members of the community to learn sign language?",
    "غير مهم إطلاقًا|Not important at all;مهم جدًا|Very important"
  ],
  [
    307,
    "r",
    "إذا توفر تطبيق يساعد الأشخاص على تعلم لغة الإشارة السعودية، إلى أي مدى تعتقد أنه قد يساعد في تسهيل التواصل؟|If an app were available to help people learn Saudi Sign Language, how much do you think it could help make communication easier?",
    "لن يساعد إطلاقًا|Would not help at all;قد يساعد كثيرًا|Could help a lot"
  ],
  [
    308,
    "t",
    "ما الذي تود قوله للأشخاص الذين يرغبون في تعلم لغة الإشارة السعودية؟|What would you like to say to people who want to learn Saudi Sign Language?",
    ""
  ]
];

const QM = {};
Q.forEach(q => QM[q[0]] = q);

const ops = q => q[3] ? q[3].split(';').map(s => s.split('|')) : [];

let HS = '';
let TR = 'h';
let NUM = {};
let HP = 'general';

const HEARING_FIRST = [101, 102, 103, 104, 105, 106];
const HEARING_GENERAL = [107, 108, 109, 110, 111];
const HEARING_UNINTERESTED = [207, 208, 209, 210];

const SECS = {
  h: [HEARING_FIRST, HEARING_GENERAL],
  d: [[301, 302, 303], [304, 305], [306, 307, 308]]
};

const EXCLUSIVE = {
  106: 6,
  208: 4,
  304: 8
};

let SEC = SECS.h;

const setTrack = t => {
  TR = t;
  HP = 'general';
  SEC = SECS[t].map(s => s.slice());
  NUM = {};
  Q.forEach(q => NUM[q[0]] = q[0] % 100);
};

setTrack('h');

const get = id => {
  const k = QM[id][1];

  if (k === 'r') {
    const b = $(`#q${id} .on`);
    return b ? +b.dataset.v : 0;
  }

  if (k === 't') return $(`#q${id} textarea`).value.trim();

  const c = $$(`#q${id} input:checked`).map(x => +x.value);
  return k === 's' ? (c.length ? c[0] : -1) : c;
};

const hearingPath = () =>
  get(104) === 3 ? 'not_interested' : 'general';

const vis = id => {
  if (TR === 'd') return id >= 301 && id <= 308;
  if (id === 103) return get(102) > 0;
  if (id === 105 || id === 106) return [0, 1].includes(get(104));
  if (HEARING_GENERAL.includes(id)) return HP === 'general';
  if (HEARING_UNINTERESTED.includes(id)) return HP === 'not_interested';
  return HEARING_FIRST.includes(id);
};

const valid = id => {
  const q = QM[id];
  const k = q[1];
  const v = get(id);

  if (k === 't') return true;
  if (k === 'r') return v > 0;
  if (k === 's' ? v < 0 : v.length === 0) return false;

  const selected = [].concat(v);
  const o = ops(q);
  const other = selected.some(i => o[i] && o[i][2] === 'o');

  if (other && !$(`#q${id} .ot`).value.trim()) return false;

  const exclusive = EXCLUSIVE[id];

  return exclusive === undefined ||
    !selected.includes(exclusive) ||
    selected.length === 1;
};

const ans = (id, s = '، ', lang = 'ar') => {
  const q = QM[id];
  const k = q[1];
  const v = get(id);
  const o = ops(q);

  if (k === 'r') return v ? v + '/5' : '—';
  if (k === 't') return v || '—';

  const t = [].concat(v < 0 ? [] : v).map(i => {
    let text = o[i][lang === 'en' ? 1 : 0];

    if (o[i][2]) {
      const x = $(`#q${id} .ot`).value.trim();
      if (x) text += ': ' + x;
    }

    return text;
  });

  return t.join(s) || '—';
};

function clearQuestion(id) {
  const q = $(`#q${id}`);
  if (!q) return;

  q.querySelectorAll('input').forEach(x => {
    if (x.type === 'radio' || x.type === 'checkbox') x.checked = false;
    else x.value = '';
  });

  q.querySelectorAll('textarea').forEach(x => x.value = '');

  q.querySelectorAll('.sc').forEach(x => {
    x.className = 'sc';
    x.setAttribute('aria-pressed', 'false');
  });

  const ot = q.querySelector('.ot');
  if (ot) ot.style.display = 'none';
}

// Number only the visible questions sequentially, so hidden ones never leave gaps.
function renumber() {
  let n = 0;

  SEC.flat().forEach(id => {
    if (vis(id)) NUM[id] = ++n;
  });

  SEC.flat().forEach(id => {
    const nb = document.querySelector(`#q${id} .nb`);
    if (nb && NUM[id] != null) nb.textContent = NUM[id];
  });
}

function syncConditions() {
  if (TR !== 'h') return;

  [103, 105, 106].forEach(id => {
    const show = vis(id);
    const q = $(`#q${id}`);

    if (!show) clearQuestion(id);
    if (q) q.style.display = show ? 'block' : 'none';
  });

  const path = hearingPath();
  if (path === HP) {
    renumber();
    return;
  }

  HP = path;

  SEC[1] = (
    path === 'not_interested'
      ? HEARING_UNINTERESTED
      : HEARING_GENERAL
  ).slice();

  SW.querySelectorAll('.pane')[1].innerHTML =
    SEC[1].map(id => qh(id)).join('');

  renumber();
  reach = 0;

  const tabs = SW.querySelectorAll('.tabs button');
  tabs[1].className = 'lk';

  applyLanguage(SW);
}

const URL_ = 'https://script.google.com/macros/s/AKfycbyMtKurV4BvE5NA7tOaJZhAANeiZp5TM9a_ChZVfuN4mIMjRla4PS6WO0C6m0FlKM2N/exec';

const ageG = () =>
  AGE < 18 ? '12–17' :
  AGE < 25 ? '18–24' :
  AGE < 35 ? '25–34' :
  AGE < 45 ? '35–44' : '45 أو أكثر';

function pay(st) {
  const answers = {};

  SEC.slice(0, reach + 1).forEach(s => {
    s.forEach(id => {
      answers[String(id)] = vis(id)
        ? (
            QM[id][1] === 'r'
              ? String(get(id) || '')
              : ans(id, ',').replace(/^—$/, '')
          )
        : '';
    });
  });

  return {
    schemaVersion: 3,
    hearingPath: TR === 'h' ? HP : '',
    id: ID,
    saveToken: uuid(),
    startTime: T0.toISOString(),
    endTime: st === 'in_progress' ? '' : new Date().toISOString(),
    name: N,
    age: AGE,
    ageGroup: ageG(),
    gender: G,
    hearing: HS,
    status: st,
    answers
  };
}

function lockSurvey(on) {
  saving = on ? 1 : 0;
  if (!SW) return;

  const description = SW.querySelector('#ds');

  if (description) {
    if (on) {
      description.innerHTML = bi(
        'جارٍ حفظ إجاباتك…',
        'Saving your answers…'
      );
    } else if (description.dataset.description) {
      description.innerHTML = description.dataset.description;
    }
  }

  SW.querySelectorAll('.bd button,.bd input,.bd textarea').forEach(el => {
    if (on) {
      el.dataset.wasDisabled = el.disabled ? '1' : '0';
      el.disabled = true;
    } else if (el.dataset.wasDisabled !== undefined) {
      el.disabled = el.dataset.wasDisabled === '1';
      delete el.dataset.wasDisabled;
    }
  });
}

// Only unconfirmed final responses are retained; confirmed responses are removed.
const FINAL_STORAGE_KEY = 'banan-pending-final-v3';
let finalSaveView = null;
const finalRequests = new Map();

function storedFinals() {
  try {
    const jobs = JSON.parse(localStorage.getItem(FINAL_STORAGE_KEY) || '{}');
    return jobs && typeof jobs === 'object' && !Array.isArray(jobs) ? jobs : {};
  }
  catch (e) { return {}; }
}

function rememberFinal(p) {
  try {
    const jobs = storedFinals();
    jobs[p.id] = p;
    localStorage.setItem(FINAL_STORAGE_KEY, JSON.stringify(jobs));
    return true;
  } catch (e) { return false; }
}

function forgetFinal(p) {
  try {
    const jobs = storedFinals();
    if (jobs[p.id] && jobs[p.id].saveToken === p.saveToken) {
      delete jobs[p.id];
      if (Object.keys(jobs).length) localStorage.setItem(FINAL_STORAGE_KEY, JSON.stringify(jobs));
      else localStorage.removeItem(FINAL_STORAGE_KEY);
    }
  } catch (e) {}
}

function renderFinalSaveStatus() {
  const el = $('#finalSaveStatus');
  if (!el || !finalSaveView) return;
  const {state, persisted} = finalSaveView;
  const messages = state === 'saved'
    ? ['تم إرسال إجاباتك بنجاح ✓', 'Your answers were sent successfully ✓']
    : state === 'saving'
      ? ['جارٍ إرسال إجاباتك… أبقِ الصفحة مفتوحة حتى يكتمل الإرسال. ويمكنك مشاركة الرابط الآن.',
         'Sending your answers… Keep this page open until sending completes. You can share the link now.']
      : persisted
        ? ['لم يكتمل الإرسال. إجاباتك محفوظة مؤقتًا على هذا الجهاز، وسنحاول مجددًا عند عودة الاتصال أو فتح الموقع. يمكنك أيضًا إعادة الإرسال الآن.',
           'Sending did not complete. Your answers are temporarily saved on this device. We will retry when you reconnect or reopen this site. You can also retry now.']
        : ['لم يكتمل الإرسال، وتعذّر حفظ نسخة على الجهاز. أبقِ الصفحة مفتوحة وأعد الإرسال.',
           'Sending did not complete and a device backup could not be saved. Keep this page open and retry.'];
  el.innerHTML = bi(...messages);
  const retryButton = $('#retryFinalSave');
  if (retryButton) retryButton.hidden = state !== 'failed';
  applyLanguage(el);
}

function submitFinal(p) {
  if (finalRequests.has(p.id)) return finalRequests.get(p.id);
  if (finalSaveView && finalSaveView.p.id === p.id) {
    finalSaveView.state = 'saving';
    renderFinalSaveStatus();
  }
  const task = enqueueSave(p).then(saved => {
    if (saved) forgetFinal(p);
    if (finalSaveView && finalSaveView.p.saveToken === p.saveToken) {
      finalSaveView.state = saved ? 'saved' : 'failed';
      renderFinalSaveStatus();
    }
    return saved;
  }).finally(() => finalRequests.delete(p.id));
  finalRequests.set(p.id, task);
  return task;
}

async function recoverFinals() {
  for (const p of Object.values(storedFinals())) {
    if (p && p.schemaVersion === 3 && p.id && p.saveToken && p.status === 'complete') {
      await submitFinal(p);
    }
  }
  if (finalSaveView && finalSaveView.state === 'failed') {
    await submitFinal(finalSaveView.p);
  }
}

window.addEventListener('online', () => { void recoverFinals(); });

let pendingSave = null;
let saveWorkerRunning = false;

function saveStatus(ar, en) {
  const hint = $('#savehint');
  if (!hint) return;
  hint.innerHTML = bi(ar, en);
  applyLanguage(hint);
}

function enqueueSave(p) {
  return new Promise(resolve => {
    if (pendingSave) pendingSave.resolve(false);

    pendingSave = {p, resolve};

    saveStatus('جارٍ حفظ إجاباتك…', 'Saving your answers…');
    void runSaveQueue();
  });
}

async function runSaveQueue() {
  if (saveWorkerRunning) return;
  saveWorkerRunning = true;

  try {
    while (pendingSave) {
      const job = pendingSave;
      pendingSave = null;

      let saved = false;

      try {
        saved = await send(job.p);
      } catch (e) {}

      if (!pendingSave) {
        saveStatus(
          saved
            ? 'تم حفظ إجاباتك ✓'
            : 'تعذّر الحفظ مؤقتًا — ستُعاد المحاولة مع الإرسال التالي',
          saved
            ? 'Your answers have been saved ✓'
            : 'Saving failed temporarily — we will retry with the next submission'
        );
      }

      job.resolve(saved);
    }
  } finally {
    saveWorkerRunning = false;
  }
}

const save = (st, next) => {
  if (saving) return;

  const p = pay(st);

  if (st === 'in_progress') {
    void enqueueSave(p);
    if (next) next();
    return;
  }

  // Keep a recoverable copy before displaying thanks; success still requires
  // the server to confirm this exact saveToken.
  const persisted = rememberFinal(p);
  finalSaveView = {p, persisted, state: 'saving'};
  saving = 1;
  if (next) next();
  void submitFinal(p);

};

function confirmSaved(id, token, ms = 30000) {
  return new Promise(resolve => {
    let delay = 300;
    let done = false;
    let retryTimer = null;
    let cancelRequest = () => {};

    const deadline = setTimeout(() => finish(false), ms);

    function finish(value) {
      if (done) return;
      done = true;

      clearTimeout(deadline);
      clearTimeout(retryTimer);
      cancelRequest();

      resolve(value);
    }

    function check() {
      if (done) return;

      const cb = 'banan_cb_' + Math.random()
        .toString(36)
        .slice(2, 12)
        .replace(/[^a-z0-9]/g, '');

      const script = document.createElement('script');

      let settled = false;
      let requestTimer;

      function cleanup() {
        clearTimeout(requestTimer);
        delete window[cb];
        script.remove();
      }

      cancelRequest = () => {
        settled = true;
        cleanup();
      };

      function respond(r) {
        if (settled || done) return;
        settled = true;
        cleanup();

        if (
          r &&
          r.ok &&
          r.schemaVersion === 3 &&
          r.exists &&
          r.saveToken === token
        ) {
          return finish(true);
        }

        delay = Math.min(delay + 200, 900);
        retryTimer = setTimeout(check, delay);
      }

      window[cb] = respond;
      script.onerror = () => respond(null);
      requestTimer = setTimeout(() => respond(null), 6000);

      script.src = URL_ +
        '?action=status&id=' + encodeURIComponent(id) +
        '&callback=' + cb +
        '&t=' + Date.now();

      document.head.append(script);
    }

    check();
  });
}

let endpointReady = false;
let endpointCheck = null;

function checkEndpoint() {
  if (endpointReady) return Promise.resolve(true);
  if (endpointCheck) return endpointCheck;

  endpointCheck = new Promise(resolve => {
    const cb = 'banan_cb_' + Math.random().toString(36).slice(2, 12);
    const script = document.createElement('script');
    let done = false;

    const finish = success => {
      if (done) return;
      done = true;

      clearTimeout(timer);
      script.remove();
      delete window[cb];

      endpointReady = success;
      resolve(success);
    };

    const timer = setTimeout(() => finish(false), 30000);

    window[cb] = r => finish(!!(
      r &&
      r.ok &&
      r.schemaVersion === 3
    ));

    script.onerror = () => finish(false);

    script.src = URL_ +
      '?action=ping&callback=' + cb +
      '&t=' + Date.now();

    document.head.append(script);
  }).finally(() => endpointCheck = null);

  return endpointCheck;
}

async function send(p, n = 0) {
  if (!URL_ || URL_.includes('PASTE_APPS_SCRIPT')) return true;
  if (!await checkEndpoint()) {
    console.warn('[Banan] Endpoint check failed: ping did not return schemaVersion 3. Redeploy Code.gs as a new version and check URL_.');
    return false;
  }

  try {
    fetch(URL_, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-store',
      headers: {'Content-Type': 'text/plain;charset=UTF-8'},
      body: JSON.stringify(p)
    }).catch(() => {});
  } catch (e) {}

  if (await confirmSaved(p.id, p.saveToken)) return true;

  console.warn('[Banan] Save not confirmed (attempt ' + (n + 1) + '). Check Apps Script > Executions for the error.');

  if (n < 2) {
    await new Promise(r => setTimeout(r, 500 * (n + 1)));
    return send(p, n + 1);
  }

  return false;
}

function retry(p, next) {
  const w = win(
    bi('تعذّر الحفظ', 'Unable to save'),
    `<p class="dm">${bi(
      'ما قدرنا نحفظ إجاباتك الحين، وإجاباتك ما زالت عندك. جرّب مرة ثانية.',
      'We could not save right now. Your answers are still on this page. Please try again.'
    )}</p>
    <button class="btn" type="button">${bi(
      'حاول مرة أخرى',
      'Try again'
    )}</button>`,
    {
      c: 'sm er',
      s: err,
      z: 5000,
      x: w => {
        w.remove();
        lockSurvey(false);
      }
    }
  );

  w.querySelector('.btn').onclick = () => {
    w.querySelector('.btn').disabled = true;

    enqueueSave(p).then(success => {
      if (success) {
        w.remove();
        lockSurvey(false);
        if (next) next();
      } else {
        w.remove();
        retry(p, next);
      }
    }).catch(() => {
      w.remove();
      retry(p, next);
    });
  };
}

function win(t, b, o = {}) {
  const w = document.createElement('div');
  w.className = 'win ' + (o.c || '');
  w.style.zIndex = o.z || ++z;

  w.innerHTML = `
    <div class="tb">
      <span>${t}</span>
      <i>
        <u>_</u>
        <u>□</u>
        <u class="x" role="button" data-ar-label="إغلاق" data-en-label="Close">✕</u>
      </i>
    </div>
    <div class="bd">${b}</div>
  `;

  w.querySelector('.x').onclick = () => o.x ? o.x(w) : nox();

  $('#desk').append(w);
  applyLanguage(w);
  (o.s || pop)();

  return w;
}

function dlg(m, bad = 1, en = '') {
  const w = win(
    bi(bad ? 'خطأ' : 'تنبيه', bad ? 'Error' : 'Notice'),
    `<p class="dm">${bad ? '🚫' : '💡'} ${bi(m, en)}</p>
    <button class="btn" type="button">${bi('موافق', 'OK')}</button>`,
    {
      c: 'sm' + (bad ? ' er' : ''),
      s: bad ? err : ok,
      z: 5000,
      x: w => w.remove()
    }
  );

  w.querySelector('.btn').onclick = () => w.remove();
}

const nox = () => dlg(
  'عذرًا 🙈 لا يمكن إغلاق هذه النافذة قبل إكمالها.',
  1,
  "Sorry! You cannot close this window until you finish it."
);

function icon(l, f, c = '') {
  const b = document.createElement('button');

  b.className = 'ico ' + c;
  b.type = 'button';

  b.innerHTML = `
    <svg width="56" height="64" viewBox="0 0 56 64" aria-hidden="true">
      <path d="M6 4h30l14 14v42H6z" fill="#fff" stroke="#1b1b1b" stroke-width="3" stroke-linejoin="round"/>
      <path d="M36 4v14h14" fill="#ffd84d" stroke="#1b1b1b" stroke-width="3" stroke-linejoin="round"/>
      <path d="M14 30h28M14 40h28M14 50h18" stroke="#2aa3c4" stroke-width="3"/>
    </svg>
    <br>${l}
  `;

  if (c === 'n') {
    b.querySelector('svg').innerHTML = `
      <path d="M8 4h40v56H8z" fill="#fff5cf" stroke="#1b1b1b" stroke-width="3"/>
      <path d="M8 4h40v12H8z" fill="#ff6f61" stroke="#1b1b1b" stroke-width="3"/>
      <path d="M16 25h24M16 35h24M16 45h16" stroke="#1b1b1b" stroke-width="3"/>
    `;

    b.querySelector('svg').setAttribute('aria-hidden', 'true');
  }

  b.onclick = f;
  $('#ic').append(b);
  applyLanguage(b);

  return b;
}

const I1 = $('#startFile');

I1.onclick = () => {
  try {
    C = C || new (window.AudioContext || window.webkitAudioContext)();
    if (C && C.state === 'suspended') C.resume();
  } catch (e) {}

  if (busy) return;
  busy = 1;
  load();
};

$('#mu').onclick = function() {
  mute = !mute;
  this.textContent = mute ? '🔇' : '🔊';
};

let openAnswers = null;

const mn = $('#mn');

$('#stb').onclick = e => {
  e.stopPropagation();
  ok();
  mn.style.display = mn.style.display === 'block' ? 'none' : 'block';
};

document.addEventListener('click', () => mn.style.display = 'none');

$('#m1').onclick = () => dlg(
  'بنان تطبيق لتعلّم لغة الإشارة السعودية بأسلوب تفاعلي وممتع، وهذا الاستبيان يساعدنا نفهم احتياجك 💙',
  0,
  'Banan helps you learn Saudi Sign Language in an interactive, fun way, and this survey helps us understand your needs.'
);

$('#m2').onclick = () => dlg(
  'الاستبيان يأخذ نحو 5 دقائق، وإجاباتك سرية وللبحث فقط 🔒',
  0,
  'About 5 minutes. Your answers are confidential and for research only.'
);

$('#m3').onclick = () => {
  if (openAnswers) openAnswers();
};

const tick = () => {
  $('#clk').textContent = new Date().toLocaleTimeString(
    LANG === 'en' ? 'en-US' : 'ar-SA',
    {hour: '2-digit', minute: '2-digit'}
  );
};

tick();

if (!URL_ || URL_.includes('PASTE_APPS_SCRIPT')) {
  saveStatus(
    'وضع معاينة — اربطي Google Sheets قبل النشر',
    'Preview mode — connect Google Sheets before publishing'
  );
}

setInterval(tick, 20000);

function load() {
  const w = win(
    bi('جارٍ التحميل…', 'Loading…'),
    `<svg width="40" height="32" viewBox="0 0 40 32" style="display:block" aria-hidden="true">
      <path d="M3 5h12l3 4h19v20H3z" fill="#ffd84d" stroke="#1b1b1b" stroke-width="3" stroke-linejoin="round"/>
    </svg>
    <p class="dm">${bi('لحظات ونبدأ 👋', 'Just a moment 👋')}</p>
    <div class="pb"><b id="lb"></b></div>`
  );

  let p = 0;

  const t = setInterval(() => {
    p += 5;
    $('#lb').style.width = p + '%';

    if (p >= 100) {
      clearInterval(t);
      w.remove();
      hello();
    }
  }, 100);
}

function hello() {
  const w = win(
    bi('رسالة جديدة', 'New message'),
    `
    <p class="dm">
      <b>${bi('وصلتك رسالة من بنان', 'You have a message from Banan!')}</b>
      <br>
      ${bi(
        'عرّفنا عليك قبل أن نبدأ، ولن يستغرق الأمر سوى دقائق.',
        'Tell us about yourself before we begin. It will only take a few minutes.'
      )}
    </p>

    <label class="fl">
      <span class="lb">
        <b>${bi('الاسم (يقبل اسمًا مستعارًا)', 'Name (a nickname is fine)')}</b>
      </span>
      <input type="text" id="nm" maxlength="40" autocomplete="off" dir="auto">
    </label>

    <label class="fl">
      <span class="lb"><b>${bi('العمر', 'Age')}</b></span>
      <input type="text" id="ag" maxlength="3" inputmode="numeric" pattern="[0-9]*" autocomplete="off">
    </label>

    <div class="lb"><b>${bi('الجنس', 'Gender')}</b></div>

    <div class="gc">
      <label class="gb">
        <input type="radio" name="g" value="ذكر">
        <svg width="30" height="32" viewBox="0 0 44 48" aria-hidden="true">
          <circle cx="22" cy="12" r="9" fill="#ffd84d" stroke="#1b1b1b" stroke-width="3"/>
          <path d="M6 46v-10a8 8 0 0 1 8-8h16a8 8 0 0 1 8 8v10z" fill="#3a5fcd" stroke="#1b1b1b" stroke-width="3" stroke-linejoin="round"/>
        </svg>
        <span>${bi('ذكر', 'Male')}</span>
      </label>

      <label class="gb">
        <input type="radio" name="g" value="أنثى">
        <svg width="30" height="32" viewBox="0 0 44 48" aria-hidden="true">
          <circle cx="22" cy="12" r="9" fill="#ffd84d" stroke="#1b1b1b" stroke-width="3"/>
          <path d="M22 24 8 46h28z" fill="#ff6f61" stroke="#1b1b1b" stroke-width="3" stroke-linejoin="round"/>
        </svg>
        <span>${bi('أنثى', 'Female')}</span>
      </label>
    </div>

    <div class="lb">
      <b>${bi('كيف تصف سمعك؟', 'How would you describe your hearing?')}</b>
    </div>

    <div class="gc hc">
      ${[
        ['سامع', 'Hearing'],
        ['غير سامع', 'Non-hearing']
      ].map(([ar, en]) => `
        <label class="gb">
          <input type="radio" name="h" value="${ar}">
          <span>${bi(ar, en)}</span>
        </label>
      `).join('')}
    </div>

    <p class="cs">${bi(
      'إجاباتك سرية وتُستخدم لأغراض البحث فقط. بالضغط على «موافق»، فإنك توافق على المشاركة.',
      'Your answers are confidential and used for research purposes only. By selecting “OK”, you consent to participate.'
    )}</p>

    <button class="btn" id="go" type="button" disabled>${bi('موافق', 'OK')}</button>
    `,
    {c: 'hw'}
  );

  $('#ag').addEventListener('input', e => {
    e.target.value = e.target.value
      .replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 0x660)
      .replace(/[\u06F0-\u06F9]/g, d => d.charCodeAt(0) - 0x6F0)
      .replace(/\D/g, '');
  });

  const chk = () => {
    $('#go').disabled = !(
      $('#nm').value.trim() &&
      $('#ag').value &&
      $('input[name=g]:checked') &&
      $('input[name=h]:checked')
    );
  };

  w.addEventListener('input', chk);
  w.addEventListener('change', chk);

  $('#go').onclick = () => {
    const n = $('#nm').value.trim();
    const a = +$('#ag').value;
    const g = ($('input[name=g]:checked') || {}).value;
    const hs = ($('input[name=h]:checked') || {}).value;

    if (!n || !a || !g || !hs) {
      return dlg(
        'عبّئ الاسم والعمر والجنس وحالة السمع أولًا 🙂',
        0,
        'Please enter your name, age, gender and hearing status first.'
      );
    }

    if (a < 12) {
      return dlg(
        'الاستبيان لمن هم 12 سنة فأكثر، شكرًا لاهتمامك 💛',
        0,
        'This survey is for ages 12 and above. Thank you for your interest!'
      );
    }

    if (!Number.isInteger(a)) {
      return dlg(
        'اكتب العمر بالسنوات كرقم صحيح 🙂',
        0,
        'Please enter your age as a whole number of years.'
      );
    }

    N = n;
    AGE = a;
    G = g;
    HS = hs;

    setTrack(hs === 'سامع' ? 'h' : 'd');

    T0 = new Date();
    ID = uuid();

    w.remove();
    ok();
    survey();
  };
}

function qh(id) {
  const q = QM[id];
  const [a, e] = q[2].split('|');
  const k = q[1];
  const o = ops(q);

  let h = `
    <div class="q" id="q${id}"${!vis(id) ? ' style="display:none"' : ''}>
      <b><i class="nb">${NUM[id]}</i>${bi(a, e)}</b>
  `;

  if (k === 's' || k === 'm') {
    h += `<div class="question-hint">${
      k === 'm'
        ? bi('يمكن اختيار أكثر من إجابة.', 'Select all that apply.')
        : bi('اختر إجابة واحدة.', 'Select one answer.')
    }</div>`;
  }

  if (id === 101) {
    h += `<div class="question-hint">${bi(
      'إذا كنت تدرس وتعمل معًا، اختر «طالب».',
      'If you both study and work, select “Student”.'
    )}</div>`;
  }

  if (EXCLUSIVE[id] !== undefined) {
    h += `<div class="question-hint">${bi(
      'خيار «' + o[EXCLUSIVE[id]][0] + '» لا يُختار مع الخيارات الأخرى.',
      '“' + o[EXCLUSIVE[id]][1] + '” cannot be selected with other options.'
    )}</div>`;
  }

  if (k === 't') {
    h += `
      <div class="question-hint">${bi('اختياري', 'Optional')}</div>
      <textarea rows="3" dir="auto"></textarea>
    `;
  } else if (k === 'r') {
    h += `
      <div class="sc2">
        ${[1, 2, 3, 4, 5].map(n => `
          <button type="button" class="sc" data-v="${n}" aria-pressed="false">${n}</button>
        `).join('')}
      </div>
      <div class="ends">
        <span>1 = ${bi(o[0][0], o[0][1])}</span>
        <span>5 = ${bi(o[1][0], o[1][1])}</span>
      </div>
    `;
  } else {
    h += o.map((x, i) => `
      <label class="op">
        <input type="${k === 's' ? 'radio' : 'checkbox'}" name="n${id}" value="${i}">
        ${bi(x[0], x[1])}
      </label>
    `).join('');

    if (o.some(x => x[2])) {
      h += `
        <input
          type="text"
          class="ot"
          dir="auto"
          data-ar-placeholder="حدد"
          data-en-placeholder="Please specify"
          style="display:none"
        >
      `;
    }
  }

  return h + '</div>';
}

const short = () => esc(N.length > 20 ? N.slice(0, 20) + '…' : N);

function survey() {
  void checkEndpoint();
  const mob = matchMedia('(max-width:600px)').matches;
  const n = short();

  const T = TR === 'd'
    ? [
        ["1 تواصلك", "1 Communication"],
        ["2 مواقفك", "2 Experiences"],
        ["3 رأيك", "3 Your views"]
      ]
    : [
        ["1 عنك", "1 About you"],
        ["2 رأيك", "2 Your views"]
      ];

  const title = mob
    ? bi('استبيان بنان 👋', 'Banan Survey 👋')
    : bh(
        `أهلًا يا <bdi>${n}</bdi> 👋 — استبيان بنان`,
        `Hi <bdi>${n}</bdi> 👋 — Banan Survey`
      );

  const w = SW = win(
    title,
    `
    <div class="tabs">
      ${T.map(([ar, en]) => `
        <button type="button">${bi(ar, en)}</button>
      `).join('')}
    </div>

    <div class="panes">
      ${SEC.map(s => `
        <div class="pane">${s.map(id => qh(id)).join('')}</div>
      `).join('')}
    </div>

    <div class="ft sf">
      <button class="btn" id="bk" type="button">${bi('رجوع', 'Back')}</button>
      <div class="pb"><b id="pg"></b></div>
      <button class="btn" id="okb" type="button"></button>
    </div>
    `,
    {c: 'sv'}
  );

  document.body.classList.add('insv');
  renumber();

  const biBar = w.querySelector('.tb i');
  const mt = document.createElement('u');
  const tg = document.createElement('u');

  mt.textContent = mute ? '🔇' : '🔊';
  mt.dataset.arTitle = 'الصوت';
  mt.dataset.enTitle = 'Sound';

  mt.onclick = () => {
    $('#mu').click();
    mt.textContent = mute ? '🔇' : '🔊';
  };

  tg.className = 'tg';
  tg.setAttribute('role', 'button');
  tg.tabIndex = 0;
  tg.dataset.languageToggle = '';
  tg.onclick = toggleLanguage;

  tg.onkeydown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleLanguage();
    }
  };

  biBar.prepend(tg);
  biBar.prepend(mt);

  applyLanguage(w);

  cur = 0;
  reach = 0;

  const show = i => {
    cur = i;

    $$('.pane').forEach((p, k) => {
      p.style.display = k === i ? 'block' : 'none';
    });

    $$('.tabs button').forEach((b, k) => {
      b.className = (k === i ? 'on ' : '') + (k > reach ? 'lk' : '');
    });

    $('#pg').style.width = (i + 1) * 100 / SEC.length + '%';
    $('#pg').textContent = (i + 1) + '/' + SEC.length;
    $('#bk').style.visibility = i ? 'visible' : 'hidden';

    $('#okb').innerHTML = i === SEC.length - 1
      ? bi('إرسال', 'Submit')
      : bi('التالي', 'Next');

    applyLanguage($('#okb'));

    $('.panes').scrollTop = 0;
  };

  tabTimers = [];

  $$('.tabs button').forEach((b, k) => {
    tabTimers.push(setTimeout(() => {
      b.style.visibility = 'visible';
      pop();
    }, 250 * (k + 1)));

    b.onclick = () => k > reach
      ? dlg('أكمل القسم الحالي أولًا', 1, 'Finish the current section first.')
      : (ok(), show(k));
  });

  show(0);

  $('#bk').onclick = () => {
    ok();
    show(cur - 1);
  };

  $('#okb').onclick = () => {
    if (saving) return;

    const section = cur;
    const miss = SEC[section].filter(id => vis(id) && !valid(id));

    if (miss.length) {
      w.classList.remove('sh');
      void w.offsetWidth;
      w.classList.add('sh');

      return dlg(
        'ناقصك الإجابة عن: ' + miss.map(id => NUM[id]).join('، '),
        1,
        'Please answer questions: ' + miss.map(id => NUM[id]).join(', ')
      );
    }

    if (section === SEC.length - 1) {
      reach = section;
      save('complete', () => fin(0));
      return;
    }

    ok();
    reach = Math.max(reach, section);

    save('in_progress', () => {
      reach = Math.max(reach, section + 1);
      show(section + 1);
    });
  };
}

document.addEventListener('change', e => {
  const t = e.target;
  const q = t.closest('.q');

  if (t.type === 'radio' || t.type === 'checkbox') {
    snd(t.checked ? 760 : 480, .07, 'triangle', .07);
  }

  if (!q) return;

  const id = +q.id.slice(1);
  const exclusive = EXCLUSIVE[id];

  if (
    t.type === 'checkbox' &&
    exclusive !== undefined &&
    t.checked
  ) {
    const inputs = [...q.querySelectorAll('input[type=checkbox]')];

    if (+t.value === exclusive) {
      inputs.forEach(c => {
        if (c !== t) c.checked = false;
      });
    } else {
      inputs[exclusive].checked = false;
    }
  }

  const ot = q.querySelector('.ot');

  if (ot) {
    const oi = ops(QM[id]).findIndex(o => o[2] === 'o');
    const c = q.querySelector(`input[value="${oi}"]`);

    ot.style.display = c && c.checked ? 'block' : 'none';

    if (!c || !c.checked) ot.value = '';
  }

  if (id === 102 || id === 104) syncConditions();
});

document.addEventListener('click', e => {
  const b = e.target.closest('.sc');
  if (!b) return;

  b.parentNode.querySelectorAll('.sc').forEach(x => {
    x.className = 'sc';
    x.setAttribute('aria-pressed', 'false');
  });

  b.className = 'sc on';
  b.setAttribute('aria-pressed', 'true');

  ok();
});

document.addEventListener('click', e => {
  const b = e.target.closest('.sc');
  if (!b) return;

  const v = +b.dataset.v;

  b.parentNode.querySelectorAll('.sc').forEach(x => {
    x.classList.toggle('fill', +x.dataset.v < v);
  });
});

function answerSnapshot() {
  return {
    name: N,
    age: AGE,
    ageGroup: ageG(),
    gender: G,
    hearing: HS,
    date: new Date(),
    questions: SEC.slice(0, reach + 1).flat().filter(vis).map(id => ({
      num: NUM[id],
      ar: QM[id][2].split('|')[0],
      en: QM[id][2].split('|')[1],
      answerAr: ans(id),
      answerEn: ans(id, ', ', 'en')
    }))
  };
}

function fin(d) {
  const snapshot = answerSnapshot();
  SW.remove();
  document.body.classList.remove('insv');
  ok();
  I1.disabled = true;
  I1.classList.add('finished');
  I1.dataset.arTitle = 'اكتملت المشاركة';
  I1.dataset.enTitle = 'Survey completed';
  const answersFile = icon(bi('إجاباتي', 'My answers'), () => notes(snapshot), 'n');
  answersFile.id = 'answersFile';
  answersFile.dataset.arLabel = 'فتح ملف إجاباتي';
  answersFile.dataset.enLabel = 'Open my answers';
  openAnswers = () => notes(snapshot);
  $('#m3').style.display = 'block';
  applyLanguage();
  pop();
  busy = 1;
  thanks(d);
}

function thanks(d) {
  const n = esc(N);

  const h = [10, 35, 60, 85].map((l, i) =>
    `<span class="ht" style="left:${l}%;animation-delay:${i * .6}s">♥</span>`
  ).join('');

  const bodyAr = `
    <p><b>شكرًا لك يا <bdi>${n}</bdi> 💙</b></p>
    <p>وقتك ورأيك صاروا جزءًا من بنان، وبفضلك نقرّب خطوة من تطبيق يخلّي التواصل مع مجتمع الصم أسهل وأقرب للجميع.</p>
  `;

  const bodyEn = `
    <p><b>Thank you, <bdi>${n}</bdi> 💙</b></p>
    <p>Your time and thoughts are now part of Banan. Thanks to you, we are one step closer to an app that makes communicating with the Deaf community easier for everyone.</p>
  `;

  const signoffAr = `
    <strong class="banan-stay">خلّك قريب 💙</strong>
    <strong class="banan-begin">بنان… توّه يبدأ</strong>
    <span class="banan-team">— فريق بنان</span>
  `;

  const signoffEn = `
    <strong class="banan-stay">Stay close 💙</strong>
    <strong class="banan-begin">Banan is just getting started</strong>
    <span class="banan-team">— The Banan Team</span>
  `;

  const w = win(
    bi('فريق بنان 💙', 'The Banan Team 💙'),
    `
    <div class="tkh">
      <span class="av">💙<i class="dot"></i></span>
      <div>
        <b>${bi('فريق بنان', 'The Banan Team')}</b>
        <span class="onl">● ${bi('متصل الآن', 'Online')}</span>
      </div>
    </div>

    <style>
      .win.nd.banan-thanks-window {
        position:fixed;display:flex;flex-direction:column;
        top:calc((100vh - var(--bh,50px)) / 2);
        top:calc((100dvh - var(--bh,50px)) / 2);
        height:min(520px,calc(100vh - var(--bh,50px) - 24px));
        height:min(520px,calc(100dvh - var(--bh,50px) - 24px));
        max-height:none;
      }
      .banan-thanks-window > .tb {flex:0 0 auto;}
      .win.banan-thanks-window > .bd {
        display:flex;flex-direction:column;flex:1 1 auto;
        min-height:0;max-height:none;overflow:hidden;
      }
      .banan-thanks-window .tkh,
      .banan-thanks-window .acts {flex:0 0 auto;}
      .banan-thanks-window .banan-messages {
        position:relative;flex:1 1 auto;min-height:0;
        overflow:auto;overscroll-behavior:contain;
        -webkit-overflow-scrolling:touch;
      }
      .banan-thanks-window #finalSaveStatus {
        margin:0;padding:8px 14px;font-size:12px;line-height:1.6;
      }
      .banan-thanks-window #finalSaveStatus:empty {display:none;}
      .nd .cht.banan-thanks {gap:10px;padding:12px 18px 14px;}
      .nd .banan-thanks .banan-signoff {
        position:relative;isolation:isolate;box-sizing:border-box;
        width:90%;align-self:center;padding:10px 12px 8px;margin:0;
        background:#cfeaf3;color:#1b1b1b;
        border:3px solid #1b1b1b;border-radius:20px 20px 6px 20px;
        text-align:center;box-shadow:3px 3px 0 #1b1b1b;
      }
      .nd .banan-signoff::after {
        content:"";position:absolute;right:-9px;bottom:12px;
        width:14px;height:14px;background:#cfeaf3;
        border-right:3px solid #1b1b1b;border-bottom:3px solid #1b1b1b;
        transform:rotate(-45deg);z-index:-1;
      }
      .nd .banan-signoff .banan-stay,
      .nd .banan-signoff .banan-begin,
      .nd .banan-signoff .banan-team {display:block;}
      .nd .banan-signoff .banan-stay {
        font-size:clamp(16px,4.4vw,20px);font-weight:700;line-height:1.5;
      }
      .nd .banan-signoff .banan-begin {
        margin-top:2px;font-size:clamp(18px,4.9vw,22px);
        font-weight:700;line-height:1.5;text-wrap:balance;
      }
      .nd .banan-signoff .banan-team {
        margin-top:4px;font-size:12px;font-weight:400;line-height:1.5;
      }
      .nd .banan-signoff [data-lang="en"] .banan-begin {
        font-size:clamp(16px,4.4vw,20px);
      }
    </style>
    <div class="banan-messages">
      <div class="cht banan-thanks">
        <div class="bub tk">${bh(bodyAr, bodyEn)}</div>
        <div class="bub tk banan-signoff">${bh(signoffAr, signoffEn)}</div>
      </div>
      ${h}
      <div id="finalSaveStatus" role="status" aria-live="polite" class="dm"></div>
    </div>
    
    <div class="acts">
      <button class="btn" id="sh" type="button">${bi('أرسل لصديق', 'Send to a friend')}</button>
      <button class="btn alt" id="cl" type="button">${bi('إغلاق', 'Close')}</button>
    </div>
    `,
    {c: 'nd banan-thanks-window', s: yay, x: w => w.remove()}
  );

  w.querySelector('#cl').onclick = () => w.remove();
  w.querySelector('#sh').onclick = shareSurvey;
  const retryFinalSave = w.querySelector('#retryFinalSave');
  if (retryFinalSave) {
    retryFinalSave.onclick = () => {
      if (finalSaveView) void submitFinal(finalSaveView.p);
    };
  }
  renderFinalSaveStatus();
}

function shareSurvey() {
  const u = location.href.split(/[?#]/)[0];
  const cs = !!navigator.share;

  const text = () => LANG === 'en'
    ? 'I took the Banan survey about learning Saudi Sign Language. I would love to hear your views too 💙'
    : 'شاركت في استبيان بنان عن تعلّم لغة الإشارة السعودية، وأبغى رأيك أنت كمان 💙';

  const s = win(
    bi('أرسل لصديق', 'Send to a friend'),
    `
    <p class="sp">${bi(
      'شارك رابط الاستبيان مع من تحب 💙',
      'Share the survey with someone you know 💙'
    )}</p>

    <div class="sg3${cs ? ' c3' : ''}">
      <a class="btn sb" id="wa" target="_blank" rel="noopener">
        <i></i>${bi('واتساب', 'WhatsApp')}
      </a>

      <button class="btn sb" id="cp" type="button">
        <i></i>${bi('نسخ الرابط', 'Copy link')}
      </button>

      ${cs ? `
        <button class="btn sb" id="ns" type="button">
          <i></i>${bi('مشاركة', 'Share')}
        </button>
      ` : ''}
    </div>

    <p class="cm" id="cm"></p>
    `,
    {c: 'sm sw', z: 5000, x: w => w.remove()}
  );

  const wa = s.querySelector('#wa');

  wa.href = 'https://wa.me/?text=' + encodeURIComponent(text() + ' ' + u);

  wa.onclick = () => {
    wa.href = 'https://wa.me/?text=' + encodeURIComponent(text() + ' ' + u);
  };

  if (cs) {
    s.querySelector('#ns').onclick = () =>
      navigator.share({text: text() + ' ' + u}).catch(() => {});
  }

  s.querySelector('#cp').onclick = () =>
    (navigator.clipboard || {
      writeText: () => Promise.reject()
    }).writeText(u).then(
      () => {
        s.querySelector('#cm').innerHTML = bi('تم النسخ', 'Copied');
        applyLanguage(s);
      },
      () => s.querySelector('#cm').textContent = u
    );
}

function ntext(snapshot, lang = LANG) {
  const en = lang === 'en';

  const labels = en
    ? ['Name', 'Age', 'Gender', 'Hearing']
    : ['الاسم', 'العمر', 'الجنس', 'السمع'];

  const gender = en
    ? (snapshot.gender === 'ذكر' ? 'Male' : 'Female')
    : snapshot.gender;

  const hearing = en
    ? ({
        'سامع': 'Hearing',
        'غير سامع': 'Non-hearing'
      }[snapshot.hearing] || snapshot.hearing)
    : snapshot.hearing;

  const group = en
    ? snapshot.ageGroup.replace('45 أو أكثر', '45 or above')
    : snapshot.ageGroup;

  let t = (
    en
      ? `Answers for ${snapshot.name} — Banan Survey`
      : `إجابات ${snapshot.name} — استبيان بنان`
  ) +
    `\n${snapshot.date.toLocaleDateString(en ? 'en-US' : 'ar-SA')}` +
    `\n\n${labels[0]}: ${snapshot.name}` +
    `\n${labels[1]}: ${snapshot.age} (${group})` +
    `\n${labels[2]}: ${gender}` +
    `\n${labels[3]}: ${hearing}\n`;

  snapshot.questions.forEach(q => {
    t += `\n${q.num}. ${en ? q.en : q.ar}` +
      `\n   ${en ? '→' : '←'} ${en ? q.answerEn : q.answerAr}\n`;
  });

  return t;
}

function notes(snapshot) {
  const ar = ntext(snapshot, 'ar');
  const en = ntext(snapshot, 'en');
  const nm = snapshot.name;
  const label = nm.length > 20 ? nm.slice(0, 20) + '…' : nm;

  const w = win(
    bi(`إجابات ${label}.txt`, `Answers for ${label}.txt`),
    `
    <div class="mn">${bi('ملف   تحرير   عرض', 'File   Edit   View')}</div>

    <pre data-lang="ar" dir="rtl">${esc(ar)}</pre>
    <pre data-lang="en" dir="ltr">${esc(en)}</pre>

    <div class="ft">
      <button class="btn" id="dl" type="button">${bi(
        'حفظ نسخة على جهازي',
        'Save a copy to my device'
      )}</button>
    </div>
    `,
    {c: 'np', x: w => w.remove()}
  );

  w.querySelector('#dl').onclick = () => {
    const a = document.createElement('a');

    a.href = URL.createObjectURL(new Blob(
      ['\ufeff' + ntext(snapshot).replace(/\n/g, '\r\n')],
      {type: 'text/plain;charset=utf-8'}
    ));

    a.download = (
      LANG === 'en' ? 'My-answers-' : 'إجاباتي-'
    ) + nm.replace(/[\\\/:*?"<>|]/g, '').slice(0, 20) + '.txt';

    a.click();

    setTimeout(() => URL.revokeObjectURL(a.href), 999);
    ok();
  };
}

$('#languageToggle').onclick = toggleLanguage;

setLanguage(LANG);

I1.disabled = false;
$('#startStatus').hidden = true;
void recoverFinals();