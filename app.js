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

// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
    setupFilterUI();
    setupInventoryListeners(); 
    fetchInventory();
    fetchSales();
});

// --- 1. DATA FETCHING ---
async function fetchInventory() {
    const { data, error } = await db.from('inventory').select('*').order('item_name', { ascending: true });
    if (!error) {
        inventory = data || [];
        renderInventoryDatalist(); 
        updateDashboard();
    }
}

async function fetchSales() {
    // CRITICAL FIX: Added 'created_at' to the select statement
    const { data, error } = await db
        .from('sales')
        .select('item_name, sale_price, quantity, profit, cost_price, created_at') 
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Supabase Error:", error.message);
    } else {
        sales = data || [];
        refreshUI(); // Unified UI update
    }
}

// Helper to refresh everything when data changes
function refreshUI() {
    renderSalesCards();
    updateDashboard();
    updateChart();
}

// --- 2. SMART INVENTORY UI ---
function renderInventoryDatalist() {
    const datalist = document.getElementById('inventory-list') || createDatalist();
    datalist.innerHTML = inventory.map(item => `<option value="${item.item_name}">`).join('');
}

function createDatalist() {
    const itemInput = document.getElementById('itemName');
    if(!itemInput) return;
    const dl = document.createElement('datalist');
    dl.id = 'inventory-list';
    itemInput.setAttribute('list', 'inventory-list');
    itemInput.parentNode.appendChild(dl);
    return dl;
}

function setupInventoryListeners() {
    const itemInput = document.getElementById('itemName');
    if (!itemInput) return;

    itemInput.addEventListener('input', function () {
        const val = itemInput.value.trim();
        const found = inventory.find(i => i.item_name.toLowerCase() === val.toLowerCase());
        let addBtn = document.getElementById('add-new-item-btn');

        if (found) {
            document.getElementById('costPrice').value = found.cost_price;
            if (addBtn) addBtn.remove();
        } else if (val.length > 0) {
            if (!addBtn) {
                addBtn = document.createElement('button');
                addBtn.id = 'add-new-item-btn';
                addBtn.type = 'button';
                addBtn.className = 'btn btn-secondary';
                addBtn.style.cssText = 'margin-top: 5px; display: block; width: 100%; font-size: 12px;';
                addBtn.textContent = `+ Add "${val}" to Inventory`;
                addBtn.onclick = () => showAddItemModal(itemInput.value);
                itemInput.parentNode.appendChild(addBtn);
            } else {
                addBtn.textContent = `+ Add "${val}" to Inventory`;
            }
        } else {
            if (addBtn) addBtn.remove();
        }
    });
}

// --- 3. MODAL FOR NEW INVENTORY ---
window.showAddItemModal = function (initialName) {
    const modal = document.createElement('div');
    modal.id = 'custom-modal';
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:2000;";
    modal.innerHTML = `
        <div style="background:white; padding:25px; border-radius:12px; width:90%; max-width:400px; color:#333;">
            <h3 style="margin-top:0;">New Inventory Item</h3>
            <label>Item Name</label>
            <input type="text" id="m-name" value="${initialName}" style="width:100%; padding:8px; margin-bottom:15px; border:1px solid #ccc; border-radius:5px;">
            <label>Cost Price (₦)</label>
            <input type="number" id="m-cost" style="width:100%; padding:8px; margin-bottom:15px; border:1px solid #ccc; border-radius:5px;">
            <label>Starting Stock</label>
            <input type="number" id="m-qty" value="1" style="width:100%; padding:8px; margin-bottom:20px; border:1px solid #ccc; border-radius:5px;">
            <div style="display:flex; gap:10px;">
                <button onclick="saveNewInventoryItem()" style="flex:1; background:#28a745; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer;">Save</button>
                <button onclick="document.getElementById('custom-modal').remove()" style="flex:1; background:#666; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer;">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.saveNewInventoryItem = async function () {
    const name = document.getElementById('m-name').value;
    const cost = parseFloat(document.getElementById('m-cost').value);
    const qty = parseInt(document.getElementById('m-qty').value);

    if (!name || isNaN(cost)) return alert("Please enter name and cost.");

    const { error } = await db.from('inventory').insert([{ item_name: name, cost_price: cost, stock_qty: qty }]);

    if (!error) {
        document.getElementById('custom-modal').remove();
        const addBtn = document.getElementById('add-new-item-btn');
        if (addBtn) addBtn.remove();
        await fetchInventory(); 
        document.getElementById('itemName').value = name;
        document.getElementById('costPrice').value = cost;
    }
};

// --- 4. SALES LOGIC ---
window.addSale = async function () {
    const name = document.getElementById('itemName').value;
    const qty = parseInt(document.getElementById('qty').value);
    const cost = parseFloat(document.getElementById('costPrice').value);
    const sell = parseFloat(document.getElementById('sellPrice').value);

    if (!name || isNaN(qty) || isNaN(sell)) return alert("Please fill all fields.");

    const profit = (sell - cost) * qty;

    const { error } = await db.from('sales').insert([{
        item_name: name,
        sale_price: sell,
        quantity: qty,
        profit: profit,
        cost_price: cost
    }]);

    if (!error) {
        const invItem = inventory.find(i => i.item_name.toLowerCase() === name.toLowerCase());
        if (invItem) {
            await db.from('inventory').update({ stock_qty: invItem.stock_qty - qty }).eq('id', invItem.id);
        }
        ['itemName', 'qty', 'sellPrice', 'costPrice'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = '';
        });
        fetchSales();
        fetchInventory();
    }
};

// --- 5. DASHBOARD & UI ---
function setupFilterUI() {
    const summarySection = document.querySelector('.summary-section');
    if (!summarySection) return;
    const filterHTML = `
        <div class="filter-menu" style="margin-bottom: 15px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button onclick="setFilter('day')" class="filter-btn">Today</button>
            <button onclick="setFilter('month')" class="filter-btn">This Month</button>
            <button onclick="setFilter('all')" class="filter-btn">All Time</button>
        </div>
    `;
    summarySection.insertAdjacentHTML('afterbegin', filterHTML);
}

window.setFilter = (type) => {
    currentFilter = type;
    refreshUI();
};

function getFilteredSales() {
    const now = new Date();
    return sales.filter(sale => {
        const saleDate = new Date(sale.created_at);
        if (currentFilter === 'day') return saleDate.toDateString() === now.toDateString();
        if (currentFilter === 'month') return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
        return true;
    });
}

function updateDashboard() {
    const filtered = getFilteredSales();
    const totalProfit = filtered.reduce((sum, s) => sum + (s.profit || 0), 0);
    const shopCap = inventory.reduce((sum, i) => sum + (i.cost_price * i.stock_qty), 0);
    
    const profitEl = document.getElementById('profit');
    const capitalEl = document.getElementById('capital');
    
    if(profitEl) profitEl.textContent = `₦${totalProfit.toLocaleString()}`;
    if(capitalEl) capitalEl.textContent = `₦${shopCap.toLocaleString()}`;
}

function renderSalesCards() {
    const container = document.getElementById("salesContainer");
    if (!container) return;
    const filtered = getFilteredSales();
    container.innerHTML = filtered.map(sale => `
        <div class="sale-card" style="border: 1px solid #eee; padding: 12px; margin-bottom: 10px; border-radius: 8px; background:white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between;">
                <small style="color:#888;">${new Date(sale.created_at).toLocaleDateString()}</small>
                <b style="color:#28a745;">+₦${sale.profit.toLocaleString()}</b>
            </div>
            <h4 style="margin:5px 0;">${sale.item_name}</h4>
            <p style="margin:0; font-size:13px; color:#555;">Sales Income: ₦${(sale.quantity * sale.sale_price).toLocaleString()}</p>
            <p style="margin:0; font-size:13px; color:#555;">Qty: ${sale.quantity} | Sold at: ₦${sale.sale_price.toLocaleString()}</p>
        </div>
    `).join('') || '<div class="empty-state">No sales found for this period.</div>';
}

function updateChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas || !window.Chart) return;

    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toDateString();
    }).reverse();

    const dailyProfit = last7Days.map(date => {
        return sales
            .filter(s => new Date(s.created_at).toDateString() === date)
            .reduce((sum, s) => sum + (s.profit || 0), 0);
    });

    if (myChart) myChart.destroy();
    myChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: last7Days.map(d => d.split(' ').slice(1, 3).join(' ')),
            datasets: [{
                label: 'Profit (₦)',
                data: dailyProfit,
                borderColor: '#28a745',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(40, 167, 69, 0.1)'
            }]
        },
        options: { 
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}