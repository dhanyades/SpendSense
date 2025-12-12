const tabs = Array.from(document.querySelectorAll('#navigationBar button'));
const pages = Array.from(document.querySelectorAll('.tab'));

tabs.forEach(button => {
  button.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));
    button.classList.add('active');
    const target = document.querySelector(button.dataset.target);
    if (target) target.classList.add('active');
  });
});

let tx = [];
const budget = { total: 0, remaining: 0 };

function computeBudgetTotals() {
  const totals = (Array.isArray(tx) ? tx : []).reduce((acc, t) => {
    if (!t || typeof t !== 'object') return acc;
    const amt = Number(t.amt) || 0;
    if (t.type === 'expense') {
      acc.totalExpenses += amt;
      if (t.goalAllocation) acc.allocatedToGoals += amt;
    }
    if (t.type === 'income') {
      acc.totalIncome += amt;
    }
    return acc;
  }, { totalExpenses: 0, totalIncome: 0, allocatedToGoals: 0 });
  const spentExcludingAllocations = Math.max(0, totals.totalExpenses - totals.allocatedToGoals);
  return {
    totalExpenses: totals.totalExpenses,
    totalIncome: totals.totalIncome,
    allocatedToGoals: totals.allocatedToGoals,
    spentExcludingAllocations
  };
}

function formatCurrency(value) {
  const amount = Number(value) || 0;
  return `$${amount.toFixed(2)}`;
}

function recalcAndSaveBudget() {
  const totals = computeBudgetTotals();
  budget.total = totals.totalIncome;
  budget.remaining = Math.max(0, totals.totalIncome - totals.totalExpenses);
  return totals;
}

function updateBudgetDisplays() {
  const totals = computeBudgetTotals();
  const remainingEl = document.querySelector('.main-budget-card .amount-remaining');
  if (remainingEl) remainingEl.textContent = formatCurrency(budget.remaining);
  const totalLabel = document.getElementById('totalBudgetLabel');
  if (totalLabel) totalLabel.textContent = `Total Budget: ${formatCurrency(budget.total)}`;
  const spentLabel = document.getElementById('spentSoFarLabel');
  if (spentLabel) spentLabel.textContent = `Spent So Far: ${formatCurrency(totals.spentExcludingAllocations)}`;
  updateBudgetBreakdownDetails();
}

const defaultCategories = [
  'Groceries',
  'Rent',
  'Utilities',
  'Transportation',
  'Dining',
  'Entertainment',
  'Miscellaneous',
  'Salary',
  'Freelance',
  'Investment',
  'Gift',
  'Bonus'
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
    const purpose = categoryMetadata[category]?.purpose || '';
    li.innerHTML = `
      <div class="category-pill-content">
        <strong>${category}</strong>
        ${purpose ? `<span class="category-purpose">${purpose}</span>` : ''}
      </div>
      <div class="category-pill-actions">
        <button class="edit-category-btn" data-category="${category}" type="button" title="Edit category">✎</button>
        <button class="delete-category-btn" data-category="${category}" type="button" title="Delete category">×</button>
      </div>
    `;
    list.appendChild(li);
  });
}

document.addEventListener('click', event => {
  const editCatBtn = event.target.closest('.edit-category-btn');
  if (editCatBtn) {
    const categoryName = editCatBtn.dataset.category;
    const purpose = categoryMetadata[categoryName]?.purpose || '';
    const nameInput = document.getElementById('newCategoryName');
    const purposeInput = document.getElementById('categoryPurpose');
    if (nameInput && purposeInput) {
      nameInput.value = categoryName;
      nameInput.disabled = true;
      purposeInput.value = purpose;
      openCreateCategoryModal();
    }
  }
  
  const deleteCatBtn = event.target.closest('.delete-category-btn');
  if (deleteCatBtn) {
    const categoryName = deleteCatBtn.dataset.category;
    const hasTransactions = tx.some(t => t.cat === categoryName);
    const message = hasTransactions 
      ? `Category "${categoryName}" is used in transactions. Delete anyway?`
      : `Delete category "${categoryName}"?`;
    if (confirm(message)) {
      categories = categories.filter(cat => cat !== categoryName);
      delete categoryMetadata[categoryName];
      saveCategories();
      saveCategoryMetadata();
      refreshCategorySelects();
      updateProfileStats(); // Update category count
    }
  }
  
  const editGoalBtn = event.target.closest('.edit-goal-btn');
  if (editGoalBtn) {
    const goalId = Number(editGoalBtn.dataset.goalId);
    const goal = goals.find(g => g.id === goalId);
    if (goal) openGoalModal(goal);
  }
  
  const deleteGoalBtn = event.target.closest('.delete-goal-btn');
  if (deleteGoalBtn) {
    const goalId = Number(deleteGoalBtn.dataset.goalId);
    if (confirm('Are you sure you want to delete this goal?')) {
      goals = goals.filter(g => g.id !== goalId);
      saveGoals();
      updateGoalDisplays();
    }
  }
});

function refreshCategorySelects(preferredSelection = null) {
  const selectConfigs = [
    { element: document.getElementById('categoryInput'), placeholder: document.getElementById('categoryInput')?.dataset.placeholder || 'Select category' },
    { element: document.getElementById('editCategoryInput'), placeholder: 'Select category' },
    { element: document.getElementById('lr_categoryInput'), placeholder: 'Select category' }
  ];
  selectConfigs.forEach(({ element, placeholder }) => {
    if (!element) return;
    const currentValue = preferredSelection || element.value;
    const parentGroup = element.closest('.input-group');
    
    // Wrap select in manage container if not already wrapped
    if (parentGroup && !parentGroup.querySelector('.category-select-with-manage')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'category-select-with-manage';
      element.parentNode.insertBefore(wrapper, element);
      wrapper.appendChild(element);
      
      const manageLink = document.createElement('button');
      manageLink.type = 'button';
      manageLink.className = 'manage-categories-link';
      manageLink.textContent = 'Manage';
      manageLink.addEventListener('click', () => {
        // Open category modal with the select ID so we can populate it after
        openCreateCategoryModal(element.id);
      });
      wrapper.appendChild(manageLink);
    }
    
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
  const lrGoalSelect = document.getElementById('lr_goalAllocationInput');
  const quickGoalSelect = document.getElementById('goalAllocationInput');
  const editGoalSelect = document.getElementById('editGoalAllocationInput');
  [lrGoalSelect, quickGoalSelect, editGoalSelect].forEach(sel => {
    if (sel && !sel.querySelector('option')) {
      const base = document.createElement('option');
      base.value = '';
      base.textContent = 'None';
      sel.appendChild(base);
    }
  });
  updateCategoryFilterOptions(document.getElementById('categoryFilter')?.value || 'all');
  renderCustomCategoryList();
}

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
    if (nameInput) nameInput.focus();
  }
}

function closeCreateCategoryModal() {
  if (createCategoryModal) createCategoryModal.classList.remove('show');
  pendingCategorySelectId = null;
}

if (manageCategoriesBtn) {
  manageCategoriesBtn.addEventListener('click', () => openCreateCategoryModal());
}

if (closeCategoryModalBtn) {
  closeCategoryModalBtn.addEventListener('click', closeCreateCategoryModal);
}

if (createCategoryModal) {
  createCategoryModal.addEventListener('click', event => {
    if (event.target === createCategoryModal) closeCreateCategoryModal();
  });
}

if (saveCategoryBtn) {
  saveCategoryBtn.addEventListener('click', () => {
    const nameInput = document.getElementById('newCategoryName');
    if (!nameInput) return;
    const normalizedName = normalizeCategoryName(nameInput.value);
    const purposeInput = document.getElementById('categoryPurpose');
    const purposeValue = purposeInput?.value.trim() || '';
    if (!normalizedName) {
      alert('Please enter a category name.');
      if (nameInput) nameInput.focus();
      return;
    }
    
    // Check if editing (name input is disabled)
    const isEditing = nameInput.disabled;
    
    if (!isEditing) {
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
    }
    
    categoryMetadata[normalizedName] = { purpose: purposeValue };
    saveCategories();
    saveCategoryMetadata();
    refreshCategorySelects(normalizedName);
    if (pendingCategorySelectId) {
      const targetSelect = document.getElementById(pendingCategorySelectId);
      if (targetSelect) targetSelect.value = normalizedName;
    }
    nameInput.disabled = false;
    closeCreateCategoryModal();
    updateProfileStats(); // Update category count
  });
}

const budgetBreakdownModal = document.getElementById('budgetBreakdownModal');
const closeBreakdownModalBtn = document.getElementById('closeBreakdownModal');
const breakdownCategoryList = document.getElementById('breakdownCategoryList');
const remainingAmountButton = document.getElementById('remainingAmount');

function updateBudgetBreakdownDetails() {
  if (!budgetBreakdownModal) return;
  const totals = computeBudgetTotals();
  const totalEl = document.getElementById('breakdownTotalBudget');
  const remainingEl = document.getElementById('breakdownRemaining');
  const spentEl = document.getElementById('breakdownSpent');
  const allocatedEl = document.getElementById('breakdownAllocated');
  const incomeEl = document.getElementById('breakdownIncome');
  const netEl = document.getElementById('breakdownNet');
  if (totalEl) totalEl.textContent = formatCurrency(budget.total);
  if (remainingEl) remainingEl.textContent = formatCurrency(budget.remaining);
  if (spentEl) spentEl.textContent = formatCurrency(totals.spentExcludingAllocations);
  if (allocatedEl) allocatedEl.textContent = formatCurrency(totals.allocatedToGoals);
  if (incomeEl) incomeEl.textContent = formatCurrency(totals.totalIncome);
  if (netEl) netEl.textContent = formatCurrency(totals.totalIncome - totals.totalExpenses);
  const progressFill = document.getElementById('breakdownProgressFill');
  const progressLabel = document.getElementById('breakdownProgressLabel');
  const utilization = budget.total ? (totals.spentExcludingAllocations / budget.total) * 100 : 0;
  const clamped = Math.min(100, Math.max(0, utilization));
  if (progressFill) progressFill.style.width = `${clamped.toFixed(0)}%`;
  if (progressLabel) progressLabel.textContent = `${clamped.toFixed(0)}% used`;
  if (breakdownCategoryList) {
    breakdownCategoryList.innerHTML = '';
    const recent = (Array.isArray(tx) ? tx : []).slice().reverse().slice(0, 5);
    if (!recent.length) {
      const li = document.createElement('li');
      li.textContent = 'No activity yet.';
      breakdownCategoryList.appendChild(li);
    } else {
      recent.forEach(item => {
        const li = document.createElement('li');
        const amt = Number(item.amt) || 0;
        const typeClass = item.type === 'income' ? 'income' : 'expense';
        li.innerHTML = `<span>${item.cat || 'General'}</span><span class="amount ${typeClass}">$${amt.toFixed(2)}</span>`;
        breakdownCategoryList.appendChild(li);
      });
    }
  }
}

function openBudgetBreakdownModal() {
  updateBudgetBreakdownDetails();
  if (budgetBreakdownModal) budgetBreakdownModal.classList.add('show');
}

function closeBudgetBreakdownModal() {
  if (budgetBreakdownModal) budgetBreakdownModal.classList.remove('show');
}

if (remainingAmountButton) {
  remainingAmountButton.addEventListener('click', openBudgetBreakdownModal);
  remainingAmountButton.addEventListener('keypress', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openBudgetBreakdownModal();
    }
  });
}

if (closeBreakdownModalBtn) {
  closeBreakdownModalBtn.addEventListener('click', closeBudgetBreakdownModal);
}

if (budgetBreakdownModal) {
  budgetBreakdownModal.addEventListener('click', event => {
    if (event.target === budgetBreakdownModal) closeBudgetBreakdownModal();
  });
}

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
    const goalAllocationInput = document.getElementById('goalAllocationInput');
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
      note: noteInput?.value || '',
      date: new Date().toISOString(),
      goalAllocation: goalAllocationInput?.value || ''
    };
    if (!Array.isArray(tx)) tx = [];
    tx.push(transaction);
    if (transaction.goalAllocation) updateGoalProgress(transaction);
    recalcAndSaveBudget();
    amountInput.value = '';
    if (noteInput) noteInput.value = '';
    if (categoryInput.options.length) categoryInput.selectedIndex = 0;
    if (goalAllocationInput) goalAllocationInput.value = '';
    quickAddModal.classList.remove('show');
    updateBudgetDisplays();
    updateGoalDisplays();
    render();
  };
}

function render() {
  recalcAndSaveBudget();
  updateBudgetDisplays();
  const transactionsList = document.getElementById('transactionsList');
  if (transactionsList) {
    transactionsList.innerHTML = '';
    if (!Array.isArray(tx)) return;
    const recentCount = 3; // Show only 3 most recent to minimize scrolling
    tx.slice().reverse().slice(0, recentCount).forEach(t => {
      if (!t || typeof t !== 'object') return;
      const li = document.createElement('li');
      li.className = 'activity-item';
      let dateStr;
      try {
        dateStr = t.date ? new Date(t.date).toLocaleDateString() : '';
      } catch (e) {
        dateStr = '';
      }
      const amt = Number(t.amt) || 0;
      li.innerHTML = `
        <div>
          <div>${t.cat || 'Uncategorized'}</div>
          <div>${t.note || ''}</div>
          <div style="font-size:1rem;color:#374151">${dateStr}</div>
        </div>
        <div class="activity-item-actions">
          <button class="delete-btn" data-delete-id="${t.id}" type="button">Delete</button>
          <div class="amount ${t.type || 'expense'}">$${amt.toFixed(2)}</div>
        </div>
      `;
      transactionsList.appendChild(li);
    });
  }
  const currentFilter = document.getElementById('categoryFilter')?.value || 'all';
  renderDetailedTransactions(currentFilter);
  updateProfileStats();
}

let goals = [];

const goalModal = document.getElementById('goalModal');
const closeGoalModal = document.getElementById('closeGoalModal');
const addGoalBtn = document.getElementById('addGoalBtn');
const saveGoalBtn = document.getElementById('saveGoal');

function saveGoals() {}

function openGoalModal(goal = null) {
  const modalTitle = document.getElementById('goalModalTitle');
  const nameInput = document.getElementById('goalName');
  const amountInput = document.getElementById('goalAmount');
  const deadlineInput = document.getElementById('goalDeadline');
  const categoryInput = document.getElementById('goalCategory');
  const notesInput = document.getElementById('goalNotes');
  const goalIdInput = document.getElementById('editGoalId');
  if (!modalTitle || !nameInput || !amountInput || !deadlineInput || !categoryInput || !notesInput || !goalIdInput) return;
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
  if (goalModal) goalModal.classList.add('show');
}

if (closeGoalModal) {
  closeGoalModal.onclick = () => {
    if (goalModal) goalModal.classList.remove('show');
  };
}

if (addGoalBtn) {
  addGoalBtn.onclick = () => openGoalModal();
}

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

if (saveGoalBtn) {
  saveGoalBtn.onclick = () => {
    const nameInput = document.getElementById('goalName');
    const amountInput = document.getElementById('goalAmount');
    const deadlineInput = document.getElementById('goalDeadline');
    const categoryInput = document.getElementById('goalCategory');
    const notesInput = document.getElementById('goalNotes');
    const goalIdInput = document.getElementById('editGoalId');
    if (!nameInput || !amountInput || !deadlineInput || !categoryInput || !notesInput || !goalIdInput) return;
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
      addGoal(goalData);
    }
    saveGoals();
    updateGoalDisplays();
    if (goalModal) goalModal.classList.remove('show');
  };
}

function updateGoalProgress(transaction) {
  const goalId = parseInt(transaction.goalAllocation);
  if (!goalId) return;
  goals.forEach(g => {
    g.transactions = g.transactions.filter(t => t.id !== transaction.id);
  });
  const goal = goals.find(g => g.id === goalId);
  if (!goal) {
    saveGoals();
    updateGoalDisplays();
    return;
  }
  goal.transactions.push(transaction);
  goal.currentAmount = goal.transactions.reduce((sum, t) => {
    const amt = Number(t.amt) || 0;
    if (t.type === 'expense') return sum - amt;
    if (t.type === 'income') return sum + amt;
    return sum;
  }, 0);
  saveGoals();
  updateGoalDisplays();
}

function updateGoalOptions(selectElement = null) {
  const selects = selectElement
    ? [selectElement]
    : [
        document.getElementById('goalAllocationInput'),
        document.getElementById('editGoalAllocationInput'),
        document.getElementById('lr_goalAllocationInput')
      ];
  selects.forEach(select => {
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">None</option>';
    goals.forEach(goal => {
      const option = document.createElement('option');
      option.value = goal.id;
      const pct = goal.targetAmount ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
      option.textContent = `${goal.name} (${pct.toFixed(1)}%)`;
      select.appendChild(option);
    });
    if (currentValue && [...select.options].some(opt => opt.value === currentValue)) {
      select.value = currentValue;
    }
  });
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
      <p style="margin-top:16px;color:var(--muted);">No goals yet. Tap "Add Goal" above to get started.</p>
    `;
    return;
  }
  const goalsMarkup = goals.map(goal => {
    const pct = goal.targetAmount ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
    const progressClamped = Math.min(Math.max(pct, 0), 100);
    const daysLeft = goal.deadline
      ? `${Math.max(0, Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24)))} days left`
      : '';
    return `
      <div class="goal-item">
        <div class="goal-header">
          <div class="goal-info">
            <div class="goal-name">${goal.name}</div>
            <div class="goal-category">${goal.category}</div>
          </div>
          <div class="goal-actions">
            <button class="edit-goal-btn" data-goal-id="${goal.id}" type="button" title="Edit goal">✎</button>
            <button class="delete-goal-btn" data-goal-id="${goal.id}" type="button" title="Delete goal">×</button>
            ${daysLeft ? `<div class="goal-deadline">${daysLeft}</div>` : ''}
          </div>
        </div>
        <div class="goal-progress-info">
          <div class="goal-amount">${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)}</div>
        </div>
        <div class="goal-progress-bar">
          <div class="goal-progress" style="width:${progressClamped}%;"></div>
        </div>
        <div class="goal-footer">
          <div class="goal-percentage">${pct.toFixed(1)}% Complete</div>
          <div class="goal-stats">
            <div class="goal-stat">
              <span class="goal-stat-value">${formatCurrency(goal.targetAmount - goal.currentAmount)} to go</span>
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
        <div class="summary-icon">$</div>
        <div class="summary-content">
          <div class="summary-label">Total Saved</div>
          <div class="summary-value">${formatCurrency(stats.totalSaved)}</div>
        </div>
      </div>
    </div>
    <div class="goals-list">
      ${goalsMarkup}
    </div>
  `;
}

function updateGoalDisplays() {
  const totalGoals = goals.length;
  const averageProgress = goals.length
    ? goals.reduce((sum, goal) => {
        const pct = goal.targetAmount ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
        return sum + pct;
      }, 0) / goals.length
    : 0;
  const totalSaved = goals.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);
  updateGoalOptions();
  renderProfileGoalsMirror({ totalGoals, averageProgress, totalSaved });
  updateProfileStats();
  renderDashboardGoals();
}

function renderDashboardGoals() {
  const container = document.getElementById('dashboardGoalsList');
  if (!container) return;
  
  if (!goals.length) {
    container.innerHTML = '<p style="color:var(--text);font-size:1.05rem;font-weight:600;text-align:center;padding:16px;">No goals yet. Start planning your financial future!</p>';
    return;
  }
  
  // Show top 2 goals with highest progress
  const topGoals = goals
    .map(goal => ({
      ...goal,
      progress: goal.targetAmount ? (goal.currentAmount / goal.targetAmount) * 100 : 0
    }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 2);
  
  container.innerHTML = topGoals.map(goal => {
    const progressClamped = Math.max(0, Math.min(100, goal.progress));
    return `
      <div class="dashboard-goal-item">
        <div class="dashboard-goal-header">
          <div class="dashboard-goal-name">${goal.name}</div>
          <div class="dashboard-goal-percentage">${goal.progress.toFixed(0)}%</div>
        </div>
        <div class="dashboard-goal-progress-bar">
          <div class="dashboard-goal-progress" style="width:${progressClamped}%;"></div>
        </div>
        <div class="dashboard-goal-footer">
          <span class="dashboard-goal-amount">${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function updateProfileStats() {
  const totalTransactionsEl = document.getElementById('totalTransactionsCount');
  const activeGoalsEl = document.getElementById('activeGoalsCount');
  const categoriesEl = document.getElementById('categoriesCount');
  
  if (totalTransactionsEl) {
    totalTransactionsEl.textContent = Array.isArray(tx) ? tx.length : 0;
  }
  if (activeGoalsEl) {
    activeGoalsEl.textContent = goals.length;
  }
  if (categoriesEl) {
    categoriesEl.textContent = categories.length;
  }
}

function renderDetailedTransactions(filterCategory = 'all') {
  const container = document.querySelector('.transactions-by-category');
  if (!container) return;
  container.innerHTML = '';
  if (!Array.isArray(tx)) return;
  const activeFilter = filterCategory || 'all';
  updateCategoryFilterOptions(activeFilter);
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
      const amt = Number(t.amt) || 0;
      if (t.type === 'expense') categoryTotals[category].expense += amt;
      if (t.type === 'income') categoryTotals[category].income += amt;
    }
  });
  const sortedCategories = Object.keys(groupedTransactions).sort();
  sortedCategories.forEach(category => {
    const categoryGroup = document.createElement('div');
    categoryGroup.className = 'category-group';
    const transactions = groupedTransactions[category];
    const totals = categoryTotals[category];
    const txMarkup = transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(t => {
        let dateStr;
        try {
          dateStr = t.date ? new Date(t.date).toLocaleDateString() : '';
        } catch (e) {
          dateStr = '';
        }
        const amt = Number(t.amt) || 0;
        const typeClass = t.type === 'income' ? 'income' : 'expense';
        return `
          <div class="transaction-item">
            <div class="transaction-details">
              <div class="transaction-note">${t.note || 'No description'}</div>
              <div class="transaction-date">${dateStr}</div>
            </div>
            <button class="edit-transaction-btn" type="button" data-transaction-id="${t.id}">
              <i class="fi fi-rr-edit"></i>
            </button>
            <button class="delete-transaction-btn" type="button" data-delete-id="${t.id}">
              <i class="fi fi-rr-trash"></i>
            </button>
            <div class="amount ${typeClass}">$${amt.toFixed(2)}</div>
          </div>
        `;
      })
      .join('');
    categoryGroup.innerHTML = `
      <div class="category-header">
        <div class="category-name">${category}</div>
        <div class="category-total">
          ${totals.expense > 0 ? `<span class="total-amount expense">$${totals.expense.toFixed(2)}</span>` : ''}
          ${totals.income > 0 ? `<span class="total-amount income">$${totals.income.toFixed(2)}</span>` : ''}
        </div>
      </div>
      <div class="category-transactions">
        ${txMarkup}
      </div>
    `;
    container.appendChild(categoryGroup);
  });
  updateCategoryTotals();
}

function updateCategoryTotals() {
  const totalsContainer = document.getElementById('categoryTotals');
  if (!totalsContainer) return;
  
  const currentFilter = document.getElementById('categoryFilter')?.value || 'all';
  let totalExpense = 0;
  let totalIncome = 0;
  
  (Array.isArray(tx) ? tx : []).forEach(t => {
    if (!t || typeof t !== 'object') return;
    // Only count transactions that match the current filter
    if (currentFilter === 'all' || t.cat === currentFilter) {
      const amt = Number(t.amt) || 0;
      if (t.type === 'expense') totalExpense += amt;
      if (t.type === 'income') totalIncome += amt;
    }
  });
  
  const net = totalIncome - totalExpense;
  const filterText = currentFilter === 'all' ? 'All Categories' : currentFilter;
  
  totalsContainer.innerHTML = `
    <div class="totals-header">Summary - ${filterText}</div>
    <div class="total-row">
      <span class="total-label">Total Expenses:</span>
      <span class="total-amount expense">$${totalExpense.toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span class="total-label">Total Income:</span>
      <span class="total-amount income">$${totalIncome.toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span class="total-label">Net:</span>
      <span class="total-amount ${net >= 0 ? 'income' : 'expense'}">
        $${Math.abs(net).toFixed(2)}
      </span>
    </div>
  `;
}

const editTransactionModal = document.getElementById('editTransactionModal');
const closeEditModal = document.getElementById('closeEditModal');
const updateTransactionBtn = document.getElementById('updateTransaction');

function openEditModal(transaction) {
  if (!editTransactionModal) return;
  const editAmountInput = document.getElementById('editAmountInput');
  const editNoteInput = document.getElementById('editNoteInput');
  const editCategoryInput = document.getElementById('editCategoryInput');
  const editGoalAllocationInput = document.getElementById('editGoalAllocationInput');
  const editTransactionId = document.getElementById('editTransactionId');
  const editTypeInputs = document.getElementsByName('editTxType');
  refreshCategorySelects(transaction.cat);
  if (editAmountInput) editAmountInput.value = transaction.amt;
  if (editNoteInput) editNoteInput.value = transaction.note || '';
  if (editCategoryInput) editCategoryInput.value = transaction.cat || '';
  if (editTransactionId) editTransactionId.value = transaction.id;
  if (editGoalAllocationInput) {
    updateGoalOptions(editGoalAllocationInput);
    editGoalAllocationInput.value = transaction.goalAllocation || '';
  }
  editTypeInputs.forEach(input => {
    input.checked = input.value === transaction.type;
  });
  editTransactionModal.classList.add('show');
}

if (closeEditModal) {
  closeEditModal.onclick = () => {
    editTransactionModal.classList.remove('show');
  };
}

if (updateTransactionBtn) {
  updateTransactionBtn.onclick = () => {
    const editAmountInput = document.getElementById('editAmountInput');
    const editNoteInput = document.getElementById('editNoteInput');
    const editCategoryInput = document.getElementById('editCategoryInput');
    const editTransactionId = document.getElementById('editTransactionId');
    const editTypeInput = document.querySelector('input[name="editTxType"]:checked');
    const editGoalAllocationInput = document.getElementById('editGoalAllocationInput');
    if (!editAmountInput || !editCategoryInput || !editTransactionId || !editTypeInput) return;
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
      note: editNoteInput?.value || '',
      goalAllocation: editGoalAllocationInput?.value || ''
    };
    tx[transactionIndex] = newTransaction;
    recalcAndSaveBudget();
    if (newTransaction.goalAllocation) updateGoalProgress(newTransaction);
    editTransactionModal.classList.remove('show');
    updateBudgetDisplays();
    render();
  };
}

document.addEventListener('click', event => {
  const editBtn = event.target.closest('.edit-transaction-btn');
  if (!editBtn) return;
  const id = Number(editBtn.dataset.transactionId);
  if (!id) return;
  const transaction = tx.find(t => t.id === id);
  if (transaction) openEditModal(transaction);
});

const viewAllTransactionsBtn = document.getElementById('viewAllTransactions');
if (viewAllTransactionsBtn) {
  viewAllTransactionsBtn.addEventListener('click', () => {
    const transactionsTab = document.getElementById('tab-lr');
    if (transactionsTab) transactionsTab.click();
  });
}

const viewAllGoalsBtn = document.getElementById('viewAllGoals');
if (viewAllGoalsBtn) {
  viewAllGoalsBtn.addEventListener('click', () => {
    const personalizeTab = document.getElementById('tab-personalize');
    if (personalizeTab) personalizeTab.click();
  });
}

document.addEventListener('click', event => {
  const pill = event.target.closest('.custom-category-pill button');
  if (pill) {
    const categoryName = pill.dataset.category;
    if (confirm(`Delete category "${categoryName}"? This cannot be undone.`)) {
      categories = categories.filter(c => c !== categoryName);
      delete categoryMetadata[categoryName];
      saveCategories();
      saveCategoryMetadata();
      refreshCategorySelects();
    }
  }
});

document.addEventListener('click', event => {
  const deleteBtn = event.target.closest('.delete-btn, .delete-transaction-btn');
  if (!deleteBtn) return;
  const id = Number(deleteBtn.dataset.deleteId);
  if (!id) return;
  if (confirm('Are you sure you want to delete this transaction?')) {
    tx = tx.filter(t => t.id !== id);
    recalcAndSaveBudget();
    updateBudgetDisplays();
    render();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const categoryFilter = document.getElementById('categoryFilter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', e => {
      renderDetailedTransactions(e.target.value);
    });
  }
});

const lrSaveBtn = document.getElementById('lr_saveTransaction');
const lrCancelBtn = document.getElementById('lr_cancel');
const addTransactionBtn = document.getElementById('addTransactionBtn');

if (addTransactionBtn) {
  addTransactionBtn.addEventListener('click', () => {
    const lrForm = document.getElementById('lr_add_form');
    if (lrForm) {
      lrForm.style.display = lrForm.style.display === 'none' ? 'block' : 'none';
    }
  });
}

if (lrSaveBtn) {
  lrSaveBtn.addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('lr_amountInput')?.value || 0);
    const category = document.getElementById('lr_categoryInput')?.value;
    const note = document.getElementById('lr_noteInput')?.value || '';
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
      note,
      date: new Date().toISOString(),
      goalAllocation
    };
    if (!Array.isArray(tx)) tx = [];
    tx.push(transaction);
    if (transaction.goalAllocation) updateGoalProgress(transaction);
    recalcAndSaveBudget();
    const lrCategorySelect = document.getElementById('lr_categoryInput');
    if (lrCategorySelect && lrCategorySelect.options.length) {
      lrCategorySelect.selectedIndex = 0;
    }
    const lrForm = document.getElementById('lr_add_form');
    if (lrForm) lrForm.style.display = 'none';
    updateBudgetDisplays();
    updateGoalDisplays();
    render();
  });
}

if (lrCancelBtn) {
  lrCancelBtn.addEventListener('click', () => {
    const lrForm = document.getElementById('lr_add_form');
    if (lrForm) lrForm.style.display = 'none';
  });
}

function initGraphSwitcher() {
  const prevBtn = document.getElementById('prevTrend');
  const nextBtn = document.getElementById('nextTrend');
  const titleEl = document.getElementById('currentTrendTitle');
  const graphs = document.querySelectorAll('.graph');
  
  if (!prevBtn || !nextBtn || !graphs.length) return;
  
  const trendData = [
    { id: 'spendingByCategory', title: 'Monthly Spending by Category' },
    { id: 'budgetVsActual', title: 'Budget vs Actual Spending' },
    { id: 'incomeTrends', title: 'Income vs Expenses Over Time' },
    { id: 'spendingBreakdown', title: 'Spending Breakdown' },
    { id: 'goalProgress', title: 'Financial Goals Progress' }
  ];
  
  let currentIndex = 0;
  
  function showGraph(index) {
    graphs.forEach(img => img.classList.remove('active-graph'));
    const currentGraph = document.getElementById(trendData[index].id);
    if (currentGraph) currentGraph.classList.add('active-graph');
    if (titleEl) titleEl.textContent = trendData[index].title;
  }
  
  prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + trendData.length) % trendData.length;
    showGraph(currentIndex);
  });
  
  nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % trendData.length;
    showGraph(currentIndex);
  });
  
  // Show first graph
  showGraph(0);
}

const reminderNameInput = document.getElementById('reminderName');
const reminderAmountInput = document.getElementById('reminderAmount');
const reminderDueDateInput = document.getElementById('reminderDueDate');
const reminderRecurringInput = document.getElementById('reminderRecurring');
const reminderList = document.getElementById('reminderList');

const today = new Date();
const defaultDue = new Date(today.getFullYear(), today.getMonth(), 15);
const defaultDueIso = defaultDue.toISOString().split('T')[0];

let reminders = [];

function setReminderFormDefaults() {
  if (!reminderNameInput || !reminderAmountInput || !reminderDueDateInput) return;
  reminderNameInput.value = '';
  reminderAmountInput.value = '';
  reminderDueDateInput.value = defaultDueIso;
  if (reminderRecurringInput) reminderRecurringInput.checked = false;
}

function renderReminders() {
  if (!reminderList) return;
  reminderList.innerHTML = '';
  if (!reminders.length) {
    const row = document.createElement('div');
    row.className = 'reminder-item';
    row.innerHTML = `
      <div class="reminder-info">
        <div class="reminder-name">No reminders yet</div>
        <div class="reminder-meta">Add one using the form above.</div>
      </div>
    `;
    reminderList.appendChild(row);
    return;
  }
  reminders.forEach(reminder => {
    const row = document.createElement('div');
    row.className = 'reminder-item';
    const dueText = reminder.dueDate ? new Date(reminder.dueDate).toLocaleDateString() : '—';
    const recurringText = reminder.recurring ? `Monthly on ${new Date(reminder.dueDate).getDate()}${getDaySuffix(new Date(reminder.dueDate).getDate())}` : 'One-time';
    row.innerHTML = `
      <div class="reminder-info">
        <div class="reminder-name">${reminder.name}</div>
        <div class="reminder-meta">$${Number(reminder.amount).toFixed(2)} • Due ${dueText} • ${recurringText}</div>
      </div>
      <div class="reminder-actions">
        <button class="reminder-edit-btn" data-reminder-id="${reminder.id}" type="button">Edit</button>
        <button class="reminder-delete-btn" data-reminder-id="${reminder.id}" type="button">Delete</button>
      </div>
    `;
    reminderList.appendChild(row);
  });
}

function getDaySuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function addReminder() {
  if (!reminderNameInput || !reminderAmountInput || !reminderDueDateInput) return;
  const name = reminderNameInput.value.trim();
  const amount = parseFloat(reminderAmountInput.value || '0');
  const dueDate = reminderDueDateInput.value;
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
  setReminderFormDefaults();
  renderReminders();
}

document.addEventListener('click', event => {
  const editBtn = event.target.closest('.reminder-edit-btn');
  if (editBtn) {
    const id = Number(editBtn.dataset.reminderId);
    const reminder = reminders.find(r => r.id === id);
    if (reminder && reminderNameInput && reminderAmountInput && reminderDueDateInput) {
      reminderNameInput.value = reminder.name;
      reminderAmountInput.value = reminder.amount;
      reminderDueDateInput.value = reminder.dueDate;
      if (reminderRecurringInput) reminderRecurringInput.checked = reminder.recurring;
      reminders = reminders.filter(r => r.id !== id);
      renderReminders();
      reminderNameInput.focus();
    }
  }
  
  const deleteBtn = event.target.closest('.reminder-delete-btn');
  if (deleteBtn) {
    const id = Number(deleteBtn.dataset.reminderId);
    if (confirm('Are you sure you want to delete this reminder?')) {
      reminders = reminders.filter(r => r.id !== id);
      renderReminders();
    }
  }
});

refreshCategorySelects();
render();
updateBudgetDisplays();
updateGoalDisplays();
setReminderFormDefaults();
renderReminders();
initGraphSwitcher();
