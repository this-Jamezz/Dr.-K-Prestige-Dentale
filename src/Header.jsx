import { useEffect, useState } from 'react';

const sections = [
  ['services', 'Services'],
  ['work', 'Our Work'],
  ['about', 'About'],
  ['faq', 'FAQ'],
  ['contact', 'Contact'],
];

export function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const desktop = matchMedia('(min-width:58rem)');
    const close = () => setOpen(false);
    desktop.addEventListener('change', close);
    return () => desktop.removeEventListener('change', close);
  }, []);

  return (
    <header className="header" onKeyDown={event => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        document.getElementById('mobile-menu').focus();
      }
    }}>
      <div className="shell navbar">
        <a href="#main" className="brand">
          <img className="brand-logo" src="./assets/clinic-logo-badge.png" alt="" />
          <span>Dr. K Prestige Dentale<small>BY DR. KIRSTEN BULAONG</small></span>
        </a>
        <button className="menu" id="mobile-menu" type="button" aria-controls="navigation"
          aria-expanded={open} onClick={() => setOpen(value => !value)}>Menu</button>
        <nav id="navigation" className={open ? 'open' : 'closed'} aria-label="Main navigation">
          {sections.map(([id, label]) => (
            <a key={id} href={'#' + id} onClick={() => {
              if (open) {
                setOpen(false);
                document.getElementById(id)?.focus({preventScroll: true});
              }
            }}>{label}</a>
          ))}
        </nav>
        <a className="button outline directions" href="https://maps.app.goo.gl/NPDndVVwfCviX75G9">Get Directions</a>
      </div>
    </header>
  );
}
