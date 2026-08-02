/* ZimScope — student app logic (index.html) */

let currentUser = null;
let currentUserData = null;
let currentLang = "en";
let selectedGrade = null;
let selectedSubject = null;
let selectedContent = null;
let quizAnswers = [];

const screens = ["screen-auth", "screen-dashboard", "screen-grade", "screen-subject", "screen-library", "screen-progress"];

function showScreen(id) {
  screens.forEach(s => document.getElementById(s).classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

function t(key) {
  return (UI_LABELS[currentLang] && UI_LABELS[currentLang][key]) || UI_LABELS.en[key] || key;
}

function applyLabels() {
  document.querySelectorAll("[data-label]").forEach(el => {
    el.textContent = t(el.dataset.label);
  });
}

/* ---------- Auth ---------- */

auth.onAuthStateChanged(async user => {
  if (user) {
    currentUser = user;
    const doc = await db.collection("users").doc(user.uid).get();
    currentUserData = doc.exists ? doc.data() : null;
    if (!currentUserData) {
      // Safety net: user exists in Auth but not Firestore yet.
      currentUserData = { email: user.email, role: "student", grade: null };
      await db.collection("users").doc(user.uid).set({
        email: user.email, role: "student", grade: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    document.getElementById("welcome-name").textContent = t("welcomeBack") + ", " + currentUser.email;
    if (currentUserData.grade) {
      selectedGrade = currentUserData.grade;
    }
    renderGradeGrid();
    showScreen("screen-dashboard");
  } else {
    currentUser = null;
    currentUserData = null;
    showScreen("screen-auth");
  }
});

function initAuthForms() {
  document.getElementById("login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const errorEl = document.getElementById("login-error");
    errorEl.classList.add("hidden");
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      errorEl.textContent = describeAuthError(err);
      errorEl.classList.remove("hidden");
    }
  });

  document.getElementById("register-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const errorEl = document.getElementById("register-error");
    errorEl.classList.add("hidden");
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await db.collection("users").doc(cred.user.uid).set({
        email: email, role: "student", grade: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      errorEl.textContent = describeAuthError(err);
      errorEl.classList.remove("hidden");
    }
  });

  document.getElementById("show-register").addEventListener("click", () => {
    document.getElementById("login-panel").classList.add("hidden");
    document.getElementById("register-panel").classList.remove("hidden");
  });
  document.getElementById("show-login").addEventListener("click", () => {
    document.getElementById("register-panel").classList.add("hidden");
    document.getElementById("login-panel").classList.remove("hidden");
  });

  document.getElementById("logout-btn").addEventListener("click", () => auth.signOut());
}

function describeAuthError(err) {
  const map = {
    "auth/email-already-in-use": "That email is already registered. Try logging in instead.",
    "auth/invalid-email": "That email address does not look valid.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/user-not-found": "No account matches that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Incorrect email or password."
  };
  return map[err.code] || "Something went wrong. Please try again.";
}

/* ---------- Navigation ---------- */

function initNav() {
  document.getElementById("nav-dashboard").addEventListener("click", () => showScreen("screen-dashboard"));
  document.getElementById("nav-library").addEventListener("click", () => {
    if (!selectedGrade) { showScreen("screen-grade"); return; }
    showScreen("screen-grade");
  });
  document.getElementById("nav-progress").addEventListener("click", () => { showScreen("screen-progress"); renderProgress(); });
  document.getElementById("dashboard-choose-grade").addEventListener("click", () => showScreen("screen-grade"));

  document.getElementById("lang-select").addEventListener("change", e => {
    currentLang = e.target.value;
    applyLabels();
  });

  document.getElementById("back-to-grade").addEventListener("click", () => showScreen("screen-grade"));
  document.getElementById("back-to-subject").addEventListener("click", () => showScreen("screen-subject"));

  document.getElementById("tutor-toggle").addEventListener("click", () => {
    document.getElementById("tutor-panel").classList.toggle("hidden");
  });
  document.getElementById("tutor-close").addEventListener("click", () => {
    document.getElementById("tutor-panel").classList.add("hidden");
  });
}

/* ---------- Grade & subject selection ---------- */

function renderGradeGrid() {
  const grid = document.getElementById("grade-grid");
  grid.innerHTML = "";
  GRADE_ORDER.forEach(grade => {
    const info = GRADE_TIERS[grade];
    const btn = document.createElement("button");
    btn.className = "text-left border border-slate-300 rounded p-4 hover:border-emerald-800 focus:outline focus:outline-2 focus:outline-amber-600 bg-white";
    btn.innerHTML = '<div class="text-xs uppercase tracking-wide text-amber-700 font-semibold">' + info.tier + '</div>' +
      '<div class="text-lg font-semibold text-slate-800 mt-1">' + grade + '</div>' +
      '<div class="text-sm text-slate-500 mt-1">' + info.subjects.length + ' subjects</div>';
    btn.addEventListener("click", () => selectGrade(grade));
    grid.appendChild(btn);
  });
}

async function selectGrade(grade) {
  selectedGrade = grade;
  if (currentUserData && currentUserData.grade !== grade) {
    currentUserData.grade = grade;
    await db.collection("users").doc(currentUser.uid).update({ grade: grade });
  }
  document.getElementById("subject-grade-title").textContent = grade;
  renderSubjectGrid(grade);
  showScreen("screen-subject");
}

function renderSubjectGrid(grade) {
  const grid = document.getElementById("subject-grid");
  grid.innerHTML = "";
  GRADE_TIERS[grade].subjects.forEach(subject => {
    const btn = document.createElement("button");
    btn.className = "text-left border border-slate-300 rounded p-4 hover:border-emerald-800 focus:outline focus:outline-2 focus:outline-amber-600 bg-white";
    btn.innerHTML = '<div class="text-base font-semibold text-slate-800">' + subject + '</div>';
    btn.addEventListener("click", () => selectSubject(grade, subject));
    grid.appendChild(btn);
  });
}

async function selectSubject(grade, subject) {
  selectedSubject = subject;
  document.getElementById("library-title").textContent = subject + " — " + grade;
  showScreen("screen-library");
  await loadLessons(grade, subject);
}

/* ---------- Content library ---------- */

async function loadLessons(grade, subject) {
  const listEl = document.getElementById("lesson-list");
  const readerEl = document.getElementById("reader-frame");
  listEl.innerHTML = '<div class="text-sm text-slate-500 p-2">Loading...</div>';
  readerEl.innerHTML = '<div class="text-slate-400">Select a lesson from the list.</div>';

  const snap = await db.collection("content")
    .where("grade", "==", grade)
    .where("subject", "==", subject)
    .get();

  if (snap.empty) {
    listEl.innerHTML = '<div class="text-sm text-slate-500 p-2" data-label="noContent">' + t("noContent") + '</div>';
    return;
  }

  listEl.innerHTML = "";
  snap.forEach(doc => {
    const data = doc.data();
    const item = document.createElement("button");
    item.className = "w-full text-left px-3 py-2 border-b border-slate-200 hover:bg-slate-50";
    item.innerHTML = '<div class="text-xs uppercase tracking-wide text-amber-700">' + (data.topic || "") + '</div>' +
      '<div class="text-sm font-medium text-slate-800">' + data.title + '</div>';
    item.addEventListener("click", () => openLesson(doc.id, data));
    listEl.appendChild(item);
  });

  // Auto-open the first lesson.
  const first = snap.docs[0];
  openLesson(first.id, first.data());
}

function openLesson(id, data) {
  selectedContent = { id, ...data };
  const readerEl = document.getElementById("reader-frame");
  const paragraphs = (data.body || "").split("\n\n").map(p => "<p>" + escapeHtml(p) + "</p>").join("");
  readerEl.innerHTML = '<h2>' + escapeHtml(data.title) + '</h2>' + paragraphs;

  const hasQuiz = Array.isArray(data.quiz) && data.quiz.length > 0;
  const assessBtn = document.getElementById("start-assessment-btn");
  assessBtn.classList.toggle("hidden", !hasQuiz);
  assessBtn.onclick = () => startQuiz(data);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Quiz engine ---------- */

function startQuiz(content) {
  quizAnswers = new Array(content.quiz.length).fill(null);
  const modal = document.getElementById("quiz-modal");
  const form = document.getElementById("quiz-form");
  form.innerHTML = "";

  content.quiz.forEach((q, qi) => {
    const block = document.createElement("fieldset");
    block.className = "mb-5 border-b border-slate-200 pb-4";
    const legend = document.createElement("legend");
    legend.className = "font-medium text-slate-800 mb-2";
    legend.textContent = (qi + 1) + ". " + q.question;
    block.appendChild(legend);

    q.options.forEach((opt, oi) => {
      const label = document.createElement("label");
      label.className = "flex items-center gap-2 py-1 text-sm text-slate-700 cursor-pointer";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "q" + qi;
      input.value = oi;
      input.className = "accent-emerald-800";
      input.addEventListener("change", () => { quizAnswers[qi] = oi; });
      label.appendChild(input);
      label.appendChild(document.createTextNode(opt));
      block.appendChild(label);
    });
    form.appendChild(block);
  });

  document.getElementById("quiz-result").classList.add("hidden");
  document.getElementById("quiz-submit-btn").classList.remove("hidden");
  modal.classList.remove("hidden");
}

function initQuizModal() {
  document.getElementById("quiz-close").addEventListener("click", () => {
    document.getElementById("quiz-modal").classList.add("hidden");
  });
  document.getElementById("quiz-submit-btn").addEventListener("click", submitQuiz);
}

async function submitQuiz() {
  const content = selectedContent;
  let correct = 0;
  content.quiz.forEach((q, qi) => {
    if (quizAnswers[qi] === q.correctIndex) correct++;
  });
  const total = content.quiz.length;

  const resultEl = document.getElementById("quiz-result");
  resultEl.classList.remove("hidden");
  resultEl.innerHTML = '<div class="font-semibold text-slate-800">' + t("yourScore") + ': ' + correct + ' / ' + total + '</div>';
  document.getElementById("quiz-submit-btn").classList.add("hidden");

  const scoreId = currentUser.uid + "_" + content.id;
  await db.collection("scores").doc(scoreId).set({
    uid: currentUser.uid,
    contentId: content.id,
    grade: selectedGrade,
    subject: selectedSubject,
    title: content.title,
    score: correct,
    total: total,
    takenAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/* ---------- Progress ---------- */

async function renderProgress() {
  const listEl = document.getElementById("progress-list");
  listEl.innerHTML = '<div class="text-sm text-slate-500">Loading...</div>';
  const snap = await db.collection("scores").where("uid", "==", currentUser.uid).get();
  if (snap.empty) {
    listEl.innerHTML = '<div class="text-sm text-slate-500">No assessments taken yet.</div>';
    return;
  }
  listEl.innerHTML = "";
  const rows = [];
  snap.forEach(doc => rows.push(doc.data()));
  rows.sort((a, b) => (b.takenAt && a.takenAt) ? b.takenAt.seconds - a.takenAt.seconds : 0);
  rows.forEach(r => {
    const row = document.createElement("div");
    row.className = "flex justify-between items-center border-b border-slate-200 py-2";
    row.innerHTML = '<div><div class="text-sm font-medium text-slate-800">' + r.title + '</div>' +
      '<div class="text-xs text-slate-500">' + r.grade + ' · ' + r.subject + '</div></div>' +
      '<div class="text-sm font-semibold text-emerald-900">' + r.score + ' / ' + r.total + '</div>';
    listEl.appendChild(row);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initAuthForms();
  initNav();
  initQuizModal();
});
