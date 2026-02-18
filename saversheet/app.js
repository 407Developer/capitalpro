// --- CONFIGURATION ---
const SUPABASE_URL = 'https://nuufdpqfqpibwqpkmewx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51dWZkcHFmcXBpYndxcGttZXd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzczMzEsImV4cCI6MjA4Njk1MzMzMX0.hqdxi0qnfTJi4lI145LRwvVwFM_3MdhB4SnZK3OS-tE';
const START_DATE = '2026-02-15'; // The day the savings plan started
const DAILY_TARGET = 1000;

let db;
if (window.supabase) {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

const members = ['Divine', 'Wisdom', 'Praise'];
let savingsData = [];

// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
    fetchSavings();
    setupAmountListener();
});

async function fetchSavings() {
    if (!db) return;
    const { data, error } = await db
        .from('savings')
        .select('*')
        .order('created_at', { ascending: false });

    if (!error) {
        savingsData = data || [];
        renderDashboard();
        renderHistory();
    }
}

function calculateStatus(memberName) {
    const totalSaved = savingsData
        .filter(s => s.member_name === memberName)
        .reduce((sum, s) => sum + parseFloat(s.amount), 0);

    const daysCovered = Math.floor(totalSaved / DAILY_TARGET);
    
    // Calculate how many days have passed since START_DATE
    const start = new Date(START_DATE);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(today - start);
    const targetDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include today

    const diff = daysCovered - targetDays;

    let status = 'today';
    let label = 'On Track';
    if (diff > 0) {
        status = 'ahead';
        label = `${diff} Day${diff > 1 ? 's' : ''} Ahead`;
    } else if (diff < 0) {
        status = 'behind';
        label = `${Math.abs(diff)} Day${Math.abs(diff) > 1 ? 's' : ''} Behind`;
    }

    return { totalSaved, daysCovered, status, label };
}

function renderDashboard() {
    const grid = document.getElementById('memberGrid');
    grid.innerHTML = members.map(name => {
        const stats = calculateStatus(name);
        return `
            <div class="member-card">
                <div class="member-info">
                    <h3>${name}</h3>
                    <p class="total-saved">Total: ₦${stats.totalSaved.toLocaleString()}</p>
                </div>
                <div class="member-status">
                    <span class="status-badge ${stats.status}">${stats.label}</span>
                    <span class="coverage-days">${stats.daysCovered} days covered</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderHistory() {
    const log = document.getElementById('activityLog');
    const recent = savingsData.slice(0, 10); // Show last 10

    if (recent.length === 0) {
        log.innerHTML = '<p class="loading-state">No activity recorded yet.</p>';
        return;
    }

    log.innerHTML = recent.map(s => `
        <div class="activity-item">
            <span>${s.member_name} paid ₦${parseFloat(s.amount).toLocaleString()}</span>
            <span class="date">${new Date(s.created_at).toLocaleDateString()}</span>
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
            hint.textContent = `This covers ${days} day${days > 1 ? 's' : ''}`;
            hint.style.color = 'var(--success)';
        } else {
            hint.textContent = 'Enter amount to see days coverage';
            hint.style.color = 'var(--text-muted)';
        }
    });
}

window.submitPayment = async function () {
    const name = document.getElementById('memberName').value;
    const amount = document.getElementById('amount').value;
    const btn = document.getElementById('saveBtn');

    if (!name || !amount) return alert("Please select a member and amount.");

    btn.disabled = true;
    btn.textContent = "Saving...";

    const { error } = await db.from('savings').insert([
        { member_name: name, amount: parseFloat(amount) }
    ]);

    if (!error) {
        document.getElementById('saveForm').reset();
        document.getElementById('coverageHint').textContent = 'Enter amount to see days coverage';
        await fetchSavings();
        alert("Payment recorded!");
    } else {
        alert("Error: " + error.message);
    }

    btn.disabled = false;
    btn.textContent = "Save Record";
};
