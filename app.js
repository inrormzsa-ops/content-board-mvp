const STORAGE_KEY = "content-board-mvp-posts";
const SETTINGS_KEY = "content-board-mvp-settings";
const STALE_THRESHOLD_KEY = "content-board-mvp-stale-threshold";
const DEFAULT_STALE_THRESHOLD_DAYS = 3;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const defaultSettings = {
  projectName: "Доска контента",
  projectSubtitle: "Собирай идеи, доводи посты до публикации и не теряй, что на какой стадии.",
  defaultNetwork: "Instagram",
  networks: ["Instagram", "Telegram", "VK", "YouTube", "Другое"]
};

const stages = [
  {
    id: "idea",
    title: "Идея",
    hint: "Сырые мысли и темы",
    accent: "#eab308"
  },
  {
    id: "draft",
    title: "Черновик",
    hint: "Пост уже пишется",
    accent: "#3b82f6"
  },
  {
    id: "scheduled",
    title: "Запланировано",
    hint: "Есть дата выхода",
    accent: "#8b5cf6"
  },
  {
    id: "published",
    title: "Опубликовано",
    hint: "Готово и вышло",
    accent: "#10b981"
  }
];

const samplePosts = [
  {
    id: crypto.randomUUID(),
    title: "Серия постов про первый MVP",
    text: "Коротко показать путь от идеи до первого рабочего билда.",
    date: "",
    network: "Telegram",
    stage: "idea",
    createdAt: Date.now(),
    stageChangedAt: Date.now()
  },
  {
    id: crypto.randomUUID(),
    title: "Черновик кейса для VK",
    text: "Описать проблему, решение и результат в одном посте.",
    date: new Date().toISOString().slice(0, 10),
    network: "VK",
    stage: "draft",
    createdAt: Date.now() - 1,
    stageChangedAt: Date.now() - DAY_IN_MS * 4
  }
];

const postTemplates = {
  lesson: {
    title: "Как сделать первый шаг",
    network: "Telegram",
    text: [
      "Хук: многие застревают не из-за сложности, а из-за слишком большого первого шага.",
      "",
      "1. Что обычно мешает начать.",
      "2. Как упростить задачу до действия на 15 минут.",
      "3. Как понять, что шаг сработал.",
      "",
      "Вывод: маленький понятный шаг лучше большого идеального плана.",
      "",
      "CTA: какой первый шаг ты сделаешь сегодня?"
    ].join("\n")
  },
  case: {
    title: "Кейс: как мы улучшили процесс",
    network: "VK",
    text: [
      "Ситуация: был процесс, в котором идеи терялись между черновиком и публикацией.",
      "",
      "Что сделали:",
      "1. Разложили работу по стадиям.",
      "2. Добавили чеклист готовности.",
      "3. Настроили напоминания по зависшим карточкам.",
      "",
      "Результат: стало видно, где именно застревает контент.",
      "",
      "CTA: хочешь такой разбор для своего процесса?"
    ].join("\n")
  },
  announcement: {
    title: "Анонс нового материала",
    network: "Instagram",
    text: [
      "Скоро выйдет новый материал про [тема].",
      "",
      "В нем разберем:",
      "- главную проблему;",
      "- практический пример;",
      "- что можно повторить у себя.",
      "",
      "Сохрани, чтобы не потерять."
    ].join("\n")
  },
  question: {
    title: "Вопрос к аудитории",
    network: "Telegram",
    text: [
      "Вопрос дня: на какой стадии чаще всего застревает твой контент?",
      "",
      "1. Идея есть, но не пишется.",
      "2. Черновик есть, но не доводится.",
      "3. Дата не выбрана.",
      "4. Опубликовано, но не разобрано дальше.",
      "",
      "Ответь одним номером или коротко расскажи свою ситуацию."
    ].join("\n")
  }
};

const priorityConfig = {
  high: {
    label: "Высокий",
    weight: 3
  },
  normal: {
    label: "Обычный",
    weight: 2
  },
  low: {
    label: "Низкий",
    weight: 1
  }
};

let posts = loadPosts();
let editingPostId = null;
let settings = loadSettings();
let staleThresholdDays = loadStaleThreshold();
let filters = {
  search: "",
  network: "all",
  date: "all",
  archive: "active",
  tag: "all"
};

const board = document.querySelector("#board");
const projectTitle = document.querySelector(".header-copy h1");
const projectSubtitle = document.querySelector(".subtitle");
const summaryStrip = document.querySelector("#summaryStrip");
const insightsGrid = document.querySelector("#insightsGrid");
const reminderList = document.querySelector("#reminderList");
const copyRemindersButton = document.querySelector("#copyRemindersButton");
const emailRemindersLink = document.querySelector("#emailRemindersLink");
const telegramRemindersLink = document.querySelector("#telegramRemindersLink");
const scheduleList = document.querySelector("#scheduleList");
const searchInput = document.querySelector("#searchInput");
const networkFilter = document.querySelector("#networkFilter");
const dateFilter = document.querySelector("#dateFilter");
const archiveFilter = document.querySelector("#archiveFilter");
const tagFilter = document.querySelector("#tagFilter");
const staleThresholdInput = document.querySelector("#staleThresholdInput");
const resetFiltersButton = document.querySelector("#resetFiltersButton");
const copyVisibleButton = document.querySelector("#copyVisibleButton");
const exportButton = document.querySelector("#exportButton");
const importInput = document.querySelector("#importInput");
const dialog = document.querySelector("#postDialog");
const form = document.querySelector("#postForm");
const addPostButton = document.querySelector("#addPostButton");
const closeDialogButton = document.querySelector("#closeDialogButton");
const deletePostButton = document.querySelector("#deletePostButton");
const archivePostButton = document.querySelector("#archivePostButton");
const settingsButton = document.querySelector("#settingsButton");
const settingsDialog = document.querySelector("#settingsDialog");
const settingsForm = document.querySelector("#settingsForm");
const closeSettingsButton = document.querySelector("#closeSettingsButton");
const resetSettingsButton = document.querySelector("#resetSettingsButton");
const projectNameInput = document.querySelector("#projectNameInput");
const projectSubtitleInput = document.querySelector("#projectSubtitleInput");
const defaultNetworkInput = document.querySelector("#defaultNetworkInput");
const settingsStaleThresholdInput = document.querySelector("#settingsStaleThresholdInput");
const networksInput = document.querySelector("#networksInput");
const dialogTitle = document.querySelector("#dialogTitle");
const titleInput = document.querySelector("#postTitle");
const textInput = document.querySelector("#postText");
const templateInput = document.querySelector("#postTemplate");
const applyTemplateButton = document.querySelector("#applyTemplateButton");
const dateInput = document.querySelector("#postDate");
const networkInput = document.querySelector("#postNetwork");
const priorityInput = document.querySelector("#postPriority");
const referenceInput = document.querySelector("#postReference");
const tagsInput = document.querySelector("#postTags");
const checkTextInput = document.querySelector("#checkText");
const checkDateInput = document.querySelector("#checkDate");
const checkReviewInput = document.querySelector("#checkReview");
const checkPublishedInput = document.querySelector("#checkPublished");
const aiDraftButton = document.querySelector("#aiDraftButton");
const aiPromptButton = document.querySelector("#aiPromptButton");
const aiOutput = document.querySelector("#aiOutput");
const copyAiOutputButton = document.querySelector("#copyAiOutputButton");
const insertAiOutputButton = document.querySelector("#insertAiOutputButton");
const historyPanel = document.querySelector("#historyPanel");
const historyList = document.querySelector("#historyList");

staleThresholdInput.value = String(staleThresholdDays);
applySettings();
renderBoard();

addPostButton.addEventListener("click", () => openPostDialog());
closeDialogButton.addEventListener("click", closePostDialog);
settingsButton.addEventListener("click", openSettingsDialog);
closeSettingsButton.addEventListener("click", closeSettingsDialog);
resetSettingsButton.addEventListener("click", resetSettings);

copyRemindersButton.addEventListener("click", async () => {
  await copyText(buildReminderDigest(getReminderItems()));
});

scheduleList.addEventListener("click", (event) => {
  const scheduleButton = event.target.closest("[data-schedule-post]");

  if (!scheduleButton) {
    return;
  }

  const post = posts.find((item) => item.id === scheduleButton.dataset.schedulePost);

  if (post) {
    openPostDialog(post);
  }
});

searchInput.addEventListener("input", () => {
  filters.search = searchInput.value.trim().toLowerCase();
  renderBoard();
});

networkFilter.addEventListener("change", () => {
  filters.network = networkFilter.value;
  renderBoard();
});

dateFilter.addEventListener("change", () => {
  filters.date = dateFilter.value;
  renderBoard();
});

archiveFilter.addEventListener("change", () => {
  filters.archive = archiveFilter.value;
  renderBoard();
});

tagFilter.addEventListener("change", () => {
  filters.tag = tagFilter.value;
  renderBoard();
});

staleThresholdInput.addEventListener("change", () => {
  staleThresholdDays = normalizeStaleThreshold(staleThresholdInput.value);
  staleThresholdInput.value = String(staleThresholdDays);
  localStorage.setItem(STALE_THRESHOLD_KEY, String(staleThresholdDays));
  renderBoard();
});

resetFiltersButton.addEventListener("click", () => {
  filters = {
    search: "",
    network: "all",
    date: "all",
    archive: "active",
    tag: "all"
  };
  searchInput.value = "";
  networkFilter.value = "all";
  dateFilter.value = "all";
  archiveFilter.value = "active";
  tagFilter.value = "all";
  renderBoard();
});

exportButton.addEventListener("click", exportPosts);
importInput.addEventListener("change", importPosts);

copyVisibleButton.addEventListener("click", async () => {
  await copyText(buildVisiblePostsDigest(getVisiblePosts()));
});

aiDraftButton.addEventListener("click", () => {
  aiOutput.value = buildLocalDraft();
});

aiPromptButton.addEventListener("click", () => {
  aiOutput.value = buildAiPrompt();
});

copyAiOutputButton.addEventListener("click", async () => {
  if (!aiOutput.value) {
    return;
  }

  await copyText(aiOutput.value);
});

insertAiOutputButton.addEventListener("click", () => {
  if (!aiOutput.value) {
    return;
  }

  textInput.value = aiOutput.value;
  checkTextInput.checked = true;
});

applyTemplateButton.addEventListener("click", applySelectedTemplate);

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    closePostDialog();
  }
});

settingsDialog.addEventListener("click", (event) => {
  if (event.target === settingsDialog) {
    closeSettingsDialog();
  }
});

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const nextNetworks = parseNetworks(networksInput.value);
  settings = {
    projectName: projectNameInput.value.trim() || defaultSettings.projectName,
    projectSubtitle: projectSubtitleInput.value.trim() || defaultSettings.projectSubtitle,
    defaultNetwork: nextNetworks.includes(defaultNetworkInput.value)
      ? defaultNetworkInput.value
      : nextNetworks[0],
    networks: nextNetworks
  };
  staleThresholdDays = normalizeStaleThreshold(settingsStaleThresholdInput.value);
  staleThresholdInput.value = String(staleThresholdDays);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  localStorage.setItem(STALE_THRESHOLD_KEY, String(staleThresholdDays));
  applySettings();
  renderBoard();
  closeSettingsDialog();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const values = {
    title: titleInput.value.trim(),
    text: textInput.value.trim(),
    date: dateInput.value,
    network: networkInput.value,
    priority: priorityInput.value,
    referenceUrl: normalizeUrl(referenceInput.value),
    tags: parseTags(tagsInput.value),
    checklist: readChecklist()
  };

  if (!values.title || !values.text) {
    return;
  }

  if (editingPostId) {
    posts = posts.map((post) =>
      post.id === editingPostId
        ? {
            ...post,
            ...values,
            history: addHistoryEvent(post.history, "updated", "Карточка отредактирована")
          }
        : post
    );
  } else {
    const now = Date.now();
    posts = [
      {
        id: crypto.randomUUID(),
        ...values,
        stage: "idea",
        archived: false,
        archivedAt: "",
        createdAt: now,
        stageChangedAt: now,
        history: createInitialHistory(now)
      },
      ...posts
    ];
  }

  savePosts();
  renderBoard();
  closePostDialog();
});

deletePostButton.addEventListener("click", () => {
  if (!editingPostId) {
    return;
  }

  const post = posts.find((item) => item.id === editingPostId);
  const confirmed = window.confirm(`Удалить карточку "${post.title}"?`);

  if (!confirmed) {
    return;
  }

  posts = posts.filter((item) => item.id !== editingPostId);
  savePosts();
  renderBoard();
  closePostDialog();
});

archivePostButton.addEventListener("click", () => {
  if (!editingPostId) {
    return;
  }

  const post = posts.find((item) => item.id === editingPostId);

  if (!post) {
    return;
  }

  togglePostArchive(post.id, !post.archived);
  closePostDialog();
});

function loadPosts() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return samplePosts;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizePosts(parsed) : samplePosts;
  } catch {
    return samplePosts;
  }
}

function savePosts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);

  if (!raw) {
    return { ...defaultSettings, networks: [...defaultSettings.networks] };
  }

  try {
    const parsed = JSON.parse(raw);
    const networks = parseNetworks(Array.isArray(parsed.networks) ? parsed.networks.join(",") : parsed.networks);

    return {
      projectName: String(parsed.projectName || defaultSettings.projectName),
      projectSubtitle: String(parsed.projectSubtitle || defaultSettings.projectSubtitle),
      defaultNetwork: networks.includes(parsed.defaultNetwork) ? parsed.defaultNetwork : networks[0],
      networks
    };
  } catch {
    return { ...defaultSettings, networks: [...defaultSettings.networks] };
  }
}

function loadStaleThreshold() {
  const storedValue = Number(localStorage.getItem(STALE_THRESHOLD_KEY));

  if (!Number.isFinite(storedValue)) {
    return DEFAULT_STALE_THRESHOLD_DAYS;
  }

  return normalizeStaleThreshold(storedValue);
}

function normalizeStaleThreshold(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return DEFAULT_STALE_THRESHOLD_DAYS;
  }

  return Math.min(Math.max(Math.round(numberValue), 1), 30);
}

function parseNetworks(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(",");
  const networks = source
    .map((item) => String(item).trim())
    .filter(Boolean)
    .filter((item, index, items) => items.findIndex((network) => network.toLowerCase() === item.toLowerCase()) === index);

  return networks.length ? networks : [...defaultSettings.networks];
}

function normalizeUrl(value) {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) {
    return "";
  }

  return /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;
}

function normalizePriority(value) {
  return priorityConfig[value] ? value : "normal";
}

function parseTags(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(",");

  return source
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .filter((tag, index, tags) => tags.findIndex((item) => item.toLowerCase() === tag.toLowerCase()) === index)
    .slice(0, 8);
}

function getPriority(value) {
  return priorityConfig[normalizePriority(value)];
}

function sortPostsForStage(firstPost, secondPost) {
  const priorityDiff =
    getPriority(secondPost.priority).weight - getPriority(firstPost.priority).weight;

  return priorityDiff || secondPost.createdAt - firstPost.createdAt;
}

function renderBoard() {
  const visiblePosts = getVisiblePosts();
  const reminderItems = getReminderItems();
  const scheduleItems = getScheduleItems();

  board.innerHTML = "";
  renderFilters();
  renderSummary(visiblePosts);
  renderInsights();
  renderReminders(reminderItems);
  renderSchedule(scheduleItems);
  copyVisibleButton.disabled = visiblePosts.length === 0;

  stages.forEach((stage) => {
    const stagePosts = visiblePosts
      .filter((post) => post.stage === stage.id)
      .sort(sortPostsForStage);
    const column = createColumn(stage, stagePosts);
    board.append(column);
  });
}

function createColumn(stage, stagePosts) {
  const column = document.createElement("section");
  column.className = "column";
  column.dataset.stage = stage.id;
  column.style.setProperty("--stage-accent", stage.accent);
  column.innerHTML = `
    <div class="column-header">
      <div>
        <h2>${stage.title}</h2>
        <p>${stage.hint}</p>
      </div>
      <span class="count">${stagePosts.length}</span>
    </div>
    <div class="card-list"></div>
  `;

  const list = column.querySelector(".card-list");

  if (stagePosts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const hasActiveFilters = filters.search || filters.network !== "all" || filters.date !== "all" || filters.archive !== "active";
    empty.innerHTML = `
      <strong>${hasActiveFilters ? "Ничего не найдено" : "Пока пусто"}</strong>
      <span>${hasActiveFilters ? "Измени фильтры или сбрось поиск" : "Перетащи карточку сюда или двигай стрелками"}</span>
    `;
    list.append(empty);
  }

  stagePosts.forEach((post) => list.append(createPostCard(post)));

  column.addEventListener("dragover", (event) => {
    event.preventDefault();
    column.classList.add("drag-over");
  });

  column.addEventListener("dragleave", () => {
    column.classList.remove("drag-over");
  });

  column.addEventListener("drop", (event) => {
    event.preventDefault();
    column.classList.remove("drag-over");
    const postId = event.dataTransfer.getData("text/plain");
    movePostToStage(postId, stage.id);
  });

  return column;
}

function createPostCard(post) {
  const currentStageIndex = stages.findIndex((stage) => stage.id === post.stage);
  const stage = stages[currentStageIndex];
  const dateStatus = getDateStatus(post);
  const stageStatus = getStageStatus(post);
  const checklistStatus = getChecklistStatus(post);
  const priority = getPriority(post.priority);
  const postTags = post.tags || [];
  const archiveActionLabel = post.archived ? "Вернуть" : "В архив";
  const canToggleArchive = post.archived || post.stage === "published";
  const card = document.createElement("article");
  card.className = `post-card ${dateStatus.className} ${stageStatus.isStale ? "is-stale" : ""} ${
    post.archived ? "is-archived" : ""
  }`;
  card.style.setProperty("--stage-accent", stage.accent);
  card.draggable = !post.archived;
  card.tabIndex = 0;
  card.innerHTML = `
    <div>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.text)}</p>
    </div>
    <div class="stage-age ${stageStatus.isStale ? "is-stale" : ""}">
      ${stageStatus.label}
    </div>
    <div class="checklist-progress" aria-label="Готовность поста">
      <span style="width: ${checklistStatus.percent}%"></span>
      <strong>${checklistStatus.done}/${checklistStatus.total}</strong>
    </div>
    <div class="meta-row">
      <span class="tag tag-${post.network.toLowerCase()}">${escapeHtml(post.network)}</span>
      <span class="date">${dateStatus.label}</span>
    </div>
    <div class="card-badges">
      <span class="priority-badge priority-${escapeAttribute(post.priority)}">${escapeHtml(priority.label)}</span>
    </div>
    ${
      postTags.length
        ? `<div class="tag-list">${postTags
            .map((tag) => `<span>${escapeHtml(tag)}</span>`)
            .join("")}</div>`
        : ""
    }
    ${
      post.referenceUrl
        ? `<a class="reference-link" href="${escapeAttribute(post.referenceUrl)}" target="_blank" rel="noreferrer">Материал</a>`
        : ""
    }
    ${
      canToggleArchive
        ? `<div class="card-tools">
            ${post.archived ? '<span class="archive-badge">Архив</span>' : ""}
            <button class="archive-button" type="button" data-archive-action>${archiveActionLabel}</button>
          </div>`
        : ""
    }
    <div class="card-actions" aria-label="Перемещение по стадиям">
      <button class="move-button" type="button" data-direction="-1" aria-label="Переместить назад">←</button>
      <span>Стадия: ${escapeHtml(stage.title)}</span>
      <button class="move-button" type="button" data-direction="1" aria-label="Переместить вперед">→</button>
    </div>
  `;

  card.querySelector('[data-direction="-1"]').disabled = post.archived || currentStageIndex === 0;
  card.querySelector('[data-direction="1"]').disabled =
    post.archived || currentStageIndex === stages.length - 1;

  card.addEventListener("click", (event) => {
    if (event.target.closest(".reference-link")) {
      return;
    }

    if (event.target.closest("[data-archive-action]")) {
      togglePostArchive(post.id, !post.archived);
      return;
    }

    const moveButton = event.target.closest(".move-button");

    if (moveButton) {
      const direction = Number(moveButton.dataset.direction);
      movePostByOneStage(post.id, direction);
      return;
    }

    openPostDialog(post);
  });

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      openPostDialog(post);
    }
  });

  card.addEventListener("dragstart", (event) => {
    if (post.archived) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.setData("text/plain", post.id);
    card.classList.add("dragging");
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
  });

  return card;
}

function renderSummary(visiblePosts) {
  const total = visiblePosts.length;
  const published = visiblePosts.filter((post) => post.stage === "published").length;
  const scheduled = visiblePosts.filter((post) => post.stage === "scheduled").length;
  const attention = visiblePosts.filter(
    (post) => getDateStatus(post).isAttention || getStageStatus(post).isStale
  ).length;

  summaryStrip.innerHTML = `
    <article>
      <strong>${total}</strong>
      <span>${hasActiveFilters() ? "найдено" : "всего постов"}</span>
    </article>
    <article>
      <strong>${scheduled}</strong>
      <span>запланировано</span>
    </article>
    <article>
      <strong>${published}</strong>
      <span>опубликовано</span>
    </article>
    <article>
      <strong>${attention}</strong>
      <span>требует внимания</span>
    </article>
  `;
}

function renderInsights() {
  const insights = getProcessInsights();

  insightsGrid.innerHTML = insights
    .map(
      (item) => `
        <article class="insight-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
          <small>${escapeHtml(item.hint)}</small>
        </article>
      `
    )
    .join("");
}

function renderReminders(reminderItems) {
  const digest = buildReminderDigest(reminderItems);

  reminderList.innerHTML = reminderItems.length
    ? reminderItems
        .slice(0, 4)
        .map(
          (item) => `
            <article class="reminder-item">
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.reason)}</span>
            </article>
          `
        )
        .join("")
    : `
      <article class="reminder-item is-clear">
        <strong>Все спокойно</strong>
        <span>Нет просроченных, зависших или недооформленных карточек.</span>
      </article>
    `;

  const encodedSubject = encodeURIComponent("Напоминание по контент-доске");
  const encodedDigest = encodeURIComponent(digest);
  emailRemindersLink.href = `mailto:?subject=${encodedSubject}&body=${encodedDigest}`;
  telegramRemindersLink.href = `https://t.me/share/url?text=${encodedDigest}`;
  copyRemindersButton.disabled = reminderItems.length === 0;
}

function renderSchedule(scheduleItems) {
  scheduleList.innerHTML = scheduleItems.length
    ? scheduleItems
        .map(
          (item) => `
            <button class="schedule-item ${item.statusClass}" type="button" data-schedule-post="${item.id}">
              <span class="schedule-date">${escapeHtml(item.dateLabel)}</span>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.meta)}</span>
            </button>
          `
        )
        .join("")
    : `
      <div class="schedule-empty">
        <strong>Дат пока нет</strong>
        <span>Назначь дату карточке, и она появится в календаре.</span>
      </div>
    `;
}

function renderFilters() {
  const currentValue = networkFilter.value;
  const currentTag = tagFilter.value;
  const networks = getAvailableNetworks().sort((a, b) =>
    a.localeCompare(b, "ru")
  );
  const tags = getAvailableTags();

  networkFilter.innerHTML = `
    <option value="all">Все соцсети</option>
    ${networks
      .map((network) => `<option value="${escapeHtml(network)}">${escapeHtml(network)}</option>`)
      .join("")}
  `;

  networkFilter.value = networks.includes(currentValue) ? currentValue : "all";
  filters.network = networkFilter.value;

  tagFilter.innerHTML = `
    <option value="all">Все теги</option>
    ${tags
      .map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`)
      .join("")}
  `;
  tagFilter.value = tags.includes(currentTag) ? currentTag : "all";
  filters.tag = tagFilter.value;
}

function renderNetworkOptions(select, selectedValue, includeEmpty = false) {
  const networks = getAvailableNetworks();
  select.innerHTML = `
    ${includeEmpty ? '<option value="">Выбери канал</option>' : ""}
    ${networks
      .map((network) => `<option value="${escapeHtml(network)}">${escapeHtml(network)}</option>`)
      .join("")}
  `;
  select.value = networks.includes(selectedValue) ? selectedValue : networks[0];
}

function getAvailableNetworks() {
  return [...new Set([...settings.networks, ...posts.map((post) => post.network)])].filter(Boolean);
}

function getAvailableTags() {
  return [...new Set(posts.flatMap((post) => post.tags || []))].sort((a, b) =>
    a.localeCompare(b, "ru")
  );
}

function getVisiblePosts() {
  return posts.filter((post) => {
    const query = `${post.title} ${post.text}`.toLowerCase();
    const tagQuery = (post.tags || []).join(" ").toLowerCase();
    const matchesSearch = !filters.search || query.includes(filters.search);
    const matchesSearchWithTags = matchesSearch || Boolean(filters.search && tagQuery.includes(filters.search));
    const matchesNetwork = filters.network === "all" || post.network === filters.network;
    const matchesTag = filters.tag === "all" || (post.tags || []).includes(filters.tag);
    const dateStatus = getDateStatus(post);
    const stageStatus = getStageStatus(post);
    const matchesArchive =
      filters.archive === "all" ||
      (filters.archive === "active" && !post.archived) ||
      (filters.archive === "archived" && post.archived);
    const matchesDate =
      filters.date === "all" ||
      (filters.date === "withoutDate" && !post.date) ||
      (filters.date === "overdue" && dateStatus.isOverdue) ||
      (filters.date === "stale" && stageStatus.isStale);

    return matchesSearchWithTags && matchesNetwork && matchesTag && matchesArchive && matchesDate;
  });
}

function hasActiveFilters() {
  return (
    Boolean(filters.search) ||
    filters.network !== "all" ||
    filters.date !== "all" ||
    filters.archive !== "active"
  );
}

function applySettings() {
  projectTitle.textContent = settings.projectName;
  projectSubtitle.textContent = settings.projectSubtitle;
  document.title = `${settings.projectName} · Content Board MVP`;
  renderNetworkOptions(networkInput, settings.defaultNetwork);
}

function openSettingsDialog() {
  fillSettingsForm();
  settingsDialog.showModal();
  projectNameInput.focus();
}

function fillSettingsForm() {
  projectNameInput.value = settings.projectName;
  projectSubtitleInput.value = settings.projectSubtitle;
  networksInput.value = settings.networks.join(", ");
  settingsStaleThresholdInput.value = String(staleThresholdDays);
  renderNetworkOptions(defaultNetworkInput, settings.defaultNetwork);
}

function closeSettingsDialog() {
  settingsForm.reset();
  settingsDialog.close();
}

function resetSettings() {
  settings = { ...defaultSettings, networks: [...defaultSettings.networks] };
  staleThresholdDays = DEFAULT_STALE_THRESHOLD_DAYS;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  localStorage.setItem(STALE_THRESHOLD_KEY, String(staleThresholdDays));
  staleThresholdInput.value = String(staleThresholdDays);
  applySettings();
  renderBoard();
  fillSettingsForm();
}

function openPostDialog(post = null) {
  editingPostId = post?.id || null;
  dialogTitle.textContent = post ? "Редактирование поста" : "Новая идея";
  titleInput.value = post?.title || "";
  textInput.value = post?.text || "";
  dateInput.value = post?.date || "";
  priorityInput.value = normalizePriority(post?.priority);
  referenceInput.value = post?.referenceUrl || "";
  tagsInput.value = post?.tags?.join(", ") || "";
  renderNetworkOptions(networkInput, post?.network || settings.defaultNetwork);
  writeChecklist(post?.checklist);
  renderHistory(post);
  deletePostButton.classList.toggle("is-hidden", !post);
  archivePostButton.classList.toggle("is-hidden", !post || (!post.archived && post.stage !== "published"));
  archivePostButton.textContent = post?.archived ? "Вернуть из архива" : "В архив";
  dialog.showModal();
  titleInput.focus();
}

function closePostDialog() {
  form.reset();
  writeChecklist();
  aiOutput.value = "";
  templateInput.value = "";
  historyPanel.classList.add("is-hidden");
  historyList.innerHTML = "";
  editingPostId = null;
  dialog.close();
}

function readChecklist() {
  return {
    text: checkTextInput.checked,
    date: checkDateInput.checked,
    review: checkReviewInput.checked,
    published: checkPublishedInput.checked
  };
}

function writeChecklist(checklist = {}) {
  checkTextInput.checked = Boolean(checklist.text);
  checkDateInput.checked = Boolean(checklist.date);
  checkReviewInput.checked = Boolean(checklist.review);
  checkPublishedInput.checked = Boolean(checklist.published);
}

function renderHistory(post) {
  if (!post) {
    historyPanel.classList.add("is-hidden");
    historyList.innerHTML = "";
    return;
  }

  const history = normalizeHistory(post).slice(-6).reverse();
  historyPanel.classList.remove("is-hidden");
  historyList.innerHTML = history
    .map(
      (item) => `
        <article class="history-item">
          <span>${escapeHtml(formatDateTime(item.at))}</span>
          <strong>${escapeHtml(item.label)}</strong>
        </article>
      `
    )
    .join("");
}

function createInitialHistory(timestamp = Date.now()) {
  return [
    {
      type: "created",
      label: "Карточка создана",
      at: timestamp
    }
  ];
}

function addHistoryEvent(history, type, label) {
  return [
    ...normalizeHistory({ history, createdAt: Date.now() }),
    {
      type,
      label,
      at: Date.now()
    }
  ].slice(-20);
}

function normalizeHistory(post) {
  const history = Array.isArray(post.history)
    ? post.history
        .filter((item) => item && item.label)
        .map((item) => ({
          type: String(item.type || "updated"),
          label: String(item.label),
          at: Number(item.at) || Number(post.createdAt) || Date.now()
        }))
    : [];

  return history.length ? history : createInitialHistory(Number(post.createdAt) || Date.now());
}

function applySelectedTemplate() {
  const template = postTemplates[templateInput.value];

  if (!template) {
    return;
  }

  const hasExistingContent = titleInput.value.trim() || textInput.value.trim();

  if (hasExistingContent && !window.confirm("Заменить текущий заголовок и текст шаблоном?")) {
    return;
  }

  titleInput.value = template.title;
  textInput.value = template.text;
  networkInput.value = template.network;
  checkTextInput.checked = true;
}

function movePostByOneStage(postId, direction) {
  const post = posts.find((item) => item.id === postId);

  if (!post) {
    return;
  }

  const currentIndex = stages.findIndex((stage) => stage.id === post.stage);
  const nextStage = stages[currentIndex + direction];

  if (nextStage) {
    movePostToStage(postId, nextStage.id);
  }
}

function movePostToStage(postId, stageId) {
  const post = posts.find((item) => item.id === postId);

  if (!post || post.stage === stageId || post.archived) {
    return;
  }

  const currentIndex = stages.findIndex((stage) => stage.id === post.stage);
  const nextIndex = stages.findIndex((stage) => stage.id === stageId);
  const isNeighbor = Math.abs(currentIndex - nextIndex) === 1;

  if (!isNeighbor) {
    return;
  }

  posts = posts.map((item) =>
    item.id === postId
      ? {
          ...item,
          stage: stageId,
          stageChangedAt: Date.now(),
          archived: stageId === "published" ? item.archived : false,
          archivedAt: stageId === "published" ? item.archivedAt : "",
          history: addHistoryEvent(
            item.history,
            "moved",
            `Перемещена: ${getStageTitle(item.stage)} → ${getStageTitle(stageId)}`
          )
        }
      : item
  );
  savePosts();
  renderBoard();
}

function togglePostArchive(postId, archived) {
  posts = posts.map((post) => {
    if (post.id !== postId) {
      return post;
    }

    if (!post.archived && post.stage !== "published") {
      return post;
    }

    return {
      ...post,
      archived,
      archivedAt: archived ? Date.now() : "",
      history: addHistoryEvent(
        post.history,
        archived ? "archived" : "restored",
        archived ? "Карточка отправлена в архив" : "Карточка возвращена из архива"
      )
    };
  });

  savePosts();
  renderBoard();
}

function formatDate(date) {
  if (!date) {
    return "Без даты";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function formatDateTime(timestamp) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(Number(timestamp) || Date.now()));
}

function getStageTitle(stageId) {
  return stages.find((stage) => stage.id === stageId)?.title || stageId;
}

function getDateStatus(post) {
  if (!post.date) {
    return {
      className: post.stage === "scheduled" ? "needs-date" : "",
      isAttention: post.stage === "scheduled",
      isOverdue: false,
      label: post.stage === "scheduled" ? "Нужна дата" : "Без даты"
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const postDate = new Date(`${post.date}T00:00:00`);
  const isOverdue = postDate < today && post.stage !== "published";

  return {
    className: isOverdue ? "is-overdue" : "",
    isAttention: isOverdue,
    isOverdue,
    label: isOverdue ? `Просрочено: ${formatDate(post.date)}` : formatDate(post.date)
  };
}

function getStageStatus(post) {
  const changedAt = Number(post.stageChangedAt || post.createdAt || Date.now());
  const ageDays = Math.max(0, Math.floor((Date.now() - changedAt) / DAY_IN_MS));
  const isStale = post.stage !== "published" && ageDays >= staleThresholdDays;

  if (ageDays === 0) {
    return {
      ageDays,
      isStale,
      label: "На стадии сегодня"
    };
  }

  return {
    ageDays,
    isStale,
    label: `На стадии ${formatDays(ageDays)}`
  };
}

function getChecklistStatus(post) {
  const checklist = post.checklist || {};
  const values = [
    Boolean(checklist.text),
    Boolean(checklist.date),
    Boolean(checklist.review),
    Boolean(checklist.published)
  ];
  const done = values.filter(Boolean).length;

  return {
    done,
    total: values.length,
    percent: Math.round((done / values.length) * 100)
  };
}

function getProcessInsights() {
  const activePosts = posts.filter((post) => !post.archived);
  const activeTotal = activePosts.length;
  const publishedCount = activePosts.filter((post) => post.stage === "published").length;
  const staleCount = activePosts.filter((post) => getStageStatus(post).isStale).length;
  const checklistTotal = activePosts.reduce((sum, post) => sum + getChecklistStatus(post).percent, 0);
  const readiness = activeTotal ? Math.round(checklistTotal / activeTotal) : 0;
  const publishedShare = activeTotal ? Math.round((publishedCount / activeTotal) * 100) : 0;
  const busiestStage = getBusiestStage(activePosts);

  return [
    {
      label: "До публикации",
      value: `${publishedShare}%`,
      hint: `${publishedCount} из ${activeTotal || 0} активных`
    },
    {
      label: "Готовность",
      value: `${readiness}%`,
      hint: "средний чеклист"
    },
    {
      label: "Зависли",
      value: String(staleCount),
      hint: `порог ${formatDays(staleThresholdDays)}`
    },
    {
      label: "Узкое место",
      value: busiestStage.title,
      hint: busiestStage.count ? `${busiestStage.count} карточек` : "нет активных карточек"
    }
  ];
}

function getBusiestStage(activePosts) {
  const counts = stages.map((stage) => ({
    title: stage.title,
    count: activePosts.filter((post) => post.stage === stage.id).length
  }));

  return counts.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, "ru"))[0];
}

function getReminderItems() {
  return posts
    .filter((post) => !post.archived && post.stage !== "published")
    .map((post) => {
      const dateStatus = getDateStatus(post);
      const stageStatus = getStageStatus(post);
      const stageTitle = stages.find((stage) => stage.id === post.stage)?.title || post.stage;
      const reasons = [];

      if (stageStatus.isStale) {
        reasons.push(`зависла на стадии "${stageTitle}" ${formatDays(stageStatus.ageDays)}`);
      }

      if (dateStatus.isOverdue) {
        reasons.push(`просрочена дата ${formatDate(post.date)}`);
      }

      if (post.stage === "scheduled" && !post.date) {
        reasons.push("в планировании не выбрана дата");
      }

      return {
        id: post.id,
        title: post.title,
        stage: stageTitle,
        reason: reasons.join(", "),
        priority: Number(stageStatus.isStale) + Number(dateStatus.isOverdue) + Number(post.stage === "scheduled" && !post.date),
        ageDays: stageStatus.ageDays
      };
    })
    .filter((item) => item.reason)
    .sort((a, b) => b.priority - a.priority || b.ageDays - a.ageDays || a.title.localeCompare(b.title, "ru"));
}

function getScheduleItems() {
  return posts
    .filter((post) => post.date && !post.archived)
    .map((post) => {
      const date = new Date(`${post.date}T00:00:00`);
      const stageTitle = stages.find((stage) => stage.id === post.stage)?.title || post.stage;
      const relative = getScheduleRelativeLabel(date, post.stage);

      return {
        id: post.id,
        title: post.title,
        dateValue: date.getTime(),
        dateLabel: formatDate(post.date),
        statusClass: relative.statusClass,
        meta: `${relative.label} · ${stageTitle} · ${post.network}`
      };
    })
    .sort((a, b) => a.dateValue - b.dateValue || a.title.localeCompare(b.title, "ru"))
    .slice(0, 8);
}

function getScheduleRelativeLabel(date, stage) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / DAY_IN_MS);

  if (diffDays < 0 && stage !== "published") {
    return {
      label: `просрочено на ${formatDays(Math.abs(diffDays))}`,
      statusClass: "is-overdue"
    };
  }

  if (diffDays === 0) {
    return {
      label: "сегодня",
      statusClass: "is-today"
    };
  }

  if (diffDays > 0) {
    return {
      label: `через ${formatDays(diffDays)}`,
      statusClass: ""
    };
  }

  return {
    label: "опубликовано",
    statusClass: "is-done"
  };
}

function buildReminderDigest(reminderItems) {
  if (reminderItems.length === 0) {
    return "На контент-доске сейчас нет карточек, которые требуют напоминания.";
  }

  const lines = reminderItems.map(
    (item, index) => `${index + 1}. ${item.title} — ${item.reason}.`
  );

  return [
    "Нужно продвинуть контент по доске:",
    "",
    ...lines,
    "",
    `Порог зависания: ${formatDays(staleThresholdDays)}.`
  ].join("\n");
}

function buildVisiblePostsDigest(visiblePosts) {
  if (visiblePosts.length === 0) {
    return "По текущим фильтрам карточек нет.";
  }

  const lines = visiblePosts.map((post, index) => {
    const stageTitle = stages.find((stage) => stage.id === post.stage)?.title || post.stage;
    const dateLabel = post.date ? formatDate(post.date) : "без даты";
    const archiveLabel = post.archived ? ", архив" : "";

    return `${index + 1}. ${post.title} — ${stageTitle}, ${post.network}, ${dateLabel}${archiveLabel}.`;
  });

  return [
    hasActiveFilters() ? "Карточки по текущим фильтрам:" : "Все активные карточки:",
    "",
    ...lines
  ].join("\n");
}

function buildLocalDraft() {
  const title = titleInput.value.trim() || "Тема поста";
  const network = networkInput.value;
  const dateLine = dateInput.value ? `Дата выхода: ${formatDate(dateInput.value)}` : "Дата выхода: не выбрана";
  const style = getNetworkStyle(network);

  return [
    `Хук: ${title}`,
    "",
    `Главная мысль: ${style.mainIdea}`,
    "",
    "Текст:",
    `1. Назови проблему, которую человек узнает сразу.`,
    `2. Покажи один конкретный пример или мини-историю.`,
    `3. Дай практичный вывод: что сделать сегодня.`,
    "",
    `Формат: ${style.format}`,
    dateLine,
    "",
    "CTA: Напиши в комментариях, на какой стадии сейчас твой контент."
  ].join("\n");
}

function buildAiPrompt() {
  const title = titleInput.value.trim() || "Тема поста";
  const currentText = textInput.value.trim() || "Текста пока нет.";
  const network = networkInput.value;
  const dateLine = dateInput.value ? formatDate(dateInput.value) : "дата еще не выбрана";
  const checklist = readChecklist();

  return [
    "Ты опытный редактор контента.",
    `Подготовь пост для ${network}.`,
    `Тема: ${title}.`,
    `Дата публикации: ${dateLine}.`,
    "",
    "Исходник:",
    currentText,
    "",
    "Сделай:",
    "- сильный хук в первой строке;",
    "- короткий, живой текст без канцелярита;",
    "- структуру, которую легко читать с телефона;",
    "- один понятный CTA в конце;",
    "- 3 варианта заголовка.",
    "",
    `Статус готовности: текст ${checklist.text ? "готов" : "не готов"}, дата ${
      checklist.date ? "выбрана" : "не выбрана"
    }, проверка ${checklist.review ? "пройдена" : "не пройдена"}.`
  ].join("\n");
}

function getNetworkStyle(network) {
  const styles = {
    Instagram: {
      mainIdea: "зацепить эмоцией и быстро перейти к полезному выводу",
      format: "короткие абзацы, 1-2 эмодзи можно добавить уже вручную"
    },
    Telegram: {
      mainIdea: "дать мысль глубже и оставить ощущение разговора один на один",
      format: "абзацы по 1-3 строки, без перегруза хэштегами"
    },
    VK: {
      mainIdea: "объяснить пользу простым языком и пригласить к обсуждению",
      format: "средняя длина, дружелюбный тон, конкретный пример"
    },
    YouTube: {
      mainIdea: "собрать сценарный каркас для описания или Shorts",
      format: "хук, тезисы, финальный призыв"
    }
  };

  return styles[network] || {
    mainIdea: "понятно объяснить ценность идеи для аудитории",
    format: "короткая структура: хук, пример, вывод, CTA"
  };
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    aiOutput.select();
    document.execCommand("copy");
  }
}

function exportPosts() {
  const payload = {
    exportedAt: new Date().toISOString(),
    posts
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "content-board-backup.json";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function importPosts(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(reader.result);
      const importedPosts = Array.isArray(parsed) ? parsed : parsed.posts;

      if (!Array.isArray(importedPosts)) {
        throw new Error("Invalid backup");
      }

      posts = normalizePosts(importedPosts);
      savePosts();
      renderBoard();
    } catch {
      window.alert("Не получилось импортировать файл. Проверь, что это JSON-экспорт доски.");
    } finally {
      importInput.value = "";
    }
  });

  reader.readAsText(file);
}

function normalizePosts(items) {
  return items
    .filter((post) => post && post.title && post.text)
    .map((post) => ({
      id: post.id || crypto.randomUUID(),
      title: String(post.title),
      text: String(post.text),
      date: post.date || "",
      network: post.network || "Другое",
      priority: normalizePriority(post.priority),
      referenceUrl: normalizeUrl(post.referenceUrl || post.reference || ""),
      tags: parseTags(post.tags || post.tag || ""),
      stage: stages.some((stage) => stage.id === post.stage) ? post.stage : "idea",
      createdAt: Number(post.createdAt) || Date.now(),
      stageChangedAt: Number(post.stageChangedAt) || Number(post.createdAt) || Date.now(),
      archived: Boolean(post.archived),
      archivedAt: post.archived ? Number(post.archivedAt) || Date.now() : "",
      history: normalizeHistory(post),
      checklist: {
        text: Boolean(post.checklist?.text),
        date: Boolean(post.checklist?.date),
        review: Boolean(post.checklist?.review),
        published: Boolean(post.checklist?.published)
      }
    }));
}

function formatDays(days) {
  const lastTwoDigits = days % 100;
  const lastDigit = days % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${days} дней`;
  }

  if (lastDigit === 1) {
    return `${days} день`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${days} дня`;
  }

  return `${days} дней`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(String(value));
}
