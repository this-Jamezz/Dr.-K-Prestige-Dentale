import { createClient } from '@supabase/supabase-js';

const demoMode = import.meta.env.MODE === 'demo' || (import.meta.env.DEV && import.meta.env.MODE !== 'live');
const supabaseUrl = demoMode ? '' : import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = demoMode ? '' : import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const demo = !supabaseUrl && !supabasePublishableKey;
const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: false, detectSessionInUrl: false },
    })
  : null;

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
function explain(error) {
  if (error.code === 'P0001') return new Error(error.message);
  if (error.code === '23505') return new Error('An active request already exists with these details. Contact the clinic if you need to change it.');
  if (error.code === '23P01') return new Error('That time overlaps a confirmed appointment.');
  if (error.code === 'PGRST202') return new Error('Clinic scheduling is unavailable. Please call the clinic.');
  if (error.code === '42501' || error.status === 401 || error.status === 403) {
    return new Error('Check your credentials and clinic access.');
  }
  return new Error('The scheduling service could not complete the action. Please retry.');
}
async function rpc(name, args, staff = false) {
  if (!supabase) throw new Error('The scheduling connection is incomplete.');
  if (staff) {
    const {data} = await supabase.auth.getSession();
    if (!data.session) throw new Error('Sign in to manage clinic appointments.');
  }
  const {data, error, status} = await supabase.rpc(name, args).abortSignal(AbortSignal.timeout(12000));
  if (error) throw explain({...error,status});
  return data;
}
const transitions = {pending:['confirmed','cancelled'],confirmed:['completed','cancelled'],completed:[],cancelled:[]};
export const clinic = {
  demo, day, addDays, display, transitions, storageKey:key,
  async services() { return demo ? read().services : rpc('clinic_services',{}); },
  async slots(id,date,exclude) {
    return (demo ? available(read(),id,date,exclude) : await (exclude ? rpc('clinic_move_slots',{p_id:exclude,p_date:date},true) : rpc('clinic_slots',{p_service:id,p_date:date}))).map(normalize);
  },
  async submit(payload) {
    if (!demo) return rpc('clinic_request',{p_request:payload});
    return change(state => {
      if (state.appointments.some(a => a.id === payload.id)) return payload.id;
      if (state.appointments.some(a => ['pending','confirmed'].includes(a.status) && a.service_id === payload.service_id && a.start === payload.start)) {
        throw new Error('A demo request already exists for this service and time.');
      }
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
    if (!supabase) throw new Error('The scheduling connection is incomplete.');
    const {error} = await supabase.auth.signInWithPassword({email,password});
    if (error) throw explain(error);
  },
  async signOut() {
    if (!supabase) return;
    const {error} = await supabase.auth.signOut({scope:'local'});
    if (error) throw explain(error);
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

