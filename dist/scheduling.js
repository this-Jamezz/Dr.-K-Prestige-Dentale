(() => {
  const {supabaseUrl, supabasePublishableKey} = window.clinicConfig;
  const demo = !supabaseUrl && !supabasePublishableKey;
  const zone = 'Asia/Manila';
  const dayFormat = new Intl.DateTimeFormat('sv-SE', {timeZone: zone});
  const day = (date = new Date()) => dayFormat.format(date);
  const addDays = (value, count) => new Date(Date.parse(value + 'T00:00:00Z') + count * 86400000).toISOString().slice(0, 10);
  const display = (value, options = {dateStyle: 'medium', timeStyle: 'short'}) =>
    new Intl.DateTimeFormat('en-PH', {timeZone: zone, ...options}).format(new Date(value));
  const starts = (date, time) => new Date(date + 'T' + time + ':00+08:00').toISOString();
  const initialServices = [
    {id:'not-sure', name:'Not sure yet', minutes:30},
    {id:'checkup', name:'Dental Checkup (sample)', minutes:30},
    {id:'cleaning', name:'Professional Cleaning (sample)', minutes:45},
    {id:'smile', name:'Smile Consultation (sample)', minutes:30}
  ];
  const key = 'prestige-scheduling-demo-v1';
  const initial = () => ({
    services: initialServices,
    hours: Array.from({length:7}, (_, weekday) => ({weekday, opens:'10:00', closes:'18:00', enabled:weekday !== 0})),
    blocks: [],
    appointments: [
      [-5,'10:00',1,'completed','Alex Reyes'],[-4,'11:30',2,'completed','Sam Torres'],
      [-2,'14:00',1,'completed','Charlie Lee'],[-2,'15:00',3,'cancelled','Jamie Lim'],
      [0,'15:00',1,'confirmed','Morgan Santos'],[1,'11:00',2,'pending','Taylor Cruz'],
      [2,'13:00',3,'confirmed','Avery Flores'],[4,'14:30',1,'pending','Casey Diaz']
    ].map(([offset,time,service,status,patient],i) => {
      const start = starts(addDays(day(),offset),time);
      return {id:'DEMO-' + (100+i), start, end:new Date(Date.parse(start)+initialServices[service].minutes*60000).toISOString(),
        service_id:initialServices[service].id, service_name:initialServices[service].name, status, patient, contact:'patient@example.com', method:'email'};
    })
  });
  function read() {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    const state = initial();
    localStorage.setItem(key,JSON.stringify(state));
    return state;
  }
  function change(update) {
    const commit = () => {
      const state = read();
      const result = update(state);
      localStorage.setItem(key,JSON.stringify(state));
      return result;
    };
    return navigator.locks ? navigator.locks.request(key,commit) : Promise.resolve().then(commit);
  }
  function available(state, id, date, exclude) {
    if (date < day() || date > addDays(day(),90) || state.blocks.some(b => b.date === date)) return [];
    const rule = state.hours.find(h => h.weekday === new Date(date + 'T00:00:00Z').getUTCDay());
    const service = state.services.find(s => s.id === id);
    if (!rule?.enabled || !service) return [];
    const start = Date.parse(starts(date,rule.opens.slice(0,5)));
    const close = Date.parse(starts(date,rule.closes.slice(0,5)));
    const duration = service.minutes * 60000;
    const slots = [];
    for (let slot = start; slot + duration <= close; slot += 900000) {
      if (slot <= Date.now()) continue;
      const collision = state.appointments.some(a => a.id !== exclude && a.status === 'confirmed'
        && Date.parse(a.start) < slot + duration && Date.parse(a.end) > slot);
      if (!collision) slots.push(new Date(slot).toISOString());
    }
    return slots;
  }
  const normalize = (value) => new Date(value).toISOString();
  const configReady = Boolean(supabaseUrl && supabasePublishableKey);
  let session = null;
  let refreshing;
  async function request(path, body, staff = false) {
    if (!configReady) throw new Error('The scheduling connection is incomplete.');
    if (staff && !session) throw new Error('Sign in to manage clinic appointments.');
    if (staff && Date.now() >= session.expires_at * 1000 - 30000) {
      refreshing ??= request('/auth/v1/token?grant_type=refresh_token', {refresh_token:session.refresh_token}).finally(() => { refreshing = undefined; });
      session = await refreshing;
    }
    const response = await fetch(supabaseUrl.replace(/\/$/,'') + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {apikey:supabasePublishableKey,'Content-Type':'application/json',
        ...(staff ? {Authorization:'Bearer ' + session.access_token} : {})},
      body:body === undefined ? undefined : JSON.stringify(body),
      signal:AbortSignal.timeout(12000)
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      if (detail.code === 'P0001') throw new Error(detail.message);
      if (detail.code === '23P01') throw new Error('That time overlaps a confirmed appointment.');
      if (response.status === 401 || response.status === 403) throw new Error('Check your credentials and clinic access.');
      throw new Error('The scheduling service could not complete the action. Please retry.');
    }
    return response.status === 204 ? null : response.json();
  }
  const rpc = (name, args, staff = false) => request('/rest/v1/rpc/' + name,args,staff);
  const transitions = {pending:['confirmed','cancelled'],confirmed:['completed','cancelled'],completed:[],cancelled:[]};
  window.clinic = {
    demo, day, addDays, display, transitions, storageKey:key,
    async services() { return demo ? read().services : rpc('clinic_services',{}); },
    async slots(id,date,exclude) {
      return (demo ? available(read(),id,date,exclude) : await (exclude ? rpc('clinic_move_slots',{p_id:exclude,p_date:date},true) : rpc('clinic_slots',{p_service:id,p_date:date}))).map(normalize);
    },
    async submit(payload) {
      if (!demo) return rpc('clinic_request',{p_request:payload});
      return change(state => {
        if (state.appointments.some(a => a.id === payload.id)) return payload.id;
        if (!available(state,payload.service_id,day(new Date(payload.start))).includes(payload.start)) {
          throw new Error('That time is no longer available. Please choose another time.');
        }
        const service = state.services.find(s => s.id === payload.service_id);
        state.appointments.push({id:payload.id,service_id:service.id,service_name:service.name,start:payload.start,
          end:new Date(Date.parse(payload.start)+service.minutes*60000).toISOString(),
          patient:'Sample Patient',contact:'patient@example.com',method:'email',status:'pending'});
        return payload.id;
      });
    },
    async signIn(email,password) {
      session = await request('/auth/v1/token?grant_type=password',{email,password});
    },
    async signOut() {
      try { if (session) await request('/auth/v1/logout',{},true); }
      finally { session = null; }
    },
    async dashboard() { return demo ? read() : rpc('clinic_dashboard',{},true); },
    async update(id,status,move) {
      if (!demo) return rpc('clinic_update',{p_id:id,p_status:status,p_move:move || null},true);
      return change(state => {
        const row = state.appointments.find(a => a.id === id);
        if (!row || (status && !transitions[row.status].includes(status))
          || (move && !['pending','confirmed'].includes(row.status))) throw new Error('That appointment has changed. Refresh and try again.');
        const start = move || row.start;
        if ((move || status === 'confirmed') &&
          !available(state,row.service_id,day(new Date(start)),id).includes(start)) {
          throw new Error('That time is outside availability or overlaps a confirmed appointment.');
        }
        if (status === 'completed' && Date.parse(row.start) > Date.now()) throw new Error('This appointment has not started yet.');
        if (move || status === 'confirmed') {
          const service = state.services.find(s => s.id === row.service_id);
          row.start = start;
          row.end = new Date(Date.parse(start)+service.minutes*60000).toISOString();
        }
        if (status) row.status = status;
      });
    },
    async setting(kind,value) {
      if (!demo) return rpc('clinic_setting',{p_kind:kind,p_value:value},true);
      return change(state => {
        if (kind === 'hours') state.hours = value;
        if (kind === 'services') state.services = value;
        if (kind === 'block') {
          state.blocks = state.blocks.filter(b => b.date !== value.date);
          if (value.blocked) {
            if (state.appointments.some(a => a.status === 'confirmed' && day(new Date(a.start)) === value.date)) {
              throw new Error('Reschedule or cancel confirmed appointments before blocking this date.');
            }
            state.blocks.push({date:value.date});
            state.blocks.sort((a,b) => a.date.localeCompare(b.date));
          }
        }
      });
    }
  };
})();


