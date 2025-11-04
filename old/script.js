// ===== STATE (simple in-memory for prototype) =====
const state = {
  totalBudget: 2500,
  transactions: [] // {id, type: 'expense'|'income', amount, category, note, ts}
};

// ===== UTIL =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const fmt = (n) =>
  (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const iconFor = (category) => {
  const map = {
    Groceries: '🛒',
    Rent: '🏠',
    Utilities: '💡',
    Transportation: '🚗',
    Dining: '🍽️',
    Entertainment: '🎬',
    Miscellaneous: '🧾'
  };
  return map[category] || '💸';
};

// ===== RENDERERS =====
function renderBudget() {
  const spent = state.transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  const income = state.transactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);

  const remaining = state.totalBudget + income - spent;

  $('#remainingAmount').textContent = fmt(remaining);
  $('#totalBudgetLabel').textContent = `Total Budget: ${fmt(state.totalBudget)}`;
  $('#spentSoFarLabel').textContent = `Spent So Far: ${fmt(spent)}`;
}

function renderActivity() {
  const ul = $('#activityList');
  ul.innerHTML = '';

  const items = [...state.transactions].sort((a, b) => b.ts - a.ts).slice(0, 10);

  items.forEach(tx => {
    const li = document.createElement('li');
    li.className = 'activity-item';

    const left = document.createElement('div');
    left.className = 'activity-left';

    const icon = document.createElement('div');
    icon.className = 'activity-icon';
    icon.textContent = iconFor(tx.category);

    const meta = document.createElement('div');
    meta.className = 'activity-meta';

    const title = document.createElement('div');
    title.className = 'activity-title';
    title.textContent = tx.category;

    const note = document.createElement('div');
    note.className = 'activity-note';
    note.textContent = tx.note ? tx.note : new Date(tx.ts).toLocaleString();

    meta.appendChild(title);
    meta.appendChild(note);
    left.appendChild(icon);
    left.appendChild(meta);

    const amt = document.createElement('div');
    amt.className = `amount ${tx.type}`;
    const signed = tx.type === 'expense' ? -tx.amount : tx.amount;
    amt.textContent = fmt(signed);

    li.appendChild(left);
    li.appendChild(amt);
    ul.appendChild(li);
  });
}

function showToast(message) {
  const feed = $('#txFeed');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  feed.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 250ms ease';
    setTimeout(() => t.remove(), 260);
  }, 2200);
}

// ===== MODAL WIRES =====
const fab = $('#fab');
const modal = $('#quickAddModal');
const btnSave = $('#saveTransaction');
const btnClose = $('#closeModal');

function openModal(){ modal.classList.add('show'); modal.setAttribute('aria-hidden', 'false'); }
function closeModal(){ modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true'); }

fab.addEventListener('click', openModal);
btnClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

// Save logic
btnSave.addEventListener('click', () => {
  const amount = Number($('#amountInput').value);
  const category = $('#categoryInput').value;
  const type = document.querySelector('input[name="txType"]:checked').value;
  const note = $('#noteInput').value.trim();

  if (!amount || amount <= 0 || !category) {
    showToast('Please enter an amount and select a category.');
    return;
  }

  const tx = { id: crypto.randomUUID?.() || String(Date.now()), type, amount, category, note, ts: Date.now() };
  state.transactions.push(tx);

  // Clear inputs
  $('#amountInput').value = '';
  $('#categoryInput').value = '';
  $('#noteInput').value = '';
  closeModal();

  // Rerender UI
  renderBudget();
  renderActivity();
  showToast(`Added ${type === 'expense' ? '-' : '+'}${fmt(amount).slice(1)} • ${category}`);
});

// ===== INIT (seed a couple of rows to show layout) =====
(function seed() {
  state.transactions.push(
    { id: '1', type: 'expense', amount: 85.22, category: 'Dining', note: 'Morning latte', ts: Date.now() - 1000 * 60 * 60 },
    { id: '2', type: 'expense', amount: 124.67, category: 'Groceries', note: "Trader Joe's Run", ts: Date.now() - 1000 * 60 * 60 * 3 }
  );
  renderBudget();
  renderActivity();
})();
