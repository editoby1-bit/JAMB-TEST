(function () {
  'use strict';

  /* ─── STORAGE KEYS ─── */
  const STORAGE_KEYS = {
    history: 'myjamb_history_v2',
    user: 'myjamb_current_user_v2'
  };

  /* ─── ELEMENT REFS ─── */
  const el = {
    // Screens
    loginScreen: document.getElementById('loginScreen'),
    homeScreen:  document.getElementById('homeScreen'),
    quizScreen:  document.getElementById('quizScreen'),
    resultScreen: document.getElementById('resultScreen'),

    // Login
    loginNameInput: document.getElementById('loginNameInput'),
    loginBtn:    document.getElementById('loginBtn'),
    loginError:  document.getElementById('loginError'),

    // Home
    welcomeName:     document.getElementById('welcomeName'),
    subjectSelect:   document.getElementById('subjectSelect'),
    modeSelect:      document.getElementById('modeSelect'),
    questionCountSelect: document.getElementById('questionCountSelect'),
    durationSelect:  document.getElementById('durationSelect'),
    durationLabel:   document.getElementById('durationLabel'),
    startBtn:        document.getElementById('startBtn'),
    switchUserBtn:   document.getElementById('switchUserBtn'),
    resetProgressBtn: document.getElementById('resetProgressBtn'),
    statSessions:    document.getElementById('statSessions'),
    statAverage:     document.getElementById('statAverage'),
    statBest:        document.getElementById('statBest'),
    statQuestions:   document.getElementById('statQuestions'),
    historyList:     document.getElementById('historyList'),
    historyUserLabel: document.getElementById('historyUserLabel'),
    toggleHistoryBtn: document.getElementById('toggleHistoryBtn'),

    // Quiz sidebar
    sidebarStudent:  document.getElementById('sidebarStudent'),
    sidebarSubject:  document.getElementById('sidebarSubject'),
    sidebarMode:     document.getElementById('sidebarMode'),
    timerDisplay:    document.getElementById('timerDisplay'),
    progressText:    document.getElementById('progressText'),
    progressBar:     document.getElementById('progressBar'),
    positionText:    document.getElementById('positionText'),
    positionBar:     document.getElementById('positionBar'),
    questionPills:   document.getElementById('questionPills'),
    submitBtn:       document.getElementById('submitBtn'),

    // Quiz main
    questionNumberBadge: document.getElementById('questionNumberBadge'),
    subjectPosBadge:     document.getElementById('subjectPosBadge'),
    diagramBox:      document.getElementById('diagramBox'),
    questionText:    document.getElementById('questionText'),
    optionsList:     document.getElementById('optionsList'),
    explanationBox:  document.getElementById('explanationBox'),
    prevBtn:         document.getElementById('prevBtn'),
    nextBtn:         document.getElementById('nextBtn'),
    backHomeBtn:     document.getElementById('backHomeBtn'),

    // Result
    resultScore:     document.getElementById('resultScore'),
    resultSummary:   document.getElementById('resultSummary'),
    resultBreakdown: document.getElementById('resultBreakdown'),
    reviewBtn:       document.getElementById('reviewBtn'),
    restartBtn:      document.getElementById('restartBtn')
  };

  /* ─── APP STATE ─── */
  const state = {
    history:          loadHistory(),
    currentUser:      loadUser(),
    showAllHistory:   false,
    currentQuestions: [],
    answers:          [],
    currentIndex:     0,
    totalCount:       0,
    mode:             'practice',
    subject:          '',
    reviewMode:       false,
    timerId:          null,
    timeLeft:         0
  };

  /* ─── INIT ─── */
  init();

  function init() {
    populateSubjects();
    bindEvents();
    syncDurationVisibility();

    if (state.currentUser) {
      showHome();
    } else {
      showScreen('login');
    }
  }

  /* ─── POPULATE SUBJECTS ─── */
  function populateSubjects() {
    const subjects = Object.keys(QUESTION_BANK);
    el.subjectSelect.innerHTML = subjects.map(s =>
      `<option value="${s}">${subjectLabel(s)}</option>`
    ).join('');
    const total = subjects.reduce((n, s) => n + QUESTION_BANK[s].length, 0);
    el.statQuestions.textContent = String(total);
  }

  /* ─── EVENTS ─── */
  function bindEvents() {
    // Login
    el.loginBtn.addEventListener('click', handleLogin);
    el.loginNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });

    // Home
    el.switchUserBtn.addEventListener('click', switchUser);
    el.resetProgressBtn.addEventListener('click', resetProgress);
    el.startBtn.addEventListener('click', startPractice);
    el.modeSelect.addEventListener('change', syncDurationVisibility);
    el.toggleHistoryBtn.addEventListener('click', toggleHistory);

    // Quiz
    el.prevBtn.addEventListener('click', () => moveQuestion(-1));
    el.nextBtn.addEventListener('click', () => moveQuestion(1));
    el.submitBtn.addEventListener('click', finishQuiz);
    el.backHomeBtn.addEventListener('click', confirmExit);

    // Result
    el.reviewBtn.addEventListener('click', enterReviewMode);
    el.restartBtn.addEventListener('click', () => showHome());
  }

  /* ─── LOGIN ─── */
  function handleLogin() {
    const name = el.loginNameInput.value.trim();
    if (!name) {
      el.loginError.classList.remove('hidden');
      el.loginNameInput.focus();
      return;
    }
    state.currentUser = name;
    saveUser(name);
    showHome();
  }

  function switchUser() {
    state.currentUser = null;
    saveUser(null);
    el.loginNameInput.value = '';
    el.loginError.classList.add('hidden');
    showScreen('login');
  }

  /* ─── SHOW HOME ─── */
  function showHome() {
    el.welcomeName.textContent = state.currentUser || 'Student';
    el.historyUserLabel.textContent = state.currentUser || 'All';
    renderStats();
    renderHistory();
    showScreen('home');
  }

  /* ─── DURATION VISIBILITY ─── */
  function syncDurationVisibility() {
    const isExam = el.modeSelect.value === 'exam';
    el.durationLabel.style.display = isExam ? '' : 'none';
    if (!isExam) el.durationLabel.style.display = 'none';
    else el.durationLabel.style.display = '';
  }

  /* ─── TOGGLE HISTORY ─── */
  function toggleHistory() {
    state.showAllHistory = !state.showAllHistory;
    el.toggleHistoryBtn.textContent = state.showAllHistory ? 'My Results Only' : 'Show All';
    renderHistory();
  }

  /* ─── START PRACTICE ─── */
  function startPractice() {
    const subject    = el.subjectSelect.value;
    const mode       = el.modeSelect.value;
    const countVal   = el.questionCountSelect.value;
    const pool       = shuffle([...QUESTION_BANK[subject]]);
    const totalAvail = pool.length;
    const count      = countVal === 'all' ? totalAvail : Math.min(Number(countVal), totalAvail);

    state.currentQuestions = pool.slice(0, count);
    state.answers          = new Array(count).fill(null);
    state.currentIndex     = 0;
    state.totalCount       = count;
    state.mode             = mode;
    state.subject          = subject;
    state.reviewMode       = false;

    // Timer
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
    if (mode === 'exam') {
      const minutes    = parseInt(el.durationSelect.value, 10) || 60;
      state.timeLeft   = minutes * 60;
      startTimer();
    } else {
      state.timeLeft = 0;
      el.timerDisplay.textContent = 'Practice';
      el.timerDisplay.classList.remove('timer-warning');
    }

    // Sidebar
    el.sidebarStudent.textContent = state.currentUser || 'Student';
    el.sidebarSubject.textContent = subjectLabel(subject);
    el.sidebarMode.textContent    = mode === 'exam' ? 'Exam Mode' : 'Practice Mode';

    buildQuestionPills();
    renderQuestion();
    showScreen('quiz');
  }

  /* ─── TIMER ─── */
  function startTimer() {
    updateTimerDisplay();
    state.timerId = setInterval(() => {
      state.timeLeft--;
      updateTimerDisplay();
      if (state.timeLeft <= 0) {
        clearInterval(state.timerId);
        state.timerId = null;
        finishQuiz();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const t = Math.max(state.timeLeft, 0);
    const m = Math.floor(t / 60);
    const s = t % 60;
    el.timerDisplay.textContent = `${pad(m)}:${pad(s)}`;
    el.timerDisplay.classList.toggle('timer-warning', t <= 60 && state.mode === 'exam');
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  /* ─── QUESTION PILLS ─── */
  function buildQuestionPills() {
    el.questionPills.innerHTML = '';
    state.currentQuestions.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.className = 'pill';
      btn.textContent = String(i + 1);
      btn.addEventListener('click', () => { state.currentIndex = i; renderQuestion(); });
      el.questionPills.appendChild(btn);
    });
    syncPills();
  }

  /* ─── RENDER QUESTION ─── */
  function renderQuestion() {
    const q   = state.currentQuestions[state.currentIndex];
    const idx = state.currentIndex;
    const total = state.totalCount;

    if (!q) return;

    // Badges
    el.questionNumberBadge.textContent = `Question ${idx + 1}`;
    el.subjectPosBadge.textContent     = `${idx + 1} / ${total}`;

    // Sidebar position
    el.positionText.textContent = `${idx + 1} of ${total}`;
    el.positionBar.style.width  = `${((idx + 1) / total) * 100}%`;

    // Diagram (if any)
    if (q.diagram) {
      el.diagramBox.innerHTML = q.diagram;
      el.diagramBox.classList.remove('hidden');
    } else {
      el.diagramBox.innerHTML = '';
      el.diagramBox.classList.add('hidden');
    }

    // Question text
    el.questionText.textContent = q.question;

    // Options
    el.optionsList.innerHTML = '';
    const selected = state.answers[idx];
    q.options.forEach((opt, oi) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<span class="opt-letter">${String.fromCharCode(65 + oi)}.</span><span>${opt}</span>`;

      if (selected === oi) btn.classList.add('selected');
      if (state.reviewMode || state.mode === 'practice') {
        if (selected !== null) {
          if (oi === q.answer)                    btn.classList.add('correct');
          if (oi === selected && selected !== q.answer) btn.classList.add('wrong');
        }
      }

      btn.addEventListener('click', () => selectAnswer(oi));
      btn.disabled = state.reviewMode;
      el.optionsList.appendChild(btn);
    });

    // Explanation
    const showExp = (state.mode === 'practice' || state.reviewMode) && selected !== null;
    if (showExp) {
      el.explanationBox.innerHTML = `<strong>Explanation:</strong> ${escHtml(q.explanation)}`;
      el.explanationBox.classList.remove('hidden');
    } else {
      el.explanationBox.classList.add('hidden');
    }

    // Nav buttons
    el.prevBtn.disabled       = idx === 0;
    el.nextBtn.textContent    = idx === total - 1 ? 'Finish' : 'Next';

    // Answered progress
    const answered = state.answers.filter(a => a !== null).length;
    el.progressText.textContent = `${answered}/${total}`;
    el.progressBar.style.width  = `${(answered / total) * 100}%`;

    syncPills();
  }

  /* ─── SELECT ANSWER ─── */
  function selectAnswer(index) {
    if (state.reviewMode) return;
    state.answers[state.currentIndex] = index;
    renderQuestion();
  }

  /* ─── MOVE QUESTION ─── */
  function moveQuestion(step) {
    if (step > 0 && state.currentIndex === state.totalCount - 1) {
      finishQuiz(); return;
    }
    state.currentIndex = Math.max(0, Math.min(state.totalCount - 1, state.currentIndex + step));
    renderQuestion();
  }

  /* ─── SYNC PILLS ─── */
  function syncPills() {
    [...el.questionPills.children].forEach((pill, i) => {
      pill.classList.toggle('current', i === state.currentIndex);
      pill.classList.toggle('answered', state.answers[i] !== null);
    });
  }

  /* ─── FINISH QUIZ ─── */
  function finishQuiz() {
    if (!state.totalCount) return;
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }

    const correct = state.currentQuestions.reduce((n, q, i) => n + (state.answers[i] === q.answer ? 1 : 0), 0);
    const total   = state.totalCount;
    const wrong   = state.answers.filter((a, i) => a !== null && a !== state.currentQuestions[i].answer).length;
    const skipped = state.answers.filter(a => a === null).length;
    const pct     = Math.round((correct / total) * 100);

    const result = {
      student: state.currentUser || 'Student',
      subject: subjectLabel(state.subject),
      mode:    state.mode,
      total, correct, wrong, skipped,
      percent: pct,
      date: new Date().toLocaleString()
    };

    state.history.unshift(result);
    state.history = state.history.slice(0, 50);
    saveHistory(state.history);

    // Show result
    el.resultScore.textContent = `${pct}%`;
    el.resultScore.className   = `result-score ${pct >= 60 ? 'pass' : 'fail'}`;
    el.resultSummary.textContent = `${escHtmlStr(result.student)} scored ${correct} out of ${total} in ${escHtmlStr(result.subject)}.`;
    el.resultBreakdown.innerHTML = [
      statCard('Correct', correct),
      statCard('Wrong', wrong),
      statCard('Skipped', skipped),
      statCard('Score', `${pct}%`)
    ].join('');

    showScreen('result');
  }

  /* ─── REVIEW MODE ─── */
  function enterReviewMode() {
    state.reviewMode   = true;
    state.currentIndex = 0;
    buildQuestionPills();
    renderQuestion();
    showScreen('quiz');
  }

  /* ─── CONFIRM EXIT ─── */
  function confirmExit() {
    if (window.confirm('Exit this session? Progress will not be saved.')) {
      if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
      showHome();
    }
  }

  /* ─── SHOW SCREEN ─── */
  function showScreen(name) {
    el.loginScreen.classList.toggle('active',  name === 'login');
    el.homeScreen.classList.toggle('active',   name === 'home');
    el.quizScreen.classList.toggle('active',   name === 'quiz');
    el.resultScreen.classList.toggle('active', name === 'result');
  }

  /* ─── STATS & HISTORY ─── */
  function renderStats() {
    const userHistory = state.history.filter(r => r.student === (state.currentUser || 'Student'));
    const n   = userHistory.length;
    const avg = n ? Math.round(userHistory.reduce((s, r) => s + r.percent, 0) / n) : 0;
    const best = n ? Math.max(...userHistory.map(r => r.percent)) : 0;
    el.statSessions.textContent = String(n);
    el.statAverage.textContent  = `${avg}%`;
    el.statBest.textContent     = `${best}%`;
  }

  function renderHistory() {
    const filtered = state.showAllHistory
      ? state.history
      : state.history.filter(r => r.student === (state.currentUser || 'Student'));

    if (!filtered.length) {
      el.historyList.className = 'history-list empty-state';
      el.historyList.textContent = 'No practice history yet.';
      return;
    }
    el.historyList.className = 'history-list';
    el.historyList.innerHTML = filtered.slice(0, 20).map(r => {
      const cls = r.percent >= 70 ? 'score-high' : r.percent >= 50 ? 'score-mid' : 'score-low';
      return `<div class="history-item">
        <div>
          <strong>${escHtmlStr(r.student)}</strong><br>
          <span style="color:var(--muted);font-size:12px">${escHtmlStr(r.subject)} &middot; ${escHtmlStr(r.date)}</span>
        </div>
        <div><span class="score-pill ${cls}">${r.percent}%</span></div>
        <div><strong>${r.correct}/${r.total}</strong><br><span style="color:var(--muted);font-size:12px">Correct</span></div>
        <div><strong>${r.mode === 'exam' ? 'Exam' : 'Practice'}</strong><br><span style="color:var(--muted);font-size:12px">Mode</span></div>
      </div>`;
    }).join('');
  }

  function resetProgress() {
    if (!window.confirm('Erase all saved results on this device? This cannot be undone.')) return;
    state.history = [];
    saveHistory([]);
    renderStats();
    renderHistory();
  }

  /* ─── HELPERS ─── */
  function statCard(label, value) {
    return `<div class="stat-box"><span>${label}</span><strong>${escHtmlStr(String(value))}</strong></div>`;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function subjectLabel(key) {
    const map = {
      english:    'Use of English',
      mathematics:'Mathematics',
      biology:    'Biology',
      government: 'Government',
      literature: 'Literature in English',
      crs:        'Christian Religious Studies',
      economics:  'Economics',
      accounting: 'Accounting',
      physics:    'Physics',
      chemistry:  'Chemistry',
      geography:  'Geography'
    };
    return map[key] || (key.charAt(0).toUpperCase() + key.slice(1));
  }

  function escHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }
  function escHtmlStr(str) { return escHtml(String(str || '')); }

  /* ─── PERSISTENCE ─── */
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]'); }
    catch { return []; }
  }
  function saveHistory(v) { localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(v)); }
  function loadUser() { return localStorage.getItem(STORAGE_KEYS.user) || null; }
  function saveUser(v) {
    if (v) localStorage.setItem(STORAGE_KEYS.user, v);
    else localStorage.removeItem(STORAGE_KEYS.user);
  }

})();
