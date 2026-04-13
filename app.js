(() => {
  const storageKeys = {
    users: 'jamb-practice-users',
    currentUser: 'jamb-practice-current-user'
  };

  const el = {
    homeScreen: document.getElementById('homeScreen'),
    quizScreen: document.getElementById('quizScreen'),
    resultScreen: document.getElementById('resultScreen'),
    studentName: document.getElementById('studentName'),
    loginBtn: document.getElementById('loginBtn'),
    currentStudentBox: document.getElementById('currentStudentBox'),
    subjectSelect: document.getElementById('subjectSelect'),
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
    sidebarStudent: document.getElementById('sidebarStudent'),
    sidebarSubject: document.getElementById('sidebarSubject'),
    sidebarMode: document.getElementById('sidebarMode'),
    timerDisplay: document.getElementById('timerDisplay'),
    progressText: document.getElementById('progressText'),
    progressBar: document.getElementById('progressBar'),
    questionPills: document.getElementById('questionPills'),
    questionNumberBadge: document.getElementById('questionNumberBadge'),
    questionText: document.getElementById('questionText'),
    optionsList: document.getElementById('optionsList'),
    explanationBox: document.getElementById('explanationBox'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    submitBtn: document.getElementById('submitBtn'),
    backHomeBtn: document.getElementById('backHomeBtn'),
    resultScore: document.getElementById('resultScore'),
    resultSummary: document.getElementById('resultSummary'),
    resultBreakdown: document.getElementById('resultBreakdown'),
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
    student: '',
    reviewMode: false,
    timerId: null,
    timeLeft: 0,
    chosenDurationMinutes: null
  };

  init();

  function init() {
    populateSubjects();
    bindEvents();
    renderCurrentUser();
    renderStats();
    renderHistory();
    showScreen('home');
  }

  function populateSubjects() {
    const subjects = Object.keys(QUESTION_BANK);
    el.subjectSelect.innerHTML = subjects
      .map(subject => `<option value="${subject}">${formatSubject(subject)}</option>`)
      .join('');
    const totalQuestions = subjects.reduce((sum, subject) => sum + QUESTION_BANK[subject].length, 0);
    el.statQuestions.textContent = String(totalQuestions);
  }

  function bindEvents() {
    el.loginBtn.addEventListener('click', loginStudent);
    el.startBtn.addEventListener('click', startPractice);
    el.prevBtn.addEventListener('click', () => moveQuestion(-1));
    el.nextBtn.addEventListener('click', () => moveQuestion(1));
    el.submitBtn.addEventListener('click', finishQuiz);
    el.backHomeBtn.addEventListener('click', confirmExit);
    el.reviewBtn.addEventListener('click', enterReviewMode);
    el.restartBtn.addEventListener('click', () => showScreen('home'));
    el.resetProgressBtn.addEventListener('click', resetProgress);
    el.switchUserBtn.addEventListener('click', switchUser);
    el.modeSelect.addEventListener('change', syncDurationUi);
  }

  function loginStudent() {
    const name = normalizeName(el.studentName.value);
    if (!name) {
      window.alert('Enter a student name to continue.');
      return;
    }

    if (!state.users[name]) {
      state.users[name] = { history: [] };
    }

    state.currentUser = name;
    saveUsers(state.users);
    saveCurrentUser(name);
    renderCurrentUser();
    renderStats();
    renderHistory();
  }

  function startPractice() {
    if (!state.currentUser) {
      loginStudent();
      if (!state.currentUser) return;
    }

    const subject = el.subjectSelect.value;
    const mode = el.modeSelect.value;
    const pool = shuffle([...QUESTION_BANK[subject]]);
    const countValue = el.questionCountSelect.value;
    const selectedCount = countValue === 'all' ? pool.length : Math.min(Number(countValue), pool.length);

    state.currentQuestions = pool.slice(0, selectedCount);
    state.answers = new Array(selectedCount).fill(null);
    state.currentIndex = 0;
    state.mode = mode;
    state.subject = subject;
    state.student = state.currentUser;
    state.reviewMode = false;
    state.chosenDurationMinutes = getChosenDurationMinutes(selectedCount, mode);
    state.timeLeft = mode === 'exam' ? state.chosenDurationMinutes * 60 : 0;

    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }

    if (mode === 'exam') {
      startTimer();
    } else {
      el.timerDisplay.textContent = 'Practice';
    }

    el.sidebarStudent.textContent = state.student;
    el.sidebarSubject.textContent = formatSubject(subject);
    el.sidebarMode.textContent = mode === 'exam' ? `Exam · ${state.chosenDurationMinutes} min` : 'Practice Mode';

    buildQuestionPills();
    renderQuestion();
    showScreen('quiz');
  }

  function getChosenDurationMinutes(selectedCount, mode) {
    if (mode !== 'exam') return 0;
    const raw = el.durationSelect.value;
    if (raw === 'auto') return selectedCount;
    return Math.max(1, Number(raw) || selectedCount);
  }

  function syncDurationUi() {
    el.durationSelect.disabled = el.modeSelect.value !== 'exam';
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
    const minutes = Math.floor(Math.max(state.timeLeft, 0) / 60);
    const seconds = Math.max(state.timeLeft, 0) % 60;
    el.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function buildQuestionPills() {
    el.questionPills.innerHTML = '';
    state.currentQuestions.forEach((_, index) => {
      const button = document.createElement('button');
      button.className = 'pill';
      button.textContent = String(index + 1);
      button.addEventListener('click', () => {
        state.currentIndex = index;
        renderQuestion();
      });
      el.questionPills.appendChild(button);
    });
    syncPills();
  }

  function renderQuestion() {
    const current = state.currentQuestions[state.currentIndex];
    if (!current) return;

    el.questionNumberBadge.textContent = `Question ${state.currentIndex + 1}`;
    el.questionText.textContent = current.question;
    el.optionsList.innerHTML = '';

    current.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.className = 'option-btn';
      button.innerHTML = `<strong>${String.fromCharCode(65 + index)}.</strong> ${escapeHtml(option)}`;

      const selectedAnswer = state.answers[state.currentIndex];
      if (selectedAnswer === index) button.classList.add('selected');

      if (state.reviewMode || state.mode === 'practice') {
        if (selectedAnswer !== null) {
          if (index === current.answer) button.classList.add('correct');
          if (index === selectedAnswer && selectedAnswer !== current.answer) button.classList.add('wrong');
        }
      }

      button.addEventListener('click', () => selectAnswer(index));
      button.disabled = state.reviewMode;
      el.optionsList.appendChild(button);
    });

    const selected = state.answers[state.currentIndex];
    const shouldShowExplanation = state.mode === 'practice' && selected !== null;
    el.explanationBox.classList.toggle('hidden', !shouldShowExplanation);
    el.explanationBox.textContent = shouldShowExplanation ? current.explanation : '';

    el.prevBtn.disabled = state.currentIndex === 0;
    el.nextBtn.textContent = state.currentIndex === state.currentQuestions.length - 1 ? 'Finish' : 'Next';

    const answeredCount = state.answers.filter(answer => answer !== null).length;
    el.progressText.textContent = `${answeredCount}/${state.currentQuestions.length}`;
    el.progressBar.style.width = `${(answeredCount / state.currentQuestions.length) * 100}%`;
    syncPills();
  }

  function selectAnswer(index) {
    if (state.reviewMode) return;
    state.answers[state.currentIndex] = index;
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

  function syncPills() {
    [...el.questionPills.children].forEach((pill, index) => {
      pill.classList.toggle('current', index === state.currentIndex);
      pill.classList.toggle('answered', state.answers[index] !== null);
    });
  }

  function finishQuiz(fromTimeout = false) {
    if (!state.currentQuestions.length) return;
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }

    const correct = state.currentQuestions.reduce((sum, item, index) => (
      sum + (state.answers[index] === item.answer ? 1 : 0)
    ), 0);

    const total = state.currentQuestions.length;
    const wrong = state.answers.filter((ans, index) => ans !== null && ans !== state.currentQuestions[index].answer).length;
    const skipped = state.answers.filter(ans => ans === null).length;
    const percent = Math.round((correct / total) * 100);

    if (!state.users[state.currentUser]) {
      state.users[state.currentUser] = { history: [] };
    }

    const result = {
      student: state.student,
      subject: formatSubject(state.subject),
      mode: state.mode,
      durationMinutes: state.chosenDurationMinutes,
      total,
      correct,
      wrong,
      skipped,
      percent,
      completedByTimeout: fromTimeout,
      date: new Date().toLocaleString()
    };

    state.users[state.currentUser].history.unshift(result);
    state.users[state.currentUser].history = state.users[state.currentUser].history.slice(0, 50);
    saveUsers(state.users);

    el.resultScore.textContent = `${percent}%`;
    el.resultSummary.textContent = `${result.student} scored ${correct} out of ${total} in ${result.subject}${fromTimeout ? ' after time elapsed.' : '.'}`;
    el.resultBreakdown.innerHTML = [
      statCard('Correct', correct),
      statCard('Wrong', wrong),
      statCard('Skipped', skipped),
      statCard('Duration', result.mode === 'exam' ? `${result.durationMinutes} min` : 'Practice')
    ].join('');

    renderStats();
    renderHistory();
    showScreen('result');
  }

  function enterReviewMode() {
    state.reviewMode = true;
    state.currentIndex = 0;
    showScreen('quiz');
    renderQuestion();
  }

  function confirmExit() {
    const leave = window.confirm('Exit this practice session?');
    if (leave) {
      if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
      }
      showScreen('home');
    }
  }

  function switchUser() {
    if (state.timerId) {
      const ok = window.confirm('Switch student? Current running session will be closed.');
      if (!ok) return;
      clearInterval(state.timerId);
      state.timerId = null;
      showScreen('home');
    }
    state.currentUser = '';
    saveCurrentUser('');
    renderCurrentUser();
    renderStats();
    renderHistory();
    el.studentName.focus();
  }

  function showScreen(name) {
    el.homeScreen.classList.toggle('active', name === 'home');
    el.quizScreen.classList.toggle('active', name === 'quiz');
    el.resultScreen.classList.toggle('active', name === 'result');
  }

  function renderCurrentUser() {
    if (state.currentUser) {
      el.currentStudentBox.textContent = `Logged in as: ${state.currentUser}`;
      el.studentName.value = state.currentUser;
      el.historyTitle.textContent = `Showing saved results for ${state.currentUser}`;
    } else {
      el.currentStudentBox.textContent = 'No student logged in.';
      el.studentName.value = '';
      el.historyTitle.textContent = 'No student selected';
    }
    syncDurationUi();
  }

  function renderStats() {
    const history = getCurrentHistory();
    const sessions = history.length;
    const average = sessions ? Math.round(history.reduce((sum, item) => sum + item.percent, 0) / sessions) : 0;
    const best = sessions ? Math.max(...history.map(item => item.percent)) : 0;
    el.statSessions.textContent = String(sessions);
    el.statAverage.textContent = `${average}%`;
    el.statBest.textContent = `${best}%`;
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
      el.historyList.textContent = 'No practice history yet for this student.';
      return;
    }

    el.historyList.className = 'history-list';
    el.historyList.innerHTML = history.map(item => `
      <div class="history-item">
        <div>
          <strong>${escapeHtml(item.student)}</strong><br>
          <span class="muted" style="text-transform:none">${escapeHtml(item.subject)} · ${escapeHtml(item.date)}</span>
        </div>
        <div><strong>${item.percent}%</strong><br><span class="muted" style="text-transform:none">Score</span></div>
        <div><strong>${item.correct}/${item.total}</strong><br><span class="muted" style="text-transform:none">Correct</span></div>
        <div><strong>${item.mode === 'exam' ? 'Exam' : 'Practice'}</strong><br><span class="muted" style="text-transform:none">Mode</span></div>
        <div><strong>${item.mode === 'exam' ? `${item.durationMinutes || '-' } min` : '-'}</strong><br><span class="muted" style="text-transform:none">Time</span></div>
      </div>
    `).join('');
  }

  function getCurrentHistory() {
    if (!state.currentUser || !state.users[state.currentUser]) return [];
    return state.users[state.currentUser].history || [];
  }

  function resetProgress() {
    if (!state.currentUser) {
      window.alert('Login with a student name first.');
      return;
    }
    const ok = window.confirm(`This will erase saved results for ${state.currentUser} on this device. Continue?`);
    if (!ok) return;
    if (!state.users[state.currentUser]) {
      state.users[state.currentUser] = { history: [] };
    }
    state.users[state.currentUser].history = [];
    saveUsers(state.users);
    renderStats();
    renderHistory();
  }

  function loadUsers() {
    try {
      return JSON.parse(localStorage.getItem(storageKeys.users) || '{}');
    } catch (error) {
      return {};
    }
  }

  function saveUsers(value) {
    localStorage.setItem(storageKeys.users, JSON.stringify(value));
  }

  function loadCurrentUser() {
    return localStorage.getItem(storageKeys.currentUser) || '';
  }

  function saveCurrentUser(value) {
    localStorage.setItem(storageKeys.currentUser, value);
  }

  function statCard(label, value) {
    return `<div class="stat-box"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function formatSubject(value) {
    return value
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function normalizeName(value) {
    return value.replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
