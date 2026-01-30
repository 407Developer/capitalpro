// Shop items registry (default items you own)
const shopItems = [
  { item: "Cement", cost: 3500 },
  { item: "Paint", cost: 8000 }
];

// Sales records
let sales = [];

// Totals
let totalCapital = 0;
let totalExternalCapital = 0;
let totalProfit = 0;

// Find item in shop registry
function findItem(name) {
  return shopItems.find(
    i => i.item.toLowerCase() === name.toLowerCase()
  );
}

// Add a sale
function addSale() {
  const itemName = document.getElementById("itemName").value.trim();
  const qty = Number(document.getElementById("qty").value);
  const costPriceInput = Number(document.getElementById("costPrice").value);
  const sellPrice = Number(document.getElementById("sellPrice").value);

  if (!itemName || qty <= 0 || sellPrice <= 0) {
    alert("Please fill all required fields");
    return;
  }

  const shopItem = findItem(itemName);

  let capital = 0;
  let externalCapital = 0;
  let profit = 0;
  let source = "";

  if (shopItem) {
    capital = shopItem.cost * qty;
    profit = (sellPrice - shopItem.cost) * qty;
    source = "shop";
  } else {
    if (costPriceInput <= 0) {
      alert("Cost price required for external items");
      return;
    }
    externalCapital = costPriceInput * qty;
    profit = (sellPrice - costPriceInput) * qty;
    source = "external";
  }

  totalCapital += capital;
  totalExternalCapital += externalCapital;
  totalProfit += profit;

  sales.push({
    date: new Date().toLocaleString(),
    item: itemName,
    qty,
    cost: shopItem ? shopItem.cost : costPriceInput,
    sell: sellPrice,
    source,
    capital,
    externalCapital,
    profit
  });

  updateUI();
  clearInputs();
}

// Update numbers on screen
function updateUI() {
  document.getElementById("capital").textContent = formatCurrency(totalCapital);
  document.getElementById("externalCapital").textContent = formatCurrency(totalExternalCapital);
  document.getElementById("profit").textContent = formatCurrency(totalProfit);
  renderSalesCards();
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
}

// Render sales cards
function renderSalesCards() {
  const container = document.getElementById("salesContainer");
  container.innerHTML = "";
  
  if (sales.length === 0) {
    container.innerHTML = '<div class="empty-state">No sales yet. Add your first sale!</div>';
    return;
  }
  
  sales.forEach((sale, index) => {
    const card = document.createElement("div");
    card.className = "sale-card";
    card.innerHTML = `
      <div class="sale-card-header">
        <h3>${sale.item}</h3>
        <button class="delete-btn" onclick="deleteSale(${index})">✕</button>
      </div>
      <div class="sale-card-content">
        <p><span class="label">Date:</span> ${sale.date}</p>
        <p><span class="label">Qty:</span> ${sale.qty}</p>
        <p><span class="label">Cost:</span> ₦${sale.cost.toLocaleString()}</p>
        <p><span class="label">Selling:</span> ₦${sale.sell.toLocaleString()}</p>
        <p><span class="label">Source:</span> <span class="source-badge ${sale.source}">${sale.source}</span></p>
      </div>
      <div class="sale-card-footer">
        <div class="profit-display ${sale.profit >= 0 ? 'positive' : 'negative'}">
          ₦${sale.profit.toLocaleString()}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Delete a sale
function deleteSale(index) {
  const sale = sales[index];
  totalCapital -= sale.capital;
  totalExternalCapital -= sale.externalCapital;
  totalProfit -= sale.profit;
  sales.splice(index, 1);
  updateUI();
}

// Clear input fields
function clearInputs() {
  document.getElementById("itemName").value = "";
  document.getElementById("qty").value = "";
  document.getElementById("costPrice").value = "";
  document.getElementById("sellPrice").value = "";
  document.getElementById("itemName").focus();
}

// Export CSV
function exportCSV() {
  let csv =
    "Date,Item,Qty,Cost Price,Selling Price,Source,Capital,External Capital,Profit\n";

  sales.forEach(s => {
    csv += `${s.date},${s.item},${s.qty},${s.cost},${s.sell},${s.source},${s.capital},${s.externalCapital},${s.profit}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "capital_pro_sales.csv";
  a.click();

  URL.revokeObjectURL(url);
}
