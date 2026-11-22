import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { startDashboard } from './admin.js';
import './tailwind.css';
import './site.css';
import './admin.css';

function Overview() {
  return (
    <>
      <section id="overview" aria-label="Overview">
      <div className="metrics" id="metrics"></div>
      <div className="insights grid gap-3.5"><article className="panel"><div className="panel-head"><div><h2>Appointment activity</h2><p>Scheduled visits by day. Includes all statuses.</p></div><div><label htmlFor="period" className="sr-only">Chart period</label><select id="period"><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="next">Next 7 days</option></select></div></div><div className="chart" id="chart"></div><p className="chart-caption" id="chart-caption" aria-live="polite"></p></article>
      <article className="panel"><h2>Appointment status</h2><p>Across all requests on the dashboard</p><div id="status-chart"></div></article></div>
      </section>
    </>
  );
}

function Appointments() {
  return (
    <>
      <section className="panel appointment-panel" id="appointments"><div className="panel-head"><div><h2>Appointments</h2><p>Review requests, confirm visits, or change the schedule.</p></div><span id="results" className="count"></span></div>
      <div className="filters"><div><label htmlFor="search">Search appointments</label><input id="search" type="search" placeholder="Name, service, or reference" /></div><div><label htmlFor="filter">Status</label><select id="filter"><option value="">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div><div><label htmlFor="on-date">Appointment date</label><input id="on-date" type="date" /></div></div>
      <div className="table-scroll overflow-auto" role="region" aria-label="Appointment results" tabIndex="0"><table><thead><tr><th scope="col">Patient</th><th scope="col">Service</th><th scope="col">Date and time</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody id="rows"></tbody></table></div><p id="empty" hidden>No appointments match these filters.</p>
      <div className="pagination" id="pagination" hidden><button className="button outline" id="previous-page" type="button">Previous</button><span id="page-label"></span><button className="button outline" id="next-page" type="button">Next</button></div>
      </section>
    </>
  );
}

function ScheduleSettings() {
  return (
    <>
      <section id="settings"><div className="settings-heading"><h2>Schedule settings</h2><p>Availability uses Philippine time and a 15-minute start interval.</p></div><div className="settings-grid">
      <form className="panel" id="hours"><h3>Weekly clinic hours</h3><p>Changes apply to future availability.</p><div id="hours-fields"></div><button className="button primary">Save hours</button><p className="form-feedback" role="status"></p></form>
      <div className="settings-stack"><form className="panel" id="services"><h3>Service durations</h3><p>Set the time needed for each visit.</p><div id="service-fields"></div><button className="button primary">Save durations</button><p className="form-feedback" role="status"></p></form>
      <form className="panel" id="blocks"><h3>Blocked dates</h3><p>Close a full day for public requests.</p><label htmlFor="blocked-date">Date</label><input id="blocked-date" type="date" required /><button className="button primary">Block date</button><ul id="blocked-list"></ul><p className="form-feedback" role="status"></p></form></div>
      </div></section>
    </>
  );
}

function ManageAppointment() {
  return (
    <>
      <dialog id="manage" aria-labelledby="manage-title"><form id="manage-form"><div className="panel-head"><div><h2 id="manage-title">Manage appointment</h2><p id="manage-subtitle"></p></div><button type="button" className="modal-close" id="close" aria-label="Close appointment details">×</button></div><dl id="detail"></dl><label htmlFor="action">Action</label><select id="action" required></select><div id="reschedule" hidden><label htmlFor="move-date">New date</label><input id="move-date" type="date" /><label htmlFor="move-time">New time (Philippine time)</label><select id="move-time"></select></div><p className="form-feedback" id="manage-error" role="status"></p><button className="button primary" id="save-action">Save change</button></form></dialog>
    </>
  );
}

function StaffDashboard() {
  const clinicHome = document.getElementById('app').dataset.clinicHome ?? './';
  useEffect(() => { startDashboard(); }, []);
  return (
    <>
      <a className="skip" href="#main">Skip to dashboard</a>
      <header className="staff-header"><div className="staff-shell topbar">
      <a className="brand" href={clinicHome}><img className="brand-logo" src="./assets/clinic-logo-badge.png" alt="" /><span>Dr. K Prestige Dentale<small>BY DR. KIRSTEN BULAONG</small></span></a>
      <div className="top-actions"><a href={clinicHome}>Clinic website</a><button className="button outline" id="logout" hidden>Sign out</button></div>
      </div></header>
      <main className="staff-shell staff-main" id="main">
      <div className="staff-heading"><div><p className="eyebrow"><span></span> CLINIC OPERATIONS</p><h1>Appointments dashboard</h1><p id="today"></p></div><button type="button" className="button outline" id="refresh" hidden>Refresh</button></div>
      <p className="demo-note" id="demo" hidden>Demo workspace. Sample appointments and changes stay in this browser. Use sample data only.</p>
      <p id="notice" role="status"></p>
      <form id="signin" className="panel sign-in" hidden><h2>Staff sign-in</h2><label htmlFor="email">Clinic email</label><input id="email" type="email" autoComplete="username" required /><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" required /><button className="button primary">Sign in</button></form>
      <div id="workspace" hidden>
      <nav className="staff-nav flex flex-wrap" aria-label="Dashboard"><a href="#overview">Overview</a><a href="#appointments">Appointments</a><a href="#settings">Schedule settings</a></nav>
      <Overview />
      <Appointments />
      <ScheduleSettings />
      </div></main>
      <ManageAppointment />
    </>
  );
}

createRoot(document.getElementById('app')).render(<StaffDashboard />);
