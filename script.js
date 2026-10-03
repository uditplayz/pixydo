// ---------- Config ----------
const XP = { high: 30, medium: 20, low: 10 };
const FOCUS_XP = 15;
const DAILY_GOAL = 3;
const GOAL_BONUS = 50;
const COMBO_WINDOW = 90 * 1000; // finish quests within 90s of each other to chain
const MAX_COMBO = 5;
const XP_PER_LEVEL = 100;
const TITLES = ['Tiny seed', 'Sprout', 'Steady sprout', 'Bloomer', 'Gardener', 'Grove keeper', 'Forest sage', 'Pixel legend'];

const BADGES = [
    { id: 'first', icon: 'star', name: 'First Step', desc: 'Complete a quest', test: (s) => s.stats.done >= 1 },
    { id: 'five', icon: 'sword', name: 'High Five', desc: 'Complete 5 quests', test: (s) => s.stats.done >= 5 },
    { id: 'twentyfive', icon: 'crown', name: 'Quest Hero', desc: 'Complete 25 quests', test: (s) => s.stats.done >= 25 },
    { id: 'boss', icon: 'heart', name: 'Boss Slayer', desc: 'Beat 3 boss quests', test: (s) => s.stats.high >= 3 },
    { id: 'combo', icon: 'bolt', name: 'Combo Master', desc: 'Reach a x3 combo', test: (s) => s.stats.bestCombo >= 3 },
    { id: 'streak3', icon: 'flame', name: 'On Fire', desc: '3 day streak', test: () => streak() >= 3 },
    { id: 'focus', icon: 'clock', name: 'Deep Focus', desc: 'Finish a focus session', test: (s) => s.stats.focus >= 1 },
    { id: 'lvl5', icon: 'sprout', name: 'Gardener', desc: 'Reach level 5', test: () => level() >= 5 },
];

const fresh = () => ({
    tasks: [], xp: 0, days: [], badges: [], muted: false, goalDay: '',
    stats: { done: 0, high: 0, focus: 0, bestCombo: 0 },
});

function load() {
    try {
        const saved = JSON.parse(localStorage.getItem('pixydo')) || {};
        const base = fresh();
        return Object.assign(base, saved, { stats: Object.assign(base.stats, saved.stats) });
    } catch {
        return fresh(); // storage blocked or corrupted: start fresh
    }
}

const state = load();
let filter = 'all';
let editingId = null;
let combo = { count: 0, last: 0 };

const $ = (id) => document.getElementById(id);
const save = () => {
    try { localStorage.setItem('pixydo', JSON.stringify(state)); } catch { /* storage unavailable */ }
};

// ---------- Sound (tiny chiptune synth, no audio files) ----------
let ctx;
function tone(notes, { type = 'square', len = 0.08, vol = 0.06 } = {}) {
    if (state.muted) return;
    try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        notes.forEach((freq, i) => {
            const t = ctx.currentTime + i * len;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + len * 0.95);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + len);
        });
    } catch { /* audio unavailable */ }
}
const SFX = {
    add: () => tone([660, 880]),
    done: (c = 1) => tone([523, 659, 784, 1047].map((f) => f * (1 + (c - 1) * 0.12))),
    undo: () => tone([420, 300], { type: 'triangle' }),
    del: () => tone([300, 220, 150], { type: 'sawtooth', len: 0.06 }),
    tab: () => tone([500], { len: 0.04 }),
    badge: () => tone([784, 988, 1175, 1568], { len: 0.1 }),
    level: () => tone([523, 659, 784, 1047, 784, 1047, 1319], { len: 0.1, vol: 0.07 }),
    goal: () => tone([659, 784, 988, 1319], { len: 0.09 }),
    start: () => tone([440, 660]),
    ding: () => tone([880, 880, 1175], { len: 0.14 }),
};

// ---------- Date helpers ----------
const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

// ---------- Game logic ----------
const level = () => Math.floor(state.xp / XP_PER_LEVEL) + 1;
const titleFor = (lv) => TITLES[Math.min(lv - 1, TITLES.length - 1)];
const gain = (n) => { state.xp = Math.max(0, state.xp + n); };
const doneToday = () => state.tasks.filter((t) => t.doneOn === dayKey()).length;

function streak() {
    let n = 0;
    let i = state.days.includes(dayKey()) ? 0 : 1; // today may not be done yet
    while (state.days.includes(dayKey(daysAgo(i)))) { n++; i++; }
    return n;
}

function checkBadges() {
    BADGES.forEach((b) => {
        if (!state.badges.includes(b.id) && b.test(state)) {
            state.badges.push(b.id);
            toast(`Achievement: ${b.name}!`, 'gold');
            SFX.badge();
        }
    });
}

function addTodo(text, priority) {
    state.tasks.push({ id: Date.now(), text, priority, done: false });
    SFX.add();
    save();
    render();
}

function toggle(task, origin) {
    task.done = !task.done;
    const levelBefore = level();

    if (task.done) {
        const now = Date.now();
        combo.count = now - combo.last <= COMBO_WINDOW ? Math.min(combo.count + 1, MAX_COMBO) : 1;
        combo.last = now;
        state.stats.bestCombo = Math.max(state.stats.bestCombo, combo.count);

        task.xp = Math.round(XP[task.priority] * (1 + 0.25 * (combo.count - 1)));
        task.doneOn = dayKey();
        gain(task.xp);
        state.stats.done++;
        if (task.priority === 'high') state.stats.high++;
        if (!state.days.includes(dayKey())) state.days.push(dayKey());

        SFX.done(combo.count);
        toast(combo.count > 1 ? `+${task.xp} XP  COMBO x${combo.count}!` : `+${task.xp} XP`);
        burst(origin, `+${task.xp}`);
        bounceMascot();

        if (doneToday() >= DAILY_GOAL && state.goalDay !== dayKey()) {
            state.goalDay = dayKey();
            gain(GOAL_BONUS);
            toast(`Daily goal met! +${GOAL_BONUS} XP`, 'gold');
            setTimeout(SFX.goal, 450);
        }
    } else {
        gain(-(task.xp || XP[task.priority])); // undoing takes back exactly what was awarded
        state.stats.done = Math.max(0, state.stats.done - 1);
        if (task.priority === 'high') state.stats.high = Math.max(0, state.stats.high - 1);
        delete task.doneOn;
        delete task.xp;
        SFX.undo();
    }

    checkBadges();
    if (level() > levelBefore) showLevelUp();
    save();
    render();
}

// ---------- Effects ----------
function burst(rect, label) {
    if (!rect) return;
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const colors = ['#3f6240', '#6f9a6a', '#e8c84a', '#d98a9a'];
    for (let i = 0; i < 14; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]}`;
        document.body.appendChild(p);
        const a = (Math.PI * 2 * i) / 14;
        const d = 30 + Math.random() * 40;
        p.animate(
            [{ transform: 'translate(0,0)', opacity: 1 },
             { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + 20}px)`, opacity: 0 }],
            { duration: 600, easing: 'steps(6)' }
        ).onfinish = () => p.remove();
    }
    const f = document.createElement('div');
    f.className = 'float';
    f.textContent = label;
    f.style.cssText = `left:${x}px;top:${y}px`;
    document.body.appendChild(f);
    f.animate([{ transform: 'translate(-50%,0)', opacity: 1 }, { transform: 'translate(-50%,-40px)', opacity: 0 }],
        { duration: 900, easing: 'steps(8)' }).onfinish = () => f.remove();
}

function bounceMascot() {
    const el = $('sprite');
    el.classList.remove('hop');
    void el.offsetWidth; // restart the animation
    el.classList.add('hop');
}

function showLevelUp() {
    $('levelup-sprite').innerHTML = sprite(2);
    $('levelup-text').textContent = `Level ${level()}: ${titleFor(level())}`;
    $('levelup').hidden = false;
    SFX.level();
}
$('levelup').addEventListener('click', () => { $('levelup').hidden = true; });

function toast(msg, kind = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = msg;
    $('toasts').appendChild(el);
    while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
    setTimeout(() => el.remove(), 2200);
}

// ---------- Pixel art ----------
const COLORS = { g: '#6f9a6a', d: '#3f6240', b: '#8a6a4a', p: '#d98a9a', y: '#e8c84a', r: '#c4574d', o: '#e09a4a', s: '#8a96a0' };
const SPRITES = {
    seed: ['..........', '..........', '..........', '..........', '..........', '..........', '....gg....', '...dggd...', '..bbbbbb..', '.bbbbbbbb.'],
    sprout: ['..........', '..........', '..gg..gg..', '.gggggggg.', '..gdggdg..', '....dd....', '....dd....', '....dd....', '..bbbbbb..', '.bbbbbbbb.'],
    bloom: ['...pppp...', '..ppyypp..', '..ppyypp..', '...pppp...', '.gg.dd.gg.', '..ggdddg..', '....dd....', '....dd....', '..bbbbbb..', '.bbbbbbbb.'],
};
const ICONS = {
    star: ['...y...', '...y...', 'yyyyyyy', '.yyyyy.', '..yyy..', '.yy.yy.', '.y...y.'],
    heart: ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...', '.......'],
    bolt: ['...yy..', '..yy...', '.yyyyy.', '...yy..', '..yy...', '.yy....', '.......'],
    flame: ['...o...', '..oo...', '.ooro..', '.orrro.', '.orrro.', '..ooo..', '.......'],
    clock: ['..ddd..', '.d...d.', 'd..d..d', 'd..dd.d', 'd.....d', '.d...d.', '..ddd..'],
    crown: ['y..y..y', 'yy.y.yy', 'yyyyyyy', 'yyyyyyy', '.ddddd.', '.......', '.......'],
    sprout: ['..g.g..', '..ggg..', '...d...', '...d...', '.bbbbb.', 'bbbbbbb', '.......'],
    sword: ['......s', '.....ss', '....ss.', 'b..ss..', '.bss...', '..b....', '.b.b...'],
};

function pixels(grid) {
    let rects = '';
    grid.forEach((row, y) => [...row].forEach((c, x) => {
        if (c !== '.') rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${COLORS[c]}"/>`;
    }));
    return `<svg viewBox="0 0 ${grid[0].length} ${grid.length}">${rects}</svg>`;
}
const sprite = (stage) => pixels(SPRITES[['seed', 'sprout', 'bloom'][stage]]);

// ---------- Render ----------
function segments(el, on, total) {
    el.innerHTML = '';
    for (let i = 0; i < total; i++) el.insertAdjacentHTML('beforeend', `<i class="${i < on ? 'on' : ''}"></i>`);
}

function render() {
    const tasks = state.tasks;
    const focusId = currentTask()?.id;

    // list
    const shown = tasks.filter((t) => filter === 'all' || (filter === 'done') === t.done);
    const list = $('todo-list');
    list.innerHTML = '';
    if (!shown.length) {
        list.innerHTML = `<li class="empty">${tasks.length ? 'Nothing here.' : 'No quests yet. Add your first one above!'}</li>`;
    }

    shown.forEach((t) => {
        const li = document.createElement('li');
        li.className = (t.done ? 'done ' : '') + (t.id === focusId && timer.running ? 'focus' : '');

        const box = document.createElement('input');
        box.type = 'checkbox';
        box.className = 'check';
        box.checked = t.done;
        box.addEventListener('change', () => toggle(t, box.getBoundingClientRect()));

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
        tag.textContent = t.done && t.xp ? `+${t.xp}` : `${{ high: 'BOSS', medium: 'MAIN', low: 'SIDE' }[t.priority]} +${XP[t.priority]}`;

        const del = document.createElement('button');
        del.className = 'icon';
        del.textContent = 'x';
        del.title = 'Delete';
        del.addEventListener('click', () => {
            state.tasks = state.tasks.filter((x) => x.id !== t.id);
            SFX.del();
            save();
            render();
        });

        li.append(box, text, tag, del);
        list.appendChild(li);
    });

    // level + xp
    const inLevel = state.xp % XP_PER_LEVEL;
    $('level').textContent = String(level()).padStart(2, '0');
    $('title').textContent = titleFor(level());
    segments($('xp-bar'), Math.floor(inLevel / 10), 10);
    $('xp-text').textContent = `${inLevel} / ${XP_PER_LEVEL} XP to next level`;
    $('stats').textContent = `${state.stats.done} quests · ${state.stats.focus} focus runs`;

    // daily goal + mascot
    const today = doneToday();
    $('goal-text').textContent = `${Math.min(today, DAILY_GOAL)} / ${DAILY_GOAL}`;
    segments($('day-bar'), Math.min(today, DAILY_GOAL), DAILY_GOAL);
    $('sprite').innerHTML = sprite(today >= DAILY_GOAL ? 2 : today > 0 ? 1 : 0);
    $('mood').textContent = today >= DAILY_GOAL ? 'Fully bloomed. Great day!' : today > 0 ? 'Growing nicely...' : 'Plant a seed: finish a quest.';

    // streak + week
    $('streak').textContent = `${streak()} day streak`;
    const week = $('week');
    week.innerHTML = '';
    const mondayOffset = (new Date().getDay() + 6) % 7;
    'MTWTFSS'.split('').forEach((letter, i) => {
        const d = daysAgo(mondayOffset - i);
        const on = state.days.includes(dayKey(d));
        const cell = document.createElement('div');
        cell.textContent = on ? '✓' : letter;
        cell.className = (on ? 'on ' : '') + (i === mondayOffset ? 'today' : '');
        week.appendChild(cell);
    });

    // badges
    const badges = $('badges');
    badges.innerHTML = '';
    BADGES.forEach((b) => {
        const got = state.badges.includes(b.id);
        const el = document.createElement('div');
        el.className = `badge ${got ? 'got' : ''}`;
        el.title = `${b.name}: ${b.desc}`;
        el.innerHTML = `${pixels(ICONS[b.icon])}<span>${got ? b.name : b.desc}</span>`;
        badges.appendChild(el);
    });
    $('badge-count').textContent = `${state.badges.length} / ${BADGES.length}`;

    $('combo').textContent = `x${combo.count > 0 && Date.now() - combo.last <= COMBO_WINDOW ? combo.count : 1}`;
    $('clock-task').textContent = currentTask() ? currentTask().text : 'Add a quest to focus on';
    $('sound').textContent = state.muted ? 'SFX OFF' : 'SFX ON';
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
    SFX.start();
    $('timer-start').textContent = 'PAUSE';
    timer.id = setInterval(() => {
        timer.left--;
        drawClock();
        if (timer.left > 0) return;
        SFX.ding();
        if (timer.mode === 'focus') {
            const before = level();
            gain(FOCUS_XP);
            state.stats.focus++;
            toast(`Focus complete! +${FOCUS_XP} XP`, 'gold');
            checkBadges();
            if (level() > before) showLevelUp();
            save();
        } else {
            toast('Break over. Ready?');
        }
        setMode(timer.mode === 'focus' ? 'break' : 'focus');
    }, 1000);
    render();
});
$('timer-mode').addEventListener('click', () => { SFX.tab(); setMode(timer.mode === 'focus' ? 'break' : 'focus'); });

// ---------- UI wiring ----------
$('add-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('todo-input').value.trim();
    if (!text) return;
    addTodo(text, $('priority').value);
    $('todo-input').value = '';
});

$('tabs').addEventListener('click', (e) => {
    if (!e.target.dataset.filter) return;
    filter = e.target.dataset.filter;
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b === e.target));
    SFX.tab();
    render();
});

$('clear-done').addEventListener('click', () => {
    state.tasks = state.tasks.filter((t) => !t.done); // XP and stats are kept
    SFX.del();
    save();
    render();
});

$('sound').addEventListener('click', () => {
    state.muted = !state.muted;
    save();
    render();
    SFX.tab();
});

$('reset').addEventListener('click', () => {
    if (!confirm('Erase all quests, XP, badges and streaks? This cannot be undone.')) return;
    Object.assign(state, fresh(), { muted: state.muted });
    combo = { count: 0, last: 0 };
    save();
    render();
});

document.addEventListener('keydown', (e) => {
    if (/INPUT|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key.toLowerCase() === 'n') { e.preventDefault(); $('todo-input').focus(); }
    if (e.key.toLowerCase() === 'm') $('sound').click();
});

$('date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
render();
