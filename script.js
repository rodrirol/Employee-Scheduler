// Check authentication
function checkAuth() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'index.html';
        return null;
    }
    return JSON.parse(currentUser);
}

// Initialize storage structure
function initializeLocalStorage() {
    if (!localStorage.getItem('stores')) {
        localStorage.setItem('stores', JSON.stringify([{
            id: 'vanderbilt',
            code: 'VAND001',
            name: 'Vanderbilt Beach Rd',
            address: '2367 Vanderbilt Beach Rd, Naples, FL 34109',
            employees: []
        }]));
    }
}

// Global variables
let currentUser = checkAuth();

// Time slots configuration
const timeSlots = [];
for (let hour = 9; hour <= 21; hour++) {
    if (hour === 9) {
        timeSlots.push('9:30 AM');
    } else {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour;
        timeSlots.push(`${displayHour}:00 ${period}`);
        timeSlots.push(`${displayHour}:30 ${period}`);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeLocalStorage();
    initializeApp();
    setupEventListeners();
    loadStores();
    document.getElementById('saveEditEmployee').addEventListener('click', handleSaveEditEmployee);
    document.getElementById('cancelEditEmployee').addEventListener('click', handleCancelEditEmployee);
});

function initializeApp() {
    document.body.classList.add(`user-${currentUser.role}`);
    document.getElementById('userRole').textContent = currentUser.username;
}

function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('addStore').addEventListener('click', showAddStoreModal);
    document.getElementById('deleteStore').addEventListener('click', handleDeleteStore);
    document.getElementById('addEmployee').addEventListener('click', handleAddEmployee);
    document.getElementById('saveStore').addEventListener('click', handleSaveStore);
    document.getElementById('prevWeek').addEventListener('click', () => changeWeek(-1));
    document.getElementById('nextWeek').addEventListener('click', () => changeWeek(1));
    document.getElementById('storeSelect').addEventListener('change', loadCurrentStoreSchedule);
    document.getElementById('printSchedule').addEventListener('click', preparePrintView);
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function loadStores() {
    const stores = JSON.parse(localStorage.getItem('stores'));
    const storeSelect = document.getElementById('storeSelect');
    storeSelect.innerHTML = '';
    
    stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store.id;
        option.textContent = `${store.name} (${store.code})`;
        storeSelect.appendChild(option);
    });

    loadCurrentStoreSchedule();
}

function loadCurrentStoreSchedule() {
    const storeId = document.getElementById('storeSelect').value;
    const stores = JSON.parse(localStorage.getItem('stores'));
    const store = stores.find(s => s.id === storeId);
    
    if (store) {
        document.getElementById('storeName').textContent = store.name;
        document.getElementById('storeAddress').textContent = store.address;
        document.getElementById('storeCode').textContent = `Store Code: ${store.code}`;
        
        const scheduleBody = document.getElementById('scheduleBody');
        scheduleBody.innerHTML = '';
        
        store.employees.forEach(employee => {
            addEmployeeRow(employee);
        });

        document.querySelectorAll('.schedule-row').forEach(row => {
            setupEmployeeActionListeners(row);
        });

        updateTotalHours();
    }
}

function handleAddEmployee() {
    const employeeName = document.getElementById('employeeName').value.trim();
    const employeeType = document.getElementById('employeeTypeSelect').value;
    
    if (!employeeName) {
        alert('Please enter employee name');
        return;
    }

    const employee = {
        id: Date.now().toString(),
        name: `${employeeName} (${employeeType})`,
        type: employeeType,
        schedule: Array(7).fill().map(() => ({
            startTime: '9:30 AM',
            endTime: '9:30 AM',
            dayOff: false
        }))
    };

    const storeId = document.getElementById('storeSelect').value;
    const stores = JSON.parse(localStorage.getItem('stores'));
    const storeIndex = stores.findIndex(s => s.id === storeId);
    
    stores[storeIndex].employees.push(employee);
    localStorage.setItem('stores', JSON.stringify(stores));
    
    addEmployeeRow(employee);
    document.getElementById('employeeName').value = '';
    updateTotalHours();
}

function createTimeSelectHTML(schedule) {
    return `
        <div class="schedule-cell">
            <select class="form-select time-select start-time" ${schedule.dayOff ? 'disabled' : ''}>
                ${timeSlots.map(time => 
                    `<option value="${time}" ${schedule.startTime === time ? 'selected' : ''}>${time}</option>`
                ).join('')}
            </select>
            <select class="form-select time-select end-time" ${schedule.dayOff ? 'disabled' : ''}>
                ${timeSlots.map(time => 
                    `<option value="${time}" ${schedule.endTime === time ? 'selected' : ''}>${time}</option>`
                ).join('')}
            </select>
            <div class="day-off-container">
                <div class="form-check">
                    <input class="form-check-input day-off" type="checkbox" ${schedule.dayOff ? 'checked' : ''}>
                    <label class="form-check-label">Day Off</label>
                </div>
            </div>
        </div>
    `;
}

function addEmployeeRow(employee) {
    const scheduleBody = document.getElementById('scheduleBody');
    const row = document.createElement('tr');
    row.classList.add('schedule-row');
    row.dataset.employeeId = employee.id;

    // Employee name cell
    const nameCell = document.createElement('td');
    nameCell.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <span class="employee-name">${employee.name}</span>
            <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary edit-employee" title="Edit Employee">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-outline-danger delete-employee" title="Delete Employee">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    row.appendChild(nameCell);

    // Days of the week
    employee.schedule.forEach((daySchedule, index) => {
        const cell = document.createElement('td');
        cell.innerHTML = createTimeSelectHTML(daySchedule);
        row.appendChild(cell);
    });

    // Total time cell
    const totalCell = document.createElement('td');
    totalCell.classList.add('total-time');
    totalCell.textContent = '0.00';
    row.appendChild(totalCell);

    scheduleBody.appendChild(row);
    setupTimeSelectListeners(row);
    setupEmployeeActionListeners(row);
    calculateEmployeeHours(row);
}

function setupTimeSelectListeners(row) {
    const timeSelects = row.querySelectorAll('.time-select');
    const dayOffCheckboxes = row.querySelectorAll('.day-off');

    timeSelects.forEach(select => {
        select.addEventListener('change', () => {
            calculateEmployeeHours(row);
            saveScheduleChanges(row);
        });
    });

    dayOffCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const cell = e.target.closest('td');
            const selects = cell.querySelectorAll('.time-select');
            selects.forEach(select => {
                select.disabled = e.target.checked;
            });
            calculateEmployeeHours(row);
            saveScheduleChanges(row);
        });
    });
}

function calculateEmployeeHours(row) {
    let totalHours = 0;
    const cells = row.querySelectorAll('td');
    
    // Skip first (name) and last (total) cells
    for (let i = 1; i < cells.length - 1; i++) {
        const cell = cells[i];
        const dayOff = cell.querySelector('.day-off').checked;
        
        if (!dayOff) {
            const startTime = cell.querySelector('.start-time').value;
            const endTime = cell.querySelector('.end-time').value;
            totalHours += calculateHoursBetween(startTime, endTime);
        }
    }

    row.querySelector('.total-time').textContent = totalHours.toFixed(2);
    updateTotalHours();
}

function calculateHoursBetween(startTime, endTime) {
    const startIndex = timeSlots.indexOf(startTime);
    const endIndex = timeSlots.indexOf(endTime);
    return Math.max(0, (endIndex - startIndex) * 0.5); // Each slot is 30 minutes
}

function updateTotalHours() {
    const rows = document.querySelectorAll('.schedule-row');
    let total = 0;

    rows.forEach(row => {
        total += parseFloat(row.querySelector('.total-time').textContent) || 0;
    });

    document.getElementById('totalHours').textContent = total.toFixed(2);
}

function saveScheduleChanges(row) {
    const employeeId = row.dataset.employeeId;
    const storeId = document.getElementById('storeSelect').value;
    const stores = JSON.parse(localStorage.getItem('stores'));
    const storeIndex = stores.findIndex(s => s.id === storeId);
    const employeeIndex = stores[storeIndex].employees.findIndex(e => e.id === employeeId);

    if (employeeIndex !== -1) {
        const schedule = Array.from(row.querySelectorAll('td')).slice(1, -1).map(cell => ({
            startTime: cell.querySelector('.start-time').value,
            endTime: cell.querySelector('.end-time').value,
            dayOff: cell.querySelector('.day-off').checked
        }));

        stores[storeIndex].employees[employeeIndex].schedule = schedule;
        localStorage.setItem('stores', JSON.stringify(stores));
    }
}

function showAddStoreModal() {
    const modal = new bootstrap.Modal(document.getElementById('addStoreModal'));
    modal.show();
}

function handleSaveStore() {
    const storeCode = document.getElementById('newStoreCode').value.trim();
    const name = document.getElementById('newStoreName').value.trim();
    const address = document.getElementById('newStoreAddress').value.trim();

    if (!isValidStoreCode(storeCode)) {
        alert('Store Code must be 3-10 alphanumeric characters.');
        return;
    }

    if (name && address) {
        const stores = JSON.parse(localStorage.getItem('stores'));

        // Check if the store code already exists
        const isDuplicateCode = stores.some(store => store.code === storeCode);
        if (isDuplicateCode) {
            alert('Store Code already exists. Please use a unique code.');
            return;
        }

        const newStore = {
            id: name.toLowerCase().replace(/\s+/g, '-'),
            code: storeCode,
            name: name,
            address: address,
            employees: []
        };

        stores.push(newStore);
        localStorage.setItem('stores', JSON.stringify(stores));
        loadStores();

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('addStoreModal')).hide();
        
        // Clear form
        document.getElementById('addStoreForm').reset();
    } else {
        alert('Please fill in all store details');
    }
}

function handleDeleteStore() {
    if (currentUser.role !== 'superadmin') {
        alert('Only super admins can delete stores');
        return;
    }

    const storeId = document.getElementById('storeSelect').value;
    const stores = JSON.parse(localStorage.getItem('stores'));

    if (stores.length === 1) {
        alert('Cannot delete the last store');
        return;
    }

    if (confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
        const updatedStores = stores.filter(s => s.id !== storeId);
        localStorage.setItem('stores', JSON.stringify(updatedStores));
        loadStores();
    }
}

function changeWeek(offset) {
    const weekRange = document.getElementById('weekRange');
    const currentDate = getDateFromWeekRange(weekRange.textContent);
    currentDate.setDate(currentDate.getDate() + (offset * 7));
    
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    weekRange.textContent = `Week: ${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
}

function getDateFromWeekRange(weekText) {
    // Extract the first date from the week range text
    const dateStr = weekText.split('-')[0].replace('Week:', '').trim();
    return new Date(dateStr);
}

function formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Handle store selection change
document.getElementById('storeSelect').addEventListener('change', function() {
    loadCurrentStoreSchedule();
});

// Handle window load to check authentication
window.addEventListener('load', function() {
    if (!checkAuth()) {
        return;
    }
    
    addPrintStyles();

    // Set initial week range if not already set
    const weekRange = document.getElementById('weekRange');
    if (weekRange.textContent.includes('Week:')) {
        return;
    }
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    weekRange.textContent = `Week: ${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
});

// Export functionality if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeLocalStorage,
        checkAuth,
        calculateHoursBetween,
        formatDate
    };
}

/*******************************
Functions to print the schedule
********************************/ 
function preparePrintView() {
    // Add this to the existing event listeners setup
    const storeId = document.getElementById('storeSelect').value;
    const stores = JSON.parse(localStorage.getItem('stores'));
    const store = stores.find(s => s.id === storeId);
    
    // Create print-friendly time displays
    document.querySelectorAll('.schedule-row').forEach(row => {
        row.querySelectorAll('.schedule-cell').forEach(cell => {
            const startSelect = cell.querySelector('.start-time');
            const endSelect = cell.querySelector('.end-time');
            const dayOff = cell.querySelector('.day-off').checked;
            
            // Create or update print-time element
            let printTime = cell.querySelector('.print-time');
            if (!printTime) {
                printTime = document.createElement('div');
                printTime.className = 'print-time';
                cell.appendChild(printTime);
            }
            
            if (dayOff) {
                printTime.textContent = 'Day Off';
            } else {
                printTime.textContent = `${startSelect.value} - ${endSelect.value}`;
            }
        });
    });

    // Create print header
    const printHeader = document.createElement('div');
    printHeader.className = 'print-header d-none';
    printHeader.innerHTML = `
        <h2>${store.name} - Schedule</h2>
        <p>${store.address}</p>
        <p>${document.getElementById('weekRange').textContent}</p>
        <hr>
    `;

    // Add print header
    const tableContainer = document.querySelector('.table-responsive');
    tableContainer.parentNode.insertBefore(printHeader, tableContainer);

    // Print the schedule
    window.print();

    // Remove print header after printing
    setTimeout(() => {
        printHeader.remove();
    }, 1000);
}

// Add this function to the window load event
function addPrintStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @page {
            size: landscape;
            margin: 0.5in;
        }
    `;
    document.head.appendChild(style);
}

/**********************************************************
Functions to handle edit and delete buttons for employees
***********************************************************/ 

// Set up listeners for edit and delete buttons
function setupEmployeeActionListeners(row) {
    const editBtn = row.querySelector('.edit-employee');
    const deleteBtn = row.querySelector('.delete-employee');

    editBtn.addEventListener('click', () => handleEditEmployee(row));
    deleteBtn.addEventListener('click', () => handleDeleteEmployee(row));
}

// Handle employee deletion
function handleDeleteEmployee(row) {
    const employeeId = row.dataset.employeeId;
    const employeeName = row.querySelector('.employee-name').textContent;

    if (confirm(`Are you sure you want to delete ${employeeName}?`)) {
        const storeId = document.getElementById('storeSelect').value;
        const stores = JSON.parse(localStorage.getItem('stores'));
        const storeIndex = stores.findIndex(s => s.id === storeId);
        
        stores[storeIndex].employees = stores[storeIndex].employees.filter(
            emp => emp.id !== employeeId
        );
        
        localStorage.setItem('stores', JSON.stringify(stores));
        row.remove();
        updateTotalHours();
    }
}

// Handle employee editing
function handleEditEmployee(row) {
    const employeeId = row.dataset.employeeId;
    const currentName = row.querySelector('.employee-name').textContent;
    // The following two lines are to extract the employee type from the name
    const currentType = currentName.match(/\((.*?)\)/)[1];
    const nameWithoutType = currentName.replace(/ \(.*?\)$/, '');

    // Fill the modal with current values
    document.getElementById('editEmployeeName').value = nameWithoutType;
    document.getElementById('editEmployeeType').value = currentType;
    
    // Store the employee ID in the modal for reference
    document.getElementById('editEmployeeModal').dataset.employeeId = employeeId;
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('editEmployeeModal'));
    modal.show();
}

// Handle saving edited employee
function handleSaveEditEmployee() {
    const modal = document.getElementById('editEmployeeModal');
    const employeeId = modal.dataset.employeeId;
    const newName = document.getElementById('editEmployeeName').value.trim();
    const newType = document.getElementById('editEmployeeType').value;

    if (newName) {
        const storeId = document.getElementById('storeSelect').value;
        const stores = JSON.parse(localStorage.getItem('stores'));
        const storeIndex = stores.findIndex(s => s.id === storeId);
        const employeeIndex = stores[storeIndex].employees.findIndex(
            emp => emp.id === employeeId
        );

        // Update the employee data
        stores[storeIndex].employees[employeeIndex].name = `${newName} (${newType})`;
        stores[storeIndex].employees[employeeIndex].type = newType;
        
        // Save to localStorage
        localStorage.setItem('stores', JSON.stringify(stores));

        // Update the UI
        const row = document.querySelector(`tr[data-employee-id="${employeeId}"]`);
        row.querySelector('.employee-name').textContent = `${newName} (${newType})`;

        // Close the modal
        bootstrap.Modal.getInstance(modal).hide();

        // Remove modal backdrop and reset modal state to return focus to the main page
        document.querySelector('.modal-backdrop')?.remove(); // Remove modal backdrop if it exists
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('padding-right');
    }
}

// Handle canceling the edit employee modal
function handleCancelEditEmployee() {
    const modal = document.getElementById('editEmployeeModal');
    bootstrap.Modal.getInstance(modal).hide();
    // Remove modal backdrop and reset modal state to return focus to the main page
    document.querySelector('.modal-backdrop')?.remove(); // Remove modal backdrop if it exists
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('padding-right');
}

function isValidStoreCode(code) {
    // Example: Allow only upper case alphanumeric characters and a length of 3-10
    const regex = /^[A-Z0-9]{3,10}$/;
    return regex.test(code);
}