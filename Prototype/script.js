// tabs
const tabs = Array.from(document.querySelectorAll('#navigationBar button'));
const pages = Array.from(document.querySelectorAll('.tab'));

tabs.forEach(b => b.addEventListener('click', () => {
  tabs.forEach(t => t.classList.remove('active'));
  pages.forEach(p => p.classList.remove('active'));
  b.classList.add('active');
  const target = document.querySelector(b.dataset.target);
  if (target) target.classList.add('active');
}));


//welcome page
let tx = [
  {amt:100,cat:'Groceries',type:'expense',note:'Lunch'},
  {amt:500,cat:'Paycheck',type:'income',note:'Work'},
  {amt:50,cat:'Snacks',type:'expense',note:'Chips'}
]

fab.onclick = () => quickAddModal.classList.add('show')
closeModal.onclick = () => quickAddModal.classList.remove('show')

saveTransaction.onclick = () => {
  tx.push({amt:20,cat:'Coffee',type:'expense',note:'Latte'})
  quickAddModal.classList.remove('show')
  render()
}

function render(){
  transactionsList.innerHTML = ''
  tx.slice().reverse().forEach(t=>{
    let li = document.createElement('li')
    li.className = 'activity-item'
    li.innerHTML = `<div>${t.cat}<div>${t.note}</div></div>
                    <div class="amount ${t.type}">$${t.amt}</div>`
    transactionsList.appendChild(li)
  })
}

render()

// profile 
const avatar = document.getElementById("avatar");
const notification = document.getElementById("profile_notification");
const closeNotification = document.getElementById("close_notification");

avatar.addEventListener("click", () => {
  notification.style.display = "flex";
});

closeNotification.addEventListener("click", () => {
  notification.style.display = "none";
});
// choices
const out = document.getElementById('choice_output');
document.getElementById('show_choice').addEventListener('click', () => {
  const termLength = (document.querySelector('input[name="termLength"]:checked') || {}).value;
  const expense = document.getElementById('expense').value;
  out.textContent = `You chose: ${termLength} • ${expense}`;
});

// todo
const list = document.getElementById('todo_list');
const input = document.getElementById('todo_input');
const addBtn = document.getElementById('todo_add');

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

  done.addEventListener('click', () => { li.classList.toggle('done'); });
  del.addEventListener('click', () => { li.remove(); });

  actions.appendChild(done);
  actions.appendChild(del);
  li.appendChild(span);
  li.appendChild(actions);
  list.appendChild(li);
}
