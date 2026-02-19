// --- CONFIGURATION ---
const SUPABASE_URL = 'https://ihajeblunhqibmjkwmhf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_j8OKa-MYTcryLG4uGiOR9A_KGemAAcr';

// BUSINESS DETAILS
const BIZ_DETAILS = {
    name: "FLOOR BOSS NG.",
    tagline: "Your Ultimate Flooring Partner",
    address: "Shop No 3, Abari Building Materials Market, Opposite Shippers Council, zone 5, Wuse, Abuja.",
    phone: "0916 520 8580 , 0803 349 7520",
    email: "floorbossng@gmail.com"
};

// --- LOCAL STORAGE KEYS ---
const STORAGE_KEYS = {
    INVENTORY: 'cap_pro_inventory',
    SALES: 'cap_pro_sales'
};

let cart = [];
let inventory = [];
let sales = [];
let currentFilter = 'all';
let myChart;
let supabaseClient = null;
let isExternalSource = false;
let dbColumns = { inventory: [], sales: [] };

// Initialize Supabase
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', async () => {
    setupFilterUI();
    setupInventoryListeners();
    loadData(); // Load local first
    await detectSchema();
    syncWithSupabase(true); // Silent sync on load
});

// --- 1. DATA PERSISTENCE & SAFE SYNC ---

async function detectSchema() {
    if (!supabaseClient) return;
    try {
        const { data: invSample } = await supabaseClient.from('inventory').select('*').limit(1);
        if (invSample && invSample[0]) dbColumns.inventory = Object.keys(invSample[0]);

        const { data: salesSample } = await supabaseClient.from('sales').select('*').limit(1);
        if (salesSample && salesSample[0]) dbColumns.sales = Object.keys(salesSample[0]);
    } catch (e) {
        console.warn("Cloud Schema Detection Failed.");
    }
}

function loadData() {
    const localInv = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    inventory = localInv ? JSON.parse(localInv) : [];

    const localSales = localStorage.getItem(STORAGE_KEYS.SALES);
    sales = localSales ? JSON.parse(localSales) : [];

    refreshUI();
}

function saveData() {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
}

function filterForCloud(dataArray, table) {
    const validCols = dbColumns[table];
    if (!validCols || validCols.length === 0) {
        // Essential columns for recovery
        const defaults = {
            sales: ['transaction_id', 'customer_name', 'item_name', 'sale_price', 'quantity', 'profit', 'cost_price', 'created_at', 'is_external'],
            inventory: ['item_name', 'cost_price', 'stock_qty', 'created_at']
        };
        const activeCols = defaults[table];
        return dataArray.map(item => {
            let filtered = {};
            activeCols.forEach(col => { if (item[col] !== undefined) filtered[col] = item[col]; });
            return filtered;
        });
    }
    return dataArray.map(item => {
        let filtered = {};
        validCols.forEach(col => { if (item[col] !== undefined) filtered[col] = item[col]; });
        return filtered;
    });
}

window.syncWithSupabase = async function (silent = false) {
    if (!supabaseClient) return;
    const syncBtn = document.getElementById('syncBtn');
    if (!silent && syncBtn) {
        syncBtn.textContent = '⏳ Syncing...';
        syncBtn.disabled = true;
    }

    try {
        if (dbColumns.sales.length === 0) await detectSchema();

        // 1. PUSH local changes
        if (inventory.length > 0) {
            const cloudInv = filterForCloud(inventory, 'inventory');
            await supabaseClient.from('inventory').upsert(cloudInv, { onConflict: 'item_name' });
        }

        if (sales.length > 0) {
            const cloudSales = filterForCloud(sales, 'sales');
            // Upsert sales to prevent duplicates on cloud
            await supabaseClient.from('sales').upsert(cloudSales);
        }

        // 2. PULL latest data
        const { data: cloudInv } = await supabaseClient.from('inventory').select('*');
        const { data: cloudSales } = await supabaseClient.from('sales').select('*').order('created_at', { ascending: false });

        if (cloudInv) {
            inventory = cloudInv.map(ci => {
                const local = inventory.find(li => li.item_name === ci.item_name);
                return local ? { ...local, ...ci } : ci;
            });
        }
        
        if (cloudSales) {
            // Deduplicate based on transaction_id + item_name
            const mergedSales = [...sales];
            cloudSales.forEach(cs => {
                const exists = mergedSales.some(ls => 
                    (ls.transaction_id === cs.transaction_id && ls.item_name === cs.item_name) ||
                    (ls.created_at === cs.created_at && ls.item_name === cs.item_name && ls.quantity === cs.quantity)
                );
                if (!exists) mergedSales.push(cs);
            });
            sales = mergedSales.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        saveData();
        refreshUI();

        if (!silent) alert("Cloud Sync Successful!");
    } catch (err) {
        if (!silent) alert("Sync partially failed.");
    } finally {
        if (syncBtn) {
            syncBtn.textContent = '☁️ Sync with Cloud (Supabase)';
            syncBtn.disabled = false;
        }
    }
};

function refreshUI() {
    renderInventoryDatalist();
    renderSalesCards();
    updateDashboard();
    updateChart();
}

// --- 2. INVENTORY LOGIC ---

function renderInventoryDatalist() {
    const itemInput = document.getElementById('itemName');
    if (!itemInput) return;
    let datalist = document.getElementById('inventory-list');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'inventory-list';
        itemInput.setAttribute('list', 'inventory-list');
        itemInput.parentNode.appendChild(datalist);
    }
    datalist.innerHTML = inventory.map(item => `<option value="${item.item_name}">`).join('');
}

function setupInventoryListeners() {
    const itemInput = document.getElementById('itemName');
    const costInput = document.getElementById('costPrice');
    if (!itemInput) return;

    itemInput.addEventListener('input', function () {
        const val = itemInput.value.trim();
        const found = inventory.find(i => i.item_name.toLowerCase() === val.toLowerCase());
        let buttonGroup = document.getElementById('inventory-action-group');

        if (found) {
            costInput.value = found.cost_price;
            costInput.setAttribute('readonly', true);
            isExternalSource = false;
            if (buttonGroup) buttonGroup.remove();
        } else if (val.length > 0) {
            isExternalSource = true;
            costInput.removeAttribute('readonly');

            if (!buttonGroup) {
                buttonGroup = document.createElement('div');
                buttonGroup.id = 'inventory-action-group';
                buttonGroup.style.cssText = 'margin-top: 8px; display: flex; gap: 8px;';
                buttonGroup.innerHTML = `
                    <button type="button" class="btn btn-secondary" style="flex:1; font-size: 11px; padding: 8px;" onclick="showAddItemModal('${val}')">+ Add to Stock</button>
                    <button type="button" id="ext-source-btn" class="btn btn-primary" style="flex:1; font-size: 11px; padding: 8px; background: var(--secondary);" onclick="toggleExternalSource(true)">Source Externally</button>
                `;
                itemInput.parentNode.appendChild(buttonGroup);
            }
        } else {
            if (buttonGroup) buttonGroup.remove();
            costInput.setAttribute('readonly', true);
            isExternalSource = false;
        }
    });
}

window.toggleExternalSource = function (isExt) {
    isExternalSource = isExt;
    const costInput = document.getElementById('costPrice');
    const extBtn = document.getElementById('ext-source-btn');

    if (isExt) {
        costInput.removeAttribute('readonly');
        costInput.focus();
        if (extBtn) extBtn.style.background = 'var(--primary)';
    } else {
        costInput.setAttribute('readonly', true);
        if (extBtn) extBtn.style.background = 'var(--secondary)';
    }
};

window.showAddItemModal = function (initialName) {
    const modal = document.createElement('div');
    modal.id = 'custom-modal';
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.75); display:flex; align-items:center; justify-content:center; z-index:2000; backdrop-filter: blur(4px);";
    modal.innerHTML = `
        <div style="background:white; padding:32px; border-radius:16px; width:90%; max-width:400px; box-shadow: var(--shadow-lg);">
            <h3 style="margin-top:0; margin-bottom: 20px; font-size: 1.25rem; font-weight: 700; color: #0f172a;">New Inventory Item</h3>
            <div class="form-group" style="margin-bottom: 16px;">
                <label style="color: #64748b;">Item Name</label>
                <input type="text" id="m-name" value="${initialName}" style="width:100%; color: #0f172a; border: 1px solid #e2e8f0; background: #fff;">
            </div>
            <div class="form-group" style="margin-bottom: 16px;">
                <label style="color: #64748b;">Cost Price (₦)</label>
                <input type="number" id="m-cost" style="width:100%; color: #0f172a; border: 1px solid #e2e8f0; background: #fff;">
            </div>
            <div class="form-group" style="margin-bottom: 24px;">
                <label style="color: #64748b;">Starting Stock</label>
                <input type="number" id="m-qty" value="1" style="width:100%; color: #0f172a; border: 1px solid #e2e8f0; background: #fff;">
            </div>
            <div style="display:flex; gap:12px;">
                <button onclick="saveNewInventoryItem()" class="btn btn-primary" style="flex:1;">Save Item</button>
                <button onclick="document.getElementById('custom-modal').remove()" class="btn btn-secondary" style="flex:1; color: #0f172a;">Cancel</button>
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

    const newItem = {
        item_name: name,
        cost_price: cost,
        stock_qty: qty,
        created_at: new Date().toISOString()
    };

    inventory.push(newItem);
    saveData();

    if (supabaseClient) {
        const cloudSafe = filterForCloud([newItem], 'inventory');
        await supabaseClient.from('inventory').insert(cloudSafe);
    }

    document.getElementById('custom-modal').remove();
    const actionGroup = document.getElementById('inventory-action-group');
    if (actionGroup) actionGroup.remove();

    document.getElementById('itemName').value = name;
    document.getElementById('costPrice').value = cost;
    document.getElementById('costPrice').setAttribute('readonly', true);
    isExternalSource = false;
    refreshUI();
};

// --- 3. SALES LOGIC (CART SYSTEM) ---

window.addToCart = function () {
    const name = document.getElementById('itemName').value;
    const qty = parseInt(document.getElementById('qty').value);
    const cost = parseFloat(document.getElementById('costPrice').value);
    const sell = parseFloat(document.getElementById('sellPrice').value);

    if (!name || isNaN(qty) || isNaN(sell) || isNaN(cost)) return alert("Please fill all fields.");

    const profit = (sell - cost) * qty;

    cart.push({
        item_name: name,
        sale_price: sell,
        quantity: qty,
        profit: profit,
        cost_price: cost,
        is_external: isExternalSource
    });

    ['itemName', 'qty', 'sellPrice', 'costPrice'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('costPrice').setAttribute('readonly', true);
    const actionGroup = document.getElementById('inventory-action-group');
    if (actionGroup) actionGroup.remove();
    isExternalSource = false;

    renderCart();
};

function renderCart() {
    const cartSection = document.getElementById('cartSection');
    const cartList = document.getElementById('cartList');
    const cartTotal = document.getElementById('cartTotal');

    if (cart.length === 0) {
        cartSection.style.display = 'none';
        return;
    }

    cartSection.style.display = 'block';
    cartList.innerHTML = cart.map((item, index) => `
        <li class="cart-item">
            <div class="cart-item-info">
                <span class="cart-item-name">${item.quantity}x ${item.item_name} ${item.is_external ? '<small style="color:var(--primary); font-weight:bold;">(Ext)</small>' : ''}</span>
                <span class="cart-item-price">@ ₦${item.sale_price.toLocaleString()} each</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <strong style="font-weight: 700;">₦${(item.quantity * item.sale_price).toLocaleString()}</strong>
                <button onclick="removeFromCart(${index})" class="cart-remove-btn" title="Remove item">✕</button>
            </div>
        </li>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.quantity * item.sale_price), 0);
    cartTotal.innerHTML = `
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; padding-top: 16px; border-top: 1px solid var(--border); margin-top: 8px;">
            <span style="font-size: 0.875rem; color: var(--text-muted); font-weight: 500;">Total Amount</span>
            <span style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">₦${total.toLocaleString()}</span>
        </div>
    `;
}

window.removeFromCart = function (index) {
    cart.splice(index, 1);
    renderCart();
};

window.checkout = async function () {
    if (cart.length === 0) return;

    const customerNameInput = document.getElementById('customerName');
    const customerName = customerNameInput ? customerNameInput.value.trim() : 'Walk-in Customer';

    const transactionId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const newSales = cart.map(item => ({
        transaction_id: transactionId,
        customer_name: customerName || 'Walk-in Customer',
        item_name: item.item_name,
        sale_price: item.sale_price,
        quantity: item.quantity,
        profit: item.profit,
        cost_price: item.cost_price,
        is_external: item.is_external,
        created_at: timestamp
    }));

    // Update Local Stock
    cart.forEach(cartItem => {
        if (!cartItem.is_external) {
            const invIdx = inventory.findIndex(i => i.item_name.toLowerCase() === cartItem.item_name.toLowerCase());
            if (invIdx !== -1) {
                inventory[invIdx].stock_qty -= cartItem.quantity;
            }
        }
    });

    sales = [...newSales, ...sales];
    saveData();

    // Cloud push (Safe)
    if (supabaseClient) {
        const cloudSafeSales = filterForCloud(newSales, 'sales');
        await supabaseClient.from('sales').insert(cloudSafeSales);

        const cloudSafeInv = filterForCloud(inventory, 'inventory');
        await supabaseClient.from('inventory').upsert(cloudSafeInv, { onConflict: 'item_name' });
    }

    alert("Sale completed and backed up!");

    cart = [];
    if (customerNameInput) customerNameInput.value = '';
    renderCart();
    refreshUI();
};

// --- 4. DASHBOARD & UI ---

function setupFilterUI() {
    const summarySection = document.querySelector('.summary-section');
    if (!summarySection) return;
    const filterHTML = `
        <div class="filter-menu" style="margin-bottom: 20px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
            <button onclick="setFilter('day')" class="btn btn-secondary ${currentFilter === 'day' ? 'active' : ''}" style="padding: 6px 12px; font-size: 0.75rem;">Today</button>
            <button onclick="setFilter('month')" class="btn btn-secondary ${currentFilter === 'month' ? 'active' : ''}" style="padding: 6px 12px; font-size: 0.75rem;">This Month</button>
            <button onclick="setFilter('all')" class="btn btn-secondary ${currentFilter === 'all' ? 'active' : ''}" style="padding: 6px 12px; font-size: 0.75rem;">All Time</button>
        </div>
    `;
    const oldMenu = summarySection.querySelector('.filter-menu');
    if (oldMenu) oldMenu.remove();
    summarySection.insertAdjacentHTML('afterbegin', filterHTML);
}

window.setFilter = (type) => {
    currentFilter = type;
    setupFilterUI();
    refreshUI();
};

function getFilteredSales() {
    const searchVal = (document.getElementById('salesSearch')?.value || "").toLowerCase();
    const dateVal = document.getElementById('dateSearch')?.value || "";
    const now = new Date();

    return sales.filter(sale => {
        const saleDate = new Date(sale.created_at);
        
        // 1. Time Filter
        let timeMatch = true;
        if (currentFilter === 'day') timeMatch = saleDate.toDateString() === now.toDateString();
        else if (currentFilter === 'month') timeMatch = saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();

        // 2. Search Text
        const textMatch = (sale.customer_name || "").toLowerCase().includes(searchVal) || 
                          (sale.item_name || "").toLowerCase().includes(searchVal);

        // 3. Specific Date
        const specificDateMatch = dateVal ? saleDate.toISOString().split('T')[0] === dateVal : true;

        return timeMatch && textMatch && specificDateMatch;
    });
}

function updateDashboard() {
    const filtered = getFilteredSales();
    const totalRevenue = filtered.reduce((sum, s) => sum + (s.sale_price * s.quantity), 0);
    const totalProfit = filtered.reduce((sum, s) => sum + (s.profit || 0), 0);
    const shopCap = inventory.reduce((sum, i) => sum + (i.cost_price * i.stock_qty), 0);

    const internalCogs = filtered.filter(s => !s.is_external).reduce((sum, s) => sum + (s.cost_price * s.quantity), 0);
    const externalCogs = filtered.filter(s => s.is_external).reduce((sum, s) => sum + (s.cost_price * s.quantity), 0);

    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const elements = {
        revenue: document.getElementById('revenue'),
        profit: document.getElementById('profit'),
        margin: document.getElementById('margin'),
        capital: document.getElementById('capital'),
        cogs: document.getElementById('cogs'),
        ecogs: document.getElementById('ecogs')
    };

    if (elements.revenue) elements.revenue.textContent = `₦${totalRevenue.toLocaleString()}`;
    if (elements.profit) elements.profit.textContent = `₦${totalProfit.toLocaleString()}`;
    if (elements.margin) elements.margin.textContent = `${profitMargin.toFixed(1)}%`;
    if (elements.capital) elements.capital.textContent = `₦${shopCap.toLocaleString()}`;
    if (elements.cogs) elements.cogs.textContent = `₦${internalCogs.toLocaleString()}`;
    if (elements.ecogs) elements.ecogs.textContent = `₦${externalCogs.toLocaleString()}`;
}

function renderSalesCards() {
    const container = document.getElementById("salesContainer");
    if (!container) return;

    const filtered = getFilteredSales();

    const grouped = filtered.reduce((acc, sale) => {
        const id = sale.transaction_id || 'legacy-' + sale.created_at;
        if (!acc[id]) {
            acc[id] = {
                id: id,
                customer: sale.customer_name || 'Customer',
                date: sale.created_at,
                items: [],
                total_profit: 0,
                total_amount: 0
            };
        }
        acc[id].items.push(sale);
        acc[id].total_profit += (sale.profit || 0);
        acc[id].total_amount += (sale.quantity * sale.sale_price);
        return acc;
    }, {});

    const sortedTransactions = Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = sortedTransactions.map(tx => `
        <div class="sale-card">
            <div class="sale-card-header">
                <span style="font-weight: 700; color: var(--text-main); font-size: 0.9375rem;">👤 ${tx.customer}</span>
                <span>${new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            
            <div style="margin: 8px 0; border-left: 2px solid var(--primary); padding-left: 12px; display: flex; flex-direction: column; gap: 4px;">
                ${tx.items.map(item => `
                    <div style="font-size: 0.8125rem; display: flex; justify-content: space-between;">
                        <span>${item.quantity}x ${item.item_name} ${item.is_external ? '<small style="color:var(--primary);">(Ext)</small>' : ''}</span>
                        <span style="color: var(--text-muted);">₦${(item.quantity * item.sale_price).toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border);">
                <button onclick="printReceipt('${tx.id}')" class="btn-receipt" style="background:none; border:none; color:var(--primary); font-size: 0.75rem; font-weight:700; cursor:pointer; padding:0; display:flex; align-items:center; gap:4px;">
                   📄 Receipt
                </button>
                <span style="font-weight: 800; font-size: 1rem;">₦${tx.total_amount.toLocaleString()}</span>
            </div>
        </div>
    `).join('') || '<div class="empty-state">No matching sales found.</div>';
}

window.printReceipt = function(txId) {
    const saleGroup = sales.filter(s => s.transaction_id === txId || ('legacy-' + s.created_at) === txId);
    if (!saleGroup.length) return;

    const tx = {
        customer: saleGroup[0].customer_name,
        date: saleGroup[0].created_at,
        items: saleGroup,
        total: saleGroup.reduce((sum, i) => sum + (i.quantity * i.sale_price), 0)
    };

    const receiptHtml = `
        <div style="padding: 40px; font-family: 'Inter', sans-serif; color: #000; background: #fff; width: 100%; max-width: 500px; margin: auto; border: 1px solid #eee;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -1px;">${BIZ_DETAILS.name}</h1>
                <p style="margin: 5px 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px;">${BIZ_DETAILS.tagline}</p>
                <p style="margin: 15px 0 5px; font-size: 11px; line-height: 1.4;">${BIZ_DETAILS.address}</p>
                <p style="margin: 0; font-size: 11px;">📞 ${BIZ_DETAILS.phone}</p>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 12px; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 15px 0;">
                <div>
                    <p style="margin: 0 0 5px; color: #666;">CUSTOMER</p>
                    <p style="margin: 0; font-weight: 700;">${tx.customer.toUpperCase()}</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0 0 5px; color: #666;">DATE</p>
                    <p style="margin: 0; font-weight: 700;">${new Date(tx.date).toLocaleDateString()}</p>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px;">
                <thead>
                    <tr style="border-bottom: 1px solid #eee;">
                        <th style="text-align: left; padding: 10px 0; color: #666;">ITEM</th>
                        <th style="text-align: center; padding: 10px 0; color: #666;">QTY</th>
                        <th style="text-align: right; padding: 10px 0; color: #666;">PRICE</th>
                        <th style="text-align: right; padding: 10px 0; color: #666;">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${tx.items.map(item => `
                        <tr style="border-bottom: 1px solid #f9f9f9;">
                            <td style="padding: 12px 0; font-weight: 500;">${item.item_name}</td>
                            <td style="padding: 12px 0; text-align: center;">${item.quantity}</td>
                            <td style="padding: 12px 0; text-align: right;">₦${item.sale_price.toLocaleString()}</td>
                            <td style="padding: 12px 0; text-align: right; font-weight: 700;">₦${(item.quantity * item.sale_price).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="display: flex; justify-content: flex-end; border-top: 2px solid #000; padding-top: 15px;">
                <div style="text-align: right;">
                    <span style="font-size: 12px; color: #666; margin-right: 20px;">GRAND TOTAL</span>
                    <span style="font-size: 20px; font-weight: 900;">₦${tx.total.toLocaleString()}</span>
                </div>
            </div>

            <div style="margin-top: 50px; text-align: center; border-top: 1px dashed #eee; padding-top: 20px;">
                <p style="font-size: 11px; color: #999;">Thank you for your patronage!</p>
                <p style="font-size: 10px; color: #ccc; margin-top: 5px;">Ref: ${txId.slice(0, 8).toUpperCase()}</p>
            </div>
        </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Receipt</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet"></head><body>');
    printWindow.document.write(receiptHtml);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 2500);
};

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
                borderColor: '#10b981',
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#10b981',
                pointBorderWidth: 2,
                fill: true,
                backgroundColor: 'rgba(16, 185, 129, 0.05)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true },
                x: { grid: { display: false } }
            }
        }
    });
}

// --- 5. DATA MANAGEMENT (EXPORT/IMPORT) ---

window.exportCSV = function () {
    if (sales.length === 0) return alert("No sales to export.");

    const headers = ["Date", "Customer", "Item", "Quantity", "Sale Price", "Cost Price", "Profit", "Sourcing"];
    const rows = sales.map(s => [
        new Date(s.created_at).toISOString(),
        s.customer_name || 'Walk-in Customer',
        s.item_name,
        s.quantity,
        s.sale_price,
        s.cost_price,
        s.profit,
        s.is_external ? 'External' : 'Stock'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `capital_pro_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.importCSV = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const rows = text.split('\n').slice(1);

        const importedSales = rows.filter(row => row.trim()).map(row => {
            const cols = row.split(',');
            return {
                created_at: cols[0],
                customer_name: cols[1],
                item_name: cols[2],
                quantity: parseInt(cols[3]),
                sale_price: parseFloat(cols[4]),
                cost_price: parseFloat(cols[5]),
                profit: parseFloat(cols[6]),
                is_external: cols[7] === 'External',
                transaction_id: crypto.randomUUID()
            };
        });

        if (confirm(`Import ${importedSales.length} sales? This will merge with existing data.`)) {
            sales = [...importedSales, ...sales];
            saveData();
            refreshUI();
            alert("Data imported successfully!");
        }
    };
    reader.readAsText(file);
};

window.resetData = function () {
    if (confirm("Are you sure you want to clear ALL local data?")) {
        localStorage.clear();
        location.reload();
    }
};
