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
let tx = [];
const budget = { total: 0, remaining: 0 };

// Update budget displays
function updateBudgetDisplays() {
  const totals = computeBudgetTotals();

  const remainingEl = document.querySelector('.amount-remaining');
  if (remainingEl) remainingEl.textContent = `$${budget.remaining.toFixed(2)}`;
  const totalLabel = document.getElementById('totalBudgetLabel');
  if (totalLabel) totalLabel.textContent = `Total Budget: $${budget.total.toFixed(2)}`;

  // Use computed totals so 'Spent So Far' excludes allocations and we show allocated separately
  const allocated = totals.allocatedToGoals || 0;
  const spentExcluding = totals.spentExcludingAllocations || 0;

  const allocatedLabel = document.getElementById('allocatedToGoalsLabel');
  if (allocatedLabel) allocatedLabel.textContent = `Allocated to Goals: $${allocated.toFixed(2)}`;

  const spentLabel = document.getElementById('spentSoFarLabel');
  if (spentLabel) spentLabel.textContent = `Spent So Far: $${spentExcluding.toFixed(2)}`;

  // Update profile page budget if it exists
  const profileBudget = document.querySelector('#profile_tab .budget-amount')
  if (profileBudget) {
    profileBudget.textContent = `$${budget.remaining.toFixed(2)}`
    const profileTotalBudget = document.getElementById('profileTotalBudgetValue') || document.querySelector('#profile_tab .budget-item-value')
    if (profileTotalBudget) profileTotalBudget.textContent = `$${budget.total.toFixed(2)}`
    const profileAllocated = document.getElementById('profileAllocatedValue')
    if (profileAllocated) profileAllocated.textContent = `$${allocated.toFixed(2)}`
    const profileSpentBudget = document.getElementById('profileSpentValue') || document.querySelectorAll('#profile_tab .budget-item-value')[1]
    if (profileSpentBudget) profileSpentBudget.textContent = `$${spentExcluding.toFixed(2)}`
  }

  updateBudgetBreakdownDetails();
}

// Compute totals, allocated amount and spent excluding allocations
function computeBudgetTotals() {
  const totals = (Array.isArray(tx) ? tx : []).reduce((acc, t) => {
    if (!t || typeof t !== 'object') return acc;
    if (t.type === 'expense') {
      acc.totalExpenses += Number(t.amt) || 0;
      // Only count allocations for expense transactions to avoid double-counting incomes
      if (t.goalAllocation) acc.allocatedToGoals += Number(t.amt) || 0;
    }
    if (t.type === 'income') {
      acc.totalIncome += Number(t.amt) || 0;
      // do not add income allocations to allocatedToGoals here
    }
    return acc;
  }, { totalExpenses: 0, totalIncome: 0, allocatedToGoals: 0 });

  // Spent so far should exclude amounts allocated to goals
  const spentExcludingAllocations = Math.max(0, totals.totalExpenses - totals.allocatedToGoals);

  return {
    totalExpenses: totals.totalExpenses,
    totalIncome: totals.totalIncome,
    allocatedToGoals: totals.allocatedToGoals,
    spentExcludingAllocations
  };
}

const defaultCategories = [
  'Groceries',
  'Rent',
  'Utilities',
  'Transportation',
  'Dining',
  'Entertainment',
  'Miscellaneous'
];

let categories = [...defaultCategories];
let categoryMetadata = {};

function saveCategories() {}
function saveCategoryMetadata() {}

function normalizeCategoryName(name) {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function refreshCategorySelects(preferredSelection = null) {
  const selectConfigs = [
    { element: document.getElementById('categoryInput'), placeholder: document.getElementById('categoryInput')?.dataset.placeholder || 'Select category' },
    { element: document.getElementById('editCategoryInput'), placeholder: 'Select category' },
    { element: document.getElementById('lr_categoryInput'), placeholder: 'Select category' }
  ];

  selectConfigs.forEach(({ element, placeholder }) => {
    if (!element) return;

    const currentValue = preferredSelection || element.value;
    element.innerHTML = '';

    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.disabled = true;
    placeholderOption.textContent = placeholder;
    if (!currentValue) placeholderOption.selected = true;
    element.appendChild(placeholderOption);

    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      const purpose = categoryMetadata[category]?.purpose;
      if (purpose) option.title = purpose;
      element.appendChild(option);
    });

    if (currentValue && categories.includes(currentValue)) {
      element.value = currentValue;
    }
  });

  updateCategoryFilterOptions(document.getElementById('categoryFilter')?.value || 'all');
  renderCustomCategoryList();
}

function renderCustomCategoryList() {
  const list = document.getElementById('customCategoriesList');
  if (!list) return;

  list.innerHTML = '';
  const customCategories = categories.filter(cat => !defaultCategories.includes(cat));

  if (!customCategories.length) {
    const li = document.createElement('li');
    li.className = 'custom-category-empty';
    li.textContent = 'You have not added any custom categories yet.';
    list.appendChild(li);
    return;
  }

  customCategories.forEach(category => {
    const li = document.createElement('li');
    li.className = 'custom-category-pill';
    const purpose = categoryMetadata[category]?.purpose;
    li.innerHTML = `
      <strong>${category}</strong>
      ${purpose ? `<span>${purpose}</span>` : ''}
    `;
    list.appendChild(li);
  });
}

function updateCategoryFilterOptions(selectedValue = 'all') {
  const filterDropdown = document.getElementById('categoryFilter');
  if (!filterDropdown) return;

  const transactionCategories = Array.from(new Set(
    (Array.isArray(tx) ? tx : [])
      .map(t => (t && t.cat) ? t.cat : null)
      .filter(Boolean)
  ));

  const combined = Array.from(new Set(['all', ...categories, ...transactionCategories]));
  filterDropdown.innerHTML = '';

  combined.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category === 'all' ? 'All Categories' : category;
    filterDropdown.appendChild(option);
  });

  filterDropdown.value = combined.includes(selectedValue) ? selectedValue : 'all';
}

refreshCategorySelects();

const createCategoryModal = document.getElementById('createCategoryModal');
const closeCategoryModalBtn = document.getElementById('closeCategoryModal');
const saveCategoryBtn = document.getElementById('saveCategory');
const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
let pendingCategorySelectId = null;

function openCreateCategoryModal(selectId = null) {
  pendingCategorySelectId = selectId;
  if (createCategoryModal) {
    const nameInput = document.getElementById('newCategoryName');
    const purposeInput = document.getElementById('categoryPurpose');
    if (nameInput) nameInput.value = '';
    if (purposeInput) purposeInput.value = '';
    createCategoryModal.classList.add('show');
    nameInput?.focus();
  }
}

function closeCreateCategoryModal() {
  createCategoryModal?.classList.remove('show');
  pendingCategorySelectId = null;
}

manageCategoriesBtn?.addEventListener('click', () => openCreateCategoryModal());
closeCategoryModalBtn?.addEventListener('click', closeCreateCategoryModal);
createCategoryModal?.addEventListener('click', (event) => {
  if (event.target === createCategoryModal) closeCreateCategoryModal();
});

saveCategoryBtn?.addEventListener('click', () => {
  const nameInput = document.getElementById('newCategoryName');
  if (!nameInput) return;

  const normalizedName = normalizeCategoryName(nameInput.value);
  const purposeInput = document.getElementById('categoryPurpose');
  const purposeValue = purposeInput?.value.trim() || '';
  if (!normalizedName) {
    alert('Please enter a category name.');
    nameInput.focus();
    return;
  }

  const exists = categories.some(cat => cat.toLowerCase() === normalizedName.toLowerCase());
  if (exists) {
    if (purposeValue) {
      categoryMetadata[normalizedName] = { purpose: purposeValue };
      saveCategoryMetadata();
      refreshCategorySelects(normalizedName);
    }
    alert('This category already exists.');
    if (pendingCategorySelectId) {
      const existingSelect = document.getElementById(pendingCategorySelectId);
      if (existingSelect) existingSelect.value = normalizedName;
    }
    closeCreateCategoryModal();
    return;
  }

  categories.push(normalizedName);
  categories.sort((a, b) => a.localeCompare(b));
  categoryMetadata[normalizedName] = { purpose: purposeValue };
  saveCategories();
  saveCategoryMetadata();
  refreshCategorySelects(normalizedName);

  if (pendingCategorySelectId) {
    const targetSelect = document.getElementById(pendingCategorySelectId);
    if (targetSelect) targetSelect.value = normalizedName;
  }

  closeCreateCategoryModal();
});

// Recalculate budget.remaining using totals and persist
function recalcAndSaveBudget() {
  const totals = computeBudgetTotals();
  budget.total = totals.totalIncome;
  budget.remaining = Math.max(0, totals.totalIncome - totals.totalExpenses);
  return totals;
}

const budgetBreakdownModal = document.getElementById('budgetBreakdownModal');
const closeBreakdownModalBtn = document.getElementById('closeBreakdownModal');
const breakdownCategoryList = document.getElementById('breakdownCategoryList');
const remainingAmountButton = document.getElementById('remainingAmount');

function formatCurrency(value = 0) {
  const amount = Number(value) || 0;
  return `$${amount.toFixed(2)}`;
}

function updateBudgetBreakdownDetails() {
  if (!budgetBreakdownModal) return;

  const totals = computeBudgetTotals();
  const remaining = budget.remaining;

  const totalEl = document.getElementById('breakdownTotalBudget');
  const remainingEl = document.getElementById('breakdownRemaining');
  const spentEl = document.getElementById('breakdownSpent');
  const allocatedEl = document.getElementById('breakdownAllocated');
  const incomeEl = document.getElementById('breakdownIncome');
  const netEl = document.getElementById('breakdownNet');

  if (totalEl) totalEl.textContent = formatCurrency(budget.total);
  if (remainingEl) remainingEl.textContent = formatCurrency(remaining);
  if (spentEl) spentEl.textContent = formatCurrency(totals.spentExcludingAllocations);
  if (allocatedEl) allocatedEl.textContent = formatCurrency(totals.allocatedToGoals);
  if (incomeEl) incomeEl.textContent = formatCurrency(totals.totalIncome);
  if (netEl) netEl.textContent = formatCurrency(totals.totalIncome - totals.totalExpenses);

  const progressFill = document.getElementById('breakdownProgressFill');
  const progressLabel = document.getElementById('breakdownProgressLabel');
  const utilization = budget.total ? (totals.spentExcludingAllocations / budget.total) * 100 : 0;
  if (progressFill) progressFill.style.width = `${Math.min(100, Math.max(0, utilization)).toFixed(0)}%`;
  if (progressLabel) progressLabel.textContent = `${Math.min(100, Math.max(0, utilization)).toFixed(0)}% used`;

  if (breakdownCategoryList) {
    breakdownCategoryList.innerHTML = '';
    const recent = tx.slice().reverse().slice(0, 5);
    if (!recent.length) {
      const li = document.createElement('li');
      li.className = 'empty-row';
      li.textContent = 'No activity yet.';
      breakdownCategoryList.appendChild(li);
    } else {
      recent.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.cat || 'General'}</span><span class="amount ${item.type}">${item.type === 'income' ? '+' : '-'}$${Number(item.amt).toFixed(2)}</span>`;
        breakdownCategoryList.appendChild(li);
      });
    }
    const hint = document.getElementById('breakdownCategoryHint');
    if (hint) hint.textContent = 'Recent activity';
  }
}

function openBudgetBreakdownModal() {
  updateBudgetBreakdownDetails();
  budgetBreakdownModal?.classList.add('show');
}

function closeBudgetBreakdownModal() {
  budgetBreakdownModal?.classList.remove('show');
  document.getElementById('tab-text')?.click();
}

remainingAmountButton?.addEventListener('click', openBudgetBreakdownModal);
remainingAmountButton?.addEventListener('keypress', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openBudgetBreakdownModal();
  }
});
closeBreakdownModalBtn?.addEventListener('click', closeBudgetBreakdownModal);
budgetBreakdownModal?.addEventListener('click', (event) => {
  if (event.target === budgetBreakdownModal) closeBudgetBreakdownModal();
});

const fab = document.getElementById('fab');
const quickAddModal = document.getElementById('quickAddModal');
const closeModal = document.getElementById('closeModal');
const saveTransactionBtn = document.getElementById('saveTransaction');

if (fab && quickAddModal) {
  fab.onclick = () => quickAddModal.classList.add('show');
}

if (closeModal && quickAddModal) {
  closeModal.onclick = () => quickAddModal.classList.remove('show');
}

if (saveTransactionBtn) {
  saveTransactionBtn.onclick = () => {
    const amountInput = document.getElementById('amountInput');
    const noteInput = document.getElementById('noteInput');
    const categoryInput = document.getElementById('categoryInput');
    const typeInput = document.querySelector('input[name="txType"]:checked');

    if (!amountInput || !categoryInput || !typeInput) return;

    const amount = parseFloat(amountInput.value);
    const category = categoryInput.value;

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!category) {
      alert('Please select a category');
      return;
    }

    const transaction = {
      id: Date.now(),
      amt: amount,
      cat: category,
      type: typeInput.value,
      merchant: document.getElementById('merchantInput')?.value || '',
      note: noteInput?.value || '',
      date: new Date().toISOString(),
      recurring: document.getElementById('recurringInput')?.value || 'no',
      goalAllocation: document.getElementById('goalAllocationInput')?.value || '',
    };

    if (!Array.isArray(tx)) tx = [];
    tx.push(transaction);

    if (transaction.goalAllocation) {
      updateGoalProgress(transaction);
    }

    recalcAndSaveBudget();

    // reset fields
    amountInput.value = '';
    if (noteInput) noteInput.value = '';
    if (categoryInput.options.length) categoryInput.selectedIndex = 0;
    const merchant = document.getElementById('merchantInput');
    if (merchant) merchant.value = '';
    const recurringSel = document.getElementById('recurringInput');
    if (recurringSel) recurringSel.value = 'no';
    const goalAllocSel = document.getElementById('goalAllocationInput');
    if (goalAllocSel) goalAllocSel.value = '';

    quickAddModal.classList.remove('show');
    updateBudgetDisplays();
    updateGoalDisplays();
    render();
  };
}

function render(){
  // Recalculate budget first (using centralized logic that excludes goal allocations from 'spent')
  recalcAndSaveBudget();
  updateBudgetDisplays();

  // Render recent transactions on home page
  const transactionsList = document.getElementById('transactionsList');
  if (transactionsList) {
    transactionsList.innerHTML = '';
    
    if (!Array.isArray(tx)) {
      console.error('Transaction data is not an array');
      return;
    }

    tx.slice().reverse().slice(0, 5).forEach(t => {
      if (!t || typeof t !== 'object') {
        console.error('Invalid transaction:', t);
        return;
      }

      let li = document.createElement('li');
      li.className = 'activity-item';

      // Safely format the date
      let dateStr;
      try {
        dateStr = t.date ? new Date(t.date).toLocaleDateString() : 'No date';
      } catch(e) {
        dateStr = 'Invalid date';
      }

      let amountStr;
      try {
        amountStr = typeof t.amt === 'number' ? t.amt.toFixed(2) : '0.00';
      } catch(e) {
        amountStr = '0.00';
      }

      li.innerHTML = `<div>
                        <div>${t.cat || 'Uncategorized'}</div>
                        <div>${t.note || ''}</div>
                        <div style="font-size: 0.8em; opacity: 0.7">${dateStr}</div>
                      </div>
                      <div class="amount ${t.type || 'expense'}">$${amountStr}</div>`;
      transactionsList.appendChild(li);
    });
  }

  // Render detailed transactions view
  const currentFilter = document.getElementById('categoryFilter')?.value || 'all';
  renderDetailedTransactions(currentFilter);
}

// Goal Management
let goals = [];

// Goal Modal Elements
const goalModal = document.getElementById('goalModal');
const closeGoalModal = document.getElementById('closeGoalModal');
const addGoalBtn = document.getElementById('addGoalBtn');
const saveGoalBtn = document.getElementById('saveGoal');

function openGoalModal(goal = null) {
  const modalTitle = document.getElementById('goalModalTitle');
  const nameInput = document.getElementById('goalName');
  const amountInput = document.getElementById('goalAmount');
  const deadlineInput = document.getElementById('goalDeadline');
  const categoryInput = document.getElementById('goalCategory');
  const notesInput = document.getElementById('goalNotes');
  const goalIdInput = document.getElementById('editGoalId');

  if (goal) {
    modalTitle.textContent = 'Edit Goal';
    nameInput.value = goal.name;
    amountInput.value = goal.targetAmount;
    deadlineInput.value = goal.deadline || '';
    categoryInput.value = goal.category || 'savings';
    notesInput.value = goal.notes || '';
    goalIdInput.value = goal.id;
  } else {
    modalTitle.textContent = 'Add New Goal';
    nameInput.value = '';
    amountInput.value = '';
    deadlineInput.value = '';
    categoryInput.value = 'savings';
    notesInput.value = '';
    goalIdInput.value = '';
  }

  goalModal.classList.add('show');
}

closeGoalModal.onclick = () => goalModal.classList.remove('show');
if (addGoalBtn) addGoalBtn.onclick = () => openGoalModal();

function addGoal(goalData) {
  const goal = {
    id: Date.now(),
    name: goalData.name,
    targetAmount: parseFloat(goalData.amount),
    deadline: goalData.deadline,
    category: goalData.category,
    notes: goalData.notes,
    currentAmount: 0,
    transactions: [],
    createdAt: new Date().toISOString()
  };
  goals.push(goal);
  saveGoals();
  updateGoalOptions();
  return goal;
}

// Save goal handler
if (saveGoalBtn) {
  saveGoalBtn.onclick = () => {
    const nameInput = document.getElementById('goalName');
    const amountInput = document.getElementById('goalAmount');
    const deadlineInput = document.getElementById('goalDeadline');
    const categoryInput = document.getElementById('goalCategory');
    const notesInput = document.getElementById('goalNotes');
    const goalIdInput = document.getElementById('editGoalId');

    if (!nameInput.value || !amountInput.value) {
      alert('Please fill in the required fields');
      return;
    }

    const goalData = {
      name: nameInput.value,
      amount: parseFloat(amountInput.value),
      deadline: deadlineInput.value,
      category: categoryInput.value,
      notes: notesInput.value
    };

    if (goalIdInput.value) {
      // Edit existing goal
      const goalIndex = goals.findIndex(g => g.id === parseInt(goalIdInput.value));
      if (goalIndex !== -1) {
        goals[goalIndex] = {
          ...goals[goalIndex],
          name: goalData.name,
          targetAmount: goalData.amount,
          deadline: goalData.deadline,
          category: goalData.category,
          notes: goalData.notes
        };
      }
    } else {
      // Add new goal
      addGoal(goalData);
    }

    saveGoals();
    updateGoalDisplays();
    goalModal.classList.remove('show');
  };
}

function deleteGoal(goalId) {
  if (confirm('Are you sure you want to delete this goal?')) {
    goals = goals.filter(g => g.id !== goalId);
    saveGoals();
    updateGoalOptions();
    updateGoalDisplays();
  }
}

function updateGoalProgress(transaction) {
  const goal = goals.find(g => g.id === parseInt(transaction.goalAllocation));
  if (!goal) return;

  // Remove transaction from all goals first (in case it was previously allocated to a different goal)
  goals.forEach(g => {
    g.transactions = g.transactions.filter(t => t.id !== transaction.id);
    g.currentAmount = g.transactions.reduce((sum, t) => {
      return sum + (t.type === 'expense' ? -t.amt : t.amt);
    }, 0);
  });

  // Add transaction to new goal
  goal.transactions.push(transaction);
  goal.currentAmount = goal.transactions.reduce((sum, t) => {
    return sum + (t.type === 'expense' ? -t.amt : t.amt);
  }, 0);

  saveGoals();
  updateGoalDisplays();
}

function saveGoals() {
  // no persistence needed
}

function updateGoalOptions(selectElement = null) {
  const selects = selectElement ? [selectElement] : 
    [document.getElementById('goalAllocationInput'), document.getElementById('editGoalAllocationInput'), document.getElementById('lr_goalAllocationInput')];
  
  selects.forEach(select => {
    if (!select) return;

    // Store current value
    const currentValue = select.value;
    
    // Clear existing options (except the "None" option)
    select.innerHTML = '<option value="">None</option>';
    
    // Add goal options
    goals.forEach(goal => {
      const option = document.createElement('option');
      option.value = goal.id;
      option.textContent = `${goal.name} (${((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)}%)`;
      select.appendChild(option);
    });
    
    // Restore selected value if it still exists
    if (currentValue && [...select.options].some(opt => opt.value === currentValue)) {
      select.value = currentValue;
    }
  });
}

function updateGoalDisplays() {
  const totalGoals = goals.length;
  const averageProgress = goals.length ?
    goals.reduce((sum, goal) => sum + (goal.currentAmount / goal.targetAmount * 100), 0) / goals.length :
    0;
  const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);

  updateGoalOptions();
  renderProfileGoalsMirror({ totalGoals, averageProgress, totalSaved });
}

function renderProfileGoalsMirror(stats) {
  const mirror = document.getElementById('profileGoalsMirror');
  if (!mirror) return;

  const header = `
    <div class="mirror-header">
      <div>
        <h3>Goals</h3>
        <p>Track your goals without leaving your profile.</p>
      </div>
    </div>
  `;

  if (!goals.length) {
    mirror.innerHTML = `
      ${header}
      <p style="margin-top:16px;color:var(--muted);">No goals yet. Tap “Add Goal” above to get started.</p>
    `;
    return;
  }

  const goalsMarkup = goals.map(goal => {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    const progressClamped = Math.min(Math.max(progress, 0), 100);
    const daysLeft = goal.deadline ?
      `${Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24))} days left` :
      '';

    return `
      <div class="goal-item">
        <div class="goal-header">
          <div class="goal-info">
            <div class="goal-name">${goal.name}</div>
            <div class="goal-category">${goal.category}</div>
          </div>
          ${daysLeft ? `<div class="goal-deadline">${daysLeft}</div>` : ''}
        </div>
        <div class="goal-progress-info">
          <div class="goal-amount">$${goal.currentAmount.toFixed(2)} / $${goal.targetAmount.toFixed(2)}</div>
        </div>
        <div class="goal-progress-bar">
          <div class="goal-progress" style="width:${progressClamped}%"></div>
        </div>
        <div class="goal-footer">
          <div class="goal-percentage">${progress.toFixed(1)}% Complete</div>
          <div class="goal-stats">
            <div class="goal-stat">
              <i class="fi fi-rr-arrow-up"></i>
              <span class="goal-stat-value">$${(goal.targetAmount - goal.currentAmount).toFixed(2)} to go</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  mirror.innerHTML = `
    ${header}
    <div class="goals-overview">
      <div class="summary-card total-goals">
        <i class="fi fi-rr-target"></i>
        <div class="summary-content">
          <div class="summary-label">Active Goals</div>
          <div class="summary-value">${stats.totalGoals}</div>
        </div>
      </div>
      <div class="summary-card total-progress">
        <i class="fi fi-rr-chart-line-up"></i>
        <div class="summary-content">
          <div class="summary-label">Average Progress</div>
          <div class="summary-value">${stats.averageProgress.toFixed(1)}%</div>
        </div>
      </div>
      <div class="summary-card total-saved">
        <svg class="summary-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="6" width="22" height="12" rx="2" ry="2" fill="currentColor" opacity="0.08"/>
          <rect x="3" y="8" width="18" height="8" rx="1" ry="1" fill="none" stroke="currentColor" stroke-width="1.2"/>
          <text x="12" y="13.2" text-anchor="middle" font-size="9" fill="currentColor" font-family="Arial, Helvetica, sans-serif" font-weight="700">$</text>
        </svg>
        <div class="summary-content">
          <div class="summary-label">Total Saved</div>
          <div class="summary-value">$${stats.totalSaved.toFixed(2)}</div>
        </div>
      </div>
    </div>
    <div class="goals-list mirror-list">
      ${goalsMarkup}
    </div>
  `;
}

// Initial render and budget update
render();
updateBudgetDisplays();
updateGoalDisplays();

// profile 
const avatar = document.getElementById("avatar");
const notification = document.getElementById("profile_notification");
const closeNotification = document.getElementById("close_notification");
const notificationTitle = document.querySelector('.notification_title');
const notificationText = document.querySelector('.notification_text');

avatar.addEventListener("click", () => {
  notificationTitle.textContent = "Welcome to SpendSense!";
  notificationText.textContent = "Hello Testudo!";
  notification.style.display = "flex";
});

closeNotification.addEventListener("click", () => {
  notification.style.display = "none";
});

// Function to render transactions grouped by category
function renderDetailedTransactions(filterCategory = 'all') {
  const container = document.querySelector('.transactions-by-category');
  if (!container) return;

  container.innerHTML = '';
  if (!Array.isArray(tx)) return;

  const activeFilter = filterCategory || 'all';
  updateCategoryFilterOptions(activeFilter);
  
  // Group transactions by category
  const groupedTransactions = {};
  const categoryTotals = {};
  
  tx.forEach(t => {
    if (!t || typeof t !== 'object') return;
    
    if (activeFilter === 'all' || t.cat === activeFilter) {
      const category = t.cat || 'Uncategorized';
      if (!groupedTransactions[category]) {
        groupedTransactions[category] = [];
        categoryTotals[category] = { expense: 0, income: 0 };
      }
      groupedTransactions[category].push(t);
      if (t.type === 'expense') {
        categoryTotals[category].expense += t.amt;
      } else {
        categoryTotals[category].income += t.amt;
      }
    }
  });

  // Sort categories alphabetically
  const sortedCategories = Object.keys(groupedTransactions).sort();

  // Render each category group
  sortedCategories.forEach(category => {
    const categoryGroup = document.createElement('div');
    categoryGroup.className = 'category-group';
    
    const transactions = groupedTransactions[category];
    const totals = categoryTotals[category];
    
    categoryGroup.innerHTML = `
      <div class="category-header">
        <div class="category-name">${category}</div>
        <div class="category-total">
          ${totals.expense > 0 ? `<span class="expense">-$${totals.expense.toFixed(2)}</span>` : ''}
          ${totals.income > 0 ? `<span class="income">+$${totals.income.toFixed(2)}</span>` : ''}
        </div>
      </div>
      <div class="category-transactions">
        ${transactions
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map(t => {
            let dateStr;
            try {
              dateStr = t.date ? new Date(t.date).toLocaleDateString() : 'No date';
            } catch(e) {
              dateStr = 'Invalid date';
            }

            let amountStr;
            try {
              amountStr = typeof t.amt === 'number' ? t.amt.toFixed(2) : '0.00';
            } catch(e) {
              amountStr = '0.00';
            }

            return `
              <div class="transaction-item">
                <div class="transaction-details">
                  <div class="transaction-note">${t.note || 'No description'}</div>
                  <div class="transaction-date">${dateStr}</div>
                </div>
                <button class="edit-transaction-btn" type="button" data-transaction-id="${t.id}">
                  <i class="fi fi-rr-edit"></i>
                </button>
                <div class="amount ${t.type || 'expense'}">
                  ${t.type === 'expense' ? '-' : '+'}$${amountStr}
                </div>
              </div>
            `;
          }).join('')}
      </div>
    `;
    
    container.appendChild(categoryGroup);
  });

  // Update category totals
  updateCategoryTotals();
}

function updateCategoryTotals() {
  const totalsContainer = document.getElementById('categoryTotals');
  if (!totalsContainer) return;

  let totalExpense = 0;
  let totalIncome = 0;

  (Array.isArray(tx) ? tx : []).forEach(t => {
    if (!t || typeof t !== 'object') return;
    if (t.type === 'expense') totalExpense += Number(t.amt) || 0;
    if (t.type === 'income') totalIncome += Number(t.amt) || 0;
  });

  totalsContainer.innerHTML = `
    <div class="totals-header">Summary</div>
    <div class="total-row">
      <span class="total-label">Total Expenses:</span>
      <span class="total-amount expense">-$${totalExpense.toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span class="total-label">Total Income:</span>
      <span class="total-amount income">+$${totalIncome.toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span class="total-label">Net:</span>
      <span class="total-amount ${totalIncome - totalExpense >= 0 ? 'income' : 'expense'}">
        ${totalIncome - totalExpense >= 0 ? '+' : '-'}$${Math.abs(totalIncome - totalExpense).toFixed(2)}
      </span>
    </div>
  `;
}

// Edit transaction functionality
const editTransactionModal = document.getElementById('editTransactionModal');
const closeEditModal = document.getElementById('closeEditModal');
const updateTransaction = document.getElementById('updateTransaction');

function openEditModal(transaction) {
  const editAmountInput = document.getElementById('editAmountInput');
  const editMerchantInput = document.getElementById('editMerchantInput');
  const editNoteInput = document.getElementById('editNoteInput');
  const editCategoryInput = document.getElementById('editCategoryInput');
  const editRecurringInput = document.getElementById('editRecurringInput');
  const editGoalAllocationInput = document.getElementById('editGoalAllocationInput');
  const editTransactionId = document.getElementById('editTransactionId');
  const editTypeInputs = document.getElementsByName('editTxType');

  // Set basic fields
  editAmountInput.value = transaction.amt;
  editMerchantInput.value = transaction.merchant || '';
  editNoteInput.value = transaction.note || '';
  editCategoryInput.value = transaction.cat;
  editTransactionId.value = transaction.id;
  
  // Set advanced fields
  editRecurringInput.value = transaction.recurring || 'no';
  editGoalAllocationInput.value = transaction.goalAllocation || '';
  
  // Set transaction type radio button
  editTypeInputs.forEach(input => {
    if (input.value === transaction.type) {
      input.checked = true;
    }
  });

  // Update goal allocation options
  updateGoalOptions(editGoalAllocationInput);

  editTransactionModal.classList.add('show');
}

closeEditModal.onclick = () => editTransactionModal.classList.remove('show');

updateTransaction.onclick = () => {
  const editAmountInput = document.getElementById('editAmountInput');
  const editNoteInput = document.getElementById('editNoteInput');
  const editCategoryInput = document.getElementById('editCategoryInput');
  const editTransactionId = document.getElementById('editTransactionId');
  const editTypeInput = document.querySelector('input[name="editTxType"]:checked');

  const amount = parseFloat(editAmountInput.value);
  const category = editCategoryInput.value;
  
  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }

  if (!category) {
    alert('Please select a category');
    return;
  }

  // Find and update the transaction
  const transactionIndex = tx.findIndex(t => t.id === parseInt(editTransactionId.value));
  if (transactionIndex === -1) {
    alert('Transaction not found');
    return;
  }

  const oldTransaction = tx[transactionIndex];
  const newTransaction = {
    ...oldTransaction,
    amt: amount,
    cat: category,
    type: editTypeInput.value,
    note: editNoteInput.value
  };

  // Update budget
  if (oldTransaction.type === 'expense') {
    budget.remaining += oldTransaction.amt;
  } else {
    budget.remaining -= oldTransaction.amt;
  }
  
  if (newTransaction.type === 'expense') {
    budget.remaining -= amount;
  } else {
    budget.remaining += amount;
  }

  tx[transactionIndex] = newTransaction;
  
  if (newTransaction.goalAllocation) {
    updateGoalProgress(newTransaction);
  }
  
  recalcAndSaveBudget();
  
  editTransactionModal.classList.remove('show');
  updateBudgetDisplays();
  render();
};

document.addEventListener('DOMContentLoaded', () => {
  const categoryFilter = document.getElementById('categoryFilter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      renderDetailedTransactions(e.target.value);
    });
  }
});

const lrSaveBtn = document.getElementById('lr_saveTransaction');
const lrCancelBtn = document.getElementById('lr_cancel');
if (lrSaveBtn) {
  lrSaveBtn.addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('lr_amountInput')?.value || 0);
    const category = document.getElementById('lr_categoryInput')?.value;
    const merchant = document.getElementById('lr_merchantInput')?.value || '';
    const note = document.getElementById('lr_noteInput')?.value || '';
    const recurring = document.getElementById('lr_recurringInput')?.value || 'no';
    const goalAllocation = document.getElementById('lr_goalAllocationInput')?.value || '';

    const type = (document.querySelector('input[name="lr_txType"]:checked') || {}).value || 'expense';

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!category) {
      alert('Please select a category');
      return;
    }

    const transaction = {
      id: Date.now(),
      amt: amount,
      cat: category,
      type,
      merchant,
      note,
      date: new Date().toISOString(),
      recurring,
      goalAllocation,
    };

    if (!Array.isArray(tx)) tx = [];
    tx.push(transaction);

    if (transaction.goalAllocation) updateGoalProgress(transaction);

    recalcAndSaveBudget();

    const lrCategorySelect = document.getElementById('lr_categoryInput');
    if (lrCategorySelect && lrCategorySelect.options.length) {
      lrCategorySelect.selectedIndex = 0;
    }
    document.getElementById('lr_add_form').style.display = 'none';
    updateBudgetDisplays();
    updateGoalDisplays();
    render();
  });
}
if (lrCancelBtn) {
  lrCancelBtn.addEventListener('click', () => {
    document.getElementById('lr_add_form').style.display = 'none';
  });
}
function initGraphSwitcher() {
  const select = document.getElementById('graph_type');
  const graphs = document.querySelectorAll('.graph');
  if (!select || !graphs.length) return;

  const showGraph = (id) => {
    graphs.forEach(img => {
      img.style.display = img.id === id ? 'block' : 'none';
    });
  };

  showGraph(select.value);
  select.addEventListener('change', (event) => showGraph(event.target.value));
}

document.addEventListener('click', (event) => {
  const editBtn = event.target.closest('.edit-transaction-btn');
  if (!editBtn) return;
  const id = Number(editBtn.dataset.transactionId);
  if (!id) return;
  const transaction = tx.find(t => t.id === id);
  if (transaction) openEditModal(transaction);
});

// Reminders tab
const reminderForm = document.getElementById('reminderForm');
const reminderNameInput = document.getElementById('reminderName');
const reminderAmountInput = document.getElementById('reminderAmount');
const reminderDueDateInput = document.getElementById('reminderDueDate');
const reminderRecurringInput = document.getElementById('reminderRecurring');
const reminderList = document.getElementById('reminderList');

const today = new Date();
const defaultDue = new Date(today.getFullYear(), today.getMonth(), 15);
const defaultDueIso = defaultDue.toISOString().split('T')[0];

let reminders = [];

function renderReminders() {
  if (!reminderList) return;
  reminderList.innerHTML = '';

  const baseCardStyle = 'background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:16px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.03);';
  const infoStyle = 'display:flex;flex-direction:column;gap:4px;';
  const nameStyle = 'font-size:1.05rem;font-weight:700;';
  const metaStyle = 'color:var(--muted);font-size:0.9rem;';

  if (!reminders.length) {
    const emptyRow = document.createElement('div');
    emptyRow.style.cssText = baseCardStyle;
    emptyRow.innerHTML = '<div style="' + infoStyle + '"><div style="' + nameStyle + '">No reminders yet</div><div style="' + metaStyle + '">Add one using the form above.</div></div>';
    reminderList.appendChild(emptyRow);
    return;
  }

  reminders.forEach(reminder => {
    const row = document.createElement('div');
    row.style.cssText = baseCardStyle;

    const info = document.createElement('div');
    info.style.cssText = infoStyle;
    info.innerHTML = `
      <div style="${nameStyle}">${reminder.name}</div>
      <div style="${metaStyle}">$${Number(reminder.amount).toFixed(2)} • Due ${reminder.dueDate ? new Date(reminder.dueDate).toLocaleDateString() : '—'}</div>
    `;

    const pill = document.createElement('div');
    pill.style.cssText = `padding:6px 12px;border-radius:999px;font-weight:600;font-size:0.85rem;${reminder.recurring ? 'background:rgba(74,157,124,0.15);color:var(--accent);' : 'background:rgba(220,53,69,0.1);color:var(--bad);'}`;
    pill.textContent = reminder.recurring ? 'Recurring' : 'One-time';

    row.appendChild(info);
    row.appendChild(pill);
    reminderList.appendChild(row);
  });
}

function setReminderFormDefaults() {
  if (!reminderNameInput || !reminderAmountInput || !reminderDueDateInput) return;
  reminderNameInput.value = '';
  reminderAmountInput.value = '';
  reminderDueDateInput.value = defaultDueIso;
  if (reminderRecurringInput) reminderRecurringInput.checked = false;
}

reminderForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = reminderNameInput?.value.trim();
  const amount = parseFloat(reminderAmountInput?.value || '0');
  const dueDate = reminderDueDateInput?.value;
  const recurring = !!reminderRecurringInput?.checked;

  if (!name || isNaN(amount) || !dueDate) {
    alert('Enter a name, amount, and due date.');
    return;
  }

  reminders.push({
    id: Date.now(),
    name,
    amount,
    dueDate,
    recurring
  });

  renderReminders();
  reminderForm.reset();
});

setReminderFormDefaults();
renderReminders();
initGraphSwitcher();
