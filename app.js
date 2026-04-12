(function () {
  'use strict';

  const storageKeys = {
    history: 'jamb_practice_history_v1'
  };

  const el = {
    homeScreen: document.getElementById('homeScreen'),
    quizScreen: document.getElementById('quizScreen'),
    resultScreen: document.getElementById('resultScreen'),
    studentName: document.getElementById('studentName'),
    subjectSelect: document.getElementById('subjectSelect'),
    modeSelect: document.getElementById('modeSelect'),
    questionCountSelect: document.getElementById('questionCountSelect'),
    startBtn: document.getElementById('startBtn'),
    statSessions: document.getElementById('statSessions'),
    statAverage: document.getElementById('statAverage'),
    statBest: document.getElementById('statBest'),
    statQuestions: document.getElementById('statQuestions'),
    historyList: document.getElementById('historyList'),
    resetProgressBtn: document.getElementById('resetProgressBtn'),
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
    history: loadHistory(),
    currentQuestions: [],
    answers: [],
    currentIndex: 0,
    mode: 'practice',
    subject: '',
    student: '',
    reviewMode: false,
    timerId: null,
    timeLeft: 0
  };

  init();

  function init() {
    populateSubjects();
    bindEvents();
    renderStats();
    renderHistory();
    showScreen('home');
  }

  function populateSubjects() {
    const subjects = Object.keys(QUESTION_BANK);
    el.subjectSelect.innerHTML = subjects
      .map(subject => `<option value="${subject}">${capitalize(subject)}</option>`)
      .join('');
    const totalQuestions = subjects.reduce((sum, subject) => sum + QUESTION_BANK[subject].length, 0);
    el.statQuestions.textContent = String(totalQuestions);
  }

  function bindEvents() {
    el.startBtn.addEventListener('click', startPractice);
    el.prevBtn.addEventListener('click', () => moveQuestion(-1));
    el.nextBtn.addEventListener('click', () => moveQuestion(1));
    el.submitBtn.addEventListener('click', finishQuiz);
    el.backHomeBtn.addEventListener('click', confirmExit);
    el.reviewBtn.addEventListener('click', enterReviewMode);
    el.restartBtn.addEventListener('click', () => showScreen('home'));
    el.resetProgressBtn.addEventListener('click', resetProgress);
  }

  function startPractice() {
    const student = el.studentName.value.trim() || 'Student';
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
    state.student = student;
    state.reviewMode = false;
    state.timeLeft = mode === 'exam' ? selectedCount * 60 : 0;

    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }

    if (mode === 'exam') {
      startTimer();
    } else {
      el.timerDisplay.textContent = 'Practice';
    }

    el.sidebarStudent.textContent = student;
    el.sidebarSubject.textContent = capitalize(subject);
    el.sidebarMode.textContent = mode === 'exam' ? 'Exam Mode' : 'Practice Mode';

    buildQuestionPills();
    renderQuestion();
    showScreen('quiz');
  }

  function startTimer() {
    updateTimerDisplay();
    state.timerId = setInterval(() => {
      state.timeLeft -= 1;
      updateTimerDisplay();
      if (state.timeLeft <= 0) {
        clearInterval(state.timerId);
        state.timerId = null;
        finishQuiz();
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
      button.innerHTML = `<strong>${String.fromCharCode(65 + index)}.</strong> ${option}`;

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
      finishQuiz();
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

  function finishQuiz() {
    if (!state.currentQuestions.length) return;
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }

    const correct = state.currentQuestions.reduce((sum, item, index) => {
      return sum + (state.answers[index] === item.answer ? 1 : 0);
    }, 0);

    const total = state.currentQuestions.length;
    const wrong = state.answers.filter((ans, index) => ans !== null && ans !== state.currentQuestions[index].answer).length;
    const skipped = state.answers.filter(ans => ans === null).length;
    const percent = Math.round((correct / total) * 100);

    const result = {
      student: state.student,
      subject: capitalize(state.subject),
      mode: state.mode,
      total,
      correct,
      wrong,
      skipped,
      percent,
      date: new Date().toLocaleString()
    };

    state.history.unshift(result);
    state.history = state.history.slice(0, 20);
    saveHistory(state.history);

    el.resultScore.textContent = `${percent}%`;
    el.resultSummary.textContent = `${result.student} scored ${correct} out of ${total} in ${result.subject}.`;
    el.resultBreakdown.innerHTML = [
      statCard('Correct', correct),
      statCard('Wrong', wrong),
      statCard('Skipped', skipped),
      statCard('Mode', result.mode === 'exam' ? 'Exam' : 'Practice')
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

  function showScreen(name) {
    el.homeScreen.classList.toggle('active', name === 'home');
    el.quizScreen.classList.toggle('active', name === 'quiz');
    el.resultScreen.classList.toggle('active', name === 'result');
  }

  function renderStats() {
    const sessions = state.history.length;
    const average = sessions ? Math.round(state.history.reduce((sum, item) => sum + item.percent, 0) / sessions) : 0;
    const best = sessions ? Math.max(...state.history.map(item => item.percent)) : 0;
    el.statSessions.textContent = String(sessions);
    el.statAverage.textContent = `${average}%`;
    el.statBest.textContent = `${best}%`;
  }

  function renderHistory() {
    if (!state.history.length) {
      el.historyList.className = 'history-list empty-state';
      el.historyList.textContent = 'No practice history yet.';
      return;
    }

    el.historyList.className = 'history-list';
    el.historyList.innerHTML = state.history.map(item => `
      <div class="history-item">
        <div>
          <strong>${escapeHtml(item.student)}</strong><br>
          <span class="muted" style="text-transform:none">${escapeHtml(item.subject)} · ${escapeHtml(item.date)}</span>
        </div>
        <div><strong>${item.percent}%</strong><br><span class="muted" style="text-transform:none">Score</span></div>
        <div><strong>${item.correct}/${item.total}</strong><br><span class="muted" style="text-transform:none">Correct</span></div>
        <div><strong>${item.mode === 'exam' ? 'Exam' : 'Practice'}</strong><br><span class="muted" style="text-transform:none">Mode</span></div>
      </div>
    `).join('');
  }

  function resetProgress() {
    const ok = window.confirm('This will erase saved results on this device. Continue?');
    if (!ok) return;
    state.history = [];
    saveHistory(state.history);
    renderStats();
    renderHistory();
  }

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(storageKeys.history) || '[]');
    } catch (error) {
      return [];
    }
  }

  function saveHistory(value) {
    localStorage.setItem(storageKeys.history, JSON.stringify(value));
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

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
