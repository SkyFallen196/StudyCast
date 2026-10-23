import { Link, NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Библиотека', end: true },
  { to: '/devices', label: 'Устройства', end: false },
  { to: '/settings', label: 'Настройки', end: false },
];

export default function Layout() {
  return (
    <>
      <a className="skip-link" href="#main">Перейти к содержимому</a>

      <header className="site-header">
        <div className="container site-header__inner">
          <Link className="logo" to="/" aria-label="StudyCast, на главную">
            Study<span className="logo__accent">Cast</span>
          </Link>
          <p className="sync-indicator sync-indicator--local">только это устройство</p>
          <nav className="main-nav" aria-label="Основная навигация">
            <ul className="main-nav__list">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink className="main-nav__link" to={item.to} end={item.end}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" className="container page">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <p className="site-footer__text">StudyCast — учебный проект. Аудиозаписи не покидают ваше устройство.</p>
          <nav aria-label="Дополнительные ссылки">
            <ul className="site-footer__links">
              <li><a href="https://github.com/SkyFallen196/StudyCast">Исходный код на GitHub</a></li>
            </ul>
          </nav>
          <p className="site-footer__copy"><small>© 2026 Горбунов Денис</small></p>
        </div>
      </footer>
    </>
  );
}
