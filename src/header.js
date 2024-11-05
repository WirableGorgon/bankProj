import 'babel-polyfill';
import './style.scss';
import { el } from 'redom';


export default function header(router) {
  return [
    el('header', { class: 'page-header' }, [
      el('h1.logo', 'Coin.'),
      el('button.btn.white', {
        href: `/map/`,
        id: 'map-head-button',
        onclick(event) {
          router.navigate(event.target.getAttribute('href'));
          //location.reload();
        },
      }, 'Банкоматы'),
      el('button.btn.white', {
        href: `/exchange/`,
        id: 'exchange-head-button',
        onclick(event) {
          router.navigate(event.target.getAttribute('href'));
          location.reload();
        },
      }, 'Валюта'),
      el('button.btn.white', {
        href: `/accounts-list/`,
        id: 'accounts-head-button',
        onclick(event) {
          router.navigate(event.target.getAttribute('href'));
          //location.reload();
        },
      }, 'Счета'),
      el('button.btn.white', {
        href: `/`,
        onclick(event) {
          localStorage.setItem('token', '');
          router.navigate(event.target.getAttribute('href'));
          //location.reload();
        },
      }, 'Выйти')
    ])
  ]
}
