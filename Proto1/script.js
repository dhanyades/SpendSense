// tabs & loading
const tabs = Array.from(document.querySelectorAll('#navigationBar button'));
const content = document.getElementById('content');

tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    // highlight active button
    tabs.forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    // load corresponding page
    const page = btn.dataset.page; 
    loadPage(page).then(() => {
      // re-activate JS for newly loaded page
      activateTabJS(page);
    });
  });
});

// load HTML content into #content
async function loadPage(url) {
  const res = await fetch(url);
  const html = await res.text();
  content.innerHTML = html;
}

// data for home
let tx = [
  {amt:100,cat:'Groceries',type:'expense',note:'Lunch'},
  {amt:500,cat:'Paycheck',type:'income',note:'Work'},
  {amt:50,cat:'Snacks',type:'expense',note:'Chips'}
];

// re-activate js for tabs
function activateTabJS(tabName) {
  if (tabName === 'home.html') {
    // FAB / Modal
    const fab = document.getElementById('fab');
    const quickAddModal = document.getElementById('quickAddModal');
    const closeModal = document.getElementById('closeModal');
    const saveTransaction = document.getElementById('saveTransaction');
    const transactionsList = document.getElementById('transactionsList');

    if (fab) fab.onclick = () => quickAddModal.classList.add('show');
    if (closeModal) closeModal.onclick = () => quickAddModal.classList.remove('show');
    if (saveTransaction) saveTransaction.onclick = () => {
      tx.push({amt:20,cat:'Coffee',type:'expense',note:'Latte'});
      quickAddModal.classList.remove('show');
      renderHomeTransactions();
    };

    function renderHomeTransactions() {
      if (!transactionsList) return;
      transactionsList.innerHTML = '';
      tx.slice().reverse().forEach(t => {
        let li = document.createElement('li');
        li.className = 'activity-item';
        li.innerHTML = `<div class="activity-left">
                          <div class="activity-title">${t.cat}</div>
                          <div class="activity-note">${t.note}</div>
                        </div>
                        <div class="amount ${t.type}">$${t.amt}</div>`;
        transactionsList.appendChild(li);
      });
    }

    renderHomeTransactions();
  }

  // to-do tab
  if (tabName === 'todo.html') {
    const list = document.getElementById('todo_list');
    const input = document.getElementById('todo_input');
    const addBtn = document.getElementById('todo_add');

    if (!list || !input || !addBtn) return;

    function addItem(txt) {
      if (!txt.trim()) return;
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'txt';
      span.textContent = txt;

      const actions = document.createElement('div');
      actions.className = 'actions';

      const done = document.createElement('button');
      done.textContent = 'Done';
      const del = document.createElement('button');
      del.textContent = 'Delete';

      done.addEventListener('click', () => li.classList.toggle('done'));
      del.addEventListener('click', () => li.remove());

      actions.appendChild(done);
      actions.appendChild(del);
      li.appendChild(span);
      li.appendChild(actions);
      list.appendChild(li);
    }

    addBtn.onclick = () => {
      addItem(input.value);
      input.value = '';
    };
  }

  // profile tab
  if (tabName === 'profile.html') {
    const avatar = document.getElementById("avatar");
    const notification = document.getElementById("profile_notification");
    const closeNotification = document.getElementById("close_notification");

    if (avatar) avatar.addEventListener("click", () => {
      notification.style.display = "flex";
    });

    if (closeNotification) closeNotification.addEventListener("click", () => {
      notification.style.display = "none";
    });
  }

  // choices tab
  if (tabName === 'choices.html') {
    const out = document.getElementById('choice_output');
    const showChoiceBtn = document.getElementById('show_choice');

    if (showChoiceBtn) showChoiceBtn.addEventListener('click', () => {
      const termLength = (document.querySelector('input[name="termLength"]:checked') || {}).value;
      const expense = document.getElementById('expense').value;
      out.textContent = `You chose: ${termLength} • ${expense}`;
    });
  }
}

// default/home tab on start
document.addEventListener('DOMContentLoaded', () => {
  const defaultBtn = tabs[0];
  if (defaultBtn) {
    defaultBtn.classList.add('active');
    loadPage(defaultBtn.dataset.page).then(() => activateTabJS(defaultBtn.dataset.page));
  }
});
