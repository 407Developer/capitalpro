// --- CONFIGURATION ---
const SUPABASE_URL = 'YOUR_NEW_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_NEW_SUPABASE_KEY';
const START_DATE = '2026-02-01'; // Update to your actual start date
const DAILY_TARGET = 1000;

let db;
if (window.supabase) {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

const members = ['Divine', 'Wisdom', 'Praise'];
let savingsData = [];

// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
    updateDateDisplay();
    fetchSavings();
    setupAmountListener();
});

function updateDateDisplay() {
    const el = document.getElementById('currentDate');
    const now = new Date();
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    el.textContent = now.toLocaleDateString('en-US', options).toUpperCase();
}

async function fetchSavings() {
    if (!db) return;
    setSyncStatus('SYNCING...');
    
    const { data, error } = await db
        .from('savings')
        .select('*')
        .order('created_at', { ascending: false });

    if (!error) {
        savingsData = data || [];
        renderDashboard();
        renderHistory();
        calculateGlobalMetrics();
        setSyncStatus('SYNCED');
    } else {
        setSyncStatus('SYNC FAILED');
    }
}

function setSyncStatus(text) {
    const el = document.getElementById('syncStatus');
    if(el) el.textContent = text;
}

function calculateStatus(memberName) {
    const totalSaved = savingsData
        .filter(s => s.member_name === memberName)
        .reduce((sum, s) => sum + parseFloat(s.amount), 0);

    const daysCovered = Math.floor(totalSaved / DAILY_TARGET);
    
    const start = new Date(START_DATE);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(today - start);
    const targetDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const diff = daysCovered - targetDays;

    let status = 'today';
    let label = 'ON TRACK';
    if (diff > 0) {
        status = 'ahead';
        label = `${diff} DAY${diff > 1 ? 'S' : ''} AHEAD`;
    } else if (diff < 0) {
        status = 'behind';
        label = `${Math.abs(diff)} DAY${Math.abs(diff) > 1 ? 'S' : ''} BEHIND`;
    }

    return { totalSaved, daysCovered, status, label, diffScore: diff };
}

function calculateGlobalMetrics() {
    const total = savingsData.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    document.getElementById('totalSavedGroup').textContent = `₦${total.toLocaleString()}`;

    // Plan Health: Average status of all members
    const stats = members.map(m => calculateStatus(m));
    const totalDiff = stats.reduce((sum, s) => sum + s.diffScore, 0);
    const health = Math.max(0, Math.min(100, 100 + (totalDiff * 5))); // Simple health formula
    document.getElementById('planHealth').textContent = `${Math.round(health)}%`;
}

function renderDashboard() {
    const grid = document.getElementById('memberGrid');
    
    // Sort members by diffScore (Rankings)
    const rankedMembers = members
        .map(name => ({ name, ...calculateStatus(name) }))
        .sort((a, b) => b.diffScore - a.diffScore);

    grid.innerHTML = rankedMembers.map((member, index) => `
        <div class="ranking-item">
            <div class="saver-identity">
                <span class="rank-number">${index + 1}</span>
                <span class="saver-name">${member.name}</span>
            </div>
            <div class="saver-status-info">
                <span class="status-text ${member.status}">${member.label}</span>
                <span class="days-count">₦${member.totalSaved.toLocaleString()} SAVED</span>
            </div>
        </div>
    `).join('');
}

function renderHistory() {
    const log = document.getElementById('activityLog');
    const recent = savingsData.slice(0, 5);

    if (recent.length === 0) {
        log.innerHTML = '<div class="loading-state">NO RECENT ACTIVITY</div>';
        return;
    }

    log.innerHTML = recent.map(s => `
        <div class="activity-row">
            <span><b>${s.member_name}</b> ADDED ₦${parseFloat(s.amount).toLocaleString()}</span>
            <span>${new Date(s.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
        </div>
    `).join('');
}

function setupAmountListener() {
    const amountInput = document.getElementById('amount');
    const hint = document.getElementById('coverageHint');

    amountInput.addEventListener('input', () => {
        const val = parseInt(amountInput.value);
        if (val && val >= DAILY_TARGET) {
            const days = Math.floor(val / DAILY_TARGET);
            hint.textContent = `COVERS ${days} DAY${days > 1 ? 'S' : ''}`;
            hint.style.color = '#fff';
        } else {
            hint.textContent = 'DAYS COVERAGE WILL APPEAR HERE';
            hint.style.color = 'var(--muted)';
        }
    });
}

window.submitPayment = async function () {
    const name = document.getElementById('memberName').value;
    const amount = document.getElementById('amount').value;
    const btn = document.getElementById('saveBtn');

    if (!name || !amount) return;

    btn.disabled = true;
    btn.textContent = 'SAVING...';

    const { error } = await db.from('savings').insert([
        { member_name: name, amount: parseFloat(amount) }
    ]);

    if (!error) {
        document.getElementById('saveForm').reset();
        document.getElementById('coverageHint').textContent = 'DAYS COVERAGE WILL APPEAR HERE';
        await fetchSavings();
    } else {
        alert("ERROR: " + error.message);
    }

    btn.disabled = false;
    btn.textContent = 'RECORD PAYMENT';
};

window.exportCSV = function () {
    if (savingsData.length === 0) return;
    const headers = ["DATE", "MEMBER", "AMOUNT"];
    const rows = savingsData.map(s => [
        new Date(s.created_at).toLocaleDateString(),
        s.member_name,
        s.amount
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `saversheet_export.csv`);
    link.click();
};
