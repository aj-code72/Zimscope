/* ZimScope — admin panel logic (admin.html) */

let adminUser = null;
let quizBuilderRows = [];
let editingContentId = null;

auth.onAuthStateChanged(async user => {
  const gate = document.getElementById("admin-gate");
  const panel = document.getElementById("admin-panel");
  if (!user) {
    adminUser = null;
    gate.classList.remove("hidden");
    panel.classList.add("hidden");
    return;
  }
  const doc = await db.collection("users").doc(user.uid).get();
  const data = doc.exists ? doc.data() : null;
  if (!data || data.role !== "admin") {
    document.getElementById("admin-login-error").textContent =
      "This account does not have admin access. Ask an existing admin to set your role to \"admin\" in Firestore.";
    document.getElementById("admin-login-error").classList.remove("hidden");
    gate.classList.remove("hidden");
    panel.classList.add("hidden");
    await auth.signOut();
    return;
  }
  adminUser = user;
  gate.classList.add("hidden");
  panel.classList.remove("hidden");
  populateGradeSelect();
  loadContentList();
});

function initAdminAuth() {
  document.getElementById("admin-login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("admin-email").value.trim();
    const password = document.getElementById("admin-password").value;
    const errorEl = document.getElementById("admin-login-error");
    errorEl.classList.add("hidden");
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      errorEl.textContent = "Log in failed. Check the email and password.";
      errorEl.classList.remove("hidden");
    }
  });
  document.getElementById("admin-logout-btn").addEventListener("click", () => auth.signOut());
}

function populateGradeSelect() {
  const select = document.getElementById("content-grade");
  select.innerHTML = "";
  GRADE_ORDER.forEach(grade => {
    const opt = document.createElement("option");
    opt.value = grade;
    opt.textContent = grade;
    select.appendChild(opt);
  });
  populateSubjectSelect(GRADE_ORDER[0]);
  select.addEventListener("change", () => populateSubjectSelect(select.value));
}

function populateSubjectSelect(grade) {
  const select = document.getElementById("content-subject");
  select.innerHTML = "";
  GRADE_TIERS[grade].subjects.forEach(subject => {
    const opt = document.createElement("option");
    opt.value = subject;
    opt.textContent = subject;
    select.appendChild(opt);
  });
}

/* ---------- Quiz builder ---------- */

function addQuizRow(prefill) {
  const id = "q" + Date.now() + Math.random().toString(36).slice(2, 6);
  quizBuilderRows.push(id);
  const container = document.getElementById("quiz-builder");
  const row = document.createElement("div");
  row.id = id;
  row.className = "border border-slate-200 rounded p-3 mb-3";
  row.innerHTML =
    '<div class="flex justify-between items-center mb-2">' +
      '<span class="text-xs uppercase tracking-wide text-slate-500 font-semibold">Question</span>' +
      '<button type="button" data-remove="' + id + '" class="text-xs text-red-700">Remove</button>' +
    '</div>' +
    '<input type="text" class="q-text w-full border border-slate-300 rounded px-2 py-1 mb-2 text-sm" placeholder="Question text" value="' + (prefill ? escapeAttr(prefill.question) : "") + '" />' +
    '<div class="grid grid-cols-1 gap-2">' +
      [0, 1, 2, 3].map(i =>
        '<div class="flex items-center gap-2">' +
          '<input type="radio" name="correct-' + id + '" class="q-correct" value="' + i + '" ' + (prefill && prefill.correctIndex === i ? "checked" : (i === 0 && !prefill ? "checked" : "")) + ' />' +
          '<input type="text" class="q-option flex-1 border border-slate-300 rounded px-2 py-1 text-sm" placeholder="Option ' + (i + 1) + '" value="' + (prefill ? escapeAttr(prefill.options[i]) : "") + '" />' +
        '</div>'
      ).join("") +
    '</div>';
  container.appendChild(row);
  row.querySelector("[data-remove]").addEventListener("click", () => {
    quizBuilderRows = quizBuilderRows.filter(r => r !== id);
    row.remove();
  });
}

function escapeAttr(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function collectQuiz() {
  const quiz = [];
  quizBuilderRows.forEach(id => {
    const row = document.getElementById(id);
    if (!row) return;
    const question = row.querySelector(".q-text").value.trim();
    const options = Array.from(row.querySelectorAll(".q-option")).map(el => el.value.trim());
    const correctRadio = row.querySelector(".q-correct:checked");
    if (!question || options.some(o => !o) || !correctRadio) return;
    quiz.push({ question, options, correctIndex: parseInt(correctRadio.value, 10) });
  });
  return quiz;
}

function resetContentForm() {
  editingContentId = null;
  document.getElementById("content-form").reset();
  document.getElementById("quiz-builder").innerHTML = "";
  quizBuilderRows = [];
  addQuizRow();
  document.getElementById("form-mode-label").textContent = "Post new lesson";
  document.getElementById("content-submit-btn").textContent = "Post lesson";
}

/* ---------- Save / list / edit / delete ---------- */

function initContentForm() {
  document.getElementById("add-quiz-row-btn").addEventListener("click", () => addQuizRow());
  document.getElementById("content-form").addEventListener("submit", async e => {
    e.preventDefault();
    const grade = document.getElementById("content-grade").value;
    const subject = document.getElementById("content-subject").value;
    const topic = document.getElementById("content-topic").value.trim();
    const title = document.getElementById("content-title").value.trim();
    const body = document.getElementById("content-body").value.trim();
    const quiz = collectQuiz();
    const statusEl = document.getElementById("content-status");

    const payload = {
      grade, subject, topic, title, body, quiz,
      createdBy: adminUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      if (editingContentId) {
        await db.collection("content").doc(editingContentId).update(payload);
        statusEl.textContent = "Lesson updated.";
      } else {
        await db.collection("content").add(payload);
        statusEl.textContent = "Lesson posted.";
      }
      statusEl.classList.remove("hidden", "text-red-700");
      statusEl.classList.add("text-emerald-800");
      resetContentForm();
      loadContentList();
    } catch (err) {
      statusEl.textContent = "Could not save: " + err.message;
      statusEl.classList.remove("hidden", "text-emerald-800");
      statusEl.classList.add("text-red-700");
    }
  });

  document.getElementById("content-cancel-btn").addEventListener("click", resetContentForm);
  addQuizRow();
}

async function loadContentList() {
  const listEl = document.getElementById("content-list");
  listEl.innerHTML = '<div class="text-sm text-slate-500 p-2">Loading...</div>';
  const snap = await db.collection("content").get();
  if (snap.empty) {
    listEl.innerHTML = '<div class="text-sm text-slate-500 p-2">No lessons posted yet.</div>';
    return;
  }
  listEl.innerHTML = "";
  snap.forEach(doc => {
    const data = doc.data();
    const row = document.createElement("div");
    row.className = "flex justify-between items-center border-b border-slate-200 py-2";
    row.innerHTML =
      '<div><div class="text-sm font-medium text-slate-800">' + escapeHtmlAdmin(data.title) + '</div>' +
      '<div class="text-xs text-slate-500">' + data.grade + ' · ' + data.subject + ' · ' + (data.quiz ? data.quiz.length : 0) + ' quiz questions</div></div>' +
      '<div class="flex gap-2">' +
        '<button data-edit="' + doc.id + '" class="text-xs text-emerald-900 font-medium">Edit</button>' +
        '<button data-delete="' + doc.id + '" class="text-xs text-red-700 font-medium">Delete</button>' +
      '</div>';
    listEl.appendChild(row);
    row.querySelector("[data-edit]").addEventListener("click", () => loadIntoForm(doc.id, data));
    row.querySelector("[data-delete]").addEventListener("click", () => deleteContent(doc.id));
  });
}

function escapeHtmlAdmin(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function loadIntoForm(id, data) {
  editingContentId = id;
  document.getElementById("content-grade").value = data.grade;
  populateSubjectSelect(data.grade);
  document.getElementById("content-subject").value = data.subject;
  document.getElementById("content-topic").value = data.topic || "";
  document.getElementById("content-title").value = data.title || "";
  document.getElementById("content-body").value = data.body || "";
  document.getElementById("quiz-builder").innerHTML = "";
  quizBuilderRows = [];
  (data.quiz || []).forEach(q => addQuizRow(q));
  if (!data.quiz || data.quiz.length === 0) addQuizRow();
  document.getElementById("form-mode-label").textContent = "Editing: " + data.title;
  document.getElementById("content-submit-btn").textContent = "Save changes";
  window.scrollTo({ top: 0 });
}

async function deleteContent(id) {
  if (!confirm("Delete this lesson? This cannot be undone.")) return;
  await db.collection("content").doc(id).delete();
  loadContentList();
}

document.addEventListener("DOMContentLoaded", () => {
  initAdminAuth();
  initContentForm();
});
