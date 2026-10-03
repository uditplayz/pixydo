// ---------- State ----------
const XP = { high: 30, medium: 20, low: 10 };
const FOCUS_XP = 10;
const XP_PER_LEVEL = 100;
const TITLES = ['Tiny seed', 'Sprout', 'Steady sprout', 'Bloomer', 'Gardener', 'Grove keeper', 'Forest sage'];

const defaults = { tasks: [], xp: 0, days: [] }; // days: dates with at least one quest done
function load() {
    try {
        return Object.assign({}, defaults, JSON.parse(localStorage.getItem('pixydo')) || {});
    } catch {
        return Object.assign({}, defaults); // storage blocked or corrupted: start fresh
    }
}
const state = load();
let filter = 'all';
let editingId = null;

const $ = (id) => document.getElementById(id);
const save = () => {
    try { localStorage.setItem('pixydo', JSON.stringify(state)); } catch { /* storage unavailable */ }
};

// ---------- Date helpers ----------
const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

// ---------- Tasks ----------
function addTodo(text, priority) {
    state.tasks.push({ id: Date.now(), text, priority, done: false });
    save();
    render();
}

function toggle(task) {
    task.done = !task.done;
    const today = dayKey();
    if (task.done) {
        const before = level();
        gain(XP[task.priority]);
        if (!state.days.includes(today)) state.days.push(today);
        task.doneOn = today;
        toast(`+${XP[task.priority]} XP`);
        if (level() > before) toast(`LEVEL UP! ${TITLES[Math.min(level() - 1, TITLES.length - 1)]}`);
    } else {
        gain(-XP[task.priority]); // undoing a quest takes its XP back
    }
    save();
    render();
}

const gain = (n) => { state.xp = Math.max(0, state.xp + n); };
const level = () => Math.floor(state.xp / XP_PER_LEVEL) + 1;

function streak() {
    let n = 0;
    // today may not be done yet, so start from yesterday if needed
    let i = state.days.includes(dayKey()) ? 0 : 1;
    while (state.days.includes(dayKey(daysAgo(i)))) { n++; i++; }
    return n;
}

// ---------- Render ----------
function segments(el, on, total) {
    el.innerHTML = '';
    for (let i = 0; i < total; i++) el.insertAdjacentHTML('beforeend', `<i class="${i < on ? 'on' : ''}"></i>`);
}

function render() {
    const tasks = state.tasks;
    const doneCount = tasks.filter((t) => t.done).length;
    const focusId = currentTask()?.id;

    // list
    const shown = tasks.filter((t) => filter === 'all' || (filter === 'done') === t.done);
    const list = $('todo-list');
    list.innerHTML = '';
    if (!shown.length) list.innerHTML = '<li class="empty">No quests here. Add one!</li>';

    shown.forEach((t) => {
        const li = document.createElement('li');
        li.className = (t.done ? 'done ' : '') + (t.id === focusId && timer.running ? 'focus' : '');

        const box = document.createElement('input');
        box.type = 'checkbox';
        box.className = 'check';
        box.checked = t.done;
        box.addEventListener('change', () => toggle(t));

        let text;
        if (editingId === t.id) {
            text = document.createElement('input');
            text.type = 'text';
            text.className = 'text';
            text.value = t.text;
            const finish = (commit) => {
                if (editingId !== t.id) return;
                editingId = null;
                if (commit && text.value.trim()) t.text = text.value.trim();
                save();
                render();
            };
            text.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') finish(true);
                if (e.key === 'Escape') finish(false);
            });
            text.addEventListener('blur', () => finish(true));
            setTimeout(() => text.focus());
        } else {
            text = document.createElement('span');
            text.className = 'text';
            text.textContent = t.text;
            text.addEventListener('click', () => { editingId = t.id; render(); });
        }

        const tag = document.createElement('span');
        tag.className = `tag ${t.priority}`;
        tag.textContent = `+${XP[t.priority]}`;

        const del = document.createElement('button');
        del.className = 'icon';
        del.textContent = 'x';
        del.title = 'Delete';
        del.addEventListener('click', () => {
            if (t.done) gain(-XP[t.priority]);
            state.tasks = state.tasks.filter((x) => x.id !== t.id);
            save();
            render();
        });

        li.append(box, text, tag, del);
        list.appendChild(li);
    });

    // level + xp
    const inLevel = state.xp % XP_PER_LEVEL;
    $('level').textContent = String(level()).padStart(2, '0');
    $('title').textContent = TITLES[Math.min(level() - 1, TITLES.length - 1)];
    segments($('xp-bar'), Math.floor(inLevel / 10), 10);
    $('xp-text').textContent = `${inLevel} / ${XP_PER_LEVEL} XP to next level`;

    // today's garden
    const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
    $('progress-text').textContent = `${doneCount} of ${tasks.length} done`;
    $('progress-pct').textContent = `${pct}%`;
    segments($('day-bar'), tasks.length ? Math.round(pct / 10) : 0, 10);
    $('sprite').innerHTML = sprite(pct === 100 && tasks.length ? 2 : pct > 0 ? 1 : 0);

    // streak + week
    $('streak').textContent = `${streak()} day streak`;
    const week = $('week');
    week.innerHTML = '';
    const mondayOffset = (new Date().getDay() + 6) % 7;
    'MTWTFSS'.split('').forEach((letter, i) => {
        const d = daysAgo(mondayOffset - i);
        const cell = document.createElement('div');
        cell.textContent = state.days.includes(dayKey(d)) ? '✓' : letter;
        cell.className = (state.days.includes(dayKey(d)) ? 'on ' : '') + (i === mondayOffset ? 'today' : '');
        week.appendChild(cell);
    });

    $('clock-task').textContent = currentTask() ? currentTask().text : 'Add a quest to focus on';
}

// ---------- Pixel sprite (seed -> sprout -> bloom) ----------
const SPRITES = [
    ['..........', '..........', '..........', '..........', '..........', '..........', '....gg....', '...dggd...', '..bbbbbb..', '.bbbbbbbb.'],
    ['..........', '..........', '..gg..gg..', '.gggggggg.', '..gdggdg..', '....dd....', '....dd....', '....dd....', '..bbbbbb..', '.bbbbbbbb.'],
    ['...pppp...', '..ppyypp..', '..ppyypp..', '...pppp...', '.gg.dd.gg.', '..ggdddg..', '....dd....', '....dd....', '..bbbbbb..', '.bbbbbbbb.'],
];
const COLORS = { g: '#6f9a6a', d: '#3f6240', b: '#8a6a4a', p: '#d98a9a', y: '#e8c84a' };

function sprite(stage) {
    let rects = '';
    SPRITES[stage].forEach((row, y) => [...row].forEach((c, x) => {
        if (c !== '.') rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${COLORS[c]}"/>`;
    }));
    return `<svg viewBox="0 0 10 10">${rects}</svg>`;
}

// ---------- Focus timer ----------
const timer = { mode: 'focus', left: 25 * 60, running: false, id: null };
const currentTask = () => state.tasks.find((t) => !t.done);

function drawClock() {
    const m = String(Math.floor(timer.left / 60)).padStart(2, '0');
    const s = String(timer.left % 60).padStart(2, '0');
    $('clock').textContent = `${m}:${s}`;
}

function stopTimer() {
    clearInterval(timer.id);
    timer.running = false;
    $('timer-start').textContent = 'START';
}

function setMode(mode) {
    stopTimer();
    timer.mode = mode;
    timer.left = (mode === 'focus' ? 25 : 5) * 60;
    $('timer-mode').textContent = mode === 'focus' ? 'BREAK' : 'FOCUS';
    drawClock();
    render();
}

$('timer-start').addEventListener('click', () => {
    if (timer.running) return (stopTimer(), render());
    timer.running = true;
    $('timer-start').textContent = 'PAUSE';
    timer.id = setInterval(() => {
        timer.left--;
        drawClock();
        if (timer.left > 0) return;
        if (timer.mode === 'focus') {
            gain(FOCUS_XP);
            save();
            toast(`Focus complete! +${FOCUS_XP} XP`);
        }
        setMode(timer.mode === 'focus' ? 'break' : 'focus');
    }, 1000);
    render();
});
$('timer-mode').addEventListener('click', () => setMode(timer.mode === 'focus' ? 'break' : 'focus'));

// ---------- UI wiring ----------
$('add-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('todo-input').value.trim();
    if (!text) return;
    addTodo(text, $('priority').value);
    $('todo-input').value = '';
});

$('reset').addEventListener('click', () => {
    if (!confirm('Erase all quests, XP and streaks? This cannot be undone.')) return;
    Object.assign(state, { tasks: [], xp: 0, days: [] });
    save();
    render();
});

$('tabs').addEventListener('click', (e) => {
    if (!e.target.dataset.filter) return;
    filter = e.target.dataset.filter;
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b === e.target));
    render();
});

document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'n' && !/INPUT|SELECT/.test(document.activeElement.tagName)) {
        e.preventDefault();
        $('todo-input').focus();
    }
});

let toastTimer;
function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

$('date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
render();
