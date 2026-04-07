import 'babel-polyfill';
import './style.scss';
import { el } from 'redom';
import { clearToken } from './auth';

function createNavButton({ id, label, href, router, isActive = false }) {
  return el('button.nav-link', {
    id,
    type: 'button',
    className: `nav-link${isActive ? ' is-active' : ''}`,
    onclick(event) {
      router.navigate(event.currentTarget.dataset.href);
    },
    'data-href': href,
  }, label);
}

export default function header(router, currentRoute = '/accounts-list/') {
  return el('header.page-header', [
    el('div.page-header__inner', [
      el('div.brand', [
        el('div.brand__mark', 'C.'),
        el('div.brand__copy', [
          el('div.brand__title', 'Coin.'),
          el('div.brand__subtitle', 'premium banking'),
        ]),
      ]),
      el('nav.page-header__nav', [
        createNavButton({
          id: 'accounts-head-button',
          label: 'Счета',
          href: '/accounts-list/',
          router,
          isActive: currentRoute.startsWith('/accounts-list/'),
        }),
        createNavButton({
          id: 'exchange-head-button',
          label: 'Валюта',
          href: '/exchange/',
          router,
          isActive: currentRoute.startsWith('/exchange/'),
        }),
        createNavButton({
          id: 'map-head-button',
          label: 'Банкоматы',
          href: '/map/',
          router,
          isActive: currentRoute.startsWith('/map/'),
        }),
      ]),
      el('div.page-header__actions', [
        el('button.btn.btn-ghost', {
          type: 'button',
          onclick() {
            clearToken();
            router.navigate('/');
          },
        }, 'Выйти'),
      ]),
    ]),
  ]);
}
