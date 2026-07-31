const STORAGE_KEY = "content-board-mvp-posts";

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
    createdAt: Date.now()
  },
  {
    id: crypto.randomUUID(),
    title: "Черновик кейса для VK",
    text: "Описать проблему, решение и результат в одном посте.",
    date: new Date().toISOString().slice(0, 10),
    network: "VK",
    stage: "draft",
    createdAt: Date.now() - 1
  }
];

let posts = loadPosts();
let editingPostId = null;

const board = document.querySelector("#board");
const summaryStrip = document.querySelector("#summaryStrip");
const dialog = document.querySelector("#postDialog");
const form = document.querySelector("#postForm");
const addPostButton = document.querySelector("#addPostButton");
const closeDialogButton = document.querySelector("#closeDialogButton");
const deletePostButton = document.querySelector("#deletePostButton");
const dialogTitle = document.querySelector("#dialogTitle");
const titleInput = document.querySelector("#postTitle");
const textInput = document.querySelector("#postText");
const dateInput = document.querySelector("#postDate");
const networkInput = document.querySelector("#postNetwork");

renderBoard();

addPostButton.addEventListener("click", () => openPostDialog());
closeDialogButton.addEventListener("click", closePostDialog);

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
    network: networkInput.value
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
        createdAt: Date.now()
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

function loadPosts() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return samplePosts;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : samplePosts;
  } catch {
    return samplePosts;
  }
}

function savePosts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function renderBoard() {
  board.innerHTML = "";
  renderSummary();

  stages.forEach((stage) => {
    const stagePosts = posts
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
    empty.innerHTML = `
      <strong>Пока пусто</strong>
      <span>Перетащи карточку сюда или двигай стрелками</span>
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
  const card = document.createElement("article");
  card.className = "post-card";
  card.style.setProperty("--stage-accent", stage.accent);
  card.draggable = true;
  card.tabIndex = 0;
  card.innerHTML = `
    <div>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.text)}</p>
    </div>
    <div class="meta-row">
      <span class="tag">${escapeHtml(post.network)}</span>
      <span class="date">${formatDate(post.date)}</span>
    </div>
    <div class="card-actions" aria-label="Перемещение по стадиям">
      <button class="move-button" type="button" data-direction="-1" aria-label="Переместить назад">←</button>
      <span>Стадия: ${escapeHtml(stage.title)}</span>
      <button class="move-button" type="button" data-direction="1" aria-label="Переместить вперед">→</button>
    </div>
  `;

  card.querySelector('[data-direction="-1"]').disabled = currentStageIndex === 0;
  card.querySelector('[data-direction="1"]').disabled =
    currentStageIndex === stages.length - 1;

  card.addEventListener("click", (event) => {
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
    event.dataTransfer.setData("text/plain", post.id);
    card.classList.add("dragging");
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
  });

  return card;
}

function renderSummary() {
  const total = posts.length;
  const published = posts.filter((post) => post.stage === "published").length;
  const scheduled = posts.filter((post) => post.stage === "scheduled").length;
  const withDate = posts.filter((post) => Boolean(post.date)).length;

  summaryStrip.innerHTML = `
    <article>
      <strong>${total}</strong>
      <span>всего постов</span>
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
      <strong>${withDate}</strong>
      <span>с датой</span>
    </article>
  `;
}

function openPostDialog(post = null) {
  editingPostId = post?.id || null;
  dialogTitle.textContent = post ? "Редактирование поста" : "Новая идея";
  titleInput.value = post?.title || "";
  textInput.value = post?.text || "";
  dateInput.value = post?.date || "";
  networkInput.value = post?.network || "Instagram";
  deletePostButton.classList.toggle("is-hidden", !post);
  dialog.showModal();
  titleInput.focus();
}

function closePostDialog() {
  form.reset();
  editingPostId = null;
  dialog.close();
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

  if (!post || post.stage === stageId) {
    return;
  }

  const currentIndex = stages.findIndex((stage) => stage.id === post.stage);
  const nextIndex = stages.findIndex((stage) => stage.id === stageId);
  const isNeighbor = Math.abs(currentIndex - nextIndex) === 1;

  if (!isNeighbor) {
    return;
  }

  posts = posts.map((item) =>
    item.id === postId ? { ...item, stage: stageId } : item
  );
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

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
