/*
  ZimScope — AI Tutor
  -------------------
  This wires the chat panel in index.html to a real LLM API call.

  PASTE YOUR API KEY BELOW. Leaving it blank shows a clear in-app notice
  instead of a fake response.

  IMPORTANT — read before deploying:
  Calling most LLM APIs (Anthropic, OpenAI) directly from client-side
  JavaScript exposes your API key to anyone who opens the browser dev tools,
  and most providers block direct browser calls with CORS for this reason.
  For a real deployment, put a small server between the browser and the
  API — a single Firebase Cloud Function works well — and have this file
  call your function's URL instead of the provider directly. The fetch
  logic below is written so that swapping the endpoint is the only change
  needed: change TUTOR_ENDPOINT and the request body shape to match
  whichever you use.
*/

// ===== PASTE YOUR API KEY / ENDPOINT HERE =====
const TUTOR_API_KEY = ""; // e.g. "sk-ant-..." — leave blank until you have one
const TUTOR_ENDPOINT = "https://api.anthropic.com/v1/messages"; // swap for your proxy URL in production
const TUTOR_MODEL = "claude-sonnet-4-6";
// ================================================

const TUTOR_SYSTEM_PROMPT = "You are the ZimScope AI Tutor, a patient study assistant for a Zimbabwean primary school " +
  "student following the MoPSE curriculum. Explain concepts simply, use examples relevant to Zimbabwe where natural, " +
  "and keep answers short and encouraging. If asked something far outside primary-school study help, gently redirect " +
  "the student back to their schoolwork.";

let tutorHistory = [];

function initTutor() {
  const form = document.getElementById("tutor-form");
  if (!form) return;
  form.addEventListener("submit", handleTutorSubmit);
  renderTutorNotice();
}

function renderTutorNotice() {
  const notice = document.getElementById("tutor-key-notice");
  if (!notice) return;
  if (!TUTOR_API_KEY) {
    notice.classList.remove("hidden");
    notice.textContent = "No API key has been added yet. Paste one into ai-tutor.js (TUTOR_API_KEY) to activate the tutor.";
  } else {
    notice.classList.add("hidden");
  }
}

async function handleTutorSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("tutor-input");
  const question = input.value.trim();
  if (!question) return;

  appendTutorMessage("student", question);
  input.value = "";
  input.disabled = true;

  if (!TUTOR_API_KEY) {
    appendTutorMessage("tutor", "The tutor is not connected yet. Once an API key is added, this message will be replaced with a real answer.");
    input.disabled = false;
    return;
  }

  appendTutorMessage("tutor", "Thinking...", true);

  try {
    const reply = await callTutorAPI(question);
    replaceLastTutorMessage(reply);
  } catch (err) {
    replaceLastTutorMessage("The tutor could not reach the API. Check the API key and endpoint in ai-tutor.js. (" + err.message + ")");
  } finally {
    input.disabled = false;
    input.focus();
  }
}

async function callTutorAPI(question) {
  tutorHistory.push({ role: "user", content: question });

  const response = await fetch(TUTOR_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": TUTOR_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: TUTOR_MODEL,
      max_tokens: 500,
      system: TUTOR_SYSTEM_PROMPT,
      messages: tutorHistory
    })
  });

  if (!response.ok) {
    throw new Error("Request failed with status " + response.status);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find(block => block.type === "text");
  const answer = textBlock ? textBlock.text : "No answer was returned.";
  tutorHistory.push({ role: "assistant", content: answer });
  return answer;
}

function appendTutorMessage(sender, text, isTemp) {
  const log = document.getElementById("tutor-log");
  if (!log) return;
  const row = document.createElement("div");
  row.className = sender === "student" ? "flex justify-end" : "flex justify-start";
  if (isTemp) row.dataset.temp = "true";

  const bubble = document.createElement("div");
  bubble.className = sender === "student"
    ? "max-w-[80%] rounded border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-800"
    : "max-w-[80%] rounded border border-emerald-800 bg-emerald-900 px-3 py-2 text-sm text-white";
  bubble.textContent = text;

  row.appendChild(bubble);
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}

function replaceLastTutorMessage(text) {
  const log = document.getElementById("tutor-log");
  if (!log) return;
  const temp = log.querySelector('[data-temp="true"]');
  if (temp) {
    temp.querySelector("div").textContent = text;
    temp.removeAttribute("data-temp");
  } else {
    appendTutorMessage("tutor", text);
  }
}

document.addEventListener("DOMContentLoaded", initTutor);
