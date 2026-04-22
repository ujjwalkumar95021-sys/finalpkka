/**
 * EventPro Master Engine
 * Manages LocalStorage "Backend" & UI Synchronization
 */
const Engine = {
    key: 'eventpro_v2_db',
    tasks: [],
    filter: 'all',
    activeUser: null,

    // Initialize the engine
    init() {
        this.load();
        this.updateAnalytics();
        this.render();

        // Multi-tab sync (The "Real-time" effect)
        window.addEventListener('storage', () => {
            this.load();
            this.updateAnalytics();
            this.render();
            this.notify("Data synced from another tab.");
        });
    },

    load() {
        const raw = localStorage.getItem(this.key);
        this.tasks = raw ? JSON.parse(raw) : [];
    },

    save() {
        localStorage.setItem(this.key, JSON.stringify(this.tasks));
        this.updateAnalytics();
        this.render();
    },

    // UI Toast Messaging
    notify(msg) {
        const container = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = 'toast';
        t.innerText = msg;
        container.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    },

    // Analytics Engine
    updateAnalytics() {
        const total = this.tasks.length;
        const wip = this.tasks.filter(t => t.status === 'Work in Progress').length;
        const done = this.tasks.filter(t => t.status === 'Work Done').length;
        const doubt = this.tasks.filter(t => t.status === 'Doubt').length;
        const percent = total === 0 ? 0 : Math.round((done / total) * 100);

        document.getElementById('dash-total').innerText = total;
        document.getElementById('dash-wip').innerText = wip;
        document.getElementById('dash-done').innerText = done;
        
        document.getElementById('wip-bar').style.width = (total === 0 ? 0 : (wip / total) * 100) + '%';
        document.getElementById('done-bar').style.width = (total === 0 ? 0 : (done / total) * 100) + '%';
        
        document.getElementById('percent-label').innerText = `${percent}%`;
        document.getElementById('master-fill').style.width = `${percent}%`;
    },

    // Rendering Hub
    render() {
        this.renderHostBoard();
        this.renderVolunteerRoster();
        if (this.activeUser) this.renderVolunteerWorkspace();
    },

    renderHostBoard() {
        const grid = document.getElementById('host-grid');
        grid.innerHTML = '';

        let filtered = this.tasks;
        if (this.filter !== 'all') {
            filtered = this.tasks.filter(t => t.status === this.filter);
        }

        filtered.forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card';
            
            // Map logic to UI status styles
            const statusClass = task.status === 'Work in Progress' ? 'WIP' : 
                                task.status === 'Work Done' ? 'Done' : 
                                task.status === 'Doubt' ? 'Doubt' : 'Pending';

            card.innerHTML = `
                <div class="status-pill status-${statusClass}">${task.status}</div>
                <h3>${task.title}</h3>
                <p>${task.description}</p>
                <div style="font-size: 12px; margin-bottom: 20px;">
                    <i class="fa-solid fa-users-viewfinder"></i> <strong>${task.volunteers.join(', ')}</strong>
                </div>
                <div class="task-footer">
                    <span style="font-size: 11px; color: #94a3b8;"><i class="fa-solid fa-hourglass-half"></i> ${task.deadline || 'No Deadline'}</span>
                    <div style="display:flex; gap: 10px;">
                        <button onclick="Engine.edit('${task.id}')" style="background:none; border:none; color:white; cursor:pointer;"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button onclick="Engine.delete('${task.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    renderVolunteerRoster() {
        const roster = document.getElementById('volunteer-roster');
        roster.innerHTML = '';
        const names = [...new Set(this.tasks.flatMap(t => t.volunteers))];

        names.forEach(name => {
            const box = document.createElement('div');
            box.className = 'vol-box';
            box.onclick = () => this.openWorkspace(name);
            box.innerHTML = `<i class="fa-solid fa-id-badge"></i><h3>${name}</h3>`;
            roster.appendChild(box);
        });
    },

    openWorkspace(name) {
        this.activeUser = name;
        document.getElementById('active-user-display').innerText = `${name}'s Workspace`;
        switchView('volunteer-workspace-view');
        this.renderVolunteerWorkspace();
    },

    renderVolunteerWorkspace() {
        const stack = document.getElementById('volunteer-tasks');
        stack.innerHTML = '';
        const myTasks = this.tasks.filter(t => t.volunteers.includes(this.activeUser));

        myTasks.forEach(task => {
            const div = document.createElement('div');
            div.className = 'task-card';
            div.innerHTML = `
                <h3>${task.title}</h3>
                <p>${task.description}</p>
                <div style="display:flex; gap: 10px; flex-wrap: wrap;">
                    <button class="f-btn" onclick="Engine.updateStatus('${task.id}', 'Doubt')">❓ Doubt</button>
                    <button class="f-btn" onclick="Engine.updateStatus('${task.id}', 'Work in Progress')">⏳ In Progress</button>
                    <button class="f-btn" onclick="Engine.updateStatus('${task.id}', 'Work Done')">✅ Completed</button>
                </div>
                <div style="margin-top: 15px; font-size: 12px; font-weight: 700;">Current State: ${task.status}</div>
            `;
            stack.appendChild(div);
        });
    },

    // Logic Actions
    updateStatus(id, newStatus) {
        const idx = this.tasks.findIndex(t => t.id === id);
        this.tasks[idx].status = newStatus;
        this.save();
        this.notify(`Status updated to ${newStatus}`);
    },

    delete(id) {
        if(confirm("Confirm deletion of this task data?")) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.save();
            this.notify("Task permanently removed.");
        }
    },

    edit(id) {
        const t = this.tasks.find(x => x.id === id);
        document.getElementById('edit-id').value = t.id;
        document.getElementById('t-title').value = t.title;
        document.getElementById('t-desc').value = t.description;
        document.getElementById('t-volunteers').value = t.volunteers.join(', ');
        document.getElementById('t-priority').value = t.priority;
        document.getElementById('t-deadline').value = t.deadline;
        document.getElementById('modal-title').innerText = 'Update Configuration';
        toggleModal(true);
    }
};

// Form Handler
document.getElementById('task-form').onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const taskObj = {
        id: id || Date.now().toString(),
        title: document.getElementById('t-title').value,
        description: document.getElementById('t-desc').value,
        volunteers: document.getElementById('t-volunteers').value.split(',').map(v => v.trim()),
        priority: document.getElementById('t-priority').value,
        deadline: document.getElementById('t-deadline').value,
        status: id ? Engine.tasks.find(x => x.id === id).status : 'Not Started'
    };

    if (id) {
        const idx = Engine.tasks.findIndex(x => x.id === id);
        Engine.tasks[idx] = taskObj;
    } else {
        Engine.tasks.unshift(taskObj);
    }

    Engine.save();
    toggleModal(false);
    Engine.notify("Storage Updated Successfully.");
};

// Global Helpers
function switchView(id, btn) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (btn) {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
}

function toggleModal(show) {
    document.getElementById('modal-overlay').style.display = show ? 'flex' : 'none';
    if(!show) document.getElementById('task-form').reset();
}

function setFilter(val, btn) {
    Engine.filter = val;
    document.querySelectorAll('.f-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    Engine.renderHostBoard();
}

function handleSearch() {
    const q = document.getElementById('task-search').value.toLowerCase();
    document.querySelectorAll('.task-card').forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(q) ? 'block' : 'none';
    });
}

function clearAllData() {
    if(confirm("DANGER: This will wipe the entire local browser database. Continue?")) {
        localStorage.removeItem(Engine.key);
        location.reload();
    }
}

// Boot the system
Engine.init();
