import 'babel-polyfill';
import './style.scss';
import { el } from 'redom';
import { format } from 'date-fns';
import { getAccount, transferFunds } from './Api';
import { Chart } from 'chart.js';

let token = localStorage.getItem('token');

const monthForStat = 6;

async function transact(accountNumber, res) {
  if (document.getElementById('sum-to-trans').value <= 0) {
    const err = new Error('Wrong amount');
    err.mess = 'Wrong amount';
    throw err;
  }

  let bal = res.payload.balance;

  if (document.getElementById('sum-to-trans').value > bal) {
    const err = new Error('Insufficient funds');
    err.mess = 'Insufficient funds';
    throw err;
  }

  const responce = localStorage.getItem('inputNums');
  if (responce) {
    const listArray = [];
    if (responce.includes(',')) {
      const res = JSON.parse(responce);
      for (const num of res) {
        listArray.push(num);
      }
    } else {
      const res = JSON.parse(responce);
      listArray.push(res);
    }
    let newInput = document.getElementById('num-to-trans').value;
    if (newInput) {
      listArray.push(newInput);
      localStorage.setItem('inputNums', JSON.stringify(listArray));
    }
  } else {
    localStorage.setItem('inputNums', JSON.stringify(document.getElementById('num-to-trans').value));
  }

    if (!document.getElementById('num-to-trans').value) {
      const err = new Error('Wrong receiver');
      err.mess = 'Wrong receiver';
      throw err;
    }
    await transferFunds(accountNumber, document.getElementById('num-to-trans').value, document.getElementById('sum-to-trans').value, token)

  document.getElementById('num-to-trans').value = '';
  document.getElementById('sum-to-trans').value = '';
}

function typedAccountsList() {
  const responce = localStorage.getItem('inputNums');
  if (responce) {
    document.getElementById('typed-list').innerHTML = '';
    if (responce.includes(',')) {
      const listArray = JSON.parse(responce);
      for (const num of listArray) {
        const opt = el('option', num);
        document.getElementById('typed-list').append(opt);
      }
    } else {
      const num = JSON.parse(responce);
      const opt = el('option', num);
      document.getElementById('typed-list').append(opt);
    }
  }
}

async function sendTrans(accountNumber, res) {
  if (document.getElementById('num-to-trans').classList.contains('error-input')) {
    document.getElementById('num-to-trans').classList.remove('error-input');
  }
  if (document.getElementById('sum-to-trans').classList.contains('error-input')) {
    document.getElementById('sum-to-trans').classList.remove('error-input');
  }
  if (document.getElementById('error-mess')) {
    document.getElementById('error-mess').remove();
  }
  try {
    await transact(accountNumber, res);
  } catch (error) {
    if (error.mess === 'Wrong receiver') {
      document.getElementById('num-to-trans').classList.add('error-input');
    } else if (error.mess === 'Wrong amount') {
      document.getElementById('sum-to-trans').classList.add('error-input');
    } else if (error.mess === 'Insufficient funds') {
      const err = el('div', { id: 'error-mess', style: 'color: red; text-align: center; font-size: 16px; font-weight: 500;' }, 'Недостаточно средств');
      trans.append(err);
    }
  }
}

function monthArrayForStat(res, month, lastTrans, lastTransMonth, monthArray, numDateArray) {
  let check = lastTransMonth;
  for (let i = 1; i < monthForStat; i++) {
    for (let j = 1; j < res.payload.transactions.length + 1; j++) {
      const lastTr = res.payload.transactions[res.payload.transactions.length - j];
      const lastTransMn = new Date(lastTr.date).getMonth();
      if (lastTransMn == lastTransMonth - i) {
        if (lastTransMn == check - 1 || lastTransMn == check + 11) {
          monthArray.unshift(month[lastTransMn]);
          numDateArray.unshift({month: lastTransMn, year: new Date(lastTrans.date).getFullYear()});
          check = lastTransMn;
          break;
        } else if (check > 0) {
          check--;
          monthArray.unshift(month[check]);
          numDateArray.unshift({month: check, year: new Date(lastTrans.date).getFullYear()});
          check = lastTransMn;
          monthArray.unshift(month[lastTransMn]);
          numDateArray.unshift({month: lastTransMn, year: new Date(lastTrans.date).getFullYear()});
          break;
        } else {
          check = check + 11;
          monthArray.unshift(month[check]);
          numDateArray.unshift({month: check, year: new Date(lastTrans.date).getFullYear()});
          check = lastTransMn;
          monthArray.unshift(month[lastTransMn]);
          numDateArray.unshift({month: lastTransMn, year: new Date(lastTrans.date).getFullYear()});
          break;
        }
      } else if (lastTransMn == lastTransMonth + 12 - i) {
        if (lastTransMn == check - 1 || lastTransMn == check + 11) {
          monthArray.unshift(month[lastTransMn]);
          numDateArray.unshift({month: lastTransMn, year: new Date(lastTrans.date).getFullYear() - 1});
          check = lastTransMn;
          break;
        } else if (check > 0) {
          check--;
          monthArray.unshift(month[check]);
          numDateArray.unshift({month: check, year: new Date(lastTrans.date).getFullYear() - 1});
          check = lastTransMn;
          monthArray.unshift(month[lastTransMn]);
          numDateArray.unshift({month: lastTransMn, year: new Date(lastTrans.date).getFullYear() - 1});
          break;
        } else {
          check = check + 11
          monthArray.unshift(month[check]);
          numDateArray.unshift({month: check, year: new Date(lastTrans.date).getFullYear()});
          check = lastTransMn;
          monthArray.unshift(month[lastTransMn]);
          numDateArray.unshift({month: lastTransMn, year: new Date(lastTrans.date).getFullYear() - 1});
          break;
        }
      }
    }
  }
}

function amountArrayForStat(res, balanceArray, numDateArray) {

  let bal = res.payload.balance;
  balanceArray.push(bal);

  for (let i = numDateArray.length - 1; i > 0; i--) {
    for (let j = res.payload.transactions.length - 1; j > -1; j--) {
      if (new Date(res.payload.transactions[j].date).getFullYear() == numDateArray[i].year && new Date(res.payload.transactions[j].date).getMonth() == numDateArray[i].month) {
        if (res.payload.transactions[j].to == res.payload.account) {
          bal = bal - res.payload.transactions[j].amount;
        } else {
          bal = bal + res.payload.transactions[j].amount;
        }
      }
    }
    balanceArray.unshift(bal);
  }
}

async function accBuild(spin, accountNumber, number, balance) {
  spin.style.display = '';
  const res = await getAccount(accountNumber, token);
  spin.style.display = 'none';
  number.textContent = '№ '+ res.payload.account;
  balance.textContent = new Intl.NumberFormat().format(res.payload.balance).replaceAll(',', '.') + ' ₽';
}

export default async function accountDetails(accountNumber, router) {
  const spin = el('div.text-center', { id: 'spin'}, [
    el('span.loader', 'QQ')
  ])


  const blockHead = el('table.acc-det-hd');
  const leftcol = el('tr.left-col');
  const rightcol = el('tr.right-col');
  const title = el('td.h1.acc-det-h1', 'Просмотр счета');
  const number = el('td.acc-det-num');
  const backBut = el('td.acc-det-back', el('button.btn.blue.go-back', {
    href: `/accounts-list/`,
    onclick(event) {
      router.navigate(event.target.getAttribute('href'));
    },
  }, 'Вернуться назад')
  );
  const balanceBlock = el('td.acc-det-bal-block', 'Баланс ')
  const balance = el('div.acc-det-bal');
  const mainDiv = el('div');
  const mainBlock = el('div.acc-det-mb');
  const trans = el('div.grey-inf-block.acc-det-tb', el('div.acc-det-block-name', 'Новый перевод'));
  const transForm = el('form.acc-det-form', [
    el('div.acc-det-ib', [
      el('div.acc-det-input-txt', 'Номер счета получателя'),
      el('input.login-form-input.acc-det-input', [
        el('datalist', {id: 'typed-list'})
      ], {
        list: 'typed-list',
        id: 'num-to-trans',
        async onfocus() {
          typedAccountsList();
        }
      })
    ]),
    el('div.acc-det-ib', [
      el('div.acc-det-input-txt', 'Сумма перевода'),
      el('input.login-form-input.acc-det-input', {
        id: 'sum-to-trans'
      })
    ]),
    el('button.btn.blue.send', {
      async onclick(event) {
        event.preventDefault();
        const res = await getAccount(accountNumber, token);
        await sendTrans(accountNumber, res);
        accBuild(spin, accountNumber, number, balance);
        number.textContent = '№ '+ res.payload.account;
        balance.textContent = new Intl.NumberFormat().format(res.payload.balance).replaceAll(',', '.') + ' ₽';
      }
    }, 'Отправить')
  ])
  await accBuild(spin, accountNumber, number, balance);
  const dynamicBut = el('div.inf-block.acc-det-dyn', 'Динамика баланса');
  const historyBut = el('div.grey-inf-block.acc-det-his', 'История переводов', [el('table.list-last-trans', {id: 'lits-of-lt'}, [
      el('tr.table-head', [
        el('th.th-col.first-col', 'Счет отправителя'),
        el('th.th-col', 'Счет получателя'),
        el('th.th-col', 'Сумма'),
        el('th.th-col.last-col.short', 'Дата'),
      ])
    ]),
    el('div.block-for-click', {
      href: `/accounts-list/${accountNumber}/history`,
      onclick(event) {
        router.navigate(event.target.getAttribute('href'));
      },
    })
  ]);

  const month = [
    'янв',
    'фев',
    'мар',
    'апр',
    'май',
    'июн',
    'июл',
    'авг',
    'сен',
    'окт',
    'ноя',
    'дек'
  ]

  const monthArray = [];
  const numDateArray = [];
  const balanceArray = [];

  getAccount(accountNumber, token).then((res) => {

    if (res.payload.transactions.length) {

      const lastTrans = res.payload.transactions[res.payload.transactions.length - 1];
      const lastTransMonth = new Date(lastTrans.date).getMonth();
      monthArray.unshift(month[lastTransMonth]);
      numDateArray.unshift({month: lastTransMonth, year: new Date(lastTrans.date).getFullYear()});

      monthArrayForStat(res, month, lastTrans, lastTransMonth, monthArray, numDateArray);

      amountArrayForStat(res, balanceArray, numDateArray);

      ch.update();
    }

    let length = 10;

    if (res.payload.transactions.length < 10) {
      length = res.payload.transactions.length;
    }

    for (let i = 1; i < length + 1; i++) {
      let trans = res.payload.transactions[res.payload.transactions.length - i];
      const str = el('tr.table-line');
      const sendAcc = el('td.first-col');
      sendAcc.textContent = trans.from;
      const resAcc = el('td');
      resAcc.textContent = trans.to;
      const sumSend = el('td');
      if (trans.to == res.payload.account) {
        sumSend.textContent = '+' + trans.amount + ' ₽';
        sumSend.style = 'color: #76CA66'
      } else {
        sumSend.textContent = '-' + trans.amount + ' ₽';
        sumSend.style = 'color: #FD4E5D'
      }
      const dateSend = el('td');
      dateSend.textContent = format(new Date(trans.date), 'dd.MM.yyyy');

      str.append(sendAcc, resAcc, sumSend, dateSend);
      document.getElementById('lits-of-lt').append(str);
    }
  })

  var popCanvas = el('canvas.popChart', { id: 'popChart',
    href: `/accounts-list/${accountNumber}/history`,
    onclick(event) {
      router.navigate(event.target.getAttribute('href'));
    },
  });
  let ch = new Chart(popCanvas, {
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          bounds: 'data',
          position: 'right',
          grid: {
            display: false
          },
          ticks: {
            color: 'black',
            font: {
              size: '20'
            },
            callback: (value, index, values) =>
              index > 0 && index < values.length - 1 ? '' : Math[index ? 'max' : 'min'](...values.map(n => n.value)),
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: 'black',
            font: {
              size: '20'
            }
          }
        },
      },
      plugins: {
        legend: {
          display: false,
        }
      }
    },
    plugins: [
      {
        beforeDraw(chart, args, options) {
          const {ctx, chartArea: {left, top, width, height}} = chart;
          ctx.save();
          ctx.strokeStyle = options.borderColor;
          ctx.lineWidth = 1;
          ctx.setLineDash(options.borderDash || []);
          ctx.lineDashOffset = options.borderDashOffset;
          ctx.strokeRect(left, top, width, height);
          ctx.restore();
        }
      }
    ],
    type: 'bar',
    data: {
      labels: monthArray,
      datasets: [{
        data: balanceArray,
        backgroundColor: [
          '#116ACC'
        ],
      }]
    },
  })

  leftcol.append(title, backBut);
  rightcol.append(number, balanceBlock);
  blockHead.append(leftcol, rightcol);
  balanceBlock.append(balance);
  mainDiv.append(spin, mainBlock);
  mainBlock.append(trans);
  trans.append(transForm);
  dynamicBut.append(popCanvas);
  mainBlock.append(dynamicBut);
  mainBlock.append(historyBut);

  return [
    blockHead,
    mainDiv
  ]
}
