import { clinic } from './scheduling.js';

export function startDashboard() {
  const by = id => document.getElementById(id);
  const dialog = by('manage');
  const statuses = ['pending','confirmed','completed','cancelled'];
  const title = value => value[0].toUpperCase() + value.slice(1);
  const option = (label,value) => new Option(label,value);
  const node = (tag,text,className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  let data;
  let active;
  let moveVersion = 0;
  let page = 0;
  let refreshVersion = 0;
  let chartObserver;
  const pageSize = 10;
  const notice = text => { by('notice').textContent = text; };
  const localDay = row => clinic.day(new Date(row.start));
  const today = clinic.day();
  by('today').textContent = clinic.display(new Date(),{dateStyle:'full'}) + ' · Philippine time';
  by('blocked-date').min = today;
  by('move-date').min = today;
  by('move-date').max = clinic.addDays(today,90);

  function overview() {
    const rows = data.appointments;
    const totals = Object.fromEntries(statuses.map(status => [status, rows.filter(a => a.status === status).length]));
    const cards = [
      ['Pending requests', totals.pending],
      ['Upcoming confirmed', rows.filter(a => a.status === 'confirmed' && Date.parse(a.start) > Date.now()).length],
      ['Scheduled today', rows.filter(a => a.status !== 'cancelled' && localDay(a) === today).length],
      ['Completed visits', totals.completed]
    ];
    by('metrics').replaceChildren(...cards.map(([label,count]) => {
      const card = node('article',undefined,'metric');
      card.append(node('p',label),node('strong',String(count)));
      return card;
    }));
    by('status-chart').replaceChildren(...statuses.map(status => {
      const line = node('div',undefined,'status-line');
      const meter = node('meter');
      meter.max = Math.max(1,rows.length);
      meter.value = totals[status];
      meter.setAttribute('aria-label',title(status) + ' appointments');
      line.append(node('span',title(status)),meter,node('strong',String(totals[status])));
      return line;
    }));
    chart();
  }

  function chart() {
    const period = by('period').value;
    const count = period === 'next' ? 7 : Number(period);
    const start = period === 'next' ? today : clinic.addDays(today,1-count);
    const dates = Array.from({length:count},(_,i) => clinic.addDays(start,i));
    const values = dates.map(date => data.appointments.filter(row => localDay(row) === date).length);
    const max = Math.max(1,...values);
    const caption = by('chart-caption');
    caption.textContent = values.reduce((sum,value) => sum + value,0) + ' appointments in this period.';
    const canvas = node('canvas',undefined,'spark');
    canvas.setAttribute('aria-hidden','true');
    const context = canvas.getContext('2d');
    function draw(activeIndex) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height || !context) return;
      const scale = devicePixelRatio || 1;
      canvas.width = Math.round(width*scale);
      canvas.height = Math.round(height*scale);
      context.scale(scale,scale);
      const points = values.map((value,i) => [(i+.5)*width/count,height-12-value*(height-24)/max]);
      const trace = limit => {
        context.beginPath();
        points.slice(0,limit+1).forEach(([x,y],i) => {
          if (i === 0) context.moveTo(x,y);
          else {
            const [previousX,previousY] = points[i-1];
            const middle = (x+previousX)/2;
            context.bezierCurveTo(middle,previousY,middle,y,x,y);
          }
        });
      };
      trace(count-1);
      context.lineTo(points.at(-1)[0],height);
      context.lineTo(points[0][0],height);
      context.closePath();
      const fill = context.createLinearGradient(0,0,0,height);
      fill.addColorStop(0,'#dfb65c66');
      fill.addColorStop(1,'#dfb65c08');
      context.fillStyle = fill;
      context.fill();
      trace(count-1);
      context.lineWidth = 2.5;
      context.strokeStyle = '#b48c45';
      context.stroke();
      if (activeIndex === undefined) return;
      trace(activeIndex);
      context.strokeStyle = '#76501a';
      context.stroke();
      const [x,y] = points[activeIndex];
      context.beginPath();
      context.arc(x,y,4.5,0,2*Math.PI);
      context.fillStyle = '#76501a';
      context.fill();
    }
    const container = by('chart');
    const choices = dates.map((date,i) => {
      const midday = date + 'T04:00:00Z';
      const label = clinic.display(midday,{month:'short',day:'numeric'}) + ' · ' + values[i] + (values[i] === 1 ? ' appointment' : ' appointments');
      const point = node('button',String(Number(date.slice(-2))));
      point.type = 'button';
      point.setAttribute('aria-label',label);
      for (const event of ['focus','mouseenter','click']) point.addEventListener(event,() => {
        caption.textContent = label;
        draw(i);
      });
      return point;
    });
    container.replaceChildren(canvas,...choices);
    chartObserver?.disconnect();
    chartObserver = new ResizeObserver(() => draw());
    chartObserver.observe(container);
  }

  function table() {
    const filter = by('filter').value;
    const date = by('on-date').value;
    const query = by('search').value.trim().toLowerCase();
    const rows = data.appointments.filter(row =>
      (!filter || row.status === filter) && (!date || localDay(row) === date) &&
      [row.patient,row.service_name,row.id].some(value => value.toLowerCase().includes(query))
    ).sort((a,b) => {
      const delta = Number(b.status === 'pending') - Number(a.status === 'pending');
      return delta || Date.parse(b.start) - Date.parse(a.start);
    });
    by('results').textContent = rows.length + (rows.length === 1 ? ' appointment' : ' appointments');
    by('empty').hidden = Boolean(rows.length);
    const pages = Math.max(1,Math.ceil(rows.length/pageSize));
    page = Math.min(page,pages-1);
    by('pagination').hidden = pages < 2;
    by('page-label').textContent = 'Page ' + (page+1) + ' of ' + pages;
    by('previous-page').disabled = page === 0;
    by('next-page').disabled = page+1 === pages;
    by('rows').replaceChildren(...rows.slice(page*pageSize,(page+1)*pageSize).map(row => {
      const tr = node('tr');
      for (const value of [row.patient,row.service_name,clinic.display(row.start)]) tr.append(node('td',value));
      const status = node('td');
      status.append(node('span',title(row.status),'badge ' + row.status));
      const cell = node('td');
      const action = node('button','View','button outline');
      action.type = 'button';
      action.setAttribute('aria-label','View appointment for ' + row.patient);
      action.addEventListener('click',() => manage(row));
      cell.append(action);
      tr.append(status,cell);
      return tr;
    }));
  }

  function manage(row) {
    active = row;
    by('manage-subtitle').textContent = row.id;
    const details = [
      ['Patient',row.patient],[row.method === 'tel' ? 'Mobile number' : 'Email',row.contact],
      ['Service',row.service_name],['Date and time',clinic.display(row.start) + ' (Philippine time)'],['Status',title(row.status)]
    ];
    const actions = [];
    for (const status of clinic.transitions[row.status]) {
      if (status !== 'completed' || Date.parse(row.start) <= Date.now()) {
        actions.push(option({confirmed:'Confirm visit',completed:'Mark completed',cancelled:'Cancel appointment'}[status],status));
      }
    }
    if (['pending','confirmed'].includes(row.status)) actions.push(option('Reschedule','move'));
    by('detail').replaceChildren(...details.flatMap(([label,value]) => [node('dt',label),node('dd',value)]));
    by('action').replaceChildren(option('Select an action',''),...actions);
    by('action').hidden = actions.length === 0;
    document.querySelector('label[for=action]').hidden = actions.length === 0;
    by('save-action').hidden = actions.length === 0;
    by('move-date').value = '';
    by('move-time').replaceChildren(option('Choose a date first',''));
    by('reschedule').hidden = true;
    by('move-date').required = false;
    by('move-time').required = false;
    by('manage-error').textContent = '';
    dialog.showModal();
  }

  async function moveSlots() {
    const version = ++moveVersion;
    const date = by('move-date').value;
    const row = active;
    by('move-time').replaceChildren(option(date ? 'Loading times…' : 'Choose a date first',''));
    by('manage-error').textContent = '';
    if (!date || !by('move-date').checkValidity()) return;
    try {
      const times = await clinic.slots(row.service_id,date,row.id);
      if (version !== moveVersion || row !== active || !dialog.open) return;
      const slots = times.filter(time => Date.parse(time) !== Date.parse(row.start));
      by('move-time').replaceChildren(option(slots.length ? 'Select a time' : 'No available times',''),
        ...slots.map(slot => option(clinic.display(slot,{timeStyle:'short'}),slot)));
    } catch (error) {
      if (version === moveVersion && row === active) {
        by('move-time').replaceChildren(option('Choose the date again',''));
        by('manage-error').textContent = error.message;
      }
    }
  }

  function settings() {
    const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    by('hours-fields').replaceChildren(...data.hours.map(rule => {
      const row = node('div',undefined,'hour-row');
      const checkbox = node('input');
      checkbox.type = 'checkbox';
      checkbox.checked = rule.enabled;
      const label = node('label',weekdays[rule.weekday]);
      label.prepend(checkbox);
      row.dataset.weekday = rule.weekday;
      function timeInput(field,label) {
        const control = node('input');
        control.type = 'time';
        control.value = rule[field].slice(0,5);
        control.required = true;
        control.dataset.field = field;
        control.setAttribute('aria-label',weekdays[rule.weekday] + ' ' + label);
        return control;
      }
      row.append(label,timeInput('opens','opens'),timeInput('closes','closes'));
      return row;
    }));
    by('service-fields').replaceChildren(...data.services.flatMap(item => {
      const control = node('input');
      control.type = 'number';
      control.id = 'minutes-' + item.id;
      control.min = 15;
      control.max = 240;
      control.step = 15;
      control.required = true;
      control.value = item.minutes;
      const label = node('label',item.name + ' (minutes)');
      label.htmlFor = control.id;
      return [label,control];
    }));
    by('blocked-list').replaceChildren(...data.blocks.map(block => {
      const li = node('li',clinic.display(block.date + 'T04:00:00Z',{dateStyle:'medium'}));
      const button = node('button','Unblock','button outline');
      button.type = 'button';
      button.setAttribute('aria-label','Unblock ' + block.date);
      button.addEventListener('click',() => saveSetting(by('blocks'),'block',{date:block.date,blocked:false},button));
      li.append(button);
      return li;
    }));
  }

  async function refresh(includeSettings = true) {
    const version = ++refreshVersion;
    const result = await clinic.dashboard();
    if (version !== refreshVersion) return;
    data = result;
    by('signin').hidden = true;
    by('workspace').hidden = false;
    by('refresh').hidden = false;
    by('logout').hidden = clinic.demo;
    overview();
    table();
    if (includeSettings) settings();
  }

  async function saveSetting(form,kind,value,button = form.querySelector('button')) {
    const feedback = form.querySelector('.form-feedback');
    button.disabled = true;
    feedback.textContent = 'Saving…';
    try {
      await clinic.setting(kind,value);
      await refresh();
      feedback.textContent = 'Saved.';
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }

  by('period').addEventListener('change',chart);
  for (const id of ['search','filter','on-date']) by(id).addEventListener(id === 'search' ? 'input' : 'change',() => { page = 0; table(); });
  by('previous-page').addEventListener('click',() => { page--; table(); by('page-label').setAttribute('aria-live','polite'); });
  by('next-page').addEventListener('click',() => { page++; table(); by('page-label').setAttribute('aria-live','polite'); });
  by('close').addEventListener('click',() => dialog.close());
  dialog.addEventListener('cancel',event => { if (by('save-action').disabled) event.preventDefault(); });
  by('action').addEventListener('change',() => {
    const moving = by('action').value === 'move';
    by('reschedule').hidden = !moving;
    by('move-date').required = moving;
    by('move-time').required = moving;
    by('manage-error').textContent = '';
  });
  by('move-date').addEventListener('change',moveSlots);
  by('manage-form').addEventListener('submit',async event => {
    event.preventDefault();
    const action = by('action').value;
    const button = by('save-action');
    if (button.disabled) return;
    button.disabled = true;
    by('close').disabled = true;
    by('manage-error').textContent = 'Saving…';
    try {
      await clinic.update(active.id,action === 'move' ? null : action,action === 'move' ? by('move-time').value : null);
      dialog.close();
      await refresh(false);
      notice('Appointment updated. Contact the patient directly about the change.');
      by('search').focus();
    } catch (error) {
      if (dialog.open) by('manage-error').textContent = error.message;
      else notice('Appointment saved. Refresh to load the updated list.');
    } finally {
      button.disabled = false;
      by('close').disabled = false;
    }
  });
  by('hours').addEventListener('submit',event => {
    event.preventDefault();
    const hours = [...by('hours-fields').children].map(row => ({
      weekday:Number(row.dataset.weekday),enabled:row.querySelector('input[type=checkbox]').checked,
      opens:row.querySelector('[data-field=opens]').value,closes:row.querySelector('[data-field=closes]').value
    }));
    if (hours.some(rule => rule.opens >= rule.closes)) {
      by('hours').querySelector('.form-feedback').textContent = 'Closing time must be later than opening time.';
      return;
    }
    void saveSetting(by('hours'),'hours',hours);
  });
  by('services').addEventListener('submit',event => {
    event.preventDefault();
    void saveSetting(by('services'),'services',data.services.map(item => ({...item,minutes:Number(by('minutes-' + item.id).value)})));
  });
  by('blocks').addEventListener('submit',event => {
    event.preventDefault();
    void saveSetting(by('blocks'),'block',{date:by('blocked-date').value,blocked:true});
  });
  by('refresh').addEventListener('click',async () => {
    notice('Refreshing…');
    try { await refresh(); notice('Dashboard refreshed.'); }
    catch (error) { notice(error.message); }
  });
  by('signin').addEventListener('submit',async event => {
    event.preventDefault();
    const button = by('signin').querySelector('button');
    button.disabled = true;
    notice('Signing in…');
    try {
      await clinic.signIn(by('email').value.trim(),by('password').value);
      await refresh();
      notice('');
    } catch (error) {
      await clinic.signOut().catch(() => {});
      notice(error.message);
    } finally {
      by('password').value = '';
      button.disabled = false;
    }
  });
  by('logout').addEventListener('click',async () => {
    ++refreshVersion;
    by('workspace').hidden = true;
    by('refresh').hidden = true;
    by('logout').hidden = true;
    data = undefined;
    active = undefined;
    by('rows').replaceChildren();
    by('detail').replaceChildren();
    by('manage-subtitle').textContent = '';
    try { await clinic.signOut(); notice('Signed out.'); }
    catch { notice('Signed out of this page.'); }
    by('signin').hidden = false;
    by('email').focus();
  });
  if (clinic.demo) {
    by('demo').hidden = false;
    by('refresh').hidden = false;
    refresh().catch(error => notice(error.message));
    window.addEventListener('storage',event => {
      if (event.key === clinic.storageKey) refresh(false).catch(error => notice(error.message));
    });
  } else {
    by('signin').hidden = false;
  }
}
