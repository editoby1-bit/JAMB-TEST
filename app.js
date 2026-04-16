(() => {
  const storageKeys = {
    users: 'jamb-cbt-users-v3',
    currentUser: 'jamb-cbt-current-user-v3'
  };

  const el = {
    homeScreen: document.getElementById('homeScreen'),
    quizScreen: document.getElementById('quizScreen'),
    resultScreen: document.getElementById('resultScreen'),
    studentName: document.getElementById('studentName'),
    loginBtn: document.getElementById('loginBtn'),
    currentStudentBox: document.getElementById('currentStudentBox'),
    sessionTypeSelect: document.getElementById('sessionTypeSelect'),
    singleSubjectWrap: document.getElementById('singleSubjectWrap'),
    comboConfig: document.getElementById('comboConfig'),
    subjectSelect: document.getElementById('subjectSelect'),
    comboSubject1: document.getElementById('comboSubject1'),
    comboSubject2: document.getElementById('comboSubject2'),
    comboSubject3: document.getElementById('comboSubject3'),
    comboQCountSelect: document.getElementById('comboQCountSelect'),
    modeSelect: document.getElementById('modeSelect'),
    questionCountSelect: document.getElementById('questionCountSelect'),
    durationSelect: document.getElementById('durationSelect'),
    startBtn: document.getElementById('startBtn'),
    switchUserBtn: document.getElementById('switchUserBtn'),
    resetProgressBtn: document.getElementById('resetProgressBtn'),
    statSessions: document.getElementById('statSessions'),
    statAverage: document.getElementById('statAverage'),
    statBest: document.getElementById('statBest'),
    statQuestions: document.getElementById('statQuestions'),
    historyTitle: document.getElementById('historyTitle'),
    historyList: document.getElementById('historyList'),
    // Sidebar
    sidebarStudent: document.getElementById('sidebarStudent'),
    sidebarMode: document.getElementById('sidebarMode'),
    timerDisplay: document.getElementById('timerDisplay'),
    progressText: document.getElementById('progressText'),
    progressBar: document.getElementById('progressBar'),
    questionPills: document.getElementById('questionPills'),
    pillsLabel: document.getElementById('pillsLabel'),
    subjectSwitcher: document.getElementById('subjectSwitcher'),
    subjectTabs: document.getElementById('subjectTabs'),
    submitBtn: document.getElementById('submitBtn'),
    // Quiz main
    questionNumberBadge: document.getElementById('questionNumberBadge'),
    questionSubjectMeta: document.getElementById('questionSubjectMeta'),
    subjectPositionTag: document.getElementById('subjectPositionTag'),
    questionText: document.getElementById('questionText'),
    diagramBox: document.getElementById('diagramBox'),
    optionsList: document.getElementById('optionsList'),
    toggleExplanationBtn: document.getElementById('toggleExplanationBtn'),
    explanationBox: document.getElementById('explanationBox'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    backHomeBtn: document.getElementById('backHomeBtn'),
    // Result
    resultScore: document.getElementById('resultScore'),
    resultSummary: document.getElementById('resultSummary'),
    resultBreakdown: document.getElementById('resultBreakdown'),
    subjectBreakdown: document.getElementById('subjectBreakdown'),
    subjectBreakdownList: document.getElementById('subjectBreakdownList'),
    reviewBtn: document.getElementById('reviewBtn'),
    restartBtn: document.getElementById('restartBtn')
  };

  const state = {
    users: loadUsers(),
    currentUser: loadCurrentUser(),
    currentQuestions: [],
    answers: [],
    currentIndex: 0,
    mode: 'practice',
    subject: '',
    subjects: [],
    student: '',
    reviewMode: false,
    showReviewExplanation: false,
    timerId: null,
    timeLeft: 0,
    chosenDurationMinutes: null,
    sessionType: 'single',
    // Subject switching data
    subjectRanges: {} // { subjectName: { start, end } }
  };

  init();

  // ─────────────────────────────────────────────────
  function init() {
    populateSubjects();
    bindEvents();
    renderCurrentUser();
    renderStats();
    renderHistory();
    syncSessionTypeUi();
    syncStartButton();
    showScreen('home');
  }

  function populateSubjects() {
    const subjects = Object.keys(QUESTION_BANK);
    el.subjectSelect.innerHTML = subjects
      .map(s => `<option value="${escHtml(s)}">${fmt(s)}</option>`)
      .join('');

    const combo = subjects.filter(s => s !== 'english');
    const opts = combo.map(s => `<option value="${escHtml(s)}">${fmt(s)}</option>`).join('');
    [el.comboSubject1, el.comboSubject2, el.comboSubject3].forEach(sel => { sel.innerHTML = opts; });

    if (QUESTION_BANK['mathematics']) el.comboSubject1.value = 'mathematics';
    if (QUESTION_BANK['physics'])     el.comboSubject2.value = 'physics';
    if (QUESTION_BANK['chemistry'])   el.comboSubject3.value = 'chemistry';

    const total = subjects.reduce((sum, s) => sum + QUESTION_BANK[s].length, 0);
    el.statQuestions.textContent = String(total);
  }

  function bindEvents() {
    el.loginBtn.addEventListener('click', loginStudent);
    el.studentName.addEventListener('keydown', e => { if (e.key === 'Enter') loginStudent(); });
    el.startBtn.addEventListener('click', startSession);
    el.prevBtn.addEventListener('click', () => moveQuestion(-1));
    el.nextBtn.addEventListener('click', () => moveQuestion(1));
    el.submitBtn.addEventListener('click', finishQuiz);
    el.backHomeBtn.addEventListener('click', confirmExit);
    el.reviewBtn.addEventListener('click', enterReviewMode);
    el.restartBtn.addEventListener('click', () => showScreen('home'));
    el.resetProgressBtn.addEventListener('click', resetProgress);
    el.switchUserBtn.addEventListener('click', switchUser);
    el.modeSelect.addEventListener('change', () => { syncDurationUi(); syncStartButton(); });
    el.sessionTypeSelect.addEventListener('change', syncSessionTypeUi);
    el.toggleExplanationBtn.addEventListener('click', toggleReviewExplanation);
  }

  // ─── SESSION START ────────────────────────────────
  function loginStudent() {
    const name = normalizeName(el.studentName.value);
    if (!name) { alert('Enter a student name to continue.'); return; }
    if (!state.users[name]) state.users[name] = { history: [] };
    state.currentUser = name;
    saveUsers(state.users);
    saveCurrentUser(name);
    renderCurrentUser();
    renderStats();
    renderHistory();
  }

  function startSession() {
    if (!state.currentUser) {
      loginStudent();
      if (!state.currentUser) return;
    }

    state.sessionType = el.sessionTypeSelect.value;
    state.mode = el.modeSelect.value;
    state.reviewMode = false;
    state.showReviewExplanation = false;
    state.currentIndex = 0;
    state.student = state.currentUser;

    const selection = state.sessionType === 'combo'
      ? buildComboSession()
      : buildSingleSession();

    if (!selection || !selection.questions.length) {
      alert('No questions available for the selected setup.');
      return;
    }

    state.currentQuestions = selection.questions;
    state.answers = new Array(state.currentQuestions.length).fill(null);
    state.subject = selection.sessionLabel;
    state.subjects = selection.subjects;
    state.subjectRanges = selection.subjectRanges || {};
    state.chosenDurationMinutes = getChosenDurationMinutes(state.currentQuestions.length, state.mode);
    state.timeLeft = state.mode === 'exam' ? state.chosenDurationMinutes * 60 : 0;

    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
    if (state.mode === 'exam') startTimer();

    el.sidebarStudent.textContent = state.student;
    el.sidebarMode.textContent = state.mode === 'exam'
      ? `Exam · ${state.chosenDurationMinutes} min`
      : 'Practice Mode';

    // Show/hide subject switcher
    const isCombo = state.sessionType === 'combo' && state.subjects.length > 1;
    el.subjectSwitcher.classList.toggle('hidden', !isCombo);
    if (isCombo) buildSubjectSwitcher();

    buildQuestionPills();
    renderQuestion();
    showScreen('quiz');
  }

  function buildSingleSession() {
    const subject = el.subjectSelect.value;
    const pool = shuffle([...QUESTION_BANK[subject]]);
    const countValue = el.questionCountSelect.value;
    const count = countValue === 'all' ? pool.length : Math.min(Number(countValue), pool.length);
    const questions = pool.slice(0, count).map(q => ({ ...q, sourceSubject: subject }));
    return {
      questions,
      subjects: [subject],
      sessionLabel: fmt(subject),
      subjectRanges: { [subject]: { start: 0, end: questions.length - 1 } }
    };
  }

  function buildComboSession() {
    const chosen = [el.comboSubject1.value, el.comboSubject2.value, el.comboSubject3.value].filter(Boolean);
    const unique = [...new Set(chosen)];
    if (unique.length !== 3) {
      alert('Choose 3 different subjects for the full JAMB combination.');
      return null;
    }

    const countVal = el.comboQCountSelect ? el.comboQCountSelect.value : 'standard';
    const isStandard = countVal === 'standard';
    const engCount = isStandard ? 60 : parseInt(countVal);
    const otherCount = isStandard ? 40 : parseInt(countVal);

    const allSubjects = ['english', ...unique];
    const subjectRanges = {};
    let offset = 0;
    let allQuestions = [];

    const enPool = shuffle([...QUESTION_BANK.english]);
    const enQs = enPool.slice(0, Math.min(engCount, enPool.length)).map(q => ({ ...q, sourceSubject: 'english' }));
    subjectRanges['english'] = { start: offset, end: offset + enQs.length - 1 };
    offset += enQs.length;
    allQuestions.push(...enQs);

    unique.forEach(subject => {
      const pool = shuffle([...QUESTION_BANK[subject]]);
      const qs = pool.slice(0, Math.min(otherCount, pool.length)).map(q => ({ ...q, sourceSubject: subject }));
      subjectRanges[subject] = { start: offset, end: offset + qs.length - 1 };
      offset += qs.length;
      allQuestions.push(...qs);
    });

    return {
      questions: allQuestions,
      subjects: allSubjects,
      sessionLabel: allSubjects.map(fmt).join(' + '),
      subjectRanges
    };
  }

  // ─── SUBJECT SWITCHER ─────────────────────────────
  function buildSubjectSwitcher() {
    el.subjectTabs.innerHTML = '';
    state.subjects.forEach(subject => {
      const range = state.subjectRanges[subject];
      const total = range ? (range.end - range.start + 1) : 0;
      const answered = range
        ? state.answers.slice(range.start, range.end + 1).filter(a => a !== null).length
        : 0;

      const btn = document.createElement('button');
      btn.className = 'subject-tab-btn';
      btn.dataset.subject = subject;
      btn.innerHTML = `<span>${fmt(subject)}</span><span class="subject-tab-count">${answered}/${total}</span>`;
      btn.addEventListener('click', () => jumpToSubject(subject));
      el.subjectTabs.appendChild(btn);
    });
    syncSubjectTabs();
  }

  function updateSubjectSwitcherCounts() {
    if (el.subjectSwitcher.classList.contains('hidden')) return;
    const btns = el.subjectTabs.querySelectorAll('.subject-tab-btn');
    btns.forEach(btn => {
      const subject = btn.dataset.subject;
      const range = state.subjectRanges[subject];
      if (!range) return;
      const total = range.end - range.start + 1;
      const answered = state.answers.slice(range.start, range.end + 1).filter(a => a !== null).length;
      const countEl = btn.querySelector('.subject-tab-count');
      if (countEl) countEl.textContent = `${answered}/${total}`;
    });
    syncSubjectTabs();
  }

  function jumpToSubject(subject) {
    const range = state.subjectRanges[subject];
    if (!range) return;
    state.currentIndex = range.start;
    renderQuestion();
    syncSubjectTabs();
  }

  function syncSubjectTabs() {
    const current = state.currentQuestions[state.currentIndex];
    if (!current) return;
    const currentSubject = current.sourceSubject;
    const btns = el.subjectTabs.querySelectorAll('.subject-tab-btn');
    btns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subject === currentSubject);
    });
  }

  // ─── TIMER ────────────────────────────────────────
  function getChosenDurationMinutes(count, mode) {
    if (mode !== 'exam') return 0;
    const raw = el.durationSelect.value;
    if (raw === 'auto') return count;
    return Math.max(1, Number(raw) || count);
  }

  function startTimer() {
    updateTimerDisplay();
    state.timerId = setInterval(() => {
      state.timeLeft -= 1;
      updateTimerDisplay();
      if (state.timeLeft <= 0) {
        clearInterval(state.timerId);
        state.timerId = null;
        finishQuiz(true);
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const t = Math.max(state.timeLeft, 0);
    const m = Math.floor(t / 60);
    const s = t % 60;
    el.timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    el.timerDisplay.classList.toggle('urgent', state.mode === 'exam' && t < 300 && t > 0);
  }

  // ─── PILLS ────────────────────────────────────────
  function buildQuestionPills() {
    el.questionPills.innerHTML = '';
    // If combo, show label; else show "Questions"
    el.pillsLabel.textContent = state.sessionType === 'combo' ? 'All Questions' : 'Questions';

    state.currentQuestions.forEach((_, idx) => {
      const btn = document.createElement('button');
      btn.className = 'pill';
      btn.textContent = String(idx + 1);
      btn.title = `Question ${idx + 1}${state.currentQuestions[idx].sourceSubject ? ' — ' + fmt(state.currentQuestions[idx].sourceSubject) : ''}`;
      btn.addEventListener('click', () => {
        state.currentIndex = idx;
        renderQuestion();
      });
      el.questionPills.appendChild(btn);
    });
    syncPills();
  }

  function syncPills() {
    [...el.questionPills.children].forEach((pill, idx) => {
      pill.classList.toggle('current', idx === state.currentIndex);
      pill.classList.toggle('answered', state.answers[idx] !== null);
    });
  }

  // ─── RENDER QUESTION ─────────────────────────────
  function renderQuestion() {
    const q = state.currentQuestions[state.currentIndex];
    if (!q) return;

    el.questionNumberBadge.textContent = `Question ${state.currentIndex + 1} of ${state.currentQuestions.length}`;
    el.questionSubjectMeta.textContent = fmt(q.sourceSubject || state.subject);

    // Subject position indicator (e.g. "Q6 of 40 in Physics")
    const range = state.subjectRanges[q.sourceSubject];
    if (range && el.subjectPositionTag) {
      const posInSubject = state.currentIndex - range.start + 1;
      const totalInSubject = range.end - range.start + 1;
      el.subjectPositionTag.textContent = `${posInSubject} / ${totalInSubject} in ${fmt(q.sourceSubject)}`;
      el.subjectPositionTag.classList.remove('hidden');
    } else if (el.subjectPositionTag) {
      el.subjectPositionTag.classList.add('hidden');
    }
    el.questionText.innerHTML = escHtml(q.question).replace(/\n/g, '<br>');

    const hasDiagram = Boolean(q.diagram);
    el.diagramBox.classList.toggle('hidden', !hasDiagram);
    el.diagramBox.innerHTML = hasDiagram ? q.diagram : '';

    el.optionsList.innerHTML = '';
    const selectedAnswer = state.answers[state.currentIndex];

    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<strong>${String.fromCharCode(65 + idx)}.</strong> ${escHtml(opt)}`;

      if (selectedAnswer === idx) btn.classList.add('selected');

      if (state.reviewMode || state.mode === 'practice') {
        if (selectedAnswer !== null) {
          if (idx === q.answer) btn.classList.add('correct');
          if (idx === selectedAnswer && selectedAnswer !== q.answer) btn.classList.add('wrong');
        }
      }

      btn.addEventListener('click', () => selectAnswer(idx));
      btn.disabled = state.reviewMode;
      el.optionsList.appendChild(btn);
    });

    // Explanation logic
    const shouldShowExpl = (
      (state.mode === 'practice' && selectedAnswer !== null) ||
      (state.reviewMode && (state.mode === 'practice' ? selectedAnswer !== null : state.showReviewExplanation))
    );

    const shouldShowToggle = state.reviewMode && state.mode === 'exam';
    el.toggleExplanationBtn.classList.toggle('hidden', !shouldShowToggle);
    el.toggleExplanationBtn.textContent = state.showReviewExplanation ? '🙈 Hide Explanation' : '💡 Show Explanation';
    el.explanationBox.classList.toggle('hidden', !shouldShowExpl);
    if (shouldShowExpl) el.explanationBox.textContent = q.explanation || '';

    // Nav buttons
    el.prevBtn.disabled = state.currentIndex === 0;
    el.nextBtn.textContent = state.currentIndex === state.currentQuestions.length - 1
      ? 'Finish ✓'
      : 'Next →';

    // Progress
    const answered = state.answers.filter(a => a !== null).length;
    el.progressText.textContent = `${answered} / ${state.currentQuestions.length}`;
    el.progressBar.style.width = `${(answered / state.currentQuestions.length) * 100}%`;

    syncPills();
    updateSubjectSwitcherCounts();
    syncSubjectTabs();
  }

  function selectAnswer(idx) {
    if (state.reviewMode) return;
    state.answers[state.currentIndex] = idx;
    renderQuestion();
  }

  function moveQuestion(step) {
    if (step > 0 && state.currentIndex === state.currentQuestions.length - 1) {
      finishQuiz(false);
      return;
    }
    state.currentIndex = Math.max(0, Math.min(state.currentQuestions.length - 1, state.currentIndex + step));
    renderQuestion();
  }

  function toggleReviewExplanation() {
    if (!(state.reviewMode && state.mode === 'exam')) return;
    state.showReviewExplanation = !state.showReviewExplanation;
    renderQuestion();
  }

  // ─── FINISH QUIZ ─────────────────────────────────
  function finishQuiz(fromTimeout = false) {
    if (!state.currentQuestions.length) return;
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }

    const correct = state.currentQuestions.reduce((sum, q, i) =>
      sum + (state.answers[i] === q.answer ? 1 : 0), 0);
    const total = state.currentQuestions.length;
    const wrong = state.answers.filter((a, i) => a !== null && a !== state.currentQuestions[i].answer).length;
    const skipped = state.answers.filter(a => a === null).length;
    const percent = Math.round((correct / total) * 100);

    if (!state.users[state.currentUser]) state.users[state.currentUser] = { history: [] };

    const result = {
      student: state.student,
      subject: state.subject,
      mode: state.mode,
      sessionType: state.sessionType,
      durationMinutes: state.chosenDurationMinutes,
      total, correct, wrong, skipped, percent,
      completedByTimeout: fromTimeout,
      date: new Date().toLocaleString()
    };

    state.users[state.currentUser].history.unshift(result);
    state.users[state.currentUser].history = state.users[state.currentUser].history.slice(0, 50);
    saveUsers(state.users);

    // Score display + color
    el.resultScore.textContent = `${percent}%`;
    el.resultScore.style.color = percent >= 50
      ? (percent >= 70 ? 'var(--green)' : 'var(--navy)')
      : 'var(--red)';

    el.resultSummary.textContent = `${result.student} scored ${correct} out of ${total} in ${result.subject}${fromTimeout ? ' (time elapsed).' : '.'}`;
    el.resultBreakdown.innerHTML = [
      statCard('Correct', correct),
      statCard('Wrong', wrong),
      statCard('Skipped', skipped),
      statCard('Duration', result.mode === 'exam' ? `${result.durationMinutes} min` : '—')
    ].join('');

    // Per-subject breakdown for combo
    if (state.sessionType === 'combo' && Object.keys(state.subjectRanges).length > 0) {
      el.subjectBreakdown.classList.remove('hidden');
      el.subjectBreakdownList.innerHTML = state.subjects.map(subject => {
        const range = state.subjectRanges[subject];
        if (!range) return '';
        const qs = state.currentQuestions.slice(range.start, range.end + 1);
        const c = qs.reduce((sum, q, i) =>
          sum + (state.answers[range.start + i] === q.answer ? 1 : 0), 0);
        const pct = Math.round((c / qs.length) * 100);
        return `
          <div class="sbdown-row">
            <span class="sbdown-name">${fmt(subject)}</span>
            <div class="sbdown-bar-wrap">
              <div class="sbdown-bar" style="width:${pct}%"></div>
            </div>
            <span class="sbdown-score">${pct}%</span>
          </div>`;
      }).join('');
    } else {
      el.subjectBreakdown.classList.add('hidden');
    }

    renderStats();
    renderHistory();
    showScreen('result');
  }

  function enterReviewMode() {
    state.reviewMode = true;
    state.currentIndex = 0;
    state.showReviewExplanation = state.mode === 'practice';
    showScreen('quiz');
    renderQuestion();
  }

  function confirmExit() {
    const leave = confirm('Exit this session? Your progress will be lost.');
    if (leave) {
      if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
      showScreen('home');
    }
  }

  function switchUser() {
    if (state.timerId) {
      if (!confirm('Switch student? Current session will close.')) return;
      clearInterval(state.timerId); state.timerId = null;
      showScreen('home');
    }
    state.currentUser = '';
    saveCurrentUser('');
    renderCurrentUser();
    renderStats();
    renderHistory();
    el.studentName.value = '';
    el.studentName.focus();
  }

  // ─── SCREEN + SYNC ────────────────────────────────
  function showScreen(name) {
    el.homeScreen.classList.toggle('active', name === 'home');
    el.quizScreen.classList.toggle('active', name === 'quiz');
    el.resultScreen.classList.toggle('active', name === 'result');
  }

  function syncDurationUi() {
    el.durationSelect.disabled = el.modeSelect.value !== 'exam';
  }

  function syncStartButton() {
    el.startBtn.textContent = el.modeSelect.value === 'exam' ? 'Start Exam' : 'Start Practice';
  }

  function syncSessionTypeUi() {
    const isCombo = el.sessionTypeSelect.value === 'combo';
    el.singleSubjectWrap.classList.toggle('hidden', isCombo);
    el.comboConfig.classList.toggle('hidden', !isCombo);
    syncDurationUi();
  }

  // ─── RENDER UI ────────────────────────────────────
  function renderCurrentUser() {
    if (state.currentUser) {
      el.currentStudentBox.textContent = `✓ Logged in as: ${state.currentUser}`;
      el.currentStudentBox.className = 'student-pill logged-in';
      el.studentName.value = state.currentUser;
      el.historyTitle.textContent = state.currentUser;
    } else {
      el.currentStudentBox.textContent = 'No student logged in';
      el.currentStudentBox.className = 'student-pill';
      el.historyTitle.textContent = 'No student selected';
    }
    syncDurationUi();
  }

  function renderStats() {
    const history = getCurrentHistory();
    const sessions = history.length;
    const avg = sessions ? Math.round(history.reduce((s, h) => s + h.percent, 0) / sessions) : null;
    const best = sessions ? Math.max(...history.map(h => h.percent)) : null;
    el.statSessions.textContent = String(sessions);
    el.statAverage.textContent = avg !== null ? `${avg}%` : '—';
    el.statBest.textContent = best !== null ? `${best}%` : '—';
  }

  function renderHistory() {
    const history = getCurrentHistory();
    if (!state.currentUser) {
      el.historyList.className = 'history-list empty-state';
      el.historyList.textContent = 'Login with a student name to view history.';
      return;
    }
    if (!history.length) {
      el.historyList.className = 'history-list empty-state';
      el.historyList.textContent = 'No practice history yet. Start your first session!';
      return;
    }
    el.historyList.className = 'history-list';
    el.historyList.innerHTML = history.map(item => `
      <div class="history-item">
        <div>
          <strong>${escHtml(item.subject)}</strong><br>
          <span class="muted">${escHtml(item.date)}</span>
        </div>
        <div><strong>${item.percent}%</strong><br><span class="muted">Score</span></div>
        <div><strong>${item.correct}/${item.total}</strong><br><span class="muted">Correct</span></div>
        <div><strong>${item.mode === 'exam' ? 'Exam' : 'Practice'}</strong><br><span class="muted">Mode</span></div>
        <div><strong>${item.mode === 'exam' ? (item.durationMinutes || '—') + ' min' : '—'}</strong><br><span class="muted">Time</span></div>
      </div>
    `).join('');
  }

  function getCurrentHistory() {
    if (!state.currentUser || !state.users[state.currentUser]) return [];
    return state.users[state.currentUser].history || [];
  }

  function resetProgress() {
    if (!state.currentUser) { alert('Login with a student name first.'); return; }
    if (!confirm(`Erase all saved results for "${state.currentUser}" on this device?`)) return;
    if (!state.users[state.currentUser]) state.users[state.currentUser] = { history: [] };
    state.users[state.currentUser].history = [];
    saveUsers(state.users);
    renderStats();
    renderHistory();
  }

  // ─── STORAGE ─────────────────────────────────────
  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(storageKeys.users) || '{}'); }
    catch { return {}; }
  }

  function saveUsers(v) { localStorage.setItem(storageKeys.users, JSON.stringify(v)); }
  function loadCurrentUser() { return localStorage.getItem(storageKeys.currentUser) || ''; }
  function saveCurrentUser(v) { localStorage.setItem(storageKeys.currentUser, v); }

  // ─── UTILS ───────────────────────────────────────
  function statCard(label, value) {
    return `<div class="stat-box"><span>${escHtml(label)}</span><strong>${escHtml(String(value))}</strong></div>`;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function fmt(val) {
    return String(val).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  function normalizeName(val) { return String(val).replace(/\s+/g, ' ').trim(); }

  function escHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
