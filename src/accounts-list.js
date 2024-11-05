import 'babel-polyfill';
import './style.scss';
import { el } from 'redom';
import { format } from 'date-fns';
import { createAccount, getAccounts } from './Api';

export default function accountsList(router) {

  const spin = el('div.text-center', { id: 'spin', style: 'display: none!important;' }, [
    el('span.loader', 'QQ')
  ])

  class BankAccount {
    constructor(accountNumber, balance, date, container) {
      this.accountNumber = accountNumber;
      this.balance = balance;
      this.date = date
      container.append(
        el('li.acc-item',
          el('div', {style: 'width: 240px;'}, [
            el('h2.acc-num', this.accountNumber),
            el('div.acc-balance', new Intl.NumberFormat().format(this.balance).replaceAll(',', '.') + ' ₽'),
            el('div.acc-lst-trns', 'Последняя транзакция:', el('span.lst-trns-date', ` ${date}`)),
          ]),
          el('button.btn.blue.acc-open-btn', {
            href: `/accounts-list/${this.accountNumber}`,
            onclick(event) {
              router.navigate(event.target.getAttribute('href'));
              location.reload();
            },
          }, 'Открыть'),
        )
      );
    }
  }

  const accSort = (arr) => {
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length - 1; j++) {
        if (arr[j].account > arr[j + 1].account) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        }
      }
    }
  }

  const balanceSort = (arr) => {
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length - 1; j++) {
        if (arr[j].balance > arr[j + 1].balance) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        }
      }
    }
  }

  const lstTransSort = (arr) => {
    for (let i = 0; i < arr.length; i++) {
      if (!arr[i].transactions[0]) {
        arr[i].transactions[0] = '';
      }
    }
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length - 1; j++) {
        if (arr[j].transactions[0].date > arr[j + 1].transactions[0].date) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        }
      }
    }
  }

  document.getElementById('accounts-head-button').disabled = true;

  const list = el('ul.acc-list');
  const title = el('div.h1', 'Ваши счета')
  const sort = el('select.sort', [
    el('option.sort-opt', {selected: true}, 'Сортировка'),
    el('option.sort-opt', {value: 'num'}, 'По номеру'),
    el('option.sort-opt', {value: 'bal'}, 'По балансу'),
    el('option.sort-opt', {value: 'ltr'}, 'По последней транзакции')
  ])

  sort.addEventListener('change', () => {
    list.innerHTML = '';
    spin.style.display = '';
    getAccounts(token).then((res) => {
      spin.style.display = 'none';
      sortAcc(res.payload);
    })
  })

  function sortAcc(arr) {
    if (sort.value === 'num') {
      accSort(arr);
      tableBuild(arr);
    } else if (sort.value === 'bal') {
      balanceSort(arr);
      tableBuild(arr);
    } else if(sort.value === 'ltr') {
      lstTransSort(arr);
      tableBuild(arr);
    } else {
      tableBuild(arr);
    }
  }

  function tableBuild(arr) {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].transactions.length === 1 && arr[i].transactions[0] !== '') {
        let [trans] = arr[i].transactions;
        let date = format(new Date(trans.date), 'd MMMM yyyy');
        date = date.replace('January', 'января').replace('February', 'февраля').replace('March', 'марта').replace('April', 'апреля').replace('May', 'мая').replace('June', 'июня').replace('July', 'июля').replace('August', 'августа').replace('September', 'сентября').replace('October', 'октября').replace('November', 'ноября').replace('December', 'декабря');
        new BankAccount(arr[i].account, arr[i].balance, date, list);
      } else {
        new BankAccount(arr[i].account, arr[i].balance, 'Нет операций', list);
      }
    }
  }

  async function reNewAcc(res) {
    if (res.payload.length > 1) {
      let arr = res.payload;
      sortAcc(arr);
    } else {
      let [destrAcc] = res.payload;
      let [trans] = destrAcc.transactions;
      let date = format(new Date(trans.date), 'd MMMM yyyy');
      date = date.replace('January', 'января').replace('February', 'февраля').replace('March', 'марта').replace('April', 'апреля').replace('May', 'мая').replace('June', 'июня').replace('July', 'июля').replace('August', 'августа').replace('September', 'сентября').replace('October', 'октября').replace('November', 'ноября').replace('December', 'декабря');
      new BankAccount(destrAcc.account, destrAcc.balance, date, list);
    }
  }

  let token = localStorage.getItem('token');

  spin.style.display = '';
  getAccounts(token).then((res) => {
    spin.style.display = 'none';
    reNewAcc(res);
  })

  const newAccountButton = el('button.btn.blue.add', {
    async onclick(event) {
      event.preventDefault();
      list.innerHTML = '';
      spin.style.display = '';
      await createAccount(token);
      getAccounts(token).then((res) => {
        spin.style.display = 'none';
        reNewAcc(res);
      })
    },
  }, 'Создать новый счет');

  return [
    title,
    sort,
    newAccountButton,
    list,
    spin
  ]
}
