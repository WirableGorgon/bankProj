import 'babel-polyfill';
import './style.scss';
import { el } from 'redom';
import { Chart } from 'chart.js/auto';
import { format } from 'date-fns';
import { getAccount } from './Api';

let token = localStorage.getItem('token');

const monthForStat = 25;

function monthArrayForStat(res, month, lastTrans, lastTransMonth, monthArray, numDateArray) {
  let check = lastTransMonth;
  for (let i = 1; i < 12; i++) {
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

function amountArrayForStat(res, transTo, transFrom, balanceArray, numDateArray) {
  let bal = res.payload.balance;
  balanceArray.push(bal);
  for (let i = numDateArray.length - 1; i > -1; i--) {
    let inside = 0;
    let outside = 0;
    for (let j = res.payload.transactions.length - 1; j > -1; j--) {
      if (new Date(res.payload.transactions[j].date).getFullYear() == numDateArray[i].year && new Date(res.payload.transactions[j].date).getMonth() == numDateArray[i].month) {
        if (res.payload.transactions[j].to == res.payload.account) {
          bal = bal - res.payload.transactions[j].amount;
          inside = inside + res.payload.transactions[j].amount;
        } else {
          bal = bal + res.payload.transactions[j].amount;
          outside = outside + res.payload.transactions[j].amount;
        }
      }
    }
    transTo.unshift(inside);
    transFrom.unshift(outside);
    balanceArray.unshift(bal);
  }
  balanceArray.shift();
}

export default async function accountHistory(accountNumber, router) {

  const spin = el('div.text-center', { id: 'spin'}, [
    el('span.loader', 'QQ')
  ])

  async function accBuild() {
    spin.style.display = '';
    const res = await getAccount(accountNumber, token);
    spin.style.display = 'none';
    number.textContent = '№ '+ res.payload.account;
    balance.textContent = new Intl.NumberFormat().format(res.payload.balance).replaceAll(',', '.') + ' ₽';
  }

  accBuild();

  const blockHead = el('table.acc-det-hd');
  const leftcol = el('tr.left-col');
  const rightcol = el('tr.right-col');
  const title = el('td.h1.acc-det-h1', 'История баланса');
  const number = el('td.acc-det-num');
  const backBut = el('td.acc-det-back', el('button.btn.blue.go-back', {
      href: `/accounts-list/${accountNumber}`,
      onclick(event) {
        router.navigate(event.target.getAttribute('href'));
      },
    }, 'Вернуться назад')
  );
  const balanceBlock = el('td.acc-det-bal-block', 'Баланс ')
  const balance = el('div.acc-det-bal');
  const mainDiv = el('div');
  const mainBlock = el('div.acc-det-mb');
  const balanceDyn = el('div.inf-block.acc-his-dyn', 'Динамика баланса');
  const transDyn = el('div.inf-block.acc-his-dyn', 'Соотношение входящих исходящих транзакций');
  const transHist = el('div.grey-inf-block.acc-det-his', {id: 'block-of-list'},
   'История переводов', el('table.list-last-trans', {id: 'lits-of-lt'}, [
      el('tr.table-head', [
        el('th.th-col.first-col', 'Счет отправителя'),
        el('th.th-col', 'Счет получателя'),
        el('th.th-col', 'Сумма'),
        el('th.th-col.last-col.short', 'Дата'),
      ])
    ])
  );

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
  const transTo = [];
  const transFrom = [];

  getAccount(accountNumber, token).then((res) => {

    if (res.payload.transactions.length) {

      const lastTrans = res.payload.transactions[res.payload.transactions.length - 1];
      const lastTransMonth = new Date(lastTrans.date).getMonth();
      monthArray.unshift(month[lastTransMonth]);
      numDateArray.unshift({month: lastTransMonth, year: new Date(lastTrans.date).getFullYear()});

      monthArrayForStat(res, month, lastTrans, lastTransMonth, monthArray, numDateArray);

      amountArrayForStat(res, transTo, transFrom, balanceArray, numDateArray);

      ch.update();
      tr.update();
    }

    let length = 25;
    let firstEl = 1;

    if (res.payload.transactions.length < monthForStat) {
      length = res.payload.transactions.length;
    }

    function addLastTrans(start, amount) {
      for (let i = start; i < amount + 1; i++) {
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
    }

    addLastTrans(firstEl, length);

    if (res.payload.transactions.length > length) {
      const addTrans = el('button.btn.blue.more', 'Больше операций');
      addTrans.addEventListener('click', () => {

        if (res.payload.transactions.length < length + monthForStat) {
          length = res.payload.transactions.length;
        } else {
          length = length + monthForStat;
          firstEl = firstEl + monthForStat;
        }

        addLastTrans(firstEl, length)
      })
      document.getElementById('block-of-list').append(addTrans);
    }
  })

  var balanceStat = el('canvas.popChart', { id: 'balance-stat' });
  let ch = new Chart(balanceStat, {
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

  var transStat = el('canvas.popChart', { id: 'trans-stat' });
  let tr = new Chart(transStat, {
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
          stacked: true,
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
        data: transFrom,
        backgroundColor: [
          '#FD4E5D'
        ],
      },{
        data: transTo,
        backgroundColor: [
          '#76CA66'
        ],
      }]
    },
  })

  leftcol.append(title, backBut);
  rightcol.append(number, balanceBlock);
  blockHead.append(leftcol, rightcol);
  balanceBlock.append(balance);
  mainDiv.append(spin, mainBlock)
  mainBlock.append(balanceDyn, transDyn, transHist);
  balanceDyn.append(balanceStat);
  transDyn.append(transStat);

  return [
    blockHead,
    mainDiv
  ]
}
