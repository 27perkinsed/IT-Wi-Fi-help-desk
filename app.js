// Keep each answer and its matching terms together so new FAQs are easy to add.
const faqs = [
  {
    question: "Can’t connect to Wi-Fi?",
    answer: "Check that Wi-Fi is turned on and Airplane mode is off. Try reconnecting to your usual network. If it still doesn’t work, restart your device and check whether other devices can connect.",
    icon: "⌁",
    keywords: ["wifi", "wireless", "internet", "network", "connect", "connection", "connectivity", "airplane mode"]
  },
  {
    question: "Need to reset your password?",
    answer: "Use your organization’s official password reset page or contact your IT team for guidance. Never share your password or verification codes in a help request.",
    icon: "◇",
    keywords: ["password", "reset", "account", "signin", "login", "locked", "forgot", "forget"]
  },
  {
    question: "Printer not printing?",
    answer: "Make sure the printer is powered on and shows no paper or ink warnings. Check that you selected the right printer, then try printing again. If it’s offline, ask IT to check the connection.",
    icon: "▤",
    keywords: ["printer", "print", "printing", "paper", "jam", "offline", "queue", "ink"]
  }
];

const faqList = document.querySelector("#faq-list");

function renderFaqs() {
  faqs.forEach((faq) => {
    const card = document.createElement("article");
    card.className = "faq-card";
    card.dataset.search = faq.keywords.join(" ");

    const icon = document.createElement("span");
    icon.className = "faq-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = faq.icon;

    const question = document.createElement("h3");
    question.textContent = faq.question;

    const answer = document.createElement("p");
    answer.textContent = faq.answer;

    card.append(icon, question, answer);
    faqList.append(card);
  });
}

renderFaqs();

// Apply a saved theme when available; the page stays light if storage is blocked.
const themeSelect = document.querySelector("#theme-select");
const themeStorageKey = "it-help-desk-theme";

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeSelect.value = theme;
}

try {
  const savedTheme = window.localStorage.getItem(themeStorageKey);
  if (savedTheme === "light" || savedTheme === "dark") {
    applyTheme(savedTheme);
  }
} catch {
  // Storage may be disabled by the browser; the default light theme still works.
}

themeSelect.addEventListener("change", () => {
  const selectedTheme = themeSelect.value;
  applyTheme(selectedTheme);

  try {
    window.localStorage.setItem(themeStorageKey, selectedTheme);
  } catch {
    // Keep the selected theme for this page even when storage is unavailable.
  }
});

// Normalize common ways of writing the same IT terms.
function normalizeText(text) {
  return text.toLowerCase()
    .replace(/wi[\s-]?fi/g, "wifi")
    .replace(/sign[\s-]?in|log[\s-]?in/g, "signin")
    .replace(/\bwireless\b/g, "wifi")
    .replace(/\binternet\b|\bnetwork\b/g, "wifi")
    .replace(/\b(connecting|connected|connectivity)\b/g, "connect")
    .replace(/\b(printers|printing|printed|prints)\b/g, "print")
    .replace(/\b(reset|resets|resetting)\b/g, "reset")
    .replace(/\b(forgot|forgetting)\b/g, "forgot");
}

function getWords(text) {
  return normalizeText(text).match(/[a-z0-9]+/g) || [];
}

// Filter FAQ cards by their question, answer, and keywords.
const searchInput = document.querySelector("#faq-search");
const faqCards = [...document.querySelectorAll(".faq-card")];
const noResults = document.querySelector("#no-results");
const searchStatus = document.querySelector("#search-status");

searchInput.addEventListener("input", () => {
  const query = normalizeText(searchInput.value.trim());
  let visibleCount = 0;

  faqCards.forEach((card) => {
    const searchableText = normalizeText(`${card.textContent} ${card.dataset.search}`);
    const matches = searchableText.includes(query);
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  });

  noResults.hidden = visibleCount > 0;
  searchStatus.textContent = query
    ? visibleCount > 0
      ? `${visibleCount} ${visibleCount === 1 ? "answer" : "answers"} found.`
      : "No matching FAQs. Try another search or create a help request."
    : "";
});

// Match only terms represented in an FAQ; never create a new answer.
const assistantForm = document.querySelector("#assistant-form");
const assistantQuestion = document.querySelector("#assistant-question");
const conversation = document.querySelector("#conversation");
const assistantError = document.querySelector("#assistant-error");
const commonWords = new Set([
  "a", "an", "and", "are", "can", "do", "does", "for", "how", "i", "in",
  "is", "it", "me", "my", "of", "on", "or", "the", "to", "what", "when",
  "where", "which", "who", "why", "with", "you", "your"
]);

function findFaqs(question) {
  const questionWords = new Set(
    getWords(question).filter((word) => word.length > 1 && !commonWords.has(word))
  );
  const matches = faqs.map((faq) => {
    const faqWords = new Set(getWords(`${faq.question} ${faq.keywords.join(" ")}`));
    const score = [...questionWords].filter((word) => faqWords.has(word)).length;
    return { faq, score };
  }).filter((match) => match.score > 0);

  matches.sort((first, second) => second.score - first.score);
  return matches.map((match) => match.faq);
}

function addChatMessage(className, label, text) {
  const message = document.createElement("article");
  message.className = `chat-message ${className}`;

  const messageLabel = document.createElement("p");
  messageLabel.className = "message-label";
  messageLabel.textContent = label;

  const messageText = document.createElement("p");
  messageText.textContent = text;

  message.append(messageLabel, messageText);
  conversation.append(message);
}

function addAnswer(faq) {
  addChatMessage("assistant-message", "IT helper", `${faq.question} ${faq.answer}`);
}

function addFaqSuggestions(suggestions) {
  const message = document.createElement("article");
  message.className = "chat-message assistant-message";

  const label = document.createElement("p");
  label.className = "message-label";
  label.textContent = "IT helper";

  const prompt = document.createElement("p");
  prompt.textContent = "A few FAQs may help. Choose the closest question:";

  const list = document.createElement("div");
  list.className = "faq-suggestions";
  list.setAttribute("role", "group");
  list.setAttribute("aria-label", "Suggested FAQ questions");

  suggestions.forEach((faq) => {
    const button = document.createElement("button");
    button.className = "suggestion-button";
    button.type = "button";
    button.textContent = faq.question;
    button.addEventListener("click", () => {
      list.querySelectorAll("button").forEach((suggestion) => {
        suggestion.disabled = true;
      });
      addChatMessage("user-message", "You selected", faq.question);
      addAnswer(faq);
      assistantQuestion.focus();
    });
    list.append(button);
  });

  message.append(label, prompt, list);
  conversation.append(message);
  list.querySelector("button").focus();
}

assistantQuestion.addEventListener("input", () => {
  assistantError.hidden = true;
  assistantError.textContent = "";
});

assistantQuestion.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    assistantForm.requestSubmit();
  }
});

assistantForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = assistantQuestion.value.trim();

  if (!question) {
    assistantError.textContent = "Type a question before selecting Ask.";
    assistantError.hidden = false;
    assistantQuestion.focus();
    return;
  }

  addChatMessage("user-message", "You", question);

  const matches = findFaqs(question);
  if (matches.length === 1) {
    addAnswer(matches[0]);
  } else if (matches.length > 1) {
    addFaqSuggestions(matches.slice(0, 3));
  } else {
    addChatMessage(
      "assistant-message",
      "IT helper",
      "I don’t know that one yet. Try searching the FAQs or submit a help request."
    );
  }

  assistantQuestion.value = "";
  if (matches.length < 2) assistantQuestion.focus();
});

// Show a local-only confirmation; the request is not transmitted or saved.
const requestForm = document.querySelector("#request-form");
const formMessage = document.querySelector("#form-message");

requestForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!requestForm.reportValidity()) return;

  formMessage.textContent = "Thanks! Your form is complete. This prototype does not send or save your information, so please contact your IT team directly for support.";
  formMessage.hidden = false;
  formMessage.focus();
});
