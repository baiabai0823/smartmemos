const STORE_KEY = "smartmemo.secure.v1";
const LEGACY_PASSWORD_KEY = "smartmemo.passwords.plain.v1";
const APP_SECRET = "SmartMemo-iPhone-local-app-key-v1";
const BACKUP_FORMAT = "smartmemo.encrypted.backup.v1";
const MASTER_PASSWORD = "bab2001823";

const $ = (selector) => document.querySelector(selector);
const app = $("#app");
const imagePicker = $("#imagePicker");
const backupPicker = $("#backupPicker");

let state = {
  folders: [],
  notes: [],
  history: [],
  settings: {
    theme: "dark",
    notifications: false
  }
};

let plainPasswords = {
  folders: {},
  notes: {}
};

function normalizePasswordVault(value = {}) {
  return {
    folders: value?.folders || {},
    notes: value?.notes || {},
    recovery: {
      folders: value?.recovery?.folders || {},
      notes: value?.recovery?.notes || {}
    }
  };
}

function mergePasswordVault(primary = {}, secondary = {}) {
  const a = normalizePasswordVault(primary);
  const b = normalizePasswordVault(secondary);
  return {
    folders: { ...a.folders, ...b.folders },
    notes: { ...a.notes, ...b.notes },
    recovery: {
      folders: { ...a.recovery.folders, ...b.recovery.folders },
      notes: { ...a.recovery.notes, ...b.recovery.notes }
    }
  };
}
let ui = {
  view: "home",
  folderId: null,
  noteId: null,
  search: "",
  composingSearch: false,
  saveStatus: "completed",
  tab: "all",
  unlockedFolders: new Set(),
  unlockedNotes: new Set(),
  modal: null,
  alarm: null,
  saveTimer: null,
  wheelDraft: null,
  longPressFolderId: null,
  silentTimer: null,
  alarmVibrateTimer: null,
  revealedPasswords: new Set(),
  recoveryOpen: new Set(),
  pendingImport: null,
  lastSelection: null,
  pendingDrag: null,
  drag: null,
  dragScrollFrame: null,
  folderPan: null,
  suppressClick: false
};

function uiSvg(type) {
  const icons = {
    back: '<path d="M15 18 9 12l6-6"/>',
    folder: '<path d="M3.5 7.5h6l2 2h9v8.5a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2Z"/>',
    note: '<path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5Z"/><path d="M13.5 3.8V8h4.2"/><path d="M9 12h6"/><path d="M9 15h6"/><path d="M9 18h4"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    unlocked: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M15 10V7a4 4 0 0 0-7.6-1.7"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0v5l2 3H4l2-3V8Z"/><path d="M10 20h4"/>',
    bellOff: '<path d="M6.8 6.2A8 8 0 0 0 5 11.2V14l-1.6 2.5h10.1"/><path d="M17.4 15.7 19 14v-2.8a8 8 0 0 0-8-8 7.8 7.8 0 0 0-2.3.3"/><path d="M10 20h4"/><path d="M4 4l16 16"/>',
    image: '<rect x="4" y="5" width="16" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m6.8 17 4.4-4.6 3.2 3.2 1.8-2.1 2.9 3.5"/>',
    gear: '<path d="M4 7h16"/><circle cx="9" cy="7" r="2"/><path d="M4 17h16"/><circle cx="15" cy="17" r="2"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m6 7 1 14h10l1-14"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    export: '<path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 15v4h14v-4"/>',
    import: '<path d="M12 15V3"/><path d="m7 10 5 5 5-5"/><path d="M5 19h14"/>',
    moon: '<path d="M20 14.2A7.7 7.7 0 0 1 9.8 4 8.2 8.2 0 1 0 20 14.2Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.9 4.9 6.3 6.3"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.9 19.1 1.4-1.4"/><path d="m17.7 6.3 1.4-1.4"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    history: '<path d="M4 12a8 8 0 1 0 2.35-5.65L4 8.7"/><path d="M4 4v4.7h4.7"/><path d="M12 7v5l3.2 2"/>',
    stack: '<path d="M12 3 4 7l8 4 8-4-8-4Z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/>',
    close: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>',
    plusImage: '<rect x="4" y="5" width="16" height="14" rx="2.5"/><path d="M12 9v6"/><path d="M9 12h6"/>',
    move: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    restore: '<path d="M20 6v5h-5"/><path d="M20 11a8 8 0 1 0 2.1 5.4"/><path d="M8 12l2.3 2.3L15.5 9"/>'
  };
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[type] || ""}</svg>`;
}

const icon = {
  back: uiSvg("back"),
  plus: "+",
  folder: uiSvg("folder"),
  note: uiSvg("note"),
  lock: uiSvg("lock"),
  unlocked: uiSvg("unlocked"),
  bell: uiSvg("bell"),
  bellOff: uiSvg("bellOff"),
  image: uiSvg("image"),
  gear: uiSvg("gear"),
  trash: uiSvg("trash"),
  export: uiSvg("export"),
  import: uiSvg("import"),
  moon: uiSvg("moon"),
  sun: uiSvg("sun"),
  moveUp: uiSvg("up"),
  moveDown: uiSvg("down"),
  move: uiSvg("move"),
  restore: uiSvg("restore"),
  history: uiSvg("history"),
  save: uiSvg("note"),
  close: uiSvg("close"),
  search: uiSvg("search"),
  stack: uiSvg("stack"),
  pictureAdd: uiSvg("plusImage"),
  vaultGlyph: uiSvg("stack"),
  historyGlyph: uiSvg("history")
};

function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function fmtTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textFromHtml(html = "") {
  const box = document.createElement("div");
  box.innerHTML = html;
  return box.textContent.replace(/\s+/g, " ").trim();
}

function sanitizeHtml(html = "") {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach((n) => n.remove());
  template.content.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value || "";
      if (name.startsWith("on")) node.removeAttribute(attr.name);
      if ((name === "src" || name === "href") && !value.startsWith("data:image") && !value.startsWith("#")) {
        node.removeAttribute(attr.name);
      }
    });
  });
  return template.innerHTML;
}

async function secretKey(secret = APP_SECRET) {
  const bytes = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function encryptPayload(payload, secret = APP_SECRET) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await secretKey(secret);
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return {
    format: BACKUP_FORMAT,
    iv: toBase64(iv),
    data: toBase64(cipher)
  };
}

async function decryptPayload(payload, secret = APP_SECRET) {
  if (!payload || payload.format !== BACKUP_FORMAT) throw new Error("FORMAT");
  const key = await secretKey(secret);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.data)
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

function seedData() {
  const inbox = uid("folder");
  const privateFolder = uid("folder");
  state.folders = [
    { id: inbox, name: "收纳备忘", hasPassword: false, createdAt: nowIso(), updatedAt: nowIso() },
    { id: privateFolder, name: "私密文件夹", hasPassword: true, createdAt: nowIso(), updatedAt: nowIso() }
  ];
  plainPasswords.folders[privateFolder] = "1234";
  state.history = [];
  state.notes = [
    {
      id: uid("note"),
      folderId: null,
      title: "快速记录",
      bodyHtml: "双击标题或正文即可编辑。图片、提醒和密码都在底部工具栏。",
      favorite: false,
      category: "default",
      hasPassword: false,
      reminder: null,
      images: [],
      createdAt: nowIso(),
      updatedAt: nowIso()
    },
    {
      id: uid("note"),
      folderId: inbox,
      title: "会议纪要",
      bodyHtml: "1. 整理产品需求<br>2. 标记需要提醒的事项<br>3. 导出加密备份",
      favorite: false,
      category: "default",
      hasPassword: false,
      reminder: null,
      images: [],
      createdAt: nowIso(),
      updatedAt: nowIso()
    },
    {
      id: uid("note"),
      folderId: privateFolder,
      title: "Protected Memo",
      bodyHtml: "Unlock The Space First, Then This Memo Can Still Use Its Own Password.",
      favorite: false,
      category: "life",
      hasPassword: true,
      reminder: null,
      images: [],
      createdAt: nowIso(),
      updatedAt: nowIso()
    }
  ];
  plainPasswords.notes[state.notes[2].id] = "0000";
}

function normalizeState() {
  state.folders = Array.isArray(state.folders) ? state.folders : [];
  state.notes = Array.isArray(state.notes) ? state.notes : [];
  state.history = Array.isArray(state.history) ? state.history.filter((entry) => entry?.type !== "version") : [];
  state.settings = { theme: "dark", notifications: false, ...(state.settings || {}) };
  plainPasswords = mergePasswordVault(state.passwordVault || {}, plainPasswords);
  delete state.passwordVault;
  state.folders.forEach((folder) => {
    folder.parentId = folder.parentId || null;
  });
  state.notes.forEach((note) => {
    note.category = note.category || "default";
    note.images = Array.isArray(note.images) ? note.images : [];
    note.createdAt = note.createdAt || nowIso();
    note.updatedAt = note.updatedAt || note.createdAt;
  });
}

async function load() {
  const passwordRaw = localStorage.getItem(LEGACY_PASSWORD_KEY);
  if (passwordRaw) {
    try {
      plainPasswords = JSON.parse(passwordRaw);
    } catch {
      plainPasswords = normalizePasswordVault();
    }
  }

  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) {
    seedData();
    normalizeState();
    await saveNow();
    return;
  }

  try {
    const payload = JSON.parse(raw);
    state = await decryptPayload(payload);
    normalizeState();
  } catch {
    seedData();
    normalizeState();
    await saveNow();
  }
}

async function saveNow() {
  state.history = Array.isArray(state.history) ? state.history.filter((entry) => entry?.type !== "version") : [];
  const payloadState = JSON.parse(JSON.stringify(state));
  payloadState.passwordVault = normalizePasswordVault(plainPasswords);
  const encrypted = await encryptPayload(payloadState);
  localStorage.setItem(STORE_KEY, JSON.stringify(encrypted));
  localStorage.removeItem(LEGACY_PASSWORD_KEY);
}

function scheduleSave() {
  clearTimeout(ui.saveTimer);
  ui.saveTimer = setTimeout(async () => {
    setSaveStatus("saving");
    await saveNow().catch(console.error);
    setSaveStatus("completed");
  }, 520);
}

function setSaveStatus(status) {
  ui.saveStatus = status;
  const badge = document.querySelector(".save-state");
  if (!badge) return;
  const label = status === "typing" ? "TYPING" : status === "saving" ? "SAVING" : "COMPLETED";
  badge.className = `save-state ${status}`;
  badge.textContent = label;
}

function setView(view, patch = {}) {
  ui = { ...ui, view, ...patch };
  render();
}

function currentFolder() {
  return state.folders.find((folder) => folder.id === ui.folderId) || null;
}

function currentNote() {
  return state.notes.find((note) => note.id === ui.noteId) || null;
}

function compareOrderedItems(a, b) {
  const pinned = (b.pinnedAt ? 1 : 0) - (a.pinnedAt ? 1 : 0);
  if (pinned) return pinned;
  const ai = Number.isFinite(a.orderIndex) ? a.orderIndex : Number.MAX_SAFE_INTEGER;
  const bi = Number.isFinite(b.orderIndex) ? b.orderIndex : Number.MAX_SAFE_INTEGER;
  if (ai !== bi) return ai - bi;
  return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
}

function compareFolders(a, b) {
  return compareOrderedItems(a, b);
}

function compareNotes(a, b) {
  return compareOrderedItems(a, b);
}
function childFolders(parentId = null) {
  return state.folders
    .filter((folder) => (parentId ? folder.parentId === parentId : !folder.parentId))
    .sort(compareFolders);
}

function notesFor(folderId) {
  return state.notes
    .filter((note) => (folderId === "root" ? !note.folderId : note.folderId === folderId))
    .sort(compareNotes);
}

function fuzzyText(value = "") {
  return String(value).toLowerCase().replace(/\s+/g, "");
}

function fuzzyIncludes(source, term) {
  const cleanTerm = fuzzyText(term);
  if (!cleanTerm) return true;
  const cleanSource = fuzzyText(source);
  return cleanSource.includes(cleanTerm) || String(source).toLowerCase().includes(String(term).toLowerCase());
}

function filteredNotes(notes) {
  const term = ui.search.trim();
  return notes.filter((note) => {
    if (ui.tab === "locked" && !note.hasPassword) return false;
    if (ui.tab === "alarm" && !note.reminder) return false;
    if (!term) return true;
    const folder = state.folders.find((item) => item.id === note.folderId);
    return fuzzyIncludes(`${note.title} ${textFromHtml(note.bodyHtml)} ${folder?.name || ""}`, term);
  });
}

function noteIsAccessible(note) {
  if (!note) return false;
  const folder = state.folders.find((item) => item.id === note.folderId);
  if (folder?.hasPassword && !ui.unlockedFolders.has(folder.id)) return false;
  if (note.hasPassword && !ui.unlockedNotes.has(note.id)) return false;
  return true;
}

function render() {
  app.className = `app-shell ${state.settings.theme === "light" ? "light" : ""}`;
  if (ui.view === "folder") renderFolder();
  else if (ui.view === "editor") renderEditor();
  else if (ui.view === "settings") renderSettings();
  else if (ui.view === "history") renderHistory();
  else renderHome();
  renderModal();
  renderAlarm();
}


function renderModalOnly() {
  document.querySelector(".modal-backdrop")?.remove();
  renderModal();
  requestAnimationFrame(focusPrimaryInput);
}
function renderPreservingScroll() {
  const scroll = document.querySelector(".scroll");
  const top = scroll?.scrollTop || 0;
  const stripPositions = [...document.querySelectorAll(".folder-strip")].map((strip, index) => ({ index, left: strip.scrollLeft }));
  render();
  requestAnimationFrame(() => {
    const next = document.querySelector(".scroll");
    if (next) next.scrollTop = top;
    const strips = [...document.querySelectorAll(".folder-strip")];
    stripPositions.forEach(({ index, left }) => {
      if (strips[index]) strips[index].scrollLeft = left;
    });
  });
}
function focusPrimaryInput() {
  const active = document.activeElement;
  if (active?.matches?.("input, textarea, [contenteditable=true]")) return;
  const target = document.querySelector(".modal input:not([type=hidden]), .modal textarea, .memo-screen .label-title, .searchbar input");
  if (!target) return;
  target.focus({ preventScroll: true });
  if (target.select && target.value) target.setSelectionRange(target.value.length, target.value.length);
}
function renderStatus(title, subtitle, actions = "") {
  return `
    <header class="status">
      <div class="status-title">
        <p class="kicker">SmartMemo</p>
        <h1 class="title">${title}</h1>
        ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ""}
      </div>
      <div class="icon-row">${actions}</div>
    </header>
  `;
}

function renderHome() {
  const folders = childFolders(null).filter((folder) => !ui.search.trim() || fuzzyIncludes(`${folder.name} ${notesFor(folder.id).map((note) => `${note.title} ${textFromHtml(note.bodyHtml)}`).join(" ")}`, ui.search));
  const rootNotes = filteredNotes(notesFor("root"));
  const allCount = state.notes.length;
  app.innerHTML = `
    <section class="screen vault-screen">
      ${renderStatus(
        "VAULT",
        `PROPRIETARY NODE · ${allCount} MEMOS`,
        `
          <button class="icon-btn ghost" data-action="theme" title="Theme">${state.settings.theme === "light" ? icon.sun : icon.moon}</button>
          <button class="icon-btn" data-action="settings" title="设置">${icon.gear}</button>
        `
      )}
      <label class="searchbar compact">
        <span class="search-icon">${icon.search}</span>
        <input data-action="search" value="${escapeHtml(ui.search)}" placeholder="Search Vault" autocomplete="off" />
      </label>
      <div class="scroll">
        <div class="section-head quiet">
          <h2>MEMO FILES</h2>
        </div>
        <div class="folder-strip compact-folders">
          ${folders.map(renderFolderCard).join("") || `<div class="empty-card">No Spaces</div>`}
        </div>
        <div class="section-head quiet">
          <h2>ACTIVE MEMOS</h2>
          <span>${rootNotes.length} 条</span>
        </div>
        <div class="note-list vault-root-notes">
          ${rootNotes.map(renderNoteCard).join("") || `<div class="empty-card">Tap + To Create Memo</div>`}
        </div>
      </div>
      ${renderDock("vault")}
    </section>
  `;
}

function renderFolderCard(folder) {
  const locked = folder.hasPassword && !ui.unlockedFolders.has(folder.id);
  const count = state.notes.filter((note) => note.folderId === folder.id).length;
  const armed = ui.longPressFolderId === folder.id;
  const dragging = ui.drag?.type === "folder" && ui.drag?.folderId === folder.id;
  return `
    <button class="folder-card ${dragging ? "dragging-placeholder" : ""} ${folder.hasPassword ? "has-lock" : ""} ${folder.pinnedAt ? "is-pinned" : ""} ${locked ? "is-locked" : ""} ${armed ? "delete-armed" : ""}" data-action="open-folder" data-id="${folder.id}" data-long-folder="${folder.id}">
      ${folder.pinnedAt ? `<span class="pin-mark" title="Pinned">${pinSvg()}</span>` : ""}
      <div class="note-card-content">
        <div class="folder-top">
          <span class="folder-icon">${icon.folder}</span>
          ${folder.hasPassword ? `<span class="lock-corner" data-action="lock-folder" data-id="${folder.id}" title="Lock Space">${icon.lock}</span>` : ""}
        </div>
        <h3>${escapeHtml(folder.name || "Untitled Space")}</h3>
        <p>${locked ? "Locked Space" : `${count} Memos`}</p>
      </div>
      ${armed ? `<span class="long-actions"><span class="long-pin" data-action="pin-folder" data-id="${folder.id}">${pinSvg()}</span><span class="long-delete" data-action="delete-folder" data-id="${folder.id}">${icon.trash}</span></span>` : ""}
    </button>
  `;
}

function renderNoteCard(note) {
  const accessible = noteIsAccessible(note);
  const excerpt = accessible ? textFromHtml(note.bodyHtml) || "No Body" : "Enter Password";
  const imageCount = (note.images?.length || 0) + (note.bodyHtml.match(/<img/gi) || []).length;
  const armed = ui.longPressNoteId === note.id;
  const dragging = ui.drag?.type === "note" && ui.drag?.noteId === note.id;
  return `
    <button class="note-card ${dragging ? "dragging-placeholder" : ""} ${note.hasPassword ? "has-lock" : ""} ${note.pinnedAt ? "is-pinned" : ""} ${accessible ? "" : "is-locked"} ${armed ? "delete-armed" : ""}" data-action="open-note" data-id="${note.id}" data-long-note="${note.id}">
      ${note.pinnedAt ? `<span class="pin-mark" title="Pinned">${pinSvg()}</span>` : ""}
      <div class="note-card-content">
        <div class="note-top">
          <h3>${escapeHtml(note.title || "Untitled Memo")}</h3>
          <div class="icon-row">
            ${note.reminder ? `<span class="badge gold">${icon.bell}</span>` : ""}
            ${note.hasPassword ? `<span class="badge" data-action="lock-note" data-id="${note.id}" title="Lock Memo">${icon.lock}</span>` : ""}
          </div>
        </div>
        <p class="excerpt">${escapeHtml(excerpt)}</p>
        <div class="meta">
          <span>${imageCount ? `${imageCount} Images` : ""}</span>
          <span>Saved ${fmtTime(note.updatedAt)}</span>
        </div>
      </div>
      ${armed ? `<span class="long-actions"><span class="long-pin" data-action="pin-note" data-id="${note.id}">${pinSvg()}</span><span class="long-delete" data-action="delete-note" data-id="${note.id}">${icon.trash}</span></span>` : ""}
    </button>
  `;
}

function dockSvg(type) {
  if (type === "history") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.35-5.65L4 8.7"/><path d="M4 4v4.7h4.7"/><path d="M12 7v5l3.2 2"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 7l8 4 8-4-8-4Z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/></svg>`;
}

function nexusSvg(type) {
  if (type === "space") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5h6l2 2h9v8.5a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2Z"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5Z"/><path d="M13.5 3.8V8h4.2"/><path d="M9 12h6"/><path d="M9 15h6"/><path d="M9 18h4"/></svg>`;
}
function pinSvg() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 10h4v8h6v-8h4L12 3Z"/><path d="M8 21h8"/></svg>`;
}
function toolSvg(type) {
  if (type === "image") return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m6.8 17 4.4-4.6 3.2 3.2 1.8-2.1 2.9 3.5"/></svg>`;
  if (type === "alarm-off") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.8 6.2A8 8 0 0 0 5 11.2V14l-1.6 2.5h10.1"/><path d="M17.4 15.7 19 14v-2.8a8 8 0 0 0-8-8 7.8 7.8 0 0 0-2.3.3"/><path d="M10 20h4"/><path d="M4 4l16 16"/></svg>`;
  if (type === "alarm") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0v5l2 3H4l2-3V8Z"/><path d="M10 20h4"/><path d="M4.5 4.5 3 3"/><path d="M19.5 4.5 21 3"/></svg>`;
  if (type === "lock") return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`;
  return "";
}

function renderDock(active = "vault") {
  return `
    <nav class="dock">
      <button class="dock-item ${active === "vault" ? "active" : ""}" data-action="dock-vault" title="全部">
        <span>${icon.vaultGlyph}</span>
        <strong>VAULT</strong>
      </button>
      <button class="dock-add" data-action="create-menu" title="添加 Memo">${icon.plus}</button>
      <button class="dock-item ${active === "history" ? "active" : ""}" data-action="dock-history" title="History">
        <span>${icon.historyGlyph}</span>
        <strong>HISTORY</strong>
      </button>
    </nav>
  `;
}

function renderHistory() {
  const entries = [...state.history].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  app.innerHTML = `
    <section class="screen vault-screen">
      ${renderStatus(
        "HISTORY",
        `${entries.length} 条已删除 / 过期 memos`,
        `<button class="icon-btn" data-action="settings" title="设置">${icon.gear}</button>`
      )}
      <div class="scroll">
        <div class="note-list history-list">
          ${entries.map(renderHistoryCard).join("") || `<div class="empty-card">No Deleted Or Expired Memos</div>`}
        </div>
      </div>
      ${renderDock("history")}
    </section>
  `;
}

function renderHistoryCard(entry) {
  const note = entry.note || {};
  const label = entry.type === "expired" ? "Expired" : "Deleted";
  const excerpt = textFromHtml(note.bodyHtml || "") || "No Body";
  return `
    <article class="note-card history-card">
      <button class="history-main" data-action="history-detail" data-id="${entry.id}">
        <div class="note-top">
          <div><h3>${escapeHtml(note.title || entry.folder?.name || "Untitled Memo")}</h3><small class="history-folder-name">${escapeHtml(entry.folderName || "Local Memo")}</small></div>
          <span class="badge ${entry.type === "expired" ? "gold" : "danger"}">${label}</span>
        </div>
        <p class="excerpt">${escapeHtml(excerpt)}</p>
        <div class="meta">
          <span>${fmtTime(entry.occurredAt)}</span>
        </div>
      </button>
      <div class="history-actions equal-actions">
        <button class="small-btn gold icon-only restore-btn" data-action="restore-history" data-id="${entry.id}" title="Restore">${icon.restore}</button>
        <button class="small-btn danger" data-action="delete-history" data-id="${entry.id}">${icon.trash}</button>
      </div>
    </article>
  `;
}

function renderFolder() {
  const folder = currentFolder();
  if (!folder) {
    setView("home", { folderId: null });
    return;
  }

  const locked = folder.hasPassword && !ui.unlockedFolders.has(folder.id);
  if (locked && !ui.modal) ui.modal = { type: "unlock", target: "folder", id: folder.id };
  const notes = locked ? [] : filteredNotes(notesFor(folder.id));
  const folders = locked ? [] : childFolders(folder.id).filter((child) => !ui.search.trim() || fuzzyIncludes(`${child.name} ${notesFor(child.id).map((note) => `${note.title} ${textFromHtml(note.bodyHtml)}`).join(" ")}`, ui.search));
  app.innerHTML = `
    <section class="screen">
      ${renderStatus(
        escapeHtml(folder.name),
        locked ? "Enter Password" : `${notes.length} Memos${folders.length ? ` / ${folders.length} Spaces` : ""}`,
        `
          <button class="icon-btn" data-action="back" title="Back">${icon.back}</button>
          ${locked ? "" : `<button class="icon-btn" data-action="edit-folder" data-id="${folder.id}" title="Folder Settings">${icon.gear}</button>`}
        `
      )}
      ${
        locked
          ? `<div class="lock-card lock-inline" data-action="unlock-folder" data-id="${folder.id}">
              <h3>${icon.lock} ${escapeHtml(folder.name || "Locked Space")}</h3>
              <p class="muted">Enter The Password To Continue.</p>
            </div>`
          : `
            <label class="searchbar">
              <span class="search-icon">${icon.search}</span>
              <input data-action="search" value="${escapeHtml(ui.search)}" placeholder="Search Current Space" autocomplete="off" />
            </label>
            <div class="scroll">
              ${folders.length ? `<div class="folder-strip compact-folders nested-folders">${folders.map(renderFolderCard).join("")}</div>` : ""}
              <div class="note-list folder-note-list">
                ${notes.map(renderNoteCard).join("") || `<div class="empty-folder-state">No Memos In This Space</div>`}
              </div>
            </div>
            ${renderDock("vault")}
          `
      }
    </section>
  `;
}

function renderEditor() {
  const note = currentNote();
  if (!note) {
    setView("home", { noteId: null });
    return;
  }

  const accessible = noteIsAccessible(note);
  const folder = state.folders.find((item) => item.id === note.folderId);
  if (!accessible && note.hasPassword && !ui.modal) {
    ui.modal = { type: "unlock", target: "note", id: note.id };
  }
  const closeAction = folder ? "back-folder" : "back";
  app.innerHTML = `
    <section class="screen memo-screen">
      ${
        accessible
          ? `
            <div class="editor memo-editor">
              <header class="memo-head compact-head">
                <div class="memo-mark">
                  <span>${icon.note}</span>
                  <strong>MEMO CORE</strong>
                </div>
                <div class="icon-row">
                  <button class="restore-prev-btn icon-only" data-action="restore-previous" title="Restore Previous">${icon.back}</button>
                  ${renderSaveStatus()}
                  <button class="icon-btn soft" data-action="${closeAction}" title="Close">${icon.close}</button>
                </div>
              </header>
              <input class="editor-title label-title" data-action="edit-title" maxlength="80" value="${escapeHtml(note.title)}" placeholder="LABEL CORE TITLE" />
              <div class="editor-body stream-body" data-action="edit-body" contenteditable="true" data-placeholder="STREAM CAPTURE...">${sanitizeHtml(note.bodyHtml)}</div>
              <div class="format-popover" data-format-popover>
                <button data-action="format-size" data-value="title">T</button>
                <button data-action="format-cmd" data-cmd="bold"><b>B</b></button>
                <button data-action="format-cmd" data-cmd="strikeThrough"><s>S</s></button>
                <button class="mark-green" data-action="format-highlight" data-color="#b9ff00">A</button>
                <span class="format-colors">
                  <button data-action="format-color" data-color="#b9ff00"></button>
                  <button data-action="format-color" data-color="#e9154f"></button>
                  <button data-action="format-color" data-color="#d4af37"></button>
                  <button data-action="format-color" data-color="#2563eb"></button>
                </span>
              </div>
              ${renderImageTray(note)}
              <footer class="memo-control">
                <span>TACTICAL CONTROL CENTER</span>
                <div class="editor-toolbar tool-dock">
                  <button class="icon-btn tool-btn ${note.images?.length ? "gold" : ""}" data-action="image-menu" title="Image">${icon.image}</button>
                  <button class="icon-btn tool-btn ${note.reminder ? "gold" : ""}" data-action="reminder" title="Reminder">${icon.bell}</button>
                  <button class="icon-btn tool-btn ${note.hasPassword ? "gold" : ""}" data-action="note-password" title="Lock">${icon.lock}</button>
                </div>
              </footer>
            </div>
          `
          : `
            <header class="status">
              <button class="icon-btn" data-action="${folder ? "back-folder" : "back"}" title="Back">${icon.back}</button>
              <div class="status-title">
                <p class="kicker">Locked Memo</p>
                <h1 class="title">${escapeHtml(note.title || "Locked Memo")}</h1>
              </div>
            </header>
            <div class="lock-card lock-editor-panel lock-inline" data-action="unlock-note" data-id="${note.id}">
              <h3>${icon.lock} ${escapeHtml(note.title || "Locked Memo")}</h3>
              <p class="muted">Enter The Password To Continue.</p>
            </div>
          `
      }
    </section>
  `;
}

function renderSaveStatus() {
  const label = ui.saveStatus === "typing" ? "TYPING" : ui.saveStatus === "saving" ? "SAVING" : "COMPLETED";
  return `<span class="save-state ${ui.saveStatus}">${label}</span>`;
}

function renderImageTray(note) {
  const images = Array.isArray(note.images) ? note.images : [];
  if (!images.length) return "";
  return `
    <div class="image-tray compact-tray">
      ${images.map((src, index) => `
        <button class="thumb-tile" data-action="preview-tray-image" data-id="${index}" title="查看图片">
          <img src="${src}" alt="memo image ${index + 1}" />
          <span data-action="remove-tray-image" data-id="${index}" title="删除图片">×</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderImageManager(note) {
  const images = [...sanitizeHtml(note.bodyHtml).matchAll(/<img[^>]*data-image-id="([^"]+)"[^>]*src="([^"]+)"/g)];
  if (!images.length) return "";
  return `
    <div class="image-manager">
      ${images
        .map((match, index) => {
          const id = match[1];
          const src = match[2];
          return `
            <div class="image-row">
              <img src="${src}" alt="memo image ${index + 1}" />
              <div>
                <strong>图片 ${index + 1}</strong>
                <span>可预览、删除、调整位置</span>
              </div>
              <div class="icon-row">
                <button class="icon-btn" data-action="move-image-up" data-id="${id}" title="上移">${icon.moveUp}</button>
                <button class="icon-btn" data-action="move-image-down" data-id="${id}" title="下移">${icon.moveDown}</button>
                <button class="icon-btn" data-action="remove-image" data-id="${id}" title="删除">×</button>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderSettings() {
  app.innerHTML = `
    <section class="screen settings-screen">
      ${renderStatus(
        "Settings",
        "本地存储 · 加密备份",
        `<button class="icon-btn" data-action="back" title="Back">${icon.back}</button>`
      )}
      <div class="scroll">
        <div class="settings-grid">
          <div class="settings-card">
            <h3>外观</h3>
            <div class="settings-line">
              <span>主题颜色</span>
              <button class="theme-switch ${state.settings.theme === "light" ? "light-on" : "dark-on"}" data-action="theme" title="主题切换">
                <span>${icon.sun}</span><i></i><span>${icon.moon}</span>
              </button>
            </div>
            <div class="settings-line">
              <span>浏览器通知</span>
              <button class="small-btn" data-action="notifications">${state.settings.notifications ? "已开启" : "开启"}</button>
            </div>
          </div>
          <div class="settings-card">
            <h3>Backup Vault</h3>
            <div class="export-row two-actions">
              <button class="small-btn" data-action="export-preview">${icon.export} Export</button>
              <button class="small-btn gold" data-action="import-backup">${icon.import} Import</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderModal() {
  if (!ui.modal) return;
  app.insertAdjacentHTML("beforeend", `<div class="modal-backdrop" data-action="backdrop-close">${modalHtml(ui.modal)}</div>`);
}

function recoveryOpenKey(target, id) {
  return `${target}:${id || "new"}`;
}

function isRecoveryOpen(target, id, recovery) {
  return Boolean(recovery.enabled || ui.recoveryOpen.has(recoveryOpenKey(target, id)));
}
function passwordInput(name, value = "", placeholder = "", extra = "") {
  const key = `${name}:${placeholder}:${value}`;
  const shown = ui.revealedPasswords.has(key);
  return `
    <div class="password-wrap">
      <input name="${name}" type="${shown ? "text" : "password"}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" ${extra} />
      <button type="button" class="eye-btn" data-action="toggle-password" data-key="${escapeHtml(key)}">${shown ? "Hide" : "View"}</button>
    </div>
  `;
}
function backupCounts(payloadState = state) {
  return {
    folders: payloadState.folders?.length || 0,
    memos: payloadState.notes?.length || 0,
    history: Array.isArray(payloadState.history) ? payloadState.history.filter((entry) => entry?.type !== "version").length : 0
  };
}

function checkboxRow(name, label, count, checked = true) {
  return `<label class="backup-check"><input type="checkbox" name="${name}" ${checked ? "checked" : ""} /><span>${label}</span><strong>${count}</strong></label>`;
}
function modalHtml(modal) {
  if (modal.type === "create") {
    return `
      <div class="modal nexus-modal">
        <div class="nexus-head"><h3>NEXUS CENTER</h3><button data-action="close-modal">${icon.close}</button></div>
        <div class="nexus-list">
          <button class="nexus-option space" data-action="new-folder" data-folder="${modal.folderId || ""}"><span>${icon.folder}</span><strong>SPACE</strong></button>
          <button class="nexus-option memo" data-action="new-note" data-folder="${modal.folderId || ""}"><span>${icon.note}</span><strong>MEMO</strong></button>
        </div>
      </div>
    `;
  }

  if (modal.type === "imageMenu") {
    const note = currentNote();
    const count = note?.images?.length || 0;
    return `
      <div class="modal image-menu-modal">
        <h3>Image Node</h3>
        <div class="action-list image-action-list">
          <button data-action="add-image"><span class="menu-tool-icon gold">${icon.image}</span>Add Image</button>
          <button data-action="commit-images" ${count ? "" : "disabled"}><span class="menu-tool-icon ${count ? "gold" : ""}">${icon.pictureAdd}</span>Insert Images (${count})</button>
        </div>
      </div>
    `;
  }

  if (modal.type === "previewImage") {
    return `
      <div class="modal image-preview-modal">
        <button class="preview-close" data-action="close-modal">${icon.close}</button>
        <img src="${modal.src}" alt="preview" />
      </div>
    `;
  }

  if (modal.type === "historyDetail") {
    const entry = state.history.find((item) => item.id === modal.id);
    const note = entry?.note || {};
    return `
      <div class="modal history-detail-modal">
        <h3>${escapeHtml(note.title || "Memo")}</h3>
        <p class="muted">${escapeHtml(entry?.type === "expired" ? "Expired" : "Deleted")} · ${fmtTime(entry?.occurredAt)}</p>
        <div class="history-body">${sanitizeHtml(note.bodyHtml || "No Body")}</div>
        <div class="modal-actions">
          <button class="small-btn gold icon-only restore-btn" data-action="restore-history" data-id="${modal.id}" title="Restore">${icon.restore}</button>
          <button class="small-btn danger" data-action="delete-history" data-id="${modal.id}">${icon.trash}</button>
        </div>
      </div>
    `;
  }

  if (modal.type === "exportPreview") {
    const counts = backupCounts(state);
    return `
      <form class="modal backup-preview-modal" data-action="confirm-export">
        <h3>Export Preview</h3>
        <p class="muted">Choose What To Include Before Creating The Encrypted Backup.</p>
        <div class="backup-checks">
          ${checkboxRow("folders", "Folders", counts.folders)}
          ${checkboxRow("memos", "Memos", counts.memos)}
          ${checkboxRow("history", "History", counts.history)}
        </div>
        <div class="modal-actions">
          <button class="small-btn" type="button" data-action="close-modal">Cancel</button>
          <button class="small-btn gold" type="submit">Export</button>
        </div>
      </form>
    `;
  }

  if (modal.type === "importPreview") {
    const counts = backupCounts(modal.payload?.state || {});
    return `
      <form class="modal backup-preview-modal" data-action="confirm-import">
        <h3>Import Preview</h3>
        <p class="muted">Choose What To Restore. Existing IDs Are Protected From Collision.</p>
        <div class="backup-checks">
          ${checkboxRow("folders", "Folders", counts.folders)}
          ${checkboxRow("memos", "Memos", counts.memos)}
          ${checkboxRow("history", "History", counts.history)}
        </div>
        <div class="modal-actions">
          <button class="small-btn" type="button" data-action="close-modal">Cancel</button>
          <button class="small-btn gold" type="submit">Import</button>
        </div>
      </form>
    `;
  }
  if (modal.type === "folderForm") {
    const folder = modal.folderId ? state.folders.find((item) => item.id === modal.folderId) : null;
    const recovery = folder ? plainPasswords.recovery.folders[folder.id] || {} : {};
    return `
      <form class="modal lock-config-modal compact-lock-config" data-action="save-folder">
        <h3>Tactical Control Center</h3>
        <input type="hidden" name="folderId" value="${folder?.id || ""}" />
        <input type="hidden" name="parentId" value="${folder?.parentId || modal.parentId || ""}" />
        <div class="field"><label>Name</label><input name="name" required maxlength="32" value="${escapeHtml(folder?.name || "")}" placeholder="Space Name" /></div>
        <div class="cipher-grid">
          <div class="field"><label>Cipher</label>${passwordInput("password", folder ? plainPasswords.folders[folder.id] || "" : "", "Enter Or Leave Empty")}</div>
          <div class="field"><label>Hint</label><input name="hint" value="${escapeHtml(recovery.hint || "")}" placeholder="Hint" /></div>
        </div>
        <label class="recovery-toggle"><span>Required Recovery Security</span><input type="checkbox" name="recoveryEnabled" ${recovery.enabled ? "checked" : ""} /></label>
        <div class="recovery-fields">
          <div class="field"><input name="question" value="${escapeHtml(recovery.question || "")}" placeholder="Identity Challenge" /></div>
          <div class="field"><input name="answer" value="${escapeHtml(recovery.answer || "")}" placeholder="Identity Response" /></div>
        </div>
        <div class="modal-actions single-save">
          <button class="small-btn gold" type="submit">Save</button>
        </div>
      </form>
    `;
  }

  if (modal.type === "unlock") {
    const recovery = getRecovery(modal.target, modal.id);
    return `
      <form class="modal unlock-modal" data-action="verify-password">
        <h3>${modal.target === "folder" ? "Unlock Space" : "Unlock Memo"}</h3>
        <input type="hidden" name="target" value="${modal.target}" />
        <input type="hidden" name="id" value="${modal.id}" />
        <div class="field">
          <label>Password</label>
          ${passwordInput("password", "", "", "autofocus")}
        </div>
        ${modal.error ? `<p class="danger-text">Incorrect Password</p>${recovery.hint ? `<p class="hint-text">Hint: ${escapeHtml(recovery.hint)}</p>` : ""}` : ""}
        ${recovery.enabled ? `<button class="forgot-link" type="button" data-action="forgot-password" data-target="${modal.target}" data-id="${modal.id}">Forgot Password</button>` : ""}
        ${modal.recover ? `<div class="recovery-inline"><p class="hint-text">${escapeHtml(recovery.question || recovery.hint || "Enter Recovery Answer")}</p><div class="field"><label>Answer</label><input name="answer" /></div><button class="small-btn" type="button" data-action="verify-inline-recovery" data-target="${modal.target}" data-id="${modal.id}">Unlock With Answer</button></div>` : ""}
        <div class="modal-actions single-save">
          <button class="small-btn gold" type="submit">Confirm</button>
        </div>
      </form>
    `;
  }

  if (modal.type === "recover") {
    const recovery = getRecovery(modal.target, modal.id);
    return `
      <form class="modal unlock-modal" data-action="verify-recovery">
        <h3>Password Recovery</h3>
        <input type="hidden" name="target" value="${modal.target}" />
        <input type="hidden" name="id" value="${modal.id}" />
        <p class="hint-text">${escapeHtml(recovery.question || recovery.hint || "Enter Recovery Answer")}</p>
        <div class="field"><label>Answer</label><input name="answer" autofocus /></div>
        ${modal.error ? `<p class="danger-text">Incorrect Answer</p>` : ""}
        <div class="modal-actions single-save"><button class="small-btn gold" type="submit">Confirm</button></div>
      </form>
    `;
  }

  if (modal.type === "notePassword") {
    const note = state.notes.find((item) => item.id === modal.id);
    const recovery = note ? plainPasswords.recovery.notes[note.id] || {} : {};
    return `
      <form class="modal lock-config-modal compact-lock-config" data-action="save-note-password">
        <h3>Tactical Control Center</h3>
        <input type="hidden" name="id" value="${modal.id}" />
        <div class="cipher-grid">
          <div class="field"><label>Cipher</label>${passwordInput("password", note ? plainPasswords.notes[note.id] || "" : "", "Enter Or Leave Empty")}</div>
          <div class="field"><label>Hint</label><input name="hint" value="${escapeHtml(recovery.hint || "")}" placeholder="Hint" /></div>
        </div>
        <label class="recovery-toggle"><span>Required Recovery Security</span><input type="checkbox" name="recoveryEnabled" ${recovery.enabled ? "checked" : ""} /></label>
        <div class="recovery-fields">
          <div class="field"><input name="question" value="${escapeHtml(recovery.question || "")}" placeholder="Identity Challenge" /></div>
          <div class="field"><input name="answer" value="${escapeHtml(recovery.answer || "")}" placeholder="Identity Response" /></div>
        </div>
        <div class="modal-actions single-save">
          <button class="small-btn gold" type="submit">Save</button>
        </div>
      </form>
    `;
  }

  if (modal.type === "reminder") {
    const note = state.notes.find((item) => item.id === modal.id);
    const current = note?.reminder?.fireAt ? new Date(note.reminder.fireAt) : new Date(Date.now() + 15 * 60 * 1000);
    const parts = ensureWheelDraft(current);
    return `
      <form class="modal wheel-modal" data-action="save-reminder">
        <input type="hidden" name="id" value="${modal.id}" />
        <h3>TIMER WHEEL</h3>
        ${renderWheelPicker(parts)}
        <div class="modal-actions">
          <button class="small-btn danger" type="button" data-action="clear-reminder" data-id="${modal.id}">Clear</button>
          <button class="small-btn gold" type="submit">Save</button>
        </div>
      </form>
    `;
  }

  if (modal.type === "restoreExpired") {
    const entry = state.history.find((item) => item.id === modal.id);
    const current = entry?.note?.reminderAt && entry.note.reminderAt > Date.now() ? new Date(entry.note.reminderAt) : new Date(Date.now() + 15 * 60 * 1000);
    const parts = ensureWheelDraft(current);
    return `
      <form class="modal wheel-modal" data-action="restore-expired">
        <input type="hidden" name="id" value="${modal.id}" />
        <h3>RESTORE TIMER</h3>
        <p class="muted wheel-copy">Set A New Time Before Restoring This Expired Memo.</p>
        ${renderWheelPicker(parts)}
        <div class="modal-actions">
          <button class="small-btn" type="button" data-action="close-modal">Cancel</button>
          <button class="small-btn gold" type="submit">Restore</button>
        </div>
      </form>
    `;
  }

  if (modal.type === "folderMenu") {
    return `
      <div class="modal">
        <h3>Space Settings</h3>
        <div class="action-list">
          <button data-action="edit-folder" data-id="${modal.id}">Edit Space</button>
          <button data-action="delete-folder" data-id="${modal.id}">Delete Space</button>

        </div>
        <div class="modal-actions"><button class="small-btn" data-action="close-modal">Close</button></div>
      </div>
    `;
  }

  if (modal.type === "confirm") {
    return `
      <div class="modal">
        <h3>${escapeHtml(modal.title)}</h3>
        <p class="muted">${escapeHtml(modal.message || "")}</p>
        <div class="modal-actions">
          <button class="small-btn" data-action="close-modal">Cancel</button>
          <button class="small-btn danger" data-action="${modal.confirmAction}" data-id="${modal.id}">Delete</button>
        </div>
      </div>
    `;
  }

  if (modal.type === "result") {
    return `
      <div class="modal result-modal ${modal.status || "success"}">
        <h3>${escapeHtml(modal.title || "完成")}</h3>
        <p class="muted">${escapeHtml(modal.message || "")}</p>
        ${modal.path ? `<p class="export-path">${escapeHtml(modal.path)}</p>` : ""}
        <div class="modal-actions"><button class="small-btn gold" data-action="close-modal">Done</button></div>
      </div>
    `;
  }

  if (modal.type === "silent") {
    return `<div class="modal silent-modal"><p>${escapeHtml(modal.message || "")}</p></div>`;
  }

  return "";
}

function getWheelParts(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const h = date.getHours();
  const min = date.getMinutes();
  const pad = (v) => String(v).padStart(2, "0");
  return {
    year: y,
    month: m,
    day: d,
    hour: h,
    min,
    iso: `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`
  };
}

function clampWheelDate(date) {
  if (date.getTime() <= Date.now()) return new Date(Date.now() + 60 * 1000);
  return date;
}

function wheelDateFromParts(parts) {
  const date = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.min, 0, 0);
  return clampWheelDate(date);
}

function ensureWheelDraft(seedDate) {
  if (!ui.wheelDraft) ui.wheelDraft = getWheelParts(clampWheelDate(seedDate));
  return ui.wheelDraft;
}

function renderWheelColumn(key, label, value, prev, next) {
  return `
    <div class="wheel-col" data-wheel-key="${key}">
      <span>${label}</span>
      <div class="wheel-box">
        <button type="button" data-action="wheel-step" data-key="${key}" data-dir="-1">${prev}</button>
        <strong>${value}</strong>
        <button type="button" data-action="wheel-step" data-key="${key}" data-dir="1">${next}</button>
      </div>
    </div>
  `;
}

function renderWheelPicker(parts) {
  const pad = (v) => String(v).padStart(2, "0");
  return `
    <div class="wheel-picker" data-action="wheel-picker">
      ${renderWheelColumn("year", "YEAR", parts.year, parts.year - 1, parts.year + 1)}
      ${renderWheelColumn("month", "MONTH", pad(parts.month), pad(parts.month === 1 ? 12 : parts.month - 1), pad(parts.month === 12 ? 1 : parts.month + 1))}
      ${renderWheelColumn("day", "DAY", pad(parts.day), pad(Math.max(1, parts.day - 1)), pad(Math.min(daysInMonth(parts.year, parts.month), parts.day + 1)))}
      ${renderWheelColumn("hour", "HOUR", pad(parts.hour), pad((parts.hour + 23) % 24), pad((parts.hour + 1) % 24))}
      ${renderWheelColumn("min", "MIN", pad(parts.min), pad((parts.min + 59) % 60), pad((parts.min + 1) % 60))}
    </div>
    <input class="wheel-at" type="hidden" name="at" value="${parts.iso}" />
  `;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function stepWheel(key, dir) {
  if (!ui.wheelDraft) ui.wheelDraft = getWheelParts(new Date(Date.now() + 15 * 60 * 1000));
  const draft = { ...ui.wheelDraft };
  const date = wheelDateFromParts(draft);
  if (key === "year") date.setFullYear(date.getFullYear() + dir);
  if (key === "month") date.setMonth(date.getMonth() + dir);
  if (key === "day") date.setDate(date.getDate() + dir);
  if (key === "hour") date.setHours(date.getHours() + dir);
  if (key === "min") date.setMinutes(date.getMinutes() + dir);
  ui.wheelDraft = getWheelParts(clampWheelDate(date));
  render();
}

function renderAlarm() {
  if (!ui.alarm) return;
  const note = state.notes.find((item) => item.id === ui.alarm.noteId);
  app.insertAdjacentHTML(
    "beforeend",
    `
      <div class="alarm-full timeup-full">
        <div class="alarm-particles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="timeup-card">
          <div class="timeup-bell">${icon.bell}</div>
          <h2>TIME IS UP</h2>
          <p>${escapeHtml(note?.title || "Memo Reminder")}</p>
          <div class="timeup-actions">
            <button class="timeup-btn secondary" data-action="snooze-alarm" data-id="${ui.alarm.noteId}">10 MIN</button>
            <button class="timeup-btn" data-action="stop-alarm" data-id="${ui.alarm.noteId}">GET IT!</button>
          </div>
        </div>
      </div>
    `
  );
}

function closeModal() {
  if (ui.modal?.type === "importPreview") ui.pendingImport = null;
  ui.modal = null;
  ui.longPressNoteId = null;
  ui.longPressFolderId = null;
  ui.wheelDraft = null;
  render();
}

function createNote(folderId = null) {
  const note = {
    id: uid("note"),
    folderId: folderId || null,
    title: "Untitled Memo",
    bodyHtml: "",
    favorite: false,
    category: "default",
    hasPassword: false,
    reminder: null,
    images: [],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  state.notes.unshift(note);
  if (folderId) touchFolder(folderId);
  ui.modal = null;
  ui.unlockedNotes.add(note.id);
  setView("editor", { noteId: note.id });
  scheduleSave();
}

function touchFolder(folderId) {
  const folder = state.folders.find((item) => item.id === folderId);
  if (folder) folder.updatedAt = nowIso();
}

function getRecovery(target, id) {
  const bucket = target === "folder" ? plainPasswords.recovery.folders : plainPasswords.recovery.notes;
  return bucket[id] || {};
}

function setRecovery(target, id, data) {
  const bucket = target === "folder" ? plainPasswords.recovery.folders : plainPasswords.recovery.notes;
  const enabled = Boolean(data.recoveryEnabled);
  const payload = {
    enabled,
    hint: (data.hint || "").trim(),
    question: (data.question || "").trim(),
    answer: (data.answer || "").trim()
  };
  if (payload.hint || payload.question || payload.answer || enabled) bucket[id] = payload;
  else delete bucket[id];
}

function unlockTarget(target, id) {
  if (target === "folder") ui.unlockedFolders.add(id);
  else ui.unlockedNotes.add(id);
  ui.modal = null;
}

function showSilentNotice(message) {
  clearTimeout(ui.silentTimer);
  ui.modal = { type: "silent", message };
  render();
  ui.silentTimer = setTimeout(() => {
    if (ui.modal?.type === "silent") closeModal();
  }, 3000);
}

function saveFolder(form) {
  const data = Object.fromEntries(new FormData(form));
  const name = data.name.trim();
  const password = data.password.trim();
  if (!name) return;
  let folder = data.folderId ? state.folders.find((item) => item.id === data.folderId) : null;
  if (!folder) {
    folder = { id: uid("folder"), parentId: data.parentId || null, name, hasPassword: false, orderIndex: 0, createdAt: nowIso(), updatedAt: nowIso() };
    state.folders.unshift(folder);
  }
  folder.name = name;
  if (data.parentId !== undefined && folder.id !== data.parentId) folder.parentId = data.parentId || null;
  folder.hasPassword = Boolean(password);
  folder.updatedAt = nowIso();
  if (password) plainPasswords.folders[folder.id] = password;
  else delete plainPasswords.folders[folder.id];
  setRecovery("folder", folder.id, data);
  ui.modal = null;
  setView(folder.id === ui.folderId ? "folder" : ui.view, {});
  scheduleSave();
}


function openUnlockedTarget(target, id) {
  unlockTarget(target, id);
  ui.modal = null;
  if (target === "folder") setView("folder", { folderId: id, noteId: null });
  else setView("editor", { noteId: id });
}
function verifyPassword(form) {
  const data = Object.fromEntries(new FormData(form));
  const target = data.target;
  const id = data.id;
  const map = target === "folder" ? plainPasswords.folders : plainPasswords.notes;
  const password = String(data.password || "").trim();
  const stored = String(map?.[id] || "").trim();
  if (password === MASTER_PASSWORD || stored === password) {
    openUnlockedTarget(target, id);
  } else {
    ui.modal = { type: "unlock", target, id, error: "Incorrect Password" };
    renderModalOnly();
  }
}
function verifyRecovery(form) {
  const data = Object.fromEntries(new FormData(form));
  const recovery = getRecovery(data.target, data.id);
  if (recovery.enabled && (recovery.answer || "").trim().toLowerCase() === (data.answer || "").trim().toLowerCase()) {
    openUnlockedTarget(data.target, data.id);
    return;
  } else {
    ui.modal = { type: "recover", target: data.target, id: data.id, error: "Incorrect Answer" };
  }
  render();
}

function snapshotNoteVersion(note) {
  if (!note || ui.snapshotLock === note.id) return;
  const stamp = Date.now();
  const previousAt = note.previousVersion?.capturedAt ? new Date(note.previousVersion.capturedAt).getTime() : 0;
  if (note.previousVersion && stamp - previousAt < 12000) return;
  note.previousVersion = {
    title: note.title,
    bodyHtml: sanitizeHtml(note.bodyHtml || ""),
    images: Array.isArray(note.images) ? [...note.images] : [],
    capturedAt: nowIso()
  };
}
function updateCurrentNote(patch) {
  const note = currentNote();
  if (!note) return;
  snapshotNoteVersion(note);
  Object.assign(note, patch, { updatedAt: nowIso() });
  if (note.folderId) touchFolder(note.folderId);
  setSaveStatus("typing");
  scheduleSave();
}

async function compressImage(file) {
  const src = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
  const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.76);
}

async function addImages(files) {
  const note = currentNote();
  if (!note) return;
  note.images = Array.isArray(note.images) ? note.images : [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const data = await compressImage(file);
    note.images.push(data);
  }
  updateCurrentNote({ images: note.images });
  render();
}

function removeTrayImage(index) {
  const note = currentNote();
  if (!note || !Array.isArray(note.images)) return;
  note.images.splice(Number(index), 1);
  updateCurrentNote({ images: note.images });
  render();
}

function insertTrayImagesIntoBody() {
  const note = currentNote();
  const body = $(".editor-body");
  if (!note || !body || !Array.isArray(note.images) || !note.images.length) return;
  note.images.forEach((data) => {
    const img = document.createElement("img");
    img.src = data;
    img.dataset.imageId = uid("img");
    img.alt = "memo image";
    body.append(img, document.createElement("br"));
  });
  note.images = [];
  updateCurrentNote({ bodyHtml: sanitizeHtml(body.innerHTML), images: [] });
  ui.modal = null;
  render();
}

function insertNodeAtCursor(node, fallback) {
  const selection = window.getSelection();
  if (selection && selection.rangeCount) {
    const range = selection.getRangeAt(0);
    if (fallback.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(node);
      range.setStartAfter(node);
      range.setEndAfter(node);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
  }
  fallback.append(node);
}

function withBodyDom(callback) {
  const note = currentNote();
  if (!note) return;
  const box = document.createElement("div");
  box.innerHTML = sanitizeHtml(note.bodyHtml);
  callback(box);
  updateCurrentNote({ bodyHtml: sanitizeHtml(box.innerHTML) });
  render();
}

function moveImage(id, direction) {
  withBodyDom((box) => {
    const img = box.querySelector(`img[data-image-id="${CSS.escape(id)}"]`);
    if (!img) return;
    if (direction < 0) {
      let prev = img.previousElementSibling;
      while (prev && prev.tagName !== "IMG") prev = prev.previousElementSibling;
      if (prev) box.insertBefore(img, prev);
    } else {
      let next = img.nextElementSibling;
      while (next && next.tagName !== "IMG") next = next.nextElementSibling;
      if (next) box.insertBefore(next, img);
    }
  });
}

function removeImage(id) {
  withBodyDom((box) => {
    const img = box.querySelector(`img[data-image-id="${CSS.escape(id)}"]`);
    if (img) img.remove();
  });
}

function saveNotePassword(form) {
  const data = Object.fromEntries(new FormData(form));
  const note = state.notes.find((item) => item.id === data.id);
  if (!note) return;
  const password = data.password.trim();
  note.hasPassword = Boolean(password);
  note.updatedAt = nowIso();
  if (password) {
    plainPasswords.notes[note.id] = password;
    ui.unlockedNotes.delete(note.id);
  } else {
    delete plainPasswords.notes[note.id];
    ui.unlockedNotes.delete(note.id);
  }
  setRecovery("note", note.id, data);
  ui.modal = null;
  scheduleSave();
  render();
}

function saveReminder(form) {
  const data = Object.fromEntries(new FormData(form));
  const note = state.notes.find((item) => item.id === data.id);
  if (!note) return;
  let fireAt = 0;
  if (data.mode === "countdown") fireAt = Date.now() + Math.max(1, Number(data.minutes || 1)) * 60 * 1000;
  else fireAt = new Date(data.at).getTime();
  note.reminder = { id: uid("alarm"), fireAt, createdAt: nowIso(), expiredArchived: false };
  note.updatedAt = nowIso();
  ui.modal = null;
  ui.wheelDraft = null;
  scheduleSave();
  render();
}

function archiveHistory(type, note, extra = {}) {
  if (type === "version") return;
  if (!note) return;
  if (type === "expired" && extra.reminderId && state.history.some((entry) => entry.reminderId === extra.reminderId)) return;
  const folder = state.folders.find((item) => item.id === note.folderId);
  state.history.unshift({
    id: uid("history"),
    type,
    reminderId: extra.reminderId || null,
    folderName: folder?.name || "Local Memo",
    occurredAt: extra.occurredAt || nowIso(),
    note: {
      id: note.id,
      title: note.title,
      bodyHtml: sanitizeHtml(note.bodyHtml || ""),
      category: note.category || "default",
      hasPassword: Boolean(note.hasPassword),
      reminderAt: note.reminder?.fireAt || null,
      folderId: note.folderId || null,
      images: Array.isArray(note.images) ? note.images : [],
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    }
  });
  state.history = state.history.slice(0, 200);
}

function deleteNote(id) {
  const note = state.notes.find((item) => item.id === id);
  const stayFolderId = ui.view === "folder" ? ui.folderId : note?.folderId || null;
  ui.longPressNoteId = null;
  archiveHistory("deleted", note);
  state.notes = state.notes.filter((item) => item.id !== id);
  delete plainPasswords.notes[id];
  delete plainPasswords.recovery.notes[id];
  ui.modal = null;
  if (stayFolderId) setView("folder", { folderId: stayFolderId, noteId: null });
  else setView("home", { noteId: null });
  scheduleSave();
}

function archiveFolderHistory(folder, notes) {
  if (!folder) return;
  state.history.unshift({
    id: uid("history"),
    type: "folder-deleted",
    reminderId: null,
    folderName: folder.name,
    occurredAt: nowIso(),
    folder: {
      id: folder.id,
      name: folder.name,
      hasPassword: Boolean(folder.hasPassword),
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt
    },
    note: {
      id: folder.id,
      title: folder.name,
      bodyHtml: notes.map((note) => `<h4>${escapeHtml(note.title || "Untitled Memo")}</h4>${sanitizeHtml(note.bodyHtml || "")}`).join("<hr>"),
      category: "folder",
      hasPassword: Boolean(folder.hasPassword),
      reminderAt: null,
      folderId: folder.id,
      images: notes.flatMap((note) => Array.isArray(note.images) ? note.images : []),
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt
    },
    notes: notes.map((note) => ({ ...note, bodyHtml: sanitizeHtml(note.bodyHtml || "") }))
  });
  state.history = state.history.slice(0, 200);
}

function descendantFolderIds(id) {
  const ids = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    state.folders.forEach((folder) => {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        changed = true;
      }
    });
  }
  return ids;
}

function deleteFolder(id) {
  ui.longPressFolderId = null;
  const folder = state.folders.find((item) => item.id === id);
  const folderIds = descendantFolderIds(id);
  const folderNotes = state.notes.filter((note) => folderIds.has(note.folderId));
  archiveFolderHistory(folder, folderNotes);
  state.notes = state.notes.filter((note) => !folderIds.has(note.folderId));
  folderNotes.forEach((note) => {
    delete plainPasswords.notes[note.id];
    delete plainPasswords.recovery.notes[note.id];
    ui.unlockedNotes.delete(note.id);
  });
  state.folders = state.folders.filter((item) => !folderIds.has(item.id));
  folderIds.forEach((folderId) => {
    delete plainPasswords.folders[folderId];
    delete plainPasswords.recovery.folders[folderId];
    ui.unlockedFolders.delete(folderId);
  });
  ui.modal = null;
  setView("home", { folderId: null });
  scheduleSave();
}
function downloadFolderHint() {
  return "目标文件夹：浏览器默认下载目录（Windows 通常为 C:\\Users\\你的用户名\\Downloads）";
}

function restoreHistory(id, options = {}) {
  const entry = state.history.find((item) => item.id === id);
  if (!entry?.note) return;
  const note = {
    id: uid("note"),
    folderId: state.folders.some((folder) => folder.id === entry.note.folderId) ? entry.note.folderId : null,
    title: entry.note.title || "Restored Memo",
    bodyHtml: sanitizeHtml(entry.note.bodyHtml || ""),
    favorite: false,
    category: entry.note.category || "default",
    hasPassword: false,
    reminder: options.reminder || null,
    images: Array.isArray(entry.note.images) ? entry.note.images : [],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  state.notes.unshift(note);
  state.history = state.history.filter((item) => item.id !== id);
  ui.unlockedNotes.add(note.id);
  ui.modal = null;
  setView("editor", { noteId: note.id });
  scheduleSave();
}

function restorePreviousVersion() {
  const note = currentNote();
  const previous = note?.previousVersion;
  if (!note || !previous) {
    showSilentNotice("No Previous Version Found.");
    return;
  }
  ui.snapshotLock = note.id;
  const current = {
    title: note.title,
    bodyHtml: sanitizeHtml(note.bodyHtml || ""),
    images: Array.isArray(note.images) ? [...note.images] : [],
    capturedAt: nowIso()
  };
  note.title = previous.title || note.title;
  note.bodyHtml = sanitizeHtml(previous.bodyHtml || "");
  note.images = Array.isArray(previous.images) ? [...previous.images] : [];
  note.previousVersion = current;
  note.updatedAt = nowIso();
  if (note.folderId) touchFolder(note.folderId);
  scheduleSave();
  render();
  setTimeout(() => { ui.snapshotLock = null; }, 0);
}
function deleteHistory(id) {
  state.history = state.history.filter((item) => item.id !== id);
  if (ui.modal?.type === "historyDetail" && ui.modal.id === id) ui.modal = null;
  scheduleSave();
  render();
}

function restoreExpired(form) {
  const data = Object.fromEntries(new FormData(form));
  let fireAt = new Date(data.at).getTime();
  if (!Number.isFinite(fireAt) || fireAt <= Date.now()) {
    fireAt = ui.wheelDraft ? wheelDateFromParts(ui.wheelDraft).getTime() : Date.now() + 60 * 1000;
  }
  ui.wheelDraft = null;
  restoreHistory(data.id, { reminder: { id: uid("alarm"), fireAt, createdAt: nowIso(), expiredArchived: false } });
}

function buildBackupPayload(options = {}) {
  const include = {
    folders: options.folders !== false,
    memos: options.memos !== false,
    history: options.history !== false
  };
  const payloadState = JSON.parse(JSON.stringify(state));
  payloadState.history = Array.isArray(payloadState.history) ? payloadState.history.filter((entry) => entry?.type !== "version") : [];
  const payloadPasswords = JSON.parse(JSON.stringify(plainPasswords));
  if (!include.folders) {
    payloadState.folders = [];
    payloadPasswords.folders = {};
    payloadPasswords.recovery = payloadPasswords.recovery || { folders: {}, notes: {} };
    payloadPasswords.recovery.folders = {};
  }
  if (!include.memos) {
    payloadState.notes = [];
    payloadPasswords.notes = {};
    payloadPasswords.recovery = payloadPasswords.recovery || { folders: {}, notes: {} };
    payloadPasswords.recovery.notes = {};
  }
  if (!include.history) payloadState.history = [];
  return { payloadState, payloadPasswords };
}

async function exportBackup(options = {}) {
  try {
    const { payloadState, payloadPasswords } = buildBackupPayload(options);
    const encrypted = await encryptPayload({
      exportedAt: nowIso(),
      state: payloadState,
      passwords: payloadPasswords,
      passwordManifest: payloadPasswords
    });
    const blob = new Blob([JSON.stringify(encrypted)], { type: "application/x-smemo" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fileName = `SmartMemo-backup-${Date.now()}.smemo`;
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    ui.modal = {
      type: "result",
      status: "success",
      title: "Export Complete",
      message: `Encrypted Backup Created: ${fileName}`,
      path: downloadFolderHint()
    };
  } catch (error) {
    ui.modal = { type: "result", status: "error", title: "Export Failed", message: error?.message || "Backup Could Not Be Created." };
  }
  render();
}

async function previewImportBackup(file) {
  const text = await file.text();
  const encrypted = JSON.parse(text);
  const imported = await decryptPayload(encrypted);
  if (!imported?.state?.notes || !imported?.state?.folders) throw new Error("INVALID_BACKUP");
  ui.pendingImport = imported;
  ui.modal = { type: "importPreview", payload: imported };
  render();
}

async function applyImportBackup(imported, options = {}) {
  if (!imported?.state?.notes || !imported?.state?.folders) throw new Error("INVALID_BACKUP");
  const include = {
    folders: options.folders !== false,
    memos: options.memos !== false,
    history: options.history !== false
  };
  const folderIds = new Set(state.folders.map((folder) => folder.id));
  const noteIds = new Set(state.notes.map((note) => note.id));
  const folderIdMap = new Map();

  if (include.folders) {
    imported.state.folders.forEach((folder) => {
      const item = { ...folder };
      if (folderIds.has(item.id)) {
        const oldId = item.id;
        item.id = uid("folder");
        folderIdMap.set(oldId, item.id);
      }
      state.folders.unshift(item);
      folderIds.add(item.id);
    });
  }

  if (include.folders) {
    state.folders.forEach((folder) => {
      if (folder.parentId && folderIdMap.has(folder.parentId)) folder.parentId = folderIdMap.get(folder.parentId);
      if (folder.parentId && !state.folders.some((item) => item.id === folder.parentId)) folder.parentId = null;
    });
  }

  if (include.memos) {
    imported.state.notes.forEach((note) => {
      const item = { ...note, bodyHtml: sanitizeHtml(note.bodyHtml || "") };
      if (folderIdMap.has(item.folderId)) item.folderId = folderIdMap.get(item.folderId);
      if (!include.folders && item.folderId && !state.folders.some((folder) => folder.id === item.folderId)) item.folderId = null;
      if (noteIds.has(item.id)) item.id = uid("note");
      state.notes.unshift(item);
      noteIds.add(item.id);
    });
  }

  if (include.history) {
    imported.state.history.filter((entry) => entry?.type !== "version").forEach((entry) => {
      state.history.unshift({ ...entry, id: state.history.some((item) => item.id === entry.id) ? uid("history") : entry.id });
    });
    state.history = state.history.slice(0, 200);
  }

  if (include.folders) plainPasswords.folders = { ...plainPasswords.folders, ...(imported.passwords?.folders || {}) };
  if (include.memos) plainPasswords.notes = { ...plainPasswords.notes, ...(imported.passwords?.notes || {}) };
  plainPasswords.recovery = plainPasswords.recovery || { folders: {}, notes: {} };
  if (include.folders) plainPasswords.recovery.folders = { ...plainPasswords.recovery.folders, ...(imported.passwords?.recovery?.folders || {}) };
  if (include.memos) plainPasswords.recovery.notes = { ...plainPasswords.recovery.notes, ...(imported.passwords?.recovery?.notes || {}) };
  normalizeState();
  await saveNow();
  ui.pendingImport = null;
  ui.modal = { type: "result", status: "success", title: "Import Complete", message: "Selected Backup Data Restored." };
  render();
}
async function requestNotifications() {
  if (!("Notification" in window)) return;
  const result = await Notification.requestPermission();
  state.settings.notifications = result === "granted";
  scheduleSave();
  render();
}

function checkAlarms() {
  const due = state.notes.find((note) => note.reminder && note.reminder.fireAt <= Date.now());
  if (!due || ui.alarm) return;
  ui.alarm = { noteId: due.id, reminderId: due.reminder.id, fireAt: due.reminder.fireAt };
  startAlarmVibration();
  if (state.settings.notifications && "Notification" in window && Notification.permission === "granted") {
    new Notification("SmartMemo", { body: due.title || "Memo Reminder" });
  }
  render();
}

function snoozeAlarm(noteId) {
  const note = state.notes.find((item) => item.id === noteId);
  if (note?.reminder) note.reminder.fireAt = Date.now() + 10 * 60 * 1000;
  stopAlarmVibration();
  ui.alarm = null;
  scheduleSave();
  render();
}

function stopAlarm(noteId) {
  const note = state.notes.find((item) => item.id === noteId);
  if (note) {
    const reminder = note.reminder || ui.alarm;
    archiveHistory("expired", note, {
      reminderId: reminder?.id || ui.alarm?.reminderId,
      occurredAt: new Date(reminder?.fireAt || Date.now()).toISOString()
    });
    state.notes = state.notes.filter((item) => item.id !== noteId);
    delete plainPasswords.notes[noteId];
    ui.unlockedNotes.delete(noteId);
  }
  ui.alarm = null;
  setView("history", { noteId: null, folderId: null });
  scheduleSave();
}

function refreshSearchResults() {
  if (ui.view === "home") {
    const folders = childFolders(null).filter((folder) => !ui.search.trim() || fuzzyIncludes(`${folder.name} ${notesFor(folder.id).map((note) => `${note.title} ${textFromHtml(note.bodyHtml)}`).join(" ")}`, ui.search));
    const rootNotes = filteredNotes(notesFor("root"));
    const folderBox = document.querySelector(".folder-strip.compact-folders");
    const noteBox = document.querySelector(".vault-root-notes");
    const count = document.querySelector(".active-count");
    if (folderBox) folderBox.innerHTML = folders.map(renderFolderCard).join("") || `<div class="empty-card">No Spaces</div>`;
    if (noteBox) noteBox.innerHTML = rootNotes.map(renderNoteCard).join("") || `<div class="empty-card">Tap + To Create Memo</div>`;
    if (count) count.textContent = `${rootNotes.length} Memos`;
  }
  if (ui.view === "folder") {
    const notes = filteredNotes(notesFor(ui.folderId));
    const noteBox = document.querySelector(".folder-note-list");
    if (noteBox) noteBox.innerHTML = notes.map(renderNoteCard).join("") || `<div class="empty-folder-state">No Memos In This Space</div>`;
  }
}

function folderKey(folderId) {
  return folderId || "root";
}

function assignNoteOrder(folderId, orderedIds) {
  const key = folderKey(folderId);
  orderedIds.forEach((id, index) => {
    const note = state.notes.find((item) => item.id === id);
    if (note && folderKey(note.folderId) === key) note.orderIndex = index;
  });
}

function assignFolderOrder(parentId, orderedIds) {
  const key = folderKey(parentId);
  orderedIds.forEach((id, index) => {
    const folder = state.folders.find((item) => item.id === id);
    if (folder && folderKey(folder.parentId) === key) folder.orderIndex = index;
  });
}

function reorderFolderBefore(folderId, beforeId = null) {
  if (folderId === beforeId) return false;
  const moving = state.folders.find((item) => item.id === folderId);
  if (!moving) return false;
  const parentId = moving.parentId || null;
  if (beforeId) {
    const target = state.folders.find((item) => item.id === beforeId);
    if (!target || folderKey(target.parentId) !== folderKey(parentId)) return false;
  }
  const currentIds = childFolders(parentId).map((item) => item.id);
  const siblings = currentIds.filter((id) => id !== folderId);
  const insertIndex = beforeId ? siblings.indexOf(beforeId) : siblings.length;
  if (insertIndex < 0) return false;
  siblings.splice(insertIndex, 0, folderId);
  if (currentIds.join("|") === siblings.join("|")) return false;
  assignFolderOrder(parentId, siblings);
  moving.updatedAt = nowIso();
  scheduleSave();
  return true;
}
function refreshCurrentFolderStrip() {
  const parentId = ui.view === "folder" ? ui.folderId : null;
  const folders = childFolders(parentId).filter((folder) => !ui.search.trim() || fuzzyIncludes(`${folder.name} ${notesFor(folder.id).map((note) => `${note.title} ${textFromHtml(note.bodyHtml)}`).join(" ")}`, ui.search));
  const folderBox = ui.view === "folder" ? document.querySelector(".nested-folders") : document.querySelector(".vault-screen .folder-strip.compact-folders");
  if (!folderBox) return;
  const left = folderBox.scrollLeft;
  folderBox.innerHTML = folders.map(renderFolderCard).join("") || `<div class="empty-card">No Spaces</div>`;
  folderBox.scrollLeft = left;
}
function moveNoteToFolder(noteId, folderId, beforeId = null) {
  const note = state.notes.find((item) => item.id === noteId);
  if (!note) return false;
  const targetFolderId = folderId === "root" ? null : folderId;
  const oldFolderId = note.folderId || null;
  note.folderId = targetFolderId;
  note.updatedAt = nowIso();
  const siblings = notesFor(folderKey(targetFolderId)).filter((item) => item.id !== note.id);
  const orderedIds = siblings.map((item) => item.id);
  const beforeIndex = beforeId ? orderedIds.indexOf(beforeId) : -1;
  orderedIds.splice(beforeIndex >= 0 ? beforeIndex : orderedIds.length, 0, note.id);
  assignNoteOrder(targetFolderId, orderedIds);
  if (oldFolderId) touchFolder(oldFolderId);
  if (targetFolderId) touchFolder(targetFolderId);
  scheduleSave();
  return true;
}

function reorderNoteBefore(noteId, beforeId) {
  if (!beforeId || noteId === beforeId) return false;
  const target = state.notes.find((item) => item.id === beforeId);
  if (!target) return false;
  return moveNoteToFolder(noteId, target.folderId || null, beforeId);
}

function refreshCurrentMemoList() {
  if (ui.view === "home") {
    const noteBox = document.querySelector(".vault-root-notes");
    if (noteBox) noteBox.innerHTML = filteredNotes(notesFor("root")).map(renderNoteCard).join("") || `<div class="empty-card">Tap + To Create Memo</div>`;
  } else if (ui.view === "folder") {
    const noteBox = document.querySelector(".folder-note-list");
    if (noteBox) noteBox.innerHTML = filteredNotes(notesFor(ui.folderId)).map(renderNoteCard).join("") || `<div class="empty-folder-state">No Memos In This Space</div>`;
  }
}
function renderDragLayer() {
  document.querySelector(".drag-ghost")?.remove();
  const drag = ui.drag;
  if (!drag) return;
  const ghost = document.createElement("div");
  ghost.className = `drag-ghost ${drag.type === "folder" ? "folder-drag-ghost" : ""}`;
  if (drag.type === "folder") {
    const folder = state.folders.find((item) => item.id === drag.folderId);
    const count = state.notes.filter((note) => note.folderId === drag.folderId).length;
    ghost.innerHTML = `<strong>${escapeHtml(folder?.name || "Untitled Space")}</strong><span>${count} Memos</span>`;
  } else {
    const note = state.notes.find((item) => item.id === drag.noteId);
    ghost.innerHTML = `<strong>${escapeHtml(note?.title || "Untitled Memo")}</strong><span>${escapeHtml(textFromHtml(note?.bodyHtml || "No Body").slice(0, 42))}</span>`;
  }
  ghost.style.left = `${drag.x}px`;
  ghost.style.top = `${drag.y}px`;
  document.body.appendChild(ghost);
}

function clearDragTargets() {
  document.querySelectorAll(".drag-over, .drag-source, .drag-before, .folder-before, .folder-after").forEach((el) => el.classList.remove("drag-over", "drag-source", "drag-before", "folder-before", "folder-after"));
}

function beginMemoDrag(noteCard, event) {
  const id = noteCard.dataset.longNote;
  ui.drag = { type: "note", noteId: id, x: event.clientX, y: event.clientY, scrollDelta: 0, folderScrollDelta: 0, sourceFolderId: state.notes.find((note) => note.id === id)?.folderId || null };
  (document.querySelector(`[data-long-note="${id}"]`) || noteCard).classList.add("drag-source");
  renderDragLayer();
}

function beginFolderDrag(folderCard, event) {
  const id = folderCard.dataset.longFolder;
  const folder = state.folders.find((item) => item.id === id);
  ui.drag = { type: "folder", folderId: id, x: event.clientX, y: event.clientY, scrollDelta: 0, folderScrollDelta: 0, parentId: folder?.parentId || null };
  (document.querySelector(`[data-long-folder="${id}"]`) || folderCard).classList.add("drag-source");
  renderDragLayer();
}

function stopDragAutoScroll() {
  if (ui.dragScrollFrame) cancelAnimationFrame(ui.dragScrollFrame);
  ui.dragScrollFrame = null;
  if (ui.drag) {
    ui.drag.scrollDelta = 0;
    ui.drag.folderScrollDelta = 0;
  }
}

function currentFolderStripForDrag() {
  if (!ui.drag || ui.drag.type !== "folder") return null;
  const liveCard = document.querySelector(`[data-long-folder="${ui.drag.folderId}"]`);
  return liveCard?.closest(".folder-strip") || document.elementFromPoint(ui.drag.x, ui.drag.y)?.closest?.(".folder-strip") || (ui.view === "folder" ? document.querySelector(".nested-folders") : document.querySelector(".vault-screen .folder-strip.compact-folders"));
}

function runDragAutoScroll() {
  if (!ui.drag) {
    ui.dragScrollFrame = null;
    return;
  }
  const yDelta = ui.drag.scrollDelta || 0;
  const xDelta = ui.drag.folderScrollDelta || 0;
  if (!yDelta && !xDelta) {
    ui.dragScrollFrame = null;
    return;
  }
  const scroll = document.querySelector(".scroll");
  const strip = currentFolderStripForDrag();
  if (scroll && yDelta) scroll.scrollTop += yDelta;
  if (strip && xDelta) strip.scrollLeft += xDelta;
  renderDragLayer();
  ui.dragScrollFrame = requestAnimationFrame(runDragAutoScroll);
}

function autoScrollDuringDrag(event) {
  if (!ui.drag) return;
  if (ui.drag.type === "folder") {
    const strip = currentFolderStripForDrag();
    if (!strip) return;
    const rect = strip.getBoundingClientRect();
    const edge = 56;
    const maxStep = 16;
    let delta = 0;
    if (event.clientX < rect.left + edge) delta = -Math.round(maxStep * (1 - Math.max(0, event.clientX - rect.left) / edge));
    if (event.clientX > rect.right - edge) delta = Math.round(maxStep * (1 - Math.max(0, rect.right - event.clientX) / edge));
    ui.drag.folderScrollDelta = delta;
    ui.drag.scrollDelta = 0;
    if (delta && !ui.dragScrollFrame) ui.dragScrollFrame = requestAnimationFrame(runDragAutoScroll);
    if (!delta && ui.dragScrollFrame) stopDragAutoScroll();
    return;
  }
  const scroll = document.querySelector(".scroll");
  if (!scroll) return;
  const rect = scroll.getBoundingClientRect();
  const edge = 74;
  const maxStep = 18;
  let delta = 0;
  if (event.clientY < rect.top + edge) delta = -Math.round(maxStep * (1 - Math.max(0, event.clientY - rect.top) / edge));
  if (event.clientY > rect.bottom - edge) delta = Math.round(maxStep * (1 - Math.max(0, rect.bottom - event.clientY) / edge));
  ui.drag.scrollDelta = delta;
  ui.drag.folderScrollDelta = 0;
  if (delta && !ui.dragScrollFrame) ui.dragScrollFrame = requestAnimationFrame(runDragAutoScroll);
  if (!delta && ui.dragScrollFrame) stopDragAutoScroll();
}

function updateFolderDrag(event) {
  if (!ui.drag || ui.drag.type !== "folder") return;
  ui.drag.x = event.clientX;
  ui.drag.y = event.clientY;
  autoScrollDuringDrag(event);
  renderDragLayer();
  clearDragTargets();
  const strip = currentFolderStripForDrag();
  if (!strip) return;
  const cards = [...strip.querySelectorAll("[data-long-folder]")].filter((card) => card.dataset.longFolder !== ui.drag.folderId);
  if (!cards.length) return;
  const beforeCard = cards.find((card) => {
    const rect = card.getBoundingClientRect();
    return event.clientX < rect.left + rect.width / 2;
  });
  const beforeId = beforeCard?.dataset.longFolder || null;
  const markerKey = beforeId || "__end__";
  if (beforeCard) beforeCard.classList.add("folder-before");
  else cards[cards.length - 1]?.classList.add("folder-after");
  if (ui.drag.overFolderId !== markerKey) {
    ui.drag.overFolderId = markerKey;
    if (reorderFolderBefore(ui.drag.folderId, beforeId)) {
      refreshCurrentFolderStrip();
      renderDragLayer();
    }
  }
}
function updateMemoDrag(event) {
  if (ui.drag?.type === "folder") {
    updateFolderDrag(event);
    return;
  }
  if (!ui.drag) return;
  ui.drag.x = event.clientX;
  ui.drag.y = event.clientY;
  autoScrollDuringDrag(event);
  renderDragLayer();
  clearDragTargets();
  const el = document.elementFromPoint(event.clientX, event.clientY);
  const folderCard = el?.closest?.("[data-long-folder]");
  const noteCard = el?.closest?.("[data-long-note]");
  const backButton = el?.closest?.('[data-action="back"]');
  if (backButton && ui.view === "folder") {
    const drag = ui.drag;
    ui.view = "home";
    ui.folderId = null;
    render();
    ui.drag = drag;
    renderDragLayer();
    return;
  }
  if (folderCard) folderCard.classList.add("drag-over");
  if (noteCard && noteCard.dataset.longNote !== ui.drag.noteId) {
    noteCard.classList.add("drag-before");
    if (ui.drag.overNoteId !== noteCard.dataset.longNote) {
      ui.drag.overNoteId = noteCard.dataset.longNote;
      if (reorderNoteBefore(ui.drag.noteId, ui.drag.overNoteId)) {
        refreshCurrentMemoList();
        renderDragLayer();
      }
    }
  }
  if (backButton) backButton.classList.add("drag-over");
}

function finishFolderDrag() {
  if (!ui.drag) return;
  ui.drag = null;
  ui.pendingDrag = null;
  ui.longPressFolderId = null;
  stopDragAutoScroll();
  clearDragTargets();
  document.querySelector(".drag-ghost")?.remove();
  scheduleSave();
  renderPreservingScroll();
}

function finishMemoDrag(event) {
  if (!ui.drag) return;
  const drag = ui.drag;
  const el = document.elementFromPoint(event.clientX, event.clientY);
  const folderCard = el?.closest?.("[data-long-folder]");
  let moved = false;
  if (folderCard) moved = moveNoteToFolder(drag.noteId, folderCard.dataset.longFolder);
  ui.drag = null;
  ui.pendingDrag = null;
  ui.longPressNoteId = null;
  stopDragAutoScroll();
  clearDragTargets();
  document.querySelector(".drag-ghost")?.remove();
  const note = state.notes.find((item) => item.id === drag.noteId);
  if (moved) setView(note?.folderId ? "folder" : "home", { folderId: note?.folderId || null, noteId: null });
  else {
    scheduleSave();
    renderPreservingScroll();
  }
}
function togglePin(target, id) {
  const list = target === "folder" ? state.folders : state.notes;
  const item = list.find((entry) => entry.id === id);
  if (!item) return;
  item.pinnedAt = item.pinnedAt ? null : nowIso();
  item.updatedAt = nowIso();
  ui.longPressNoteId = null;
  ui.longPressFolderId = null;
  scheduleSave();
  renderPreservingScroll();
}
function lockTarget(target, id) {
  if (target === "folder") ui.unlockedFolders.delete(id);
  else ui.unlockedNotes.delete(id);
  render();
}

function startAlarmVibration() {
  clearInterval(ui.alarmVibrateTimer);
  if (navigator.vibrate) {
    navigator.vibrate([260, 100, 260, 100, 420]);
    ui.alarmVibrateTimer = setInterval(() => navigator.vibrate([260, 100, 260, 100, 420]), 1300);
  }
}

function stopAlarmVibration() {
  clearInterval(ui.alarmVibrateTimer);
  ui.alarmVibrateTimer = null;
  if (navigator.vibrate) navigator.vibrate(0);
}
function hideFormatPopover() {
  const popover = document.querySelector("[data-format-popover]");
  if (popover) popover.classList.remove("show");
}

function saveSelection() {
  const selection = window.getSelection();
  const body = document.querySelector(".editor-body");
  const popover = document.querySelector("[data-format-popover]");
  if (!selection || !selection.rangeCount || !body) return;
  const range = selection.getRangeAt(0);
  if (!selection.isCollapsed && body.contains(range.commonAncestorContainer)) {
    ui.lastSelection = range.cloneRange();
    if (popover) {
      popover.classList.add("show");
      const rect = range.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      const width = popover.offsetWidth || 220;
      const left = Math.min(window.innerWidth - width - 10, Math.max(10, bodyRect.left));
      const top = Math.max(bodyRect.top + 2, rect.top - 38);
      popover.style.left = `${left}px`;
      popover.style.top = `${top}px`;
      popover.dataset.placement = "above-line";
    }
  } else if (popover && !document.activeElement?.closest?.(".format-popover")) {
    hideFormatPopover();
    ui.lastSelection = null;
  }
}
function restoreSelection() {
  if (!ui.lastSelection) return;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(ui.lastSelection);
}

function closestStyledNode(range, attr, value) {
  let node = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
  const body = document.querySelector(".editor-body");
  while (node && node !== body) {
    if (node.nodeType === Node.ELEMENT_NODE && node.dataset?.[attr] === value) return node;
    node = node.parentElement;
  }
  return null;
}

function unwrapNode(node) {
  const parent = node.parentNode;
  if (!parent) return;
  while (node.firstChild) parent.insertBefore(node.firstChild, node);
  parent.removeChild(node);
}

function clearFormatInFragment(fragment, datasetKey) {
  fragment.querySelectorAll?.(`[data-${datasetKey.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}]`).forEach((node) => unwrapNode(node));
  const first = fragment.firstElementChild;
  if (first?.dataset?.[datasetKey]) unwrapNode(first);
}

function styleSelection(range, datasetKey, datasetValue, styles = {}, resetStyles = {}) {
  const active = closestStyledNode(range, datasetKey, datasetValue);
  const wrapper = document.createElement("span");
  if (active) {
    wrapper.dataset[`${datasetKey}Reset`] = datasetValue;
    Object.assign(wrapper.style, resetStyles);
  } else {
    wrapper.dataset[datasetKey] = datasetValue;
    Object.assign(wrapper.style, styles);
  }
  const fragment = range.extractContents();
  wrapper.appendChild(fragment);
  range.insertNode(wrapper);
  const marker = document.createTextNode("\u200B");
  wrapper.after(marker);
  const selection = window.getSelection();
  const caret = document.createRange();
  caret.setStartAfter(marker);
  caret.collapse(true);
  selection.removeAllRanges();
  selection.addRange(caret);
  setTimeout(() => marker.parentNode?.removeChild(marker), 0);
  ui.lastSelection = null;
  hideFormatPopover();
}
function applyFormat(action, value) {
  restoreSelection();
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  if (action === "size") styleSelection(range, "smSize", value, { fontSize: "1.28em", fontWeight: "850" }, { fontSize: "18px", fontWeight: "inherit" });
  if (action === "cmd") document.execCommand(value, false, null);
  if (action === "color") styleSelection(range, "smColor", value, { color: value }, { color: "var(--text)" });
  if (action === "highlight") styleSelection(range, "smHighlight", value, { backgroundColor: value, borderRadius: "0.28em", padding: "0 0.08em" }, { backgroundColor: "var(--surface)", borderRadius: "0.18em", padding: "0 0.04em" });
  const body = document.querySelector(".editor-body");
  if (body) updateCurrentNote({ bodyHtml: sanitizeHtml(body.innerHTML) });
}
app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id;

  
  if (action === "wheel-step") {
    stepWheel(target.dataset.key, Number(target.dataset.dir));
    return;
  }
  if (action === "restore-previous") {
    restorePreviousVersion();
    return;
  }
  if (action === "format-size") {
    applyFormat("size", target.dataset.value);
    return;
  }
  if (action === "format-cmd") {
    applyFormat("cmd", target.dataset.cmd);
    return;
  }
  if (action === "format-color") {
    applyFormat("color", target.dataset.color);
    return;
  }
  if (action === "format-highlight") {
    applyFormat("highlight", target.dataset.color);
    return;
  }
  if (action === "toggle-password") {
    if (ui.revealedPasswords.has(target.dataset.key)) ui.revealedPasswords.delete(target.dataset.key);
    else ui.revealedPasswords.add(target.dataset.key);
    render();
    return;
  }
  if (action === "lock-folder") {
    event.stopPropagation();
    lockTarget("folder", id);
    return;
  }
  if (action === "lock-note") {
    event.stopPropagation();
    lockTarget("note", id);
    return;
  }
  if (action === "pin-folder") {
    event.stopPropagation();
    togglePin("folder", id);
    return;
  }
  if (action === "pin-note") {
    event.stopPropagation();
    togglePin("note", id);
    return;
  }
if (action === "back") setView("home", { folderId: null, noteId: null });
  if (action === "back-folder") setView("folder", { noteId: null });
  if (action === "settings") setView("settings");
  if (action === "dock-vault") {
    ui.tab = "all";
    ui.search = "";
    setView("home", { folderId: null, noteId: null });
  }
  if (action === "dock-history") setView("history", { folderId: null, noteId: null });
  if (action === "theme") {
    state.settings.theme = state.settings.theme === "light" ? "dark" : "light";
    scheduleSave();
    render();
  }
  if (action === "tab") {
    ui.tab = id;
    render();
  }
  if (action === "save-note") {
    await saveNow();
    ui.modal = { type: "result", status: "success", title: "Saved", message: "Memo Is Encrypted Locally." };
    render();
  }
  if (action === "create-menu") {
    ui.modal = { type: "create", folderId: ui.view === "folder" ? ui.folderId : null };
    render();
  }
  if (action === "new-note") createNote(target.dataset.folder || null);
  if (action === "new-folder") {
    ui.modal = { type: "folderForm", parentId: target.dataset.folder || (ui.view === "folder" ? ui.folderId : null) };
    render();
  }
  if (action === "open-folder") {
    if (ui.longPressFolderId === id) return;
    const folder = state.folders.find((item) => item.id === id);
    if (folder?.hasPassword && !ui.unlockedFolders.has(id)) {
      ui.modal = { type: "unlock", target: "folder", id };
      render();
      return;
    }
    ui.search = "";
    setView("folder", { folderId: id });
  }
  if (action === "open-note") {
    if (ui.longPressNoteId === id) return;
    const note = state.notes.find((item) => item.id === id);
    if (note?.hasPassword && !ui.unlockedNotes.has(id)) {
      ui.modal = { type: "unlock", target: "note", id };
      render();
      return;
    }
    setView("editor", { noteId: id });
  }
  if (action === "unlock-folder") {
    ui.modal = { type: "unlock", target: "folder", id };
    render();
  }
  if (action === "unlock-note") {
    ui.modal = { type: "unlock", target: "note", id };
    render();
  }
  if (action === "folder-menu") {
    ui.modal = { type: "folderMenu", id };
    render();
  }
  if (action === "edit-folder") {
    ui.modal = { type: "folderForm", folderId: id };
    render();
  }
  if (action === "delete-folder") {
    const folder = state.folders.find((item) => item.id === id);
    if (folder?.hasPassword && !ui.unlockedFolders.has(id)) {
      ui.longPressFolderId = null;
      return;
    }
    ui.modal = { type: "confirm", title: "Delete Space", message: "Memos Inside Will Move To Vault.", id, confirmAction: "confirm-delete-folder" };
    render();
  }
  if (action === "confirm-delete-folder") deleteFolder(id);
  if (action === "delete-note") {
    ui.modal = { type: "confirm", title: "Delete Memo", message: "Reminder And Password Will Be Removed.", id, confirmAction: "confirm-delete-note" };
    render();
  }
  if (action === "confirm-delete-note") deleteNote(id);
  if (action === "add-image") imagePicker.click();
  if (action === "image-menu") {
    ui.modal = { type: "imageMenu" };
    render();
  }
  if (action === "remove-tray-image") {
    event.stopPropagation();
    removeTrayImage(id);
  }
  if (action === "preview-tray-image") {
    const note = currentNote();
    ui.modal = { type: "previewImage", src: note?.images?.[Number(id)] || "" };
    render();
  }
  if (action === "commit-images") insertTrayImagesIntoBody();
  if (action === "restore-history") {
    const entry = state.history.find((item) => item.id === id);
    if (entry?.type === "expired") {
      ui.wheelDraft = null;
      ui.modal = { type: "restoreExpired", id };
      render();
    } else {
      restoreHistory(id);
    }
  }
  if (action === "delete-history") {
    deleteHistory(id);
    return;
  }
  if (action === "note-password") {
    const note = currentNote();
    ui.modal = { type: "notePassword", id: note.id };
    render();
  }
  if (action === "reminder") {
    const note = currentNote();
    ui.wheelDraft = null;
    ui.modal = { type: "reminder", id: note.id };
    render();
  }
  if (action === "clear-reminder") {
    const note = state.notes.find((item) => item.id === id);
    if (note) note.reminder = null;
    ui.modal = null;
    scheduleSave();
    render();
  }
  if (action === "move-image-up") moveImage(id, -1);
  if (action === "move-image-down") moveImage(id, 1);
  if (action === "remove-image") removeImage(id);
  if (action === "export-preview") {
    ui.modal = { type: "exportPreview" };
    render();
  }
  if (action === "import-backup") backupPicker.click();
  if (action === "notifications") await requestNotifications();
  if (action === "snooze-alarm") snoozeAlarm(id);
  if (action === "stop-alarm") stopAlarm(id);
  if (action === "history-detail") {
    ui.modal = { type: "historyDetail", id };
    render();
  }
  if (action === "forgot-password") {
    ui.modal = { type: "unlock", target: target.dataset.target, id, recover: true };
    render();
  }
  if (action === "verify-inline-recovery") {
    const answer = target.closest("form")?.querySelector("input[name=answer]")?.value || "";
    const recovery = getRecovery(target.dataset.target, id);
    if (recovery.enabled && (recovery.answer || "").trim().toLowerCase() === answer.trim().toLowerCase()) {
      openUnlockedTarget(target.dataset.target, id);
      return;
    }
    else ui.modal = { type: "unlock", target: target.dataset.target, id, recover: true, error: "Incorrect Answer" };
    render();
  }
  if (action === "backdrop-close" && event.target === target) closeModal();
  if (action === "close-modal") closeModal();
});

app.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-action]");
  if (!form) return;
  event.preventDefault();
  const action = form.dataset.action;
  if (action === "verify-password") return verifyPassword(form);
  if (action === "verify-recovery") return verifyRecovery(form);
  if (action === "save-folder") return saveFolder(form);
  if (action === "save-note-password") return saveNotePassword(form);
  if (action === "save-reminder") return saveReminder(form);
  if (action === "restore-expired") return restoreExpired(form);
  if (action === "confirm-export") {
    const data = Object.fromEntries(new FormData(form));
    return exportBackup({ folders: Boolean(data.folders), memos: Boolean(data.memos), history: Boolean(data.history) });
  }
  if (action === "confirm-import") {
    const data = Object.fromEntries(new FormData(form));
    return applyImportBackup(ui.pendingImport, { folders: Boolean(data.folders), memos: Boolean(data.memos), history: Boolean(data.history) }).catch(() => {
      ui.modal = { type: "result", status: "error", title: "Import Failed", message: "Backup Could Not Be Restored." };
      render();
    });
  }
});

app.addEventListener("input", (event) => {
  const target = event.target;
  const action = target?.dataset?.action;
  if (action === "edit-title") updateCurrentNote({ title: target.value });
  if (action === "edit-body") updateCurrentNote({ bodyHtml: sanitizeHtml(target.innerHTML) });
});

imagePicker.addEventListener("change", async () => {
  await addImages([...imagePicker.files]);
  imagePicker.value = "";
});

backupPicker.addEventListener("change", async () => {
  const file = backupPicker.files?.[0];
  if (!file) return;
  try {
    await previewImportBackup(file);
  } catch (error) {
    ui.modal = { type: "result", status: "error", title: "Import Failed", message: error?.message || "Backup Could Not Be Read." };
    render();
  } finally {
    backupPicker.value = "";
  }
});
app.addEventListener("click", (event) => {
  if (ui.suppressClick) {
    event.preventDefault();
    event.stopImmediatePropagation();
    ui.suppressClick = false;
    return;
  }
  if (!ui.longPressNoteId && !ui.longPressFolderId) return;
  const action = event.target.closest("[data-action]")?.dataset.action;
  const keepActions = new Set(["pin-note", "pin-folder", "delete-note", "delete-folder", "confirm-delete-note", "confirm-delete-folder"]);
  if (keepActions.has(action)) return;
  const noteArmed = ui.longPressNoteId && event.target.closest(`[data-long-note="${ui.longPressNoteId}"]`);
  const folderArmed = ui.longPressFolderId && event.target.closest(`[data-long-folder="${ui.longPressFolderId}"]`);
  if (noteArmed || folderArmed) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  ui.longPressNoteId = null;
  ui.longPressFolderId = null;
  renderPreservingScroll();
}, true);

app.addEventListener("pointerdown", (event) => {
  const noteCard = event.target.closest("[data-long-note]");
  const folderCard = event.target.closest("[data-long-folder]");
  const card = noteCard || folderCard;
  if (!card) return;
  ui.folderPan = null;
  if (noteCard) {
    const note = state.notes.find((item) => item.id === noteCard.dataset.longNote);
    if (note?.hasPassword && !ui.unlockedNotes.has(note.id)) return;
    ui.pendingDrag = { type: "note", noteCard, startX: event.clientX, startY: event.clientY };
  }
  if (folderCard && !noteCard) {
    const folder = state.folders.find((item) => item.id === folderCard.dataset.longFolder);
    if (folder?.hasPassword && !ui.unlockedFolders.has(folder.id)) return;
    ui.pendingDrag = { type: "folder", folderId: folderCard.dataset.longFolder, folderCard, startX: event.clientX, startY: event.clientY };
    const strip = folderCard.closest(".folder-strip");
    if (strip) ui.folderPan = { strip, startX: event.clientX, startY: event.clientY, scrollLeft: strip.scrollLeft, moved: false };
  }
  clearTimeout(ui.pressTimer);
  ui.pressTimer = setTimeout(() => {
    ui.longPressNoteId = noteCard ? noteCard.dataset.longNote : null;
    ui.longPressFolderId = folderCard && !noteCard ? folderCard.dataset.longFolder : null;
    renderPreservingScroll();
  }, 520);
});

app.addEventListener("pointermove", (event) => {
  if (ui.drag) {
    event.preventDefault();
    if (ui.drag.type === "folder") updateFolderDrag(event);
    else updateMemoDrag(event);
    return;
  }
  if (ui.folderPan && !ui.longPressFolderId && !ui.longPressNoteId) {
    const panDx = event.clientX - ui.folderPan.startX;
    const panDy = event.clientY - ui.folderPan.startY;
    if (Math.abs(panDx) > 8 && Math.abs(panDx) > Math.abs(panDy)) {
      clearTimeout(ui.pressTimer);
      ui.folderPan.moved = true;
      ui.pendingDrag = null;
      event.preventDefault();
      ui.folderPan.strip.scrollLeft = ui.folderPan.scrollLeft - panDx;
      return;
    }
  }
  if (!ui.pendingDrag) return;
  const dx = Math.abs(event.clientX - ui.pendingDrag.startX);
  const dy = Math.abs(event.clientY - ui.pendingDrag.startY);
  if (dx + dy <= 8) return;
  if (ui.pendingDrag.type === "note" && ui.longPressNoteId === ui.pendingDrag.noteCard.dataset.longNote) {
    event.preventDefault();
    beginMemoDrag(ui.pendingDrag.noteCard, event);
  }
  if (ui.pendingDrag.type === "folder" && ui.longPressFolderId === ui.pendingDrag.folderId) {
    event.preventDefault();
    const liveFolderCard = document.querySelector(`[data-long-folder="${ui.pendingDrag.folderId}"]`) || ui.pendingDrag.folderCard;
    beginFolderDrag(liveFolderCard, event);
  }
});

app.addEventListener("pointerup", (event) => {
  clearTimeout(ui.pressTimer);
  if (ui.drag?.type === "folder") finishFolderDrag();
  else if (ui.drag) finishMemoDrag(event);
  if (ui.folderPan?.moved) ui.suppressClick = true;
  ui.folderPan = null;
  ui.pendingDrag = null;
});

app.addEventListener("pointercancel", () => {
  clearTimeout(ui.pressTimer);
  ui.drag = null;
  ui.pendingDrag = null;
  ui.folderPan = null;
  ui.longPressNoteId = null;
  ui.longPressFolderId = null;
  stopDragAutoScroll();
  clearDragTargets();
  document.querySelector(".drag-ghost")?.remove();
});
function applyUrlUnlock() {
  const params = new URLSearchParams(window.location.search || "");
  const target = params.get("target");
  const id = params.get("id");
  const password = String(params.get("password") || "").trim();
  if (!target || !id || !password) return;
  const validTarget = target === "folder" || target === "note";
  if (!validTarget || password !== MASTER_PASSWORD) return;
  if (target === "folder" && state.folders.some((folder) => folder.id === id)) {
    ui.unlockedFolders.add(id);
    ui.view = "folder";
    ui.folderId = id;
    ui.noteId = null;
  }
  if (target === "note" && state.notes.some((note) => note.id === id)) {
    ui.unlockedNotes.add(id);
    ui.view = "editor";
    ui.noteId = id;
  }
  history.replaceState(null, "", window.location.pathname);
}

function armEditorSelectionTools() {
  const schedule = () => setTimeout(saveSelection, 0);
  document.addEventListener("selectionchange", () => {
    if (document.querySelector(".editor-body")) schedule();
  });
  app.addEventListener("mouseup", schedule);
  app.addEventListener("keyup", schedule);
  app.addEventListener("touchend", schedule, { passive: true });
}
async function boot() {
  try {
    await load();
    render();
  } catch (error) {
    console.error(error);
    app.innerHTML = `
      <section class="screen vault-screen">
        <div class="empty-card boot-error">
          <strong>Unable To Open SmartMemo</strong>
          <p>Please Reload The App. Your Local Data Was Not Deleted.</p>
        </div>
      </section>
    `;
  }
}

armEditorSelectionTools();
boot();