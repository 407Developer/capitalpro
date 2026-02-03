// // 1. CONFIGURATION
// const SUPABASE_URL = 'https://ihajeblunhqibmjkwmhf.supabase.co';
// const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYWplYmx1bmhxaWJtamt3bWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTg1NjEsImV4cCI6MjA4NTY5NDU2MX0.S8FrmoafAgfwlbYCbn41mpaySuNVLpfTw49cD1xH6nA';

// let db;
// if (window.supabase) {
//   db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
//   console.log("Capital Pro Connected");
// }

// let inventory = [];
// let sales = [];

// // --- INITIALIZE ---
// document.addEventListener('DOMContentLoaded', () => {
//   fetchInventory();
//   fetchSales();
// });

// async function fetchInventory() {
//   const { data, error } = await db.from('inventory').select('*').order('item_name', { ascending: true });
//   if (!error) {
//     inventory = data || [];
//     renderInventoryDropdown();
//     updateDashboard();
//   }
// }

// async function fetchSales() {
//   const { data, error } = await db.from('sales').select('*').order('created_at', { ascending: false });
//   if (!error) {
//     sales = data || [];
//     renderSalesCards();
//     updateDashboard();
//   }
// }

// // --- UI LOGIC ---
// function renderInventoryDropdown() {
//   const itemInput = document.getElementById('itemName');
//   if (!itemInput) return;

//   let datalist = document.getElementById('inventory-list');
//   if (!datalist) {
//     datalist = document.createElement('datalist');
//     datalist.id = 'inventory-list';
//     itemInput.setAttribute('list', 'inventory-list');
//     itemInput.parentNode.appendChild(datalist);
//   }

//   datalist.innerHTML = inventory.map(item => `<option value="${item.item_name}">`).join('');

//   itemInput.addEventListener('input', function () {
//     const val = itemInput.value.trim();
//     const found = inventory.find(i => i.item_name.toLowerCase() === val.toLowerCase());
//     let addBtn = document.getElementById('add-new-item-btn');

//     // Auto-fill cost price if item exists
//     if (found) {
//       document.getElementById('costPrice').value = found.cost_price;
//       if (addBtn) addBtn.remove();
//     } else if (val) {
//       if (!addBtn) {
//         addBtn = document.createElement('button');
//         addBtn.id = 'add-new-item-btn';
//         addBtn.type = 'button';
//         addBtn.className = 'btn btn-secondary';
//         addBtn.style.marginTop = '5px';
//         addBtn.textContent = '+ Add New to Inventory';
//         addBtn.onclick = () => showAddItemModal(val);
//         itemInput.parentNode.appendChild(addBtn);
//       }
//     }
//   });
// }

// // THE MISSING FUNCTION
// window.showAddItemModal = function (initialName) {
//   const modal = document.createElement('div');
//   modal.id = 'custom-modal';
//   modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:1000;";
//   modal.innerHTML = `
//             <div style="background:white; padding:20px; border-radius:10px; width:90%; max-width:400px;">
//                 <h3>Add to Permanent Inventory</h3>
//                 <label>Item Name</label>
//                 <input type="text" id="m-name" value="${initialName}" style="width:100%; margin-bottom:10px;">
//                 <label>Cost Price (₦)</label>
//                 <input type="number" id="m-cost" style="width:100%; margin-bottom:10px;">
//                 <label>Initial Stock Qty</label>
//                 <input type="number" id="m-qty" value="1" style="width:100%; margin-bottom:20px;">
//                 <button onclick="saveNewInventoryItem()" style="background:#28a745; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer;">Save to Inventory</button>
//                 <button onclick="document.getElementById('custom-modal').remove()" style="background:#ccc; border:none; padding:10px; border-radius:5px; margin-left:10px;">Cancel</button>
//             </div>
//         `;
//   document.body.appendChild(modal);
// };

// window.saveNewInventoryItem = async function () {
//   const name = document.getElementById('m-name').value;
//   const cost = document.getElementById('m-cost').value;
//   const qty = document.getElementById('m-qty').value;

//   const { error } = await db.from('inventory').insert([{ item_name: name, cost_price: cost, stock_qty: qty }]);

//   if (!error) {
//     document.getElementById('custom-modal').remove();
//     await fetchInventory();
//     document.getElementById('itemName').value = name;
//     document.getElementById('costPrice').value = cost;
//   } else {
//     alert("Error: " + error.message);
//   }
// };

// // --- CORE ACTIONS ---
// window.addSale = async function () {
//   const name = document.getElementById('itemName').value;
//   const qty = parseInt(document.getElementById('qty').value);
//   const sell = parseFloat(document.getElementById('sellPrice').value);
//   const cost = parseFloat(document.getElementById('costPrice').value);

//   if (!name || !qty || !sell) return alert("Fill all fields");

//   const profit = (sell - cost) * qty;

//   const { error } = await db.from('sales').insert([{
//     item_name: name,
//     sale_price: sell,
//     quantity: qty,
//     profit: profit,
//     source: 'Manual'
//   }]);

//   if (!error) {
//     // Update stock
//     const invItem = inventory.find(i => i.item_name.toLowerCase() === name.toLowerCase());
//     if (invItem) {
//       await db.from('inventory').update({ stock_qty: invItem.stock_qty - qty }).eq('id', invItem.id);
//     }

//     // Clear and Refresh
//     document.getElementById('itemName').value = '';
//     document.getElementById('qty').value = '';
//     document.getElementById('sellPrice').value = '';
//     fetchSales();
//     fetchInventory();
//   }
// };

// function updateDashboard() {
//   const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);
//   const shopCap = inventory.reduce((sum, i) => sum + (i.cost_price * i.stock_qty), 0);

//   document.getElementById('profit').textContent = `₦${totalProfit.toLocaleString()}`;
//   document.getElementById('capital').textContent = `₦${shopCap.toLocaleString()}`;
// }

// function renderSalesCards() {
//   const container = document.getElementById("salesContainer");
//   container.innerHTML = sales.map(sale => `
//             <div class="sale-card">
//                 <h3>${sale.item_name}</h3>
//                 <p>Total Revenue: ₦${(sale.quantity * sale.sale_price).toLocaleString()}</p>
//                 <p>Qty: ${sale.quantity} | Profit: ₦${sale.profit.toLocaleString()}</p>
//                 <small>${new Date(sale.created_at).toLocaleDateString()}</small>
//             </div>
//         `).join('') || '<div class="empty-state">No sales recorded.</div>';
// }






const SUPABASE_URL = 'https://ihajeblunhqibmjkwmhf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYWplYmx1bmhxaWJtamt3bWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTg1NjEsImV4cCI6MjA4NTY5NDU2MX0.S8FrmoafAgfwlbYCbn41mpaySuNVLpfTw49cD1xH6nA';

let db;
if (window.supabase) {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let inventory = [];
let sales = [];
let currentFilter = 'all'; 
let myChart;

document.addEventListener('DOMContentLoaded', () => {
    setupFilterUI();
    fetchInventory();
    fetchSales();
});

// --- 1. FILTER UI ---
function setupFilterUI() {
    const summarySection = document.querySelector('.summary-section');
    const filterHTML = `
        <div class="filter-menu" style="margin-bottom: 15px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button onclick="setFilter('day')" class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;">Today</button>
            <button onclick="setFilter('month')" class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;">This Month</button>
            <button onclick="setFilter('all')" class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;">Lifetime</button>
            <select id="analytics-extra" onchange="showExtraTool(this.value)" style="border-radius:5px; border:1px solid #ccc; padding: 5px;">
                <option value="">Tools...</option>
                <option value="valuation">Inventory Valuation</option>
                <option value="margins">Profit Margins</option>
            </select>
        </div>
    `;
    summarySection.insertAdjacentHTML('afterbegin', filterHTML);
}

window.setFilter = (type) => {
    currentFilter = type;
    renderSalesCards();
    updateDashboard();
};

// --- 2. DATA FETCHING ---
async function fetchInventory() {
    const { data, error } = await db.from('inventory').select('*');
    if (!error) {
        inventory = data || [];
        updateDashboard();
    }
}

async function fetchSales() {
    const { data, error } = await db.from('sales').select('*').order('created_at', { ascending: false });
    if (!error) {
        sales = data || [];
        renderSalesCards();
        updateDashboard();
        updateChart(); // This draws the chart once data is ready
    }
}

// --- 3. LOGIC & DASHBOARD ---
function getFilteredSales() {
    const now = new Date();
    return sales.filter(sale => {
        const saleDate = new Date(sale.created_at);
        if (currentFilter === 'day') {
            return saleDate.toDateString() === now.toDateString();
        } else if (currentFilter === 'month') {
            return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
        }
        return true; 
    });
}

function updateDashboard() {
    const filtered = getFilteredSales();
    const totalProfit = filtered.reduce((sum, s) => sum + (s.profit || 0), 0);
    const shopCap = inventory.reduce((sum, i) => sum + (i.cost_price * i.stock_qty), 0);
    const externalCap = shopCap * 0.2; 

    document.getElementById('profit').textContent = `₦${totalProfit.toLocaleString()}`;
    document.getElementById('capital').textContent = `₦${shopCap.toLocaleString()}`;
    document.getElementById('externalCapital').textContent = `₦${externalCap.toLocaleString()}`;

    const header = document.querySelector('.summary-section h2');
    if (header) header.textContent = `Summary (${currentFilter.toUpperCase()})`;
}

function renderSalesCards() {
    const container = document.getElementById("salesContainer");
    const filtered = getFilteredSales();
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">No sales for this period.</div>';
        return;
    }

    container.innerHTML = filtered.map(sale => {
        const dateObj = new Date(sale.created_at);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
            <div class="sale-card" style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 8px;">
                <small style="color: #666;">${formattedDate}</small>
                <h3 style="margin: 5px 0;">${sale.item_name}</h3>
                <p style="margin: 0;">Qty: ${sale.quantity} | Profit: <b>₦${sale.profit.toLocaleString()}</b></p>
            </div>
        `;
    }).join('');
}

// --- 4. CHARTING ---
function updateChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toDateString();
    }).reverse();

    const dailyProfit = last7Days.map(date => {
        return sales
            .filter(s => new Date(s.created_at).toDateString() === date)
            .reduce((sum, s) => sum + s.profit, 0);
    });

    if (myChart) myChart.destroy();

    // Ensure Chart.js is loaded
    if (window.Chart) {
        myChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: last7Days.map(d => d.split(' ').slice(1, 3).join(' ')),
                datasets: [{
                    label: 'Daily Profit (₦)',
                    data: dailyProfit,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true }
        });
    }
}

// --- 5. ADD SALE FUNCTION ---
async function addSale() {
    const name = document.getElementById('itemName').value;
    const qty = parseInt(document.getElementById('qty').value);
    const cost = parseFloat(document.getElementById('costPrice').value);
    const sell = parseFloat(document.getElementById('sellPrice').value);
    const profit = (sell - cost) * qty;

    const { error } = await db.from('sales').insert([
        { item_name: name, quantity: qty, cost_price: cost, sale_price: sell, profit: profit }
    ]);

    if (!error) {
        alert("Sale saved!");
        location.reload(); // Refresh to show new data
    } else {
        console.error(error);
        alert("Error saving sale.");
    }
}

window.showExtraTool = (tool) => {
    if (tool === 'valuation') {
        const total = inventory.reduce((sum, i) => sum + (i.cost_price * i.stock_qty), 0);
        alert(`Total Inventory Value: ₦${total.toLocaleString()}`);
    } else if (tool === 'margins') {
        const totalRevenue = sales.reduce((sum, s) => sum + (s.sale_price * s.quantity), 0);
        const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
        const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
        alert(`Your overall profit margin is ${margin}%`);
    }
};