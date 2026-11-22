import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Header } from './Header.jsx';
import { startBooking } from './booking.js';
import './tailwind.css';
import './site.css';

function Hero() {
  return (
    <>
      <section className="shell hero grid">
      <div className="hero-copy"><p className="eyebrow"><span></span> DENTAL CLINIC · GUIGUINTO</p><h1>Dr. K Prestige<br /><em>Dentale</em></h1><p className="byline">By Dr. Kirsten Bulaong</p><p className="motto">Smile with Prestige, Crafted with Care in Every Detail.</p><a className="button primary" href="#booking">Book an Appointment</a></div>
      <figure className="hero-image photo"><img src="./assets/hero.webp" width="900" height="900" fetchPriority="high" alt="Illustrative sunlit dental treatment room with a reclining chair and warm wood cabinetry" /><figcaption>Sample clinic image</figcaption></figure>
      </section>
    </>
  );
}

function Services() {
  return (
    <>
      <section id="services" tabIndex={-1} className="band"><div className="shell block">
      <div className="intro"><p className="eyebrow"><span></span> SERVICES</p><h2>Care for your smile</h2><p>Explore sample services. Please check with the clinic for its current offerings.</p></div>
      <div className="cards">
      <article><span className="service-icon" aria-hidden="true">✧</span><h3>Dental Checkup</h3><p>Discuss any concerns and have your teeth and gums examined.</p><a href="#booking" data-service="checkup">Request a checkup</a></article>
      <article><span className="service-icon" aria-hidden="true">✦</span><h3>Professional Cleaning</h3><p>Have plaque and hardened buildup removed during a routine cleaning.</p><a href="#booking" data-service="cleaning">Request a cleaning</a></article>
      <article><span className="service-icon" aria-hidden="true">◇</span><h3>Smile Consultation</h3><p>Talk through what you’d like to change and explore your options.</p><a href="#booking" data-service="smile">Request a consultation</a></article>
      </div></div></section>
    </>
  );
}

function Gallery() {
  return (
    <>
      <section id="work" tabIndex={-1} className="shell block"><div className="intro"><p className="eyebrow"><span></span> OUR WORK</p><h2>A closer look</h2><p>Illustrative samples for the clinic’s gallery.</p></div>
      <div className="gallery">
      <figure><div className="photo"><img src="./assets/smile.webp" loading="lazy" width="600" height="450" alt="Illustrative close-up of an adult smile" /></div><figcaption><h3>Smile case</h3><p>Sample visual for a future consented case.</p></figcaption></figure>
      <figure><div className="photo"><img src="./assets/detail.webp" loading="lazy" width="600" height="450" alt="Illustrative dental mirror and model on a white tray" /></div><figcaption><h3>Treatment detail</h3><p>Sample visual of dental instruments.</p></figcaption></figure>
      <figure><div className="photo"><img src="./assets/interior.webp" loading="lazy" width="600" height="450" alt="Illustrative waiting area with warm oak and upholstered seating" /></div><figcaption><h3>Clinic interior</h3><p>Sample visual for a future clinic photo.</p></figcaption></figure>
      </div></section>
    </>
  );
}

function About() {
  return (
    <>
      <section id="about" tabIndex={-1} className="band"><div className="shell block split">
      <figure className="portrait photo"><img src="./assets/portrait.webp" loading="lazy" width="600" height="650" alt="Portrait placeholder showing an anonymous dental professional in an ivory coat" /><figcaption>Portrait placeholder</figcaption></figure>
      <div><p className="eyebrow"><span></span> ABOUT</p><h2>Meet Dr. Kirsten Bulaong</h2><p>Dr. Kirsten Bulaong leads Dr. K Prestige Dentale in Guiguinto.</p><p className="muted">An approved biography and portrait will be added here.</p><a href="#booking" className="button outline">Request an Appointment</a></div>
      </div></section>
    </>
  );
}

function Booking() {
  return (
    <>
      <section id="booking" className="booking"><div className="shell block split booking-layout">
      <div><p className="eyebrow"><span></span> APPOINTMENTS</p><h2 tabIndex="-1" id="booking-title">Request an Appointment</h2><p>Choose an available time in the Philippines and send your request. The clinic will contact you to confirm your schedule.</p><a href="tel:+639763422320">Call 0976 342 2320</a></div>
      <div className="form-card min-w-0">
      <p id="demo-booking" className="demo-note" hidden>Demo scheduling. Use sample information only. Requests stay in this browser and the clinic does not receive them.</p><form id="request" hidden>
      <p id="progress" className="eyebrow"></p>
      <div data-step="0"><h3 tabIndex="-1">Choose a service</h3><label htmlFor="service">Service</label><select id="service" required><option value="">Select an option</option></select></div>
      <div data-step="1" hidden><h3 tabIndex="-1">Choose a preferred time</h3><p>Philippine time (Asia/Manila)</p><div className="fields"><div><label htmlFor="date">Preferred date</label><input id="date" type="date" required /></div><div><label htmlFor="time">Preferred time</label><select id="time" required><option value="">Choose a date first</option></select></div></div></div>
      <div data-step="2" hidden><h3 tabIndex="-1">Contact details</h3><label htmlFor="patient">Patient name</label><input id="patient" autoComplete="name" maxLength="100" required /><label htmlFor="method">How should the clinic contact you?</label><select id="method"><option value="tel">Mobile number</option><option value="email">Email</option></select><label htmlFor="reply" id="reply-label">Mobile number</label><input id="reply" type="tel" autoComplete="tel" maxLength="160" required /></div>
      <div data-step="3" hidden><h3 tabIndex="-1">Review your request</h3><dl id="review"></dl><p>The clinic will confirm availability after reviewing your request.</p></div>
      <div data-step="4" hidden><h3 tabIndex="-1" id="receipt-title">Request received</h3><p id="receipt-message"></p><p id="receipt-reference"></p></div>
      <p id="status" role="status"></p>
      <div className="actions"><button id="retry" type="button" className="button outline" hidden>Retry</button><button id="back" type="button" className="button outline" hidden>Back</button><button id="next" className="button primary" type="submit">Continue</button></div>
      </form>
      
      </div></div></section>
    </>
  );
}

function FrequentlyAskedQuestions() {
  return (
    <>
      <section id="faq" tabIndex={-1} className="shell block split faq-layout"><div><p className="eyebrow"><span></span> FAQ</p><h2>Before your visit</h2></div><div>
      <details><summary>How do I book an appointment?</summary><p>Use the <a href="#booking">appointment request form</a> to choose a service and an available time, or call the clinic. Wait for the clinic to confirm your schedule.</p></details>
      <details><summary>What should I bring to my first visit?</summary><p>Please ask the clinic what to bring. You can mention whether you have recent dental records or a list of current medications when you call.</p></details>
      <details><summary>How do I reschedule?</summary><p>Call <a href="tel:+639763422320">0976 342 2320</a> or email the clinic with your current appointment and your preferred new time.</p></details>
      <details><summary>What are the clinic hours?</summary><p>Clinic hours are pending confirmation. Call the clinic before visiting.</p></details>
      <details><summary>Is there parking or accessible building entry?</summary><p>The clinic is on the second floor of Sunoria Plaza. Please contact the clinic for current parking, elevator, and entrance details.</p></details>
      </div></section>
    </>
  );
}

function Contact() {
  return (
    <>
      <section id="contact" tabIndex={-1} className="band"><div className="shell block split">
      <div><p className="eyebrow"><span></span> CONTACT</p><h2>Visit us in Guiguinto</h2><address>2nd floor Sunoria Plaza, Mc Arthur Hway,<br />Poblacion, Guiguinto, Philippines, 3015</address><ul className="contacts"><li><a href="tel:+639763422320">0976 342 2320</a></li><li><a href="mailto:dr.kbulaong@gmail.com">dr.kbulaong@gmail.com</a></li><li><a href="https://www.facebook.com/KPdentale/?rdid=hgG0v1SP0XO04m3M">Dr. K Prestige Dentale on Facebook</a></li></ul></div>
      <div className="map"><iframe title="Google Maps location of Dr. K Prestige Dentale at Sunoria Plaza" src="https://maps.google.com/maps?cid=15952478824533610506&amp;output=embed" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe><div className="map-label"><a className="button outline" href="https://maps.app.goo.gl/NPDndVVwfCviX75G9">Open in Google Maps</a></div></div>
      </div></section>
    </>
  );
}

function Footer() {
  return (
    <>
      <footer><div className="shell footer"><div><p className="footer-name">Dr. K Prestige Dentale</p><p>By Dr. Kirsten Bulaong</p></div><nav aria-label="Footer contact links"><a href="./admin.html">Staff dashboard</a><a href="https://maps.app.goo.gl/NPDndVVwfCviX75G9">Directions</a><a href="tel:+639763422320">Call</a><a href="mailto:dr.kbulaong@gmail.com">Email</a><a href="https://www.facebook.com/KPdentale/?rdid=hgG0v1SP0XO04m3M">Facebook</a></nav></div></footer>
    </>
  );
}

function ClinicSite() {
  useEffect(() => {
    startBooking();
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  }, []);
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Header />
      <main id="main">
      <Hero />
      <Services />
      <Gallery />
      <About />
      <Booking />
      <FrequentlyAskedQuestions />
      <Contact />
      </main>
      <Footer />
    </>
  );
}

createRoot(document.getElementById('app')).render(<ClinicSite />);
