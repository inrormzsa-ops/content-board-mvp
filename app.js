const STORAGE_KEY = "content-board-mvp-posts";
const STALE_THRESHOLD_KEY = "content-board-mvp-stale-threshold";
const DEFAULT_STALE_THRESHOLD_DAYS = 3;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

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

let posts = loadPosts();
let editingPostId = null;
let staleThresholdDays = loadStaleThreshold();
let filters = {
  search: "",
  network: "all",
  date: "all",
  archive: "active"
};

const board = document.querySelector("#board");
const summaryStrip = document.querySelector("#summaryStrip");
const reminderList = document.querySelector("#reminderList");
const copyRemindersButton = document.querySelector("#copyRemindersButton");
const emailRemindersLink = document.querySelector("#emailRemindersLink");
const telegramRemindersLink = document.querySelector("#telegramRemindersLink");
const searchInput = document.querySelector("#searchInput");
const networkFilter = document.querySelector("#networkFilter");
const dateFilter = document.querySelector("#dateFilter");
const archiveFilter = document.querySelector("#archiveFilter");
const staleThresholdInput = document.querySelector("#staleThresholdInput");
const resetFiltersButton = document.querySelector("#resetFiltersButton");
const exportButton = document.querySelector("#exportButton");
const importInput = document.querySelector("#importInput");
const dialog = document.querySelector("#postDialog");
const form = document.querySelector("#postForm");
const addPostButton = document.querySelector("#addPostButton");
const closeDialogButton = document.querySelector("#closeDialogButton");
const deletePostButton = document.querySelector("#deletePostButton");
const archivePostButton = document.querySelector("#archivePostButton");
const dialogTitle = document.querySelector("#dialogTitle");
const titleInput = document.querySelector("#postTitle");
const textInput = document.querySelector("#postText");
const dateInput = document.querySelector("#postDate");
const networkInput = document.querySelector("#postNetwork");
const checkTextInput = document.querySelector("#checkText");
const checkDateInput = document.querySelector("#checkDate");
const checkReviewInput = document.querySelector("#checkReview");
const checkPublishedInput = document.querySelector("#checkPublished");
const aiDraftButton = document.querySelector("#aiDraftButton");
const aiPromptButton = document.querySelector("#aiPromptButton");
const aiOutput = document.querySelector("#aiOutput");
const copyAiOutputButton = document.querySelector("#copyAiOutputButton");
const insertAiOutputButton = document.querySelector("#insertAiOutputButton");

renderBoard();
staleThresholdInput.value = String(staleThresholdDays);

addPostButton.addEventListener("click", () => openPostDialog());
closeDialogButton.addEventListener("click", closePostDialog);

copyRemindersButton.addEventListener("click", async () => {
  await copyText(buildReminderDigest(getReminderItems()));
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

staleThresholdInput.addEventListener("change", () => {
  const nextValue = Number(staleThresholdInput.value);
  staleThresholdDays = Number.isFinite(nextValue)
    ? Math.min(Math.max(Math.round(nextValue), 1), 30)
    : DEFAULT_STALE_THRESHOLD_DAYS;
  staleThresholdInput.value = String(staleThresholdDays);
  localStorage.setItem(STALE_THRESHOLD_KEY, String(staleThresholdDays));
  renderBoard();
});

resetFiltersButton.addEventListener("click", () => {
  filters = {
    search: "",
    network: "all",
    date: "all",
    archive: "active"
  };
  searchInput.value = "";
  networkFilter.value = "all";
  dateFilter.value = "all";
  archiveFilter.value = "active";
  renderBoard();
});

exportButton.addEventListener("click", exportPosts);
importInput.addEventListener("change", importPosts);

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

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    closePostDialog();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const values = {
    title: titleInput.value.trim(),
    text: textInput.value.trim(),
    date: dateInput.value,
    network: networkInput.value,
    checklist: readChecklist()
  };

  if (!values.title || !values.text) {
    return;
  }

  if (editingPostId) {
    posts = posts.map((post) =>
      post.id === editingPostId ? { ...post, ...values } : post
    );
  } else {
    posts = [
      {
        id: crypto.randomUUID(),
        ...values,
        stage: "idea",
        archived: false,
        archivedAt: "",
        createdAt: Date.now(),
        stageChangedAt: Date.now()
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

function loadStaleThreshold() {
  const storedValue = Number(localStorage.getItem(STALE_THRESHOLD_KEY));

  if (!Number.isFinite(storedValue)) {
    return DEFAULT_STALE_THRESHOLD_DAYS;
  }

  return Math.min(Math.max(Math.round(storedValue), 1), 30);
}

function renderBoard() {
  const visiblePosts = getVisiblePosts();
  const reminderItems = getReminderItems();

  board.innerHTML = "";
  renderFilters();
  renderSummary(visiblePosts);
  renderReminders(reminderItems);

  stages.forEach((stage) => {
    const stagePosts = visiblePosts
      .filter((post) => post.stage === stage.id)
      .sort((a, b) => b.createdAt - a.createdAt);
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

function renderFilters() {
  const currentValue = networkFilter.value;
  const networks = [...new Set(posts.map((post) => post.network))].sort((a, b) =>
    a.localeCompare(b, "ru")
  );

  networkFilter.innerHTML = `
    <option value="all">Все соцсети</option>
    ${networks
      .map((network) => `<option value="${escapeHtml(network)}">${escapeHtml(network)}</option>`)
      .join("")}
  `;

  networkFilter.value = networks.includes(currentValue) ? currentValue : "all";
  filters.network = networkFilter.value;
}

function getVisiblePosts() {
  return posts.filter((post) => {
    const query = `${post.title} ${post.text}`.toLowerCase();
    const matchesSearch = !filters.search || query.includes(filters.search);
    const matchesNetwork = filters.network === "all" || post.network === filters.network;
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

    return matchesSearch && matchesNetwork && matchesArchive && matchesDate;
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

function openPostDialog(post = null) {
  editingPostId = post?.id || null;
  dialogTitle.textContent = post ? "Редактирование поста" : "Новая идея";
  titleInput.value = post?.title || "";
  textInput.value = post?.text || "";
  dateInput.value = post?.date || "";
  networkInput.value = post?.network || "Instagram";
  writeChecklist(post?.checklist);
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
          archivedAt: stageId === "published" ? item.archivedAt : ""
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
      archivedAt: archived ? Date.now() : ""
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
      stage: stages.some((stage) => stage.id === post.stage) ? post.stage : "idea",
      createdAt: Number(post.createdAt) || Date.now(),
      stageChangedAt: Number(post.stageChangedAt) || Number(post.createdAt) || Date.now(),
      archived: Boolean(post.archived),
      archivedAt: post.archived ? Number(post.archivedAt) || Date.now() : "",
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
