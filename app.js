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
    initPaywall();
    initAIExplain();
    initCommunityQuiz();
    checkForSharedSession();
    refreshChallengeBtn();
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
    // New features
    const shareBtn = document.getElementById('shareResultBtn');
    if (shareBtn) shareBtn.addEventListener('click', shareJambResult);
    const challengeBtn = document.getElementById('jambChallengeBtn');
    if (challengeBtn) challengeBtn.addEventListener('click', openJambChallenge);
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

    // Paywall check
    if (!checkAccess()) {
      const used = getFreeUsed();
      if (used >= JAMB_FREE_LIMIT) {
        showPaywall('trial');
        return;
      }
      // Increment free usage
      savePref(SK_FREE, { n: used + 1 });
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

    // Show AI explain button for paid users
    if (checkAccess()) showAIButton();
    else hideAIButton();

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

    // Store for session sharing
    window._jambLastResult    = result;
    window._jambLastQuestions = [...state.currentQuestions];
    window._jambLastAnswers   = [...state.answers];

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
    if (name !== 'quiz') hideAIButton();
    if (name === 'home') refreshChallengeBtn();
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

  /* ════════════════════════════════════════════════════
     PAYWALL + ACCESS CONTROL
  ════════════════════════════════════════════════════ */
  const SK_ACCESS = 'jamb-access-v1';
  const SK_FREE   = 'jamb-free-v1';
  const SK_TIER   = 'jamb-tier-v1';
  const SK_EASOLD = 'jamb-ea-sold-v1';
  const JAMB_FREE_LIMIT    = 10;
  const JAMB_EA_CAP        = 100;
  const PAYSTACK_KEY       = 'pk_test_1ac5e055de30ca320129b0e5b6f57d0df7ab2281';
  // 🔑 Replace above with pk_live_ key when Paystack approves

  function savePref(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} }
  function loadPref(k, d=null) { try { const v=localStorage.getItem(k); return v!==null?JSON.parse(v):d; } catch(e) { return d; } }

  function checkAccess() {
    const d = loadPref(SK_ACCESS);
    return !!(d?.expires && new Date(d.expires) > new Date());
  }

  function getFreeUsed() {
    return loadPref(SK_FREE)?.n || 0;
  }

  function grantAccess(days, tier) {
    const exp = new Date();
    exp.setDate(exp.getDate() + days);
    savePref(SK_ACCESS, { expires: exp.toISOString() });
    savePref(SK_TIER, tier || 'jamb');
    document.getElementById('jambPaywall')?.classList.add('hidden');
    refreshChallengeBtn();
    alert(`✅ Access granted for ${days} days! Welcome to My JAMB App.`);
  }

  function refreshChallengeBtn() {
    const btn = document.getElementById('jambChallengeBtn');
    if (!btn) return;
    if (state.currentUser) btn.classList.remove('hidden');
    else btn.classList.add('hidden');
  }

  function showPaywall(reason) {
    const badge = document.getElementById('jambPaywallBadge');
    if (badge) badge.textContent = reason === 'trial' ? 'FREE TRIAL COMPLETE' : 'PREMIUM FEATURE';
    document.getElementById('jambPaywall')?.classList.remove('hidden');
  }

  function initPaywall() {
    document.getElementById('jambPaywallClose')?.addEventListener('click', () => {
      document.getElementById('jambPaywall')?.classList.add('hidden');
    });
    document.getElementById('jambPayBtn')?.addEventListener('click', handleJambPayment);
    document.getElementById('jambRedeemBtn')?.addEventListener('click', redeemJambCode);
    // Check for shared access from My Exams App
    const examsAccess = loadPref('mea-access-v1');
    if (examsAccess?.expires && new Date(examsAccess.expires) > new Date()) {
      // Student Pass on Exams App grants JAMB access
      grantJambFromExamsApp();
    }
    // Check URL for shared session
    const params = new URLSearchParams(window.location.search);
    if (params.get('session')) checkForSharedSession();
  }

  function grantJambFromExamsApp() {
    const examsAccess = loadPref('mea-access-v1');
    if (!examsAccess?.expires) return;
    savePref(SK_ACCESS, { expires: examsAccess.expires, fromExamsApp: true });
    refreshChallengeBtn();
  }

  function handleJambPayment() {
    const email = prompt('Enter your email to continue:');
    if (!email?.includes('@')) { if (email !== null) alert('Please enter a valid email.'); return; }
    const sold = loadPref(SK_EASOLD) || 0;
    const isEA = sold < JAMB_EA_CAP;
    const amount = 150000; // ₦1,500 in kobo

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_KEY,
      email, amount,
      currency: 'NGN',
      ref: 'JAMB-' + Date.now(),
      metadata: { custom_fields: [
        { display_name: 'Plan', variable_name: 'plan', value: 'My JAMB App' },
        { display_name: 'App',  variable_name: 'app',  value: 'My JAMB App' },
      ]},
      onClose() {},
      callback() {
        if (isEA) savePref(SK_EASOLD, sold + 1);
        grantAccess(90, 'jamb');
      }
    });
    handler.openIframe();
  }

  function redeemJambCode() {
    const code = (document.getElementById('jambCodeInput')?.value || '').trim().toUpperCase();
    if (!code) return;
    const codes = {
      'MEA-DEMO-2025': { days:90, tier:'jamb' },
      'JAMB-PROMO':    { days:90, tier:'jamb' },
      'MEA-PLUS-DEMO': { days:90, tier:'plus' },
      'TEST7':         { days:7,  tier:'jamb' },
    };
    if (codes[code]) {
      grantAccess(codes[code].days, codes[code].tier);
    } else {
      alert('Invalid or expired code.');
    }
  }

  /* ════════════════════════════════════════════════════
     AI EXPLANATIONS
  ════════════════════════════════════════════════════ */
  const SK_AI_CREDITS = 'jamb-ai-credits-v1';
  const AI_QUARTERLY  = 100;

  function getAICredits() {
    const d = loadPref(SK_AI_CREDITS);
    // Reset quarterly
    if (!d || !d.quarter || d.quarter !== getCurrentQuarter()) {
      savePref(SK_AI_CREDITS, { n: AI_QUARTERLY, quarter: getCurrentQuarter() });
      return AI_QUARTERLY;
    }
    return d.n;
  }

  function useAICredit() {
    const credits = getAICredits();
    if (credits <= 0) return false;
    savePref(SK_AI_CREDITS, { n: credits - 1, quarter: getCurrentQuarter() });
    return true;
  }

  function getCurrentQuarter() {
    const d = new Date();
    return `${d.getFullYear()}-Q${Math.ceil((d.getMonth()+1)/3)}`;
  }

  function updateAICreditsBadge() {
    const badge = document.getElementById('aiCreditsBadge');
    if (!badge) return;
    const c = getAICredits();
    badge.textContent = `${c} credit${c===1?'':'s'} left`;
    badge.style.color = c < 10 ? '#e74c3c' : '#27ae60';
  }

  function initAIExplain() {
    document.getElementById('aiPanelClose')?.addEventListener('click', () => {
      document.getElementById('aiPanel')?.classList.add('hidden');
    });
    document.getElementById('aiExplainBtn')?.addEventListener('click', triggerAIExplain);
  }

  function showAIButton() {
    if (!checkAccess()) return;
    const btn = document.getElementById('aiExplainBtn');
    if (!btn) return;
    // Position near question
    const questionArea = document.querySelector('.quiz-main');
    if (questionArea && !questionArea.contains(btn)) {
      questionArea.appendChild(btn);
    }
    btn.classList.remove('hidden');
  }

  function hideAIButton() {
    document.getElementById('aiExplainBtn')?.classList.add('hidden');
  }

  async function triggerAIExplain() {
    if (!checkAccess()) { showPaywall('feature'); return; }
    const credits = getAICredits();
    if (credits <= 0) {
      alert(`You've used all ${AI_QUARTERLY} AI explanation credits for this quarter.\n\nTop up: ₦500 = 50 more explanations.`);
      return;
    }
    const q = state.currentQuestions[state.currentIndex];
    if (!q) return;

    const panel = document.getElementById('aiPanel');
    const loading = document.getElementById('aiLoading');
    const response = document.getElementById('aiResponse');
    panel?.classList.remove('hidden');
    loading?.classList.remove('hidden');
    response?.classList.add('hidden');
    updateAICreditsBadge();

    const correctOpt = q.options[q.answer];
    const studentAns = state.answers[state.currentIndex];
    const studentOpt = studentAns !== null ? q.options[studentAns] : 'Did not answer';
    const wasCorrect = studentAns === q.answer;

    const prompt = `You are a JAMB/UTME exam tutor helping a Nigerian student prepare.

Question: ${q.question}
Options: ${q.options.map((o,i)=>String.fromCharCode(65+i)+'. '+o).join(' | ')}
Correct answer: ${correctOpt}
Student answered: ${studentOpt} (${wasCorrect ? 'CORRECT ✓' : 'WRONG ✗'})

Give a clear, concise explanation in 3-4 sentences:
1. Why the correct answer is right
2. Why common wrong choices are incorrect (if student was wrong, specifically address their choice)
3. A memory tip or key principle to remember for JAMB

Use plain English. Be encouraging. Keep it brief — this student is studying under pressure.`;

    try {
      if (!useAICredit()) {
        loading?.classList.add('hidden');
        alert('No AI credits remaining this quarter.');
        panel?.classList.add('hidden');
        return;
      }
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(c=>c.text||'').join('') || 'Could not get explanation. Please try again.';
      loading?.classList.add('hidden');
      if (response) {
        response.innerHTML = `<div class="ai-q-recap"><strong>${escHtml(q.question.substring(0,80))}${q.question.length>80?'…':''}</strong></div><div class="ai-text">${escHtml(text).replace(/\n/g,'<br/>')}</div>`;
        response.classList.remove('hidden');
      }
      updateAICreditsBadge();
    } catch(err) {
      loading?.classList.add('hidden');
      if (response) {
        response.innerHTML = '<p style="color:#e74c3c">Could not reach AI. Check your connection and try again.</p>';
        response.classList.remove('hidden');
      }
    }
  }

  /* ════════════════════════════════════════════════════
     COMMUNITY QUIZ
  ════════════════════════════════════════════════════ */
  const QC_STORE = 'jamb-challenges-v1';
  let _currentChallengeCode = null;

  function initCommunityQuiz() {
    const modal = document.getElementById('jambQuizModal');
    document.getElementById('jambQcClose')?.addEventListener('click', () => modal?.classList.add('hidden'));
    modal?.addEventListener('click', e => { if(e.target===modal) modal?.classList.add('hidden'); });
    document.getElementById('jambQcCreate')?.addEventListener('click', () => showJQCPanel('jambQcCreate2'));
    document.getElementById('jambQcBack')?.addEventListener('click', () => showJQCPanel('jambQcHome'));
    document.getElementById('jambQcJoin')?.addEventListener('click', () => {
      document.getElementById('jambJoinRow')?.classList.toggle('hidden');
    });
    document.getElementById('jambJoinConfirm')?.addEventListener('click', joinJambChallenge);
    document.getElementById('jambQcGenerate')?.addEventListener('click', generateJambChallenge);
    document.getElementById('jambQcShareLink')?.addEventListener('click', shareJambChallengeLink);
    document.getElementById('jambQcStartOwn')?.addEventListener('click', startJambChallengeAttempt);
    document.getElementById('jambQcNew')?.addEventListener('click', () => showJQCPanel('jambQcCreate2'));
    document.getElementById('jambQcDone')?.addEventListener('click', () => modal?.classList.add('hidden'));

    // Populate subject dropdown
    const sel = document.getElementById('jambQcSubject');
    if (sel) Object.keys(QUESTION_BANK).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = fmt(s);
      sel.appendChild(opt);
    });

    // Check URL for challenge code
    const params = new URLSearchParams(window.location.search);
    const code = params.get('challenge');
    if (code) {
      history.replaceState(null,'',window.location.pathname);
      openJambChallenge();
      document.getElementById('jambJoinCode').value = code;
      joinJambChallenge();
    }
  }

  function showJQCPanel(id) {
    ['jambQcHome','jambQcCreate2','jambQcShare2','jambQcLeaderboard'].forEach(p => {
      document.getElementById(p)?.classList.toggle('hidden', p !== id);
    });
  }

  function openJambChallenge() {
    if (!checkAccess()) { showPaywall('feature'); return; }
    if (!state.currentUser) { alert('Please log in first.'); return; }
    showJQCPanel('jambQcHome');
    document.getElementById('jambQuizModal')?.classList.remove('hidden');
  }

  function generateJambChallengeCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'JAMB-';
    for (let i=0;i<5;i++) code += chars[Math.floor(Math.random()*chars.length)];
    return code;
  }

  function generateJambChallenge() {
    const subject = document.getElementById('jambQcSubject')?.value;
    const count   = parseInt(document.getElementById('jambQcCount')?.value || '10');
    const pool    = QUESTION_BANK[subject] || [];
    if (!pool.length) { alert('No questions for this subject.'); return; }
    const selected = [...pool].sort(()=>Math.random()-.5).slice(0, count);
    const code     = generateJambChallengeCode();
    const challenges = loadPref(QC_STORE, {});
    challenges[code] = {
      code, subject, count,
      questions: selected,
      expires: Date.now() + 24*60*60*1000,
      creator: state.currentUser,
      scores: {},
    };
    savePref(QC_STORE, challenges);
    _currentChallengeCode = code;
    document.getElementById('jambCodeDisplay').textContent = code;
    showJQCPanel('jambQcShare2');
  }

  function shareJambChallengeLink() {
    if (!_currentChallengeCode) return;
    const url  = window.location.origin + window.location.pathname + '?challenge=' + _currentChallengeCode;
    const subj = document.getElementById('jambQcSubject')?.value || '';
    const text = `🏆 JAMB Challenge! Beat my score in ${fmt(subj)}.\n\nCode: ${_currentChallengeCode}\nLink: ${url}`;
    if (navigator.share) navigator.share({ title:'JAMB Challenge', text, url }).catch(()=>{});
    else navigator.clipboard?.writeText(text).then(()=>alert('Link copied!')).catch(()=>prompt('Copy:',url));
  }

  function joinJambChallenge() {
    const code = (document.getElementById('jambJoinCode')?.value||'').trim().toUpperCase();
    if (!code) return;
    const challenges = loadPref(QC_STORE, {});
    const challenge  = challenges[code];
    if (!challenge) { alert('Challenge not found.'); return; }
    if (Date.now() > challenge.expires) { alert('This challenge has expired.'); return; }
    _currentChallengeCode = code;
    startJambChallengeAttempt(challenge);
  }

  function startJambChallengeAttempt(challengeArg) {
    const challenges = loadPref(QC_STORE, {});
    const challenge  = challengeArg || challenges[_currentChallengeCode];
    if (!challenge) return;
    document.getElementById('jambQuizModal')?.classList.add('hidden');

    state.sessionType = 'single';
    state.mode = 'exam';
    state.subject = challenge.subject;
    state.currentQuestions = challenge.questions;
    state.answers = new Array(challenge.questions.length).fill(null);
    state.currentIndex = 0;
    state.reviewMode = false;
    state.chosenDurationMinutes = 10;
    state.student = state.currentUser;
    state._challengeCode = challenge.code;

    el.sidebarStudent.textContent = state.currentUser;
    el.sidebarMode.textContent = 'Challenge';
    buildQuestionPills();
    renderQuestion();
    showScreen('quiz');
  }

  /* ════════════════════════════════════════════════════
     SESSION SHARING
  ════════════════════════════════════════════════════ */
  function shareJambResult() {
    const r  = window._jambLastResult;
    const qs = window._jambLastQuestions || [];
    const as = window._jambLastAnswers  || [];
    if (!r) return;
    const payload = {
      r,
      q: qs.slice(0,10).map((q,i)=>({
        q: q.question,
        o: q.options,
        a: q.answer,
        ua: as[i],
      }))
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const url  = window.location.origin + window.location.pathname + '?session=' + encoded;
    const text = `🎯 ${r.student} scored ${r.percent}% in ${fmt(r.subject)} JAMB\n\nSee my full session:\n${url}\n\nThink you can beat it? 💪`;
    if (navigator.share) navigator.share({ title:'JAMB Result', text, url }).catch(()=>{});
    else navigator.clipboard?.writeText(text).then(()=>alert('Result link copied!')).catch(()=>prompt('Copy:',url));
  }

  function checkForSharedSession() {
    const params = new URLSearchParams(window.location.search);
    const data   = params.get('session');
    if (!data) return;
    history.replaceState(null,'',window.location.pathname);
    try {
      const payload = JSON.parse(decodeURIComponent(escape(atob(data))));
      showJambSharedSession(payload);
    } catch(e) { console.warn('Could not parse session:', e); }
  }

  function showJambSharedSession(payload) {
    const r   = payload.r;
    const modal = document.getElementById('jambSharedModal');
    if (!modal) return;
    const pct   = r.percent || 0;
    const emoji = pct>=70?'🏆':pct>=50?'🎯':'💪';
    const color = pct>=50?'#27ae60':'#e74c3c';
    document.getElementById('jambSsEmoji').textContent = emoji;
    document.getElementById('jambSsScore').textContent = pct + '%';
    document.getElementById('jambSsScore').style.color = color;
    document.getElementById('jambSsMeta').innerHTML = `<strong>${escHtml(r.student)}</strong> · ${escHtml(fmt(r.subject||'JAMB'))} · ${escHtml(r.mode||'')}`;
    document.getElementById('jambSsStats').innerHTML = `<span style="color:#27ae60">✓ ${r.correct} correct</span> · <span style="color:#e74c3c">✗ ${r.wrong} wrong</span> · <span>⊘ ${r.skipped} skipped</span>`;
    document.getElementById('jambSsClose')?.addEventListener('click', ()=>modal.classList.add('hidden'));
    modal.addEventListener('click', e=>{ if(e.target===modal) modal.classList.add('hidden'); });
    document.getElementById('jambSsTry')?.addEventListener('click', ()=>{
      modal.classList.add('hidden');
      showScreen('home');
    });
    modal.classList.remove('hidden');
  }

})();
