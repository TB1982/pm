const STORAGE_KEY = "pm-journal-theme";
const QUESTIONS = [
  { id: "learned", title: "今天學到什麼？", placeholder: "寫下今天新增的理解、發現或提醒。" },
  { id: "initiated", title: "我發起了什麼？", placeholder: "記錄你主動推進、開啟或促成的事。" },
  { id: "helped", title: "我幫助了誰？", placeholder: "記錄你支持的人、協作的連結或帶來的影響。" },
  { id: "blocked", title: "遇到了什麼問題？", placeholder: "寫下卡點、風險或還沒解開的問題。" }
];

const state = {
  index: 0,
  stage: "intro",
  answers: Object.fromEntries(
    QUESTIONS.map((question) => [question.id, { text: "", images: [] }])
  )
};

const dateInput = document.getElementById("journal-date");
const nameInput = document.getElementById("journal-name");
const clock = document.getElementById("clock");
const summaryClock = document.getElementById("summary-clock");
const themeToggle = document.getElementById("theme-toggle");
const exportButton = document.getElementById("export-button");
const startButton = document.getElementById("start-journal");
const prevButton = document.getElementById("prev-question");
const nextButton = document.getElementById("next-question");
const backToQuestionsButton = document.getElementById("back-to-questions");
const closeSummaryButton = document.getElementById("close-summary");
const reopenSummaryButton = document.getElementById("reopen-summary");
const summaryShell = document.querySelector(".summary-shell");
const activeImageInput = document.getElementById("active-image-input");
const questionTitle = document.getElementById("question-title");
const questionProgress = document.getElementById("question-progress");
const questionText = document.getElementById("question-text");
const questionImages = document.getElementById("question-images");
const questionDots = document.getElementById("question-dots");
const questionCard = document.getElementById("question-card");
const summaryDate = document.getElementById("summary-date");
const summaryName = document.getElementById("summary-name");
const summaryGrid = document.getElementById("summary-grid");
const fireflyField = document.getElementById("firefly-field");
const stages = {
  intro: document.getElementById("intro-stage"),
  question: document.getElementById("question-stage"),
  summary: document.getElementById("summary-stage")
};

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

function pad(value) {
  return String(value).padStart(2, "0");
}

function setToday() {
  if (dateInput.value) {
    return;
  }
  const now = new Date();
  dateInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function updateClock() {
  const now = new Date();
  const timeText = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  clock.textContent = timeText;
  summaryClock.textContent = timeText;
}

function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || "system";
}

function resolveTheme(theme) {
  if (theme === "system") {
    return prefersDark.matches ? "dark" : "light";
  }
  return theme;
}

function applyTheme(theme) {
  document.body.dataset.theme = resolveTheme(theme);
}

function toggleTheme() {
  const current = getTheme();
  if (current === "system") {
    localStorage.setItem(STORAGE_KEY, resolveTheme("system") === "dark" ? "light" : "dark");
  } else if (current === "dark") {
    localStorage.setItem(STORAGE_KEY, "light");
  } else {
    localStorage.setItem(STORAGE_KEY, "dark");
  }
  applyTheme(getTheme());
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("無法讀取圖片"));
    reader.readAsDataURL(file);
  });
}

function saveCurrentAnswer() {
  const currentQuestion = QUESTIONS[state.index];
  state.answers[currentQuestion.id].text = questionText.value;
}

function createImageItem(imageInfo, onUpdate, onRemove) {
  const item = document.createElement("div");
  item.className = "image-item";

  const image = document.createElement("img");
  image.src = imageInfo.src;
  image.alt = imageInfo.name || "使用者上傳的圖片";
  image.style.setProperty("--image-width", `${imageInfo.widthPercent}%`);

  const controls = document.createElement("div");
  controls.className = "image-controls";

  const range = document.createElement("input");
  range.type = "range";
  range.min = "35";
  range.max = "100";
  range.value = String(imageInfo.widthPercent);
  range.setAttribute("aria-label", "調整圖片大小");
  range.addEventListener("input", () => {
    imageInfo.widthPercent = Number.parseInt(range.value, 10);
    image.style.setProperty("--image-width", `${imageInfo.widthPercent}%`);
    onUpdate();
  });

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-image";
  removeButton.textContent = "×";
  removeButton.setAttribute("aria-label", "移除圖片");
  removeButton.addEventListener("click", onRemove);

  controls.append(range, removeButton);
  item.append(image, controls);
  return item;
}

function renderDots() {
  questionDots.innerHTML = "";
  QUESTIONS.forEach((_, index) => {
    const dot = document.createElement("span");
    if (index === state.index) {
      dot.classList.add("is-active");
    }
    questionDots.append(dot);
  });
}

function renderQuestion() {
  const question = QUESTIONS[state.index];
  const answer = state.answers[question.id];

  questionProgress.textContent = `${state.index + 1} / ${QUESTIONS.length}`;
  questionTitle.textContent = question.title;
  questionText.placeholder = question.placeholder;
  questionText.value = answer.text;
  prevButton.disabled = state.index === 0;
  nextButton.textContent = state.index === QUESTIONS.length - 1 ? "完成" : "下一題";
  renderDots();

  questionImages.innerHTML = "";
  answer.images.forEach((imageInfo, imageIndex) => {
    const item = createImageItem(
      imageInfo,
      () => renderSummary(),
      () => {
        answer.images.splice(imageIndex, 1);
        renderQuestion();
        renderSummary();
      }
    );
    questionImages.append(item);
  });
}

function renderSummary() {
  summaryDate.textContent = dateInput.value || "";
  summaryName.textContent = nameInput.value || " ";
  summaryGrid.innerHTML = "";

  QUESTIONS.forEach((question) => {
    const answer = state.answers[question.id];
    const item = document.createElement("article");
    item.className = "summary-item";

    const title = document.createElement("h3");
    title.textContent = question.title;

    const text = document.createElement("div");
    text.className = "summary-text";
    text.textContent = answer.text.trim();

    const images = document.createElement("div");
    images.className = "summary-images";

    answer.images.forEach((imageInfo) => {
      const image = document.createElement("img");
      image.src = imageInfo.src;
      image.alt = imageInfo.name || "使用者上傳的圖片";
      image.style.setProperty("--image-width", `${imageInfo.widthPercent}%`);
      images.append(image);
    });

    item.append(title, text, images);
    summaryGrid.append(item);
  });
}

function createFireflies() {
  const fireflies = [
    { x: "12%", y: "24%", size: "10px", drift: "16s", pulse: "4.8s", delay: "-1.2s" },
    { x: "22%", y: "68%", size: "7px", drift: "18s", pulse: "6.1s", delay: "-3.4s" },
    { x: "31%", y: "36%", size: "9px", drift: "15s", pulse: "5.2s", delay: "-2.1s" },
    { x: "42%", y: "74%", size: "8px", drift: "20s", pulse: "5.8s", delay: "-4.7s" },
    { x: "56%", y: "18%", size: "6px", drift: "17s", pulse: "4.4s", delay: "-0.8s" },
    { x: "63%", y: "58%", size: "11px", drift: "19s", pulse: "6.4s", delay: "-2.8s" },
    { x: "74%", y: "28%", size: "8px", drift: "14s", pulse: "4.9s", delay: "-5.1s" },
    { x: "82%", y: "70%", size: "9px", drift: "21s", pulse: "6.6s", delay: "-1.6s" },
    { x: "90%", y: "42%", size: "7px", drift: "16s", pulse: "5.3s", delay: "-3.9s" },
    { x: "48%", y: "46%", size: "5px", drift: "13s", pulse: "4.3s", delay: "-2.6s" }
  ];

  fireflyField.innerHTML = "";
  fireflies.forEach((config) => {
    const dot = document.createElement("span");
    dot.className = "firefly";
    dot.style.setProperty("--x", config.x);
    dot.style.setProperty("--y", config.y);
    dot.style.setProperty("--size", config.size);
    dot.style.setProperty("--drift", config.drift);
    dot.style.setProperty("--pulse", config.pulse);
    dot.style.setProperty("--delay", config.delay);
    fireflyField.append(dot);
  });
}

function setStage(stageName) {
  state.stage = stageName;
  Object.entries(stages).forEach(([name, element]) => {
    element.classList.toggle("is-active", name === stageName);
  });
  exportButton.hidden = stageName !== "summary";
  if (stageName !== "summary") {
    summaryShell.classList.remove("is-dismissed");
    reopenSummaryButton.classList.remove("is-visible");
  }
}

async function handleImageInput(event) {
  const files = Array.from(event.currentTarget.files || []);
  const answer = state.answers[QUESTIONS[state.index].id];

  for (const file of files) {
    const src = await readFileAsDataUrl(file);
    answer.images.push({ src, name: file.name, widthPercent: 100 });
  }

  event.currentTarget.value = "";
  renderQuestion();
  renderSummary();
}

function goToQuestion(index) {
  saveCurrentAnswer();
  state.index = index;
  renderQuestion();
  setStage("question");
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function animateQuestionChange(nextIndex, direction) {
  const exitClass = direction === "next" ? "is-exit-next" : "is-exit-prev";
  const enterClass = direction === "next" ? "is-enter-next" : "is-enter-prev";

  questionCard.classList.add("is-transitioning", exitClass);
  await wait(240);

  state.index = nextIndex;
  renderQuestion();

  questionCard.classList.remove(exitClass);
  questionCard.classList.add(enterClass);
  void questionCard.offsetWidth;

  await wait(30);
  questionCard.classList.remove(enterClass);
  await wait(360);
  questionCard.classList.remove("is-transitioning");
}

async function nextStep() {
  saveCurrentAnswer();
  if (state.index === QUESTIONS.length - 1) {
    renderSummary();
    setStage("summary");
    return;
  }

  await animateQuestionChange(state.index + 1, "next");
}

async function previousStep() {
  saveCurrentAnswer();
  if (state.index === 0) {
    return;
  }

  await animateQuestionChange(state.index - 1, "prev");
}

function getThemePalette() {
  const styles = getComputedStyle(document.body);
  return {
    bg: styles.getPropertyValue("--bg").trim(),
    bg2: styles.getPropertyValue("--bg2").trim(),
    panelStrong: styles.getPropertyValue("--panel-strong").trim(),
    card: styles.getPropertyValue("--card").trim(),
    border: styles.getPropertyValue("--border").trim(),
    text: styles.getPropertyValue("--text").trim(),
    muted: styles.getPropertyValue("--muted").trim(),
    accent: styles.getPropertyValue("--accent").trim(),
    accentSoft: styles.getPropertyValue("--accent-soft").trim()
  };
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function fillRoundedRect(context, x, y, width, height, radius, fillStyle, strokeStyle) {
  roundRect(context, x, y, width, height, radius);
  context.fillStyle = fillStyle;
  context.fill();
  if (strokeStyle) {
    context.strokeStyle = strokeStyle;
    context.lineWidth = 1;
    context.stroke();
  }
}

function drawTextBlock(context, text, x, y, maxWidth, lineHeight, maxLines, color) {
  const paragraphs = (text || "").split("\n");
  const lines = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const chars = paragraph.split("");
    let current = "";
    if (!paragraph.length) {
      lines.push("");
    }
    chars.forEach((char) => {
      const next = current + char;
      if (context.measureText(next).width > maxWidth && current) {
        lines.push(current);
        current = char;
      } else {
        current = next;
      }
    });
    if (current) {
      lines.push(current);
    }
    if (paragraphIndex < paragraphs.length - 1) {
      lines.push("");
    }
  });

  const visibleLines = lines.slice(0, maxLines);
  context.fillStyle = color;
  visibleLines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
  return visibleLines.length;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("圖片載入失敗"));
    image.src = src;
  });
}

async function drawSummaryCard(context, question, answer, x, y, width, height, palette) {
  fillRoundedRect(context, x, y, width, height, 24, palette.card, palette.border);
  context.fillStyle = palette.text;
  context.font = "700 27px 'Noto Sans TC', 'Segoe UI', sans-serif";
  context.fillText(question.title, x + 22, y + 40);

  context.font = "500 20px 'Noto Sans TC', 'Segoe UI', sans-serif";
  const linesUsed = drawTextBlock(context, answer.text, x + 22, y + 82, width - 44, 30, 6, palette.text);
  const imageTop = y + 82 + Math.max(linesUsed, 1) * 30 + 14;

  let cursorX = x + 22;
  let cursorY = imageTop;
  let rowHeight = 0;
  const gap = 10;
  const containerWidth = Math.min(150, (width - 44 - gap) / 2);
  const containerHeight = 116;

  for (const imageInfo of answer.images) {
    if (cursorX + containerWidth > x + width - 22) {
      cursorX = x + 22;
      cursorY += rowHeight + gap;
      rowHeight = 0;
    }

    if (cursorY + containerHeight > y + height - 20) {
      break;
    }

    const image = await loadImage(imageInfo.src);
    fillRoundedRect(context, cursorX, cursorY, containerWidth, containerHeight, 16, "rgba(255,255,255,0.04)", palette.border);

    const usableWidth = (containerWidth - 18) * (imageInfo.widthPercent / 100);
    const usableHeight = 74;
    const ratio = Math.min(usableWidth / image.width, usableHeight / image.height);
    const drawWidth = image.width * ratio;
    const drawHeight = image.height * ratio;
    const drawX = cursorX + (containerWidth - drawWidth) / 2;
    const drawY = cursorY + 10 + (usableHeight - drawHeight) / 2;
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

    context.strokeStyle = palette.accent;
    context.lineWidth = 4;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(cursorX + 12, cursorY + containerHeight - 18);
    context.lineTo(cursorX + containerWidth - 28, cursorY + containerHeight - 18);
    context.stroke();

    cursorX += containerWidth + gap;
    rowHeight = Math.max(rowHeight, containerHeight);
  }
}

async function renderExportCanvas() {
  const palette = getThemePalette();
  const canvas = document.createElement("canvas");
  canvas.width = 2800;
  canvas.height = 1800;
  const context = canvas.getContext("2d");
  context.scale(2, 2);

  const width = 1400;
  const height = 900;
  context.fillStyle = palette.bg;
  context.fillRect(0, 0, width, height);

  const gradient = context.createRadialGradient(width / 2, 80, 40, width / 2, 80, 420);
  gradient.addColorStop(0, document.body.dataset.theme === "dark" ? "rgba(91,124,223,0.18)" : "rgba(138,156,190,0.18)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  fillRoundedRect(context, 24, 24, width - 48, height - 48, 28, palette.panelStrong, palette.border);

  context.fillStyle = palette.muted;
  context.font = "500 12px 'Segoe UI', sans-serif";
  context.fillText("ONE-PAGE WORK JOURNAL", 52, 56);

  context.fillStyle = palette.text;
  context.font = "700 32px 'Noto Sans TC', 'Segoe UI', sans-serif";
  context.fillText("一頁式好工作日誌", 52, 92);

  fillRoundedRect(context, 74, 116, width - 148, 86, 20, palette.card, palette.border);
  context.fillStyle = palette.muted;
  context.font = "500 14px 'Noto Sans TC', 'Segoe UI', sans-serif";
  context.fillText("日期", 100, 144);
  context.fillText("名字", 330, 144);
  context.fillStyle = palette.text;
  context.font = "600 18px 'Noto Sans TC', 'Segoe UI', sans-serif";
  context.fillText(dateInput.value || "", 100, 174);
  context.fillText(nameInput.value || "", 330, 174);

  fillRoundedRect(context, width - 192, 132, 92, 40, 20, palette.card, palette.border);
  context.beginPath();
  context.fillStyle = palette.accent;
  context.arc(width - 168, 152, 7, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = palette.muted;
  context.font = "500 18px 'Segoe UI', sans-serif";
  context.fillText(summaryClock.textContent, width - 154, 158);

  const gridX = 74;
  const gridY = 222;
  const gap = 16;
  const cardWidth = (width - 148 - gap) / 2;
  const cardHeight = 288;

  for (let index = 0; index < QUESTIONS.length; index += 1) {
    const question = QUESTIONS[index];
    const answer = state.answers[question.id];
    const x = gridX + (index % 2) * (cardWidth + gap);
    const y = gridY + Math.floor(index / 2) * (cardHeight + gap);
    await drawSummaryCard(context, question, answer, x, y, cardWidth, cardHeight, palette);
  }

  return canvas;
}

function downloadCanvas(canvas) {
  const link = document.createElement("a");
  const safeName = (nameInput.value || "nova").trim().replace(/[^\w\u4e00-\u9fff-]+/g, "-");
  const safeDate = dateInput.value || "journal";
  link.href = canvas.toDataURL("image/png");
  link.download = `good-work-journal-${safeName || "nova"}-${safeDate}.png`;
  link.click();
}

async function exportAsPng() {
  exportButton.classList.add("is-exporting");
  exportButton.textContent = "輸出中...";

  try {
    const canvas = await renderExportCanvas();
    downloadCanvas(canvas);
  } catch (error) {
    window.alert("這次離線匯出沒有成功，我再陪你一起修。");
  } finally {
    exportButton.classList.remove("is-exporting");
    exportButton.textContent = "輸出 PNG";
  }
}

setToday();
updateClock();
applyTheme(getTheme());
createFireflies();
renderQuestion();
renderSummary();
setStage("intro");
setInterval(updateClock, 1000);

startButton.addEventListener("click", () => goToQuestion(0));
questionText.addEventListener("input", saveCurrentAnswer);
prevButton.addEventListener("click", previousStep);
nextButton.addEventListener("click", nextStep);
activeImageInput.addEventListener("change", handleImageInput);
backToQuestionsButton.addEventListener("click", () => setStage("question"));
closeSummaryButton.addEventListener("click", () => {
  summaryShell.classList.add("is-dismissed");
  reopenSummaryButton.classList.add("is-visible");
});
reopenSummaryButton.addEventListener("click", () => {
  summaryShell.classList.remove("is-dismissed");
  reopenSummaryButton.classList.remove("is-visible");
});
themeToggle.addEventListener("click", toggleTheme);
exportButton.addEventListener("click", exportAsPng);
dateInput.addEventListener("input", renderSummary);
nameInput.addEventListener("input", renderSummary);

prefersDark.addEventListener("change", () => {
  if (getTheme() === "system") {
    applyTheme("system");
  }
});
