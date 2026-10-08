// ===== 設定 =====
const BURST_LIMIT = 15;   // 合計がこの値を超える（16以上）とバースト
const CPU_STAY_AT = 12;   // CPU は合計がこの値以上になったらステイ
const CPU_DELAY_MS = 700; // CPU が振る間隔（演出用）

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

// ===== ゲームロジック =====
function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function sum(dice) {
  return dice.reduce((a, b) => a + b, 0);
}

function isBurst(dice) {
  return sum(dice) > BURST_LIMIT;
}

// バーストなら 0 として扱う
function score(dice) {
  return isBurst(dice) ? 0 : sum(dice);
}

function cpuShouldRoll(dice) {
  return sum(dice) < CPU_STAY_AT;
}

// 'player' | 'cpu' | 'draw'
function judge(playerDice, cpuDice) {
  const p = score(playerDice);
  const c = score(cpuDice);
  if (p > c) return 'player';
  if (c > p) return 'cpu';
  return 'draw';
}

// Node でのテスト用
if (typeof module !== 'undefined') {
  module.exports = { BURST_LIMIT, CPU_STAY_AT, sum, isBurst, score, cpuShouldRoll, judge };
}

// ===== 画面制御 =====
if (typeof document !== 'undefined') {
  const state = { player: [], cpu: [], phase: 'idle' };
  const record = { win: 0, lose: 0, draw: 0 };

  const $ = (id) => document.getElementById(id);
  const els = {
    playerDice: $('player-dice'), playerTotal: $('player-total'),
    cpuDice: $('cpu-dice'), cpuTotal: $('cpu-total'),
    message: $('message'),
    roll: $('btn-roll'), stay: $('btn-stay'), start: $('btn-start'),
    win: $('rec-win'), lose: $('rec-lose'), draw: $('rec-draw'),
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function renderSide(dice, diceEl, totalEl) {
    // 新しく増えたダイスだけを追加してアニメーションさせる
    const shown = diceEl.children.length;
    if (dice.length < shown) diceEl.innerHTML = '';
    for (let i = diceEl.children.length; i < dice.length; i++) {
      const span = document.createElement('span');
      span.className = 'die new';
      span.title = dice[i];
      span.textContent = DICE_FACES[dice[i] - 1];
      diceEl.appendChild(span);
    }
    if (dice.length === 0) {
      totalEl.textContent = '-';
      totalEl.className = 'total';
    } else if (isBurst(dice)) {
      totalEl.textContent = `${sum(dice)} バースト！（0点）`;
      totalEl.className = 'total burst';
    } else {
      totalEl.textContent = sum(dice);
      totalEl.className = 'total';
    }
  }

  function render() {
    renderSide(state.player, els.playerDice, els.playerTotal);
    renderSide(state.cpu, els.cpuDice, els.cpuTotal);
    const playerTurn = state.phase === 'player';
    els.roll.disabled = !playerTurn;
    els.stay.disabled = !playerTurn;
    els.start.disabled = state.phase === 'player' || state.phase === 'cpu';
    els.win.textContent = record.win;
    els.lose.textContent = record.lose;
    els.draw.textContent = record.draw;
  }

  function setMessage(text, cls = '') {
    els.message.textContent = text;
    els.message.className = `message ${cls}`;
  }

  function startGame() {
    // ① それぞれ 1 個目のダイスをオートで振る
    state.player = [rollDie()];
    state.cpu = [rollDie()];
    els.playerDice.innerHTML = '';
    els.cpuDice.innerHTML = '';
    state.phase = 'player';
    els.start.textContent = 'もう一度';
    setMessage('あなたの番です。ロールかステイを選んでください。');
    render();
  }

  function playerRoll() {
    if (state.phase !== 'player') return;
    state.player.push(rollDie());
    if (isBurst(state.player)) {
      setMessage('バースト！ CPU の番です…', 'bad');
      cpuTurn();
    } else {
      render();
    }
  }

  function playerStay() {
    if (state.phase !== 'player') return;
    setMessage(`あなたは ${sum(state.player)} でステイ。CPU の番です…`);
    cpuTurn();
  }

  async function cpuTurn() {
    state.phase = 'cpu';
    render();
    await sleep(CPU_DELAY_MS);
    while (cpuShouldRoll(state.cpu)) {
      state.cpu.push(rollDie());
      render();
      await sleep(CPU_DELAY_MS);
    }
    finish();
  }

  function finish() {
    state.phase = 'done';
    const result = judge(state.player, state.cpu);
    const p = score(state.player);
    const c = score(state.cpu);
    if (result === 'player') {
      record.win++;
      setMessage(`あなたの勝ち！（${p} 対 ${c}）`, 'good');
    } else if (result === 'cpu') {
      record.lose++;
      setMessage(`CPU の勝ち…（${p} 対 ${c}）`, 'bad');
    } else {
      record.draw++;
      setMessage(`引き分け（${p} 対 ${c}）`);
    }
    render();
  }

  els.start.addEventListener('click', startGame);
  els.roll.addEventListener('click', playerRoll);
  els.stay.addEventListener('click', playerStay);
  render();
}
