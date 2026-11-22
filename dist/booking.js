const nav = document.querySelector('#navigation');
const menu = document.querySelector('.menu');
const desktop = matchMedia('(min-width:58rem)');
function setMenu(open) {
  menu.setAttribute('aria-expanded', String(open));
  nav.hidden = !desktop.matches && !open;
}
menu.hidden = false;
setMenu(false);
desktop.addEventListener('change', () => setMenu(false));
menu.addEventListener('click', () => setMenu(nav.hidden));
nav.addEventListener('click', (event) => {
  if (!desktop.matches && event.target.matches('a')) {
    const section = document.querySelector(event.target.hash);
    setMenu(false);
    section.setAttribute('tabindex', '-1');
    section.focus({preventScroll: true});
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !desktop.matches && !nav.hidden) {
    setMenu(false);
    menu.focus();
  }
});

const form = document.querySelector('#request');
const panels = [...form.querySelectorAll('[data-step]')];
const field = (id) => document.getElementById(id);
const progress = field('progress');
const back = field('back');
const next = field('next');
const status = field('status');
const service = field('service');
const date = field('date');
const time = field('time');
const patient = field('patient');
const method = field('method');
const reply = field('reply');
const manual = field('manual');
const clinicEmail = 'dr.kbulaong@gmail.com';
const zone = 'Asia/Manila';
let step = 0;
let draft = '';

function todayInManila() {
  return new Intl.DateTimeFormat('en-CA', {timeZone: zone}).format(new Date());
}

function show(index, focus = true) {
  step = index;
  panels.forEach((panel, i) => {
    panel.hidden = i !== index;
    panel.querySelectorAll('input, select').forEach((control) => {
      control.disabled = i !== index;
    });
  });
  progress.textContent = index === 4 ? 'EMAIL HANDOFF' : 'STEP ' + (index + 1) + ' OF 4';
  back.hidden = index === 0;
  next.textContent = ['Continue', 'Continue', 'Review request', 'Open email draft', 'Try email again'][index];
  status.textContent = '';
  manual.hidden = true;
  date.min = todayInManila();
  if (focus) panels[index].querySelector('h3').focus();
}

function appointmentDate() {
  return new Date(date.value + 'T' + time.value + ':00+08:00');
}

function validate() {
  time.setCustomValidity(date.value && time.value && appointmentDate() <= new Date()
    ? 'Choose a future time in the Philippines.' : '');
  patient.setCustomValidity(patient.value && !patient.value.trim() ? 'Enter the patient name.' : '');
  const digits = reply.value.replace(/\D/g, '');
  const mobileValid = /^(?:09\d{9}|639\d{9})$/.test(digits) && /^\+?[0-9 ().-]+$/.test(reply.value.trim());
  reply.setCustomValidity(method.value === 'tel' && reply.value && !mobileValid
    ? 'Enter a Philippine mobile number, such as 0912 345 6789.' : '');
}

function updateReview() {
  const selected = service.selectedOptions[0].textContent;
  const preferred = new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'long', timeStyle: 'short', timeZone: zone
  }).format(appointmentDate()) + ' (Philippine time)';
  const entries = [
    ['Service', selected],
    ['Preferred date and time', preferred],
    ['Patient name', patient.value.trim()],
    [method.value === 'tel' ? 'Mobile number' : 'Email', reply.value.trim()]
  ];
  field('review').replaceChildren(...entries.flatMap(([label, value]) => {
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    return [term, description];
  }));
  draft = 'Hello Dr. K Prestige Dentale,\r\n\r\nI would like to request an appointment.\r\n\r\n'
    + entries.map(([label, value]) => label + ': ' + value).join('\r\n')
    + '\r\n\r\nPlease let me know if this time is available. Thank you.';
  manual.value = draft;
}

function openDraft() {
  if (appointmentDate() <= new Date()) {
    show(1);
    status.textContent = 'That time has passed. Choose a new preferred time.';
    return;
  }
  show(4);
  window.location.href = 'mailto:' + clinicEmail + '?subject=Appointment%20request&body=' + encodeURIComponent(draft);
}

method.addEventListener('change', () => {
  const email = method.value === 'email';
  reply.value = '';
  reply.type = method.value;
  reply.autocomplete = method.value;
  field('reply-label').textContent = email ? 'Email address' : 'Mobile number';
  validate();
});

form.noValidate = true;
form.addEventListener('submit', (event) => {
  event.preventDefault();
  date.min = todayInManila();
  validate();
  if (!form.reportValidity()) {
    status.textContent = 'Check the highlighted field before continuing.';
    return;
  }
  if (step >= 3) {
    openDraft();
    return;
  }
  if (step === 2) updateReview();
  show(step + 1);
});

back.addEventListener('click', () => show(step - 1));
document.querySelectorAll('[data-service]').forEach((link) => {
  link.addEventListener('click', () => {
    service.value = link.dataset.service;
    show(0, false);
    field('booking-title').focus({preventScroll: true});
  });
});

field('copy').addEventListener('click', async () => {
  const copy = field('copy');
  copy.disabled = true;
  status.textContent = 'Copying…';
  try {
    await navigator.clipboard.writeText(draft);
    status.textContent = 'Request copied. Paste it into an email to the clinic.';
  } catch {
    manual.hidden = false;
    manual.focus();
    manual.select();
    status.textContent = 'Copy the selected text and paste it into an email to the clinic.';
  } finally {
    copy.disabled = false;
  }
});

show(0, false);
form.hidden = false;
