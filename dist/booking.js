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
const field = id => document.getElementById(id);
const panels = [...form.querySelectorAll('[data-step]')];
const {service,date,time,patient,method,reply,progress,back,next,status,retry} =
  Object.fromEntries(['service','date','time','patient','method','reply','progress','back','next','status','retry'].map(id => [id,field(id)]));
let step = 0;
let loadVersion = 0;
let busy = false;
let payload;
let retryAction;

function message(text, action) {
  status.textContent = text;
  retryAction = action;
  retry.hidden = !action;
}

function show(index, focus = true) {
  step = index;
  panels.forEach((panel,i) => {
    panel.hidden = i !== index;
    panel.querySelectorAll('input,select').forEach(control => { control.disabled = i !== index; });
  });
  progress.textContent = index === 4 ? 'APPOINTMENT REQUEST' : 'STEP ' + (index+1) + ' OF 4';
  next.textContent = ['Continue','Continue','Review request',clinic.demo ? 'Send demo request' : 'Send request','Start another request'][index];
  back.hidden = index === 0 || index === 4;
  next.disabled = index === 1 && !time.value;
  message('');
  if (focus) panels[index].querySelector('h3').focus();
}

function option(label,value) {
  return new Option(label,value);
}

async function loadServices() {
  next.disabled = true;
  message('Loading services…');
  try {
    const items = await clinic.services();
    service.replaceChildren(option('Select an option',''),...items.map(item => option(item.name,item.id)));
    next.disabled = false;
    message('');
  } catch (error) {
    message(error.message,loadServices);
  }
}

async function loadSlots() {
  const version = ++loadVersion;
  const selected = time.value;
  next.disabled = true;
  time.replaceChildren(option(date.value ? 'Loading times…' : 'Choose a date first',''));
  if (!date.value || !date.checkValidity()) {
    time.replaceChildren(option('Choose a valid date first',''));
    message(date.value ? 'Choose a date within the next 90 days.' : '');
    return;
  }
  message('Checking availability…');
  try {
    const slots = await clinic.slots(service.value,date.value);
    if (version !== loadVersion || step !== 1) return;
    time.replaceChildren(option(slots.length ? 'Select a time' : 'No available times',''),
      ...slots.map(slot => option(clinic.display(slot,{timeStyle:'short'}),slot)));
    if (slots.includes(selected)) time.value = selected;
    next.disabled = !time.value;
    message(slots.length ? '' : 'No available times on this date. Try another day.');
  } catch (error) {
    if (version !== loadVersion || step !== 1) return;
    time.replaceChildren(option('Times unavailable',''));
    message(error.message,loadSlots);
  }
}

function review() {
  const rows = [
    ['Service',service.selectedOptions[0].textContent],
    ['Date and time',clinic.display(time.value) + ' (Philippine time)'],
    ['Patient name',patient.value.trim()],
    [method.value === 'tel' ? 'Mobile number' : 'Email',reply.value.trim()]
  ];
  field('review').replaceChildren(...rows.flatMap(([label,value]) => {
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    return [term,description];
  }));
  const values = {service_id:service.value,start:time.value,patient:patient.value.trim(),method:method.value,contact:reply.value.trim()};
  if (!payload || Object.keys(values).some(key => values[key] !== payload[key])) payload = {id:crypto.randomUUID(),...values};
}

async function send() {
  busy = true;
  next.disabled = true;
  back.disabled = true;
  message(clinic.demo ? 'Saving demo request…' : 'Sending request…');
  try {
    const reference = await clinic.submit(payload);
    field('receipt-title').textContent = clinic.demo ? 'Demo request saved' : 'Request received';
    field('receipt-message').textContent = clinic.demo
      ? 'View this sample in the staff dashboard in this browser.'
      : 'The clinic will contact you to confirm your schedule.';
    field('receipt-reference').textContent = 'Reference ' + reference;
    show(4);
  } catch (error) {
    if (/no longer available/i.test(error.message)) {
      show(1);
      await loadSlots();
      if (!retryAction) message('That time is no longer available. Choose another time.');
    } else {
      message(error.message,send);
    }
  } finally {
    busy = false;
    back.disabled = false;
    next.disabled = step === 1 && !time.value;
  }
}

function reset() {
  form.reset();
  reply.type = 'tel';
  reply.autocomplete = 'tel';
  field('reply-label').textContent = 'Mobile number';
  time.replaceChildren(option('Choose a date first',''));
  payload = undefined;
  show(0);
}

form.noValidate = true;
form.addEventListener('submit',event => {
  event.preventDefault();
  if (busy || next.disabled) return;
  if (step === 4) return reset();
  if (step === 3) return void send();
  const digits = reply.value.replace(/\D/g,'');
  patient.setCustomValidity(patient.value && !patient.value.trim() ? 'Enter the patient name.' : '');
  reply.setCustomValidity(method.value === 'tel' && reply.value && !(/^(?:09\d{9}|639\d{9})$/.test(digits) && /^\+?[0-9 ().-]+$/.test(reply.value.trim()))
    ? 'Enter a Philippine mobile number.' : '');
  if (!form.reportValidity()) return message('Check the highlighted field before continuing.');
  if (step === 2) review();
  show(step+1);
  if (step === 1) void loadSlots();
});
date.addEventListener('change',loadSlots);
time.addEventListener('change',() => { next.disabled = !time.value; });
method.addEventListener('change',() => {
  reply.value = '';
  reply.type = method.value;
  reply.autocomplete = method.value;
  field('reply-label').textContent = method.value === 'email' ? 'Email address' : 'Mobile number';
});
retry.addEventListener('click',() => retryAction?.());
back.addEventListener('click',() => {
  show(step-1);
  if (step === 1) void loadSlots();
});
document.querySelectorAll('[data-service]').forEach(link => {
  link.addEventListener('click',() => {
    if (busy) return;
    show(0,false);
    service.value = [...service.options].some(o => o.value === link.dataset.service) ? link.dataset.service : '';
    next.disabled = service.options.length <= 1;
    if (next.disabled) void loadServices();
    field('booking-title').focus({preventScroll:true});
  });
});
date.min = clinic.day();
date.max = clinic.addDays(date.min,90);
field('demo-booking').hidden = !clinic.demo;
show(0,false);
form.hidden = false;
void loadServices();
