import 'babel-polyfill';
import './style.scss';
import { el, setChildren } from 'redom';
import Navigo from 'navigo';
import header from './header';
import accountsList from './accounts-list';
import accountDetails from './account-details';
import accountHistory from './account-history';
import exchange from './exchange';
import mapp from './map';
import { login } from './Api';

let router = new Navigo('/');

let token;

async function loginForm(event) {
  const res = await login(document.getElementById('log').value, document.getElementById('pas').value);
  if (!res.payload) {
    const err = new Error('No user');
    err.mess = 'No user';
    throw err;
  }
  token = res.payload.token;
  localStorage.setItem('token', token);
  router.navigate(event.target.getAttribute('href'));
}

export function cadrCreateBlock() {
    const autorizationPage = el('div.main-page', [
      el('.page-header.autorization', [
        el('h1.logo', 'Coin.'),
      ], {style: 'height: 50p;'}),
      el('.card', { id: 'main-block' }, [
        el('.login-title', 'Вход в аккаунт'),
        el('table.card-body', [
          el('tr', [
            el('td.table-text', 'Логин'),
            el('td', el('input.login-form-input', {placeholder: 'Логин', id: 'log'}),)
          ]),
          el('tr', [
            el('td.table-text', 'Пароль'),
            el('td', el('input.login-form-input', {placeholder: 'Пароль', id: 'pas'}),)
          ]),
          el('tr', [
            el('td'),
            el('td', el('button.btn.blue', {
              href: `/accounts-list/`, async onclick(event) {
                event.preventDefault();
                if (document.getElementById('error-mess')) {
                  document.getElementById('error-mess').remove();
                }
                try {
                  await loginForm(event);
                } catch (error) {
                  if (error.mess === 'No user') {
                    const err = el('div', { id: 'error-mess', style: 'color: red; text-align: center;' }, 'Неверный логин или пароль');
                    document.getElementById('main-block').append(err);
                  }
                }
              }
            }, 'Войти'))
          ])
        ])
      ])
    ])

    return [
      autorizationPage
    ]
}

router.on('/', () => {
  setChildren(window.document.body, cadrCreateBlock());
})

router.on('/map/', () => {
  const main = el('main');

  setChildren(window.document.body, [
    header(router),
    main
  ]);
  router.resolve();
  setChildren(main, mapp());
})

router.on('/exchange/', async () => {
  const main = el('main');

  setChildren(window.document.body, [
    header(router),
    main
  ]);
  router.resolve();
  setChildren(main, await exchange());
})

router.on('/accounts-list/', () => {
  const main = el('main');

  setChildren(window.document.body, [
    header(router),
    main
  ]);
  router.resolve();
  setChildren(main, accountsList(router));
})

router.on('/accounts-list/:accountNumber', async ({ data: { accountNumber } }) => {
  const main = el('main');

  setChildren(window.document.body, [
    header(router),
    main
  ]);
  router.resolve();
  setChildren(main, await accountDetails(accountNumber, router))
})

router.on('/accounts-list/:accountNumber/history', async ({ data: { accountNumber } }) => {
  const main = el('main');

  setChildren(window.document.body, [
    header(router),
    main
  ]);
  router.resolve();
  setChildren(main, await accountHistory(accountNumber, router))
})

router.resolve();

cadrCreateBlock();
