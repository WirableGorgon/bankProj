import 'babel-polyfill';
import './style.scss';
import { el } from 'redom';
import { exchangeCurrency, getCurrencyAccounts, getKnownCurrencies } from './Api';

let token = localStorage.getItem('token');

async function tableBuild() {
  const currArray = [];
  getKnownCurrencies().then((res) => {
    for (const curr of res.payload) {
      currArray.push(curr);
    }
    for (let i = 0; i < currArray.length; i++) {
      const opt = el('option', {value: currArray[i]}, currArray[i]);
      const optt = el('option', {value: currArray[i]}, currArray[i]);
      document.getElementById('cur-from').append(opt);
      document.getElementById('cur-to').append(optt);
    }
  })

  getCurrencyAccounts(token).then((res) => {
    document.getElementById('spin').style.display = 'none';
    for (let i = 0; i < currArray.length; i++) {
      let curr = res.payload[currArray[i]]
      if (curr.amount > 0) {
        const li = el('p.have-current', [
          el('span.cur.cur-code', curr.code),
          el('span.cur', new Intl.NumberFormat().format(curr.amount).replaceAll(',', '.'))
        ]);
        document.getElementById('curList').append(li);
      }
    }
  })
}

async function convert() {
  if (document.getElementById('cur-from').value === document.getElementById('cur-to').value) {
    const err = new Error('Same exchange');
    err.mess = 'Same exchange';
    throw err;
  }
  if (document.getElementById('sum-to-change').value <= 0) {
    const err = new Error('Wrong amount');
    err.mess = 'Wrong amount';
    throw err;
  }
  const res = await exchangeCurrency(document.getElementById('cur-from').value, document.getElementById('cur-to').value, document.getElementById('sum-to-change').value, token);
  if (!res.payload) {
    const err = new Error('Not enough');
    err.mess = 'Not enough';
    throw err;
  }
  document.getElementById('curList').innerHTML = '';
  tableBuild();
  document.getElementById('sum-to-change').value = '';
}

export default async function exchange() {
  document.getElementById('exchange-head-button').disabled = true;
  const spin = el('div.text-center', { id: 'spin', style: 'display: none!important;' }, [
    el('span.loader', 'QQ')
  ])

  spin.style.display = '';

  await tableBuild();

  const wsRes = [];
  let ws = new WebSocket('ws://localhost:3000/currency-feed');
  ws.onmessage = function(event) {
    rateList.innerHTML = '';
    if (wsRes.length > 21) {
      wsRes.shift();
      wsRes.push(event.data);
    } else {
      wsRes.push(event.data);
      //console.log(wsRes);
    }
    //console.log(event.data);
    for (const res of wsRes) {
      let jsRes = JSON.parse(res);
      //console.log(jsRes);
      if (jsRes.type === 'EXCHANGE_RATE_CHANGE') {
        const li = el('p.have-current', [
          el('span.cur.cur-code', `${jsRes.from}/${jsRes.to}`),
          el('span.cur', new Intl.NumberFormat().format(jsRes.rate).replaceAll(',', '.'))
        ]);
        if (jsRes.change > 0) {
          li.classList.add('have-current-up');
        } else {
          li.classList.add('have-current-down');
        }
        rateList.append(li);
      }
    }
  }

  const firstTable = el('table.first-table');
  const title = el('div.h1.exchange-h1', 'Валютный обмен');
  const mainBlock = el('div.main-block')
  const currency = el('tr.inf-block', 'Ваши валюты');
  const curList = el('div.have-current-list', { id: 'curList' });
  const rate = el('div.grey-inf-block', 'Изменение курсов в реальном времени');
  const rateList = el('div.have-current-list');
  const change = el('tr.inf-block', 'Обмен валюты', { id: 'exch' }, [
    el('div.exch-block', [
      el('table.change-form', [
        el('tr.change-form-line', [
          el('span.change-form-text', 'Из '),
          el('select.change-form-select', {
            id: 'cur-from'
          }),
          el('span.change-form-text', ' в '),
          el('select.change-form-select', {
            id: 'cur-to'
          })
        ]),
        el('tr.change-form-line', [
          el('span.change-form-text.form-txt-wnm', 'Сумма'),
          el('input.change-form-input', {
            id: 'sum-to-change'
          })
        ]),
      ]),
      el('button.btn.blue.change-btn', {
        async onclick(event) {
          event.preventDefault();
          if (document.getElementById('cur-from').classList.contains('error-input')) {
            document.getElementById('cur-from').classList.remove('error-input');
          }
          if (document.getElementById('cur-to').classList.contains('error-input')) {
            document.getElementById('cur-to').classList.remove('error-input');
          }
          if (document.getElementById('sum-to-change').classList.contains('error-input')) {
            document.getElementById('sum-to-change').classList.remove('error-input');
          }
          if (document.getElementById('error-mess')) {
            document.getElementById('error-mess').remove();
          }
          try {
            await convert();
          } catch (error) {
            if (error.mess === 'Same exchange') {
              document.getElementById('cur-from').classList.add('error-input');
              document.getElementById('cur-to').classList.add('error-input');
            } else if (error.mess === 'Wrong amount') {
              document.getElementById('sum-to-change').classList.add('error-input');
            } else if (error.mess === 'Not enough') {
              const err = el('div', { id: 'error-mess', style: 'color: red; text-align: center; font-size: 16px; font-weight: 500;' }, 'Недостаточно средств');
              document.getElementById('exch').append(err);
            }
          }
        }
      }, 'Обменять'),
    ]),
  ]);

  firstTable.append(currency, change)
  //secondtable.append(rate);
  mainBlock.append(firstTable, rate)
  currency.append(curList);
  rate.append(rateList)

  return [
    title,
    spin,
    mainBlock
  ]
}
