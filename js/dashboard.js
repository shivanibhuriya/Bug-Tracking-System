// public/js/dashboard.js

let globalBugs = [];
let globalUsers = [];
let activeTab = 'All';

function toggleModal(show) { 
    document.getElementById('formModal').classList.toggle('hidden', !show); 
}

function setStatusTab(tabName) {
    activeTab = tabName;
    ['All', 'Open', 'In Progress', 'Resolved'].forEach(t => {
        const button = document.getElementById(`tab-${t.replace(' ', '-')}`);
        if (t === tabName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    renderDashboard();
}

async function fetchSystemState() {
    try {
        const [bugsRes, usersRes] = await Promise.all([fetch('/api/bugs'), fetch('/api/users')]);
        globalBugs = await bugsRes.json();
        globalUsers = await usersRes.json();
        
        document.getElementById('userDropdown').innerHTML = globalUsers.map(u => 
            `<option value="${u.id}">${u.name}</option>`
        ).join('');
        
        renderDashboard();
    } catch (error) {
        console.error("Error synchronizing with backend API:", error);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    await fetch('/api/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    e.target.reset();
    toggleModal(false);
    fetchSystemState();
}

async function mutateWorkflowState(id, newStatus) {
    await fetch(`/api/bugs/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    });
    fetchSystemState();
}

function renderDashboard() {
    const severityFilter = document.getElementById('filterSeverity').value;
    const filtered = globalBugs.filter(b => 
        (activeTab === 'All' || b.status === activeTab) && 
        (severityFilter === 'All' || b.severity === severityFilter)
    );

    document.getElementById('sidebarCount').innerText = globalBugs.length;
    
    const openC = globalBugs.filter(b => b.status === 'Open').length;
    const progC = globalBugs.filter(b => b.status === 'In Progress').length;
    const resC = globalBugs.filter(b => b.status === 'Resolved').length;

    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card"><p class="stat-label">Active load</p><p class="stat-number">${globalBugs.length}</p></div>
        <div class="stat-card critical"><p class="stat-label">Open</p><p class="stat-number" style="color: #e11d48;">${openC}</p></div>
        <div class="stat-card progress"><p class="stat-label">In Progress</p><p class="stat-number" style="color: #d97706;">${progC}</p></div>
        <div class="stat-card resolved"><p class="stat-label">Patched</p><p class="stat-number" style="color: #059669;">${resC}</p></div>
    `;

    const sevStyles = { 
        'Critical': 'badge-critical', 
        'High': 'badge-high', 
        'Medium': 'badge-medium', 
        'Low': 'badge-low' 
    };

    document.getElementById('tableBody').innerHTML = filtered.length === 0 
        ? `<tr><td colspan="5" class="text-center text-slate-400" style="padding: 2rem; color: #94a3b8; font-size: 0.875rem;">No active issues match criteria.</td></tr>` 
        : filtered.map(bug => `
            <tr>
                <td>
                    <div class="bug-title">${bug.title}</div>
                    <div class="bug-desc">${bug.description || 'No system logs provided.'}</div>
                </td>
                <td><span class="badge ${sevStyles[bug.severity] || 'badge-low'}">${bug.severity}</span></td>
                <td class="font-mono" style="font-size: 0.75rem; color: var(--text-muted);">${bug.sprint}</td>
                <td>
                    <div class="developer-cell">
                        <div class="avatar">${bug.assignee_avatar || '??'}</div>
                        <span style="font-size: 0.875rem; color: #334155;">${bug.assignee_name || 'Unassigned'}</span>
                    </div>
                </td>
                <td class="text-right">
                    <select onchange="mutateWorkflowState(${bug.id}, this.value)" class="form-control" style="width: auto; display: inline-block; padding: 0.375rem 0.5rem; font-size: 0.75rem;">
                        <option value="Open" ${bug.status === 'Open' ? 'selected' : ''}>🔴 Open</option>
                        <option value="In Progress" ${bug.status === 'In Progress' ? 'selected' : ''}>🟡 In Progress</option>
                        <option value="Resolved" ${bug.status === 'Resolved' ? 'selected' : ''}>🟢 Resolved</option>
                    </select>
                </td>
            </tr>
        `).join('');
}

// Initialize on boot
fetchSystemState();