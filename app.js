const STORAGE_KEY = "skycraft.inventory.v1";
const VISUAL_PACK_KEY = "skycraft.visual-pack.v1";
const NBT_INVENTORY_FIELDS = new Set([
  "inv_contents", "ender_chest_contents", "talisman_bag", "wardrobe_contents",
  "bag_contents", "fishing_bag", "potion_bag", "personal_vault_contents",
  "backpack_contents", "storage"
]);

const elements = {
  status: document.querySelector("#data-status"),
  search: document.querySelector("#item-search"),
  suggestions: document.querySelector("#suggestions"),
  quantity: document.querySelector("#target-quantity"),
  plannerForm: document.querySelector("#planner-form"),
  plannerMessage: document.querySelector("#planner-message"),
  results: document.querySelector("#results"),
  title: document.querySelector("#result-title"),
  badge: document.querySelector("#target-badge"),
  summaryMaterials: document.querySelector("#summary-materials"),
  summaryOwned: document.querySelector("#summary-owned"),
  summaryMissing: document.querySelector("#summary-missing"),
  inventoryCount: document.querySelector("#inventory-count"),
  materials: document.querySelector("#materials-list"),
  tree: document.querySelector("#craft-tree"),
  treePanel: document.querySelector(".tree-panel"),
  treeViewport: document.querySelector("#tree-viewport"),
  treeExpand: document.querySelector("#tree-expand"),
  treeZoomOut: document.querySelector("#tree-zoom-out"),
  treeZoomIn: document.querySelector("#tree-zoom-in"),
  treeZoomReset: document.querySelector("#tree-zoom-reset"),
  treeZoomValue: document.querySelector("#tree-zoom-value"),
  treeFullscreen: document.querySelector("#tree-fullscreen"),
  treeMessage: document.querySelector("#tree-message"),
  recipeChoiceWrap: document.querySelector("#recipe-choice-wrap"),
  recipeChoice: document.querySelector("#recipe-choice"),
  clearInventory: document.querySelector("#clear-inventory"),
  inventoryAddForm: document.querySelector("#inventory-add-form"),
  inventorySearch: document.querySelector("#inventory-item-search"),
  inventoryOptions: document.querySelector("#inventory-item-options"),
  inventoryAmount: document.querySelector("#inventory-item-amount"),
  inventoryMessage: document.querySelector("#inventory-message"),
  savedInventory: document.querySelector("#saved-inventory"),
  ownedItemCount: document.querySelector("#owned-item-count"),
  visualPack: document.querySelector("#visual-pack"),
  apiForm: document.querySelector("#api-form"),
  apiKey: document.querySelector("#api-key"),
  uuid: document.querySelector("#player-uuid"),
  apiMessage: document.querySelector("#api-message"),
  profilePickerWrap: document.querySelector("#profile-picker-wrap"),
  profilePicker: document.querySelector("#profile-picker"),
  importProfile: document.querySelector("#import-profile"),
  loadProfiles: document.querySelector("#load-profiles")
};

let items = [];
let itemById = new Map();
let visualsById = new Map();
let baseResourceIds = new Set();
let inventory = readInventory();
let visualPack = readVisualPack();
let selectedItem = null;
let currentPlan = null;
let loadedProfiles = [];
let treeZoom = 1;
const recipeChoices = {};

function readVisualPack() {
  try {
    return localStorage.getItem(VISUAL_PACK_KEY) === "hypixel" ? "hypixel" : "fursky";
  } catch (error) {
    console.warn("Impossible de lire le pack visuel sauvegardé.", error);
    return "fursky";
  }
}

function readInventory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch (error) {
    console.warn("Impossible de lire l’inventaire sauvegardé.", error);
    return {};
  }
}

function saveInventory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  } catch (error) {
    elements.plannerMessage.textContent = "Le navigateur n’a pas pu sauvegarder les stocks localement.";
    console.error("Impossible de sauvegarder l’inventaire.", error);
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function getItemName(id) {
  return visualsById.get(id)?.name || itemById.get(id)?.name || id.replace(/_/g, " ").toLowerCase().replace(/\b\p{L}/gu, letter => letter.toUpperCase());
}

function normalizeSearch(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function itemGlyph(id) {
  const material = visualsById.get(id)?.material || id;
  if (/DIAMOND|EMERALD|GEM|ORE|AMETHYST|CRYSTAL/.test(material)) return "◆";
  if (/SWORD|BOW|AXE|PICKAXE|SHOVEL|SPADE|HOE/.test(material)) return "⚔";
  if (/HELMET|CHESTPLATE|LEGGINGS|BOOTS|ARMOR/.test(material)) return "◈";
  if (/POTION|BREW|WATER_BUCKET|HYPERION/.test(material)) return "⚗";
  if (/WOOD|LOG|LEAVES|SAPLING|PLANK|STICK/.test(material)) return "♣";
  if (/FISH|SALMON|COD|TROPICAL/.test(material)) return "♧";
  if (/SKULL|PET|ANIMAL|SPAWN_EGG/.test(material)) return "✦";
  if (/PAPER|BOOK|MAP|ENCHANT/.test(material)) return "▤";
  return "✧";
}

function createItemIcon(id, size = "") {
  const icon = document.createElement("span");
  const visual = visualsById.get(id);
  icon.className = `item-icon${size ? ` ${size}` : ""}${visual?.glowing ? " item-glowing" : ""}`;
  if (visual?.tier) icon.dataset.tier = visual.tier.toLowerCase();
  const fallback = document.createElement("span");
  fallback.className = "item-icon-fallback";
  fallback.setAttribute("aria-hidden", "true");
  fallback.textContent = itemGlyph(id);
  icon.append(fallback);

  const imageSource = visualPack === "fursky"
    ? visual?.furSkyTexture || visual?.skinTexture || visual?.texture
    : visual?.skinTexture || visual?.texture;
  if (imageSource) {
    const image = document.createElement("img");
    image.src = imageSource;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.className = visual?.isSkin ? "item-skin-texture" : "item-sprite";
    image.addEventListener("error", () => image.remove(), { once: true });
    icon.append(image);
  }
  return icon;
}

function inventoryItems() {
  return Object.entries(inventory)
    .filter(([, quantity]) => Number(quantity) > 0)
    .sort(([first], [second]) => getItemName(first).localeCompare(getItemName(second), "fr"));
}

function renderInventory() {
  const savedItems = inventoryItems();
  elements.ownedItemCount.textContent = `${savedItems.length} ${savedItems.length > 1 ? "objets" : "objet"}`;
  elements.savedInventory.replaceChildren();
  if (!savedItems.length) {
    const empty = document.createElement("div");
    empty.className = "inventory-empty";
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "＋";
    const message = document.createElement("span");
    message.textContent = "Ton inventaire est vide. Ajoute un objet ou importe ton profil Hypixel.";
    empty.append(icon, message);
    elements.savedInventory.append(empty);
    return;
  }

  for (const [id, quantity] of savedItems) {
    const card = document.createElement("article");
    card.className = "owned-item-card";
    card.append(createItemIcon(id, "item-icon-small"));
    const name = document.createElement("span");
    name.className = "owned-item-name";
    name.textContent = getItemName(id);
    name.title = `${getItemName(id)} (${id})`;
    const amount = document.createElement("input");
    amount.className = "owned-item-stock";
    amount.type = "number";
    amount.min = "0";
    amount.max = "999999999";
    amount.step = "1";
    amount.inputMode = "numeric";
    amount.value = String(getStock(id, inventory));
    amount.setAttribute("aria-label", `Quantité possédée : ${getItemName(id)}`);
    amount.addEventListener("change", () => {
      const quantity = Math.min(999999999, Math.max(0, Math.floor(Number(amount.value) || 0)));
      if (quantity === 0) delete inventory[id];
      else inventory[id] = quantity;
      saveInventory();
      renderInventory();
      if (selectedItem) renderPlan();
    });
    const remove = document.createElement("button");
    remove.className = "remove-owned-item";
    remove.type = "button";
    remove.setAttribute("aria-label", `Retirer ${getItemName(id)} de l’inventaire`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      delete inventory[id];
      saveInventory();
      renderInventory();
      if (selectedItem) renderPlan();
    });
    card.append(name, amount, remove);
    elements.savedInventory.append(card);
  }
}

function findInventoryItem(query) {
  const normalized = normalizeSearch(query);
  if (!normalized) return null;
  for (const id of baseResourceIds) {
    const visual = visualsById.get(id);
    if (normalizeSearch(id) === normalized || normalizeSearch(visual?.name || getItemName(id)) === normalized) {
      return { id, ...(visual || {}), name: visual?.name || getItemName(id) };
    }
  }
  return null;
}

function chooseItem(item) {
  selectedItem = item;
  elements.search.value = item.name;
  elements.suggestions.hidden = true;
  elements.plannerMessage.textContent = "";
  elements.recipeChoiceWrap.hidden = item.recipes.length < 2;
  elements.recipeChoice.replaceChildren();
  item.recipes.forEach((recipe, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${recipe.name} · ${formatNumber(recipe.output)} par craft`;
    elements.recipeChoice.append(option);
  });
  if (item.recipes.length > 1) {
    elements.recipeChoice.value = String(recipeChoices[item.id] || 0);
  }
  renderPlan();
}

function findMatchingItem(query) {
  const normalized = normalizeSearch(query);
  if (!normalized) return null;
  return items.find(item => item.name.toLowerCase() === query.trim().toLowerCase())
    || items.find(item => item.id.toLowerCase() === query.trim().toUpperCase())
    || items.find(item => normalizeSearch(item.name) === normalized)
    || null;
}

function updateSuggestions() {
  const query = normalizeSearch(elements.search.value);
  elements.suggestions.replaceChildren();
  if (query.length < 2) {
    elements.suggestions.hidden = true;
    return;
  }

  const matches = items.filter(item => normalizeSearch(item.name).includes(query) || normalizeSearch(item.id).includes(query))
    .slice(0, 10);
  if (!matches.length) {
    elements.suggestions.hidden = true;
    return;
  }

  for (const item of matches) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "suggestion-option";
    option.setAttribute("role", "option");
    option.append(createItemIcon(item.id, "item-icon-small"));
    const name = document.createElement("span");
    name.className = "suggestion-name";
    name.textContent = item.name;
    const id = document.createElement("small");
    id.textContent = item.id;
    option.append(name, id);
    option.addEventListener("click", () => chooseItem(item));
    elements.suggestions.append(option);
  }
  elements.suggestions.hidden = false;
}

function getStock(id, pool) {
  const value = Number(pool[id]) || 0;
  return Math.min(999999999, Math.max(0, Math.floor(value)));
}

function makePlan(itemId, required, pool, totals, used, path = []) {
  totals[itemId] = (totals[itemId] || 0) + required;
  const available = getStock(itemId, pool);
  const owned = Math.min(required, available);
  pool[itemId] = available - owned;
  used[itemId] = (used[itemId] || 0) + owned;
  const remaining = required - owned;
  const item = itemById.get(itemId);
  const cycle = path.includes(itemId);

  if (remaining <= 0) {
    return { id: itemId, name: getItemName(itemId), required, owned, remaining: 0, craftCount: 0, children: [], cycle: false };
  }
  if (!item || cycle) {
    return { id: itemId, name: getItemName(itemId), required, owned, remaining, craftCount: 0, children: [], cycle };
  }

  const recipeIndex = Math.min(Number(recipeChoices[itemId]) || 0, item.recipes.length - 1);
  const recipe = item.recipes[recipeIndex];
  const craftCount = Math.ceil(remaining / recipe.output);
  const children = recipe.ingredients.map(ingredient =>
    makePlan(ingredient.id, ingredient.quantity * craftCount, pool, totals, used, [...path, itemId])
  );
  pool[itemId] = getStock(itemId, pool) + craftCount * recipe.output - remaining;
  return {
    id: itemId,
    name: item.name,
    required,
    owned,
    remaining: 0,
    craftCount,
    recipeName: recipe.name,
    children,
    cycle: false
  };
}

function calculatePlan() {
  if (!selectedItem) return null;
  const requested = Math.max(1, Math.min(999999, Math.floor(Number(elements.quantity.value) || 1)));
  elements.quantity.value = String(requested);
  const pool = { ...inventory };
  const totals = {};
  const used = {};
  const tree = makePlan(selectedItem.id, requested, pool, totals, used);
  return { tree, totals, used, requested };
}

function sumValues(record) {
  return Object.values(record).reduce((sum, value) => sum + value, 0);
}

function createProgress(used, required, className = "") {
  const percent = required ? Math.min(100, (used / required) * 100) : 0;
  const wrapper = document.createElement("div");
  wrapper.className = className;
  const track = document.createElement("div");
  track.className = "progress-track";
  const fill = document.createElement("div");
  fill.className = `progress-fill ${percent >= 100 ? "complete" : percent > 0 ? "partial" : ""}`;
  fill.style.width = `${percent}%`;
  track.append(fill);
  const label = document.createElement("div");
  label.className = "stock-progress-label";
  label.textContent = `${formatNumber(used)} / ${formatNumber(required)} possédé${used > 1 ? "s" : ""} · ${Math.round(percent)} %`;
  wrapper.append(track, label);
  return wrapper;
}

function renderTreeNode(node, root = false) {
  const card = document.createElement("div");
  card.className = `node-card${root ? " node-card-root" : ""}`;
  card.dataset.state = node.cycle ? "error" : node.craftCount ? "craft" : node.remaining ? "missing" : "owned";
  const top = document.createElement("div");
  top.className = "node-topline";
  top.append(createItemIcon(node.id, "item-icon-small"));
  const title = document.createElement("span");
  title.className = "node-title";
  title.textContent = node.name;
  const quantity = document.createElement("span");
  quantity.className = "node-quantity";
  quantity.textContent = `× ${formatNumber(node.required)}`;
  top.append(title, quantity);

  const detail = document.createElement("div");
  detail.className = "node-detail";
  if (node.cycle) {
    detail.textContent = "Dépendance circulaire dans les données de recette.";
    detail.style.color = "var(--red)";
  } else if (node.craftCount) {
    detail.textContent = `${node.recipeName} · ${formatNumber(node.craftCount)} craft${node.craftCount > 1 ? "s" : ""} à réaliser`;
    const tag = document.createElement("span");
    tag.className = "node-tag";
    tag.textContent = "à fabriquer";
    detail.append(tag);
  } else if (node.remaining) {
    detail.textContent = `${formatNumber(node.remaining)} à trouver`;
    detail.style.color = "var(--red)";
    const tag = document.createElement("span");
    tag.className = "node-tag";
    tag.textContent = "rang 0";
    detail.append(tag);
  } else {
    detail.textContent = "Déjà disponible dans ton inventaire";
  }

  card.append(top, detail, createProgress(node.owned, node.required, "node-progress"));
  if (!node.children.length) {
    const leaf = document.createElement("div");
    leaf.className = `tree-node${root ? " tree-root" : ""}`;
    leaf.append(card);
    return leaf;
  }

  const wrapper = document.createElement("details");
  wrapper.className = `tree-node tree-branch${root ? " tree-root" : ""}`;
  wrapper.open = root;
  const summary = document.createElement("summary");
  summary.className = "tree-summary";
  summary.append(card);
  wrapper.append(summary);
  if (node.children.length) {
    const children = document.createElement("div");
    children.className = "node-children";
    node.children.forEach(child => children.append(renderTreeNode(child)));
    wrapper.append(children);
  }
  return wrapper;
}

function renderMaterials(plan) {
  const materialIds = Object.keys(plan.totals)
    .filter(id => !itemById.has(id))
    .sort((a, b) => getItemName(a).localeCompare(getItemName(b), "fr"));
  elements.materials.replaceChildren();
  elements.inventoryCount.textContent = `${materialIds.length} ${materialIds.length > 1 ? "objets" : "objet"}`;
  if (!materialIds.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucune ressource de rang 0 à réunir pour ce craft.";
    elements.materials.append(empty);
    return;
  }
  for (const id of materialIds) {
    const needed = plan.totals[id];
    const owned = plan.used[id] || 0;
    const row = document.createElement("div");
    row.className = "material-row";
    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "material-name";
    name.title = `${getItemName(id)} (${id})`;
    const label = document.createElement("span");
    label.textContent = getItemName(id);
    name.append(createItemIcon(id, "item-icon-tiny"), label);
    const quantity = document.createElement("div");
    quantity.className = "material-quantity";
    quantity.textContent = `${formatNumber(needed)} requis`;
    info.append(name, quantity, createProgress(owned, needed));
    const input = document.createElement("input");
    input.className = "material-stock";
    input.type = "number";
    input.min = "0";
    input.max = "999999999";
    input.step = "1";
    input.inputMode = "numeric";
    input.value = String(getStock(id, inventory));
    input.setAttribute("aria-label", `Quantité possédée : ${getItemName(id)}`);
    input.addEventListener("change", () => {
      inventory[id] = Math.max(0, Math.floor(Number(input.value) || 0));
      saveInventory();
      renderInventory();
      renderPlan();
    });
    row.append(info, input);
    elements.materials.append(row);
  }
}

function renderPlan() {
  if (!selectedItem) return;
  currentPlan = calculatePlan();
  const resourceIds = Object.keys(currentPlan.totals).filter(id => !itemById.has(id));
  const missing = resourceIds.reduce((total, id) =>
    total + Math.max(0, currentPlan.totals[id] - (currentPlan.used[id] || 0)), 0
  );
  elements.results.hidden = false;
  elements.title.textContent = selectedItem.name;
  elements.badge.textContent = `${formatNumber(currentPlan.requested)} demandé${currentPlan.requested > 1 ? "s" : ""}`;
  elements.summaryMaterials.textContent = formatNumber(resourceIds.length);
  elements.summaryOwned.textContent = formatNumber(sumValues(currentPlan.used));
  elements.summaryMissing.textContent = formatNumber(missing);
  renderInventory();
  renderMaterials(currentPlan);
  elements.tree.replaceChildren(renderTreeNode(currentPlan.tree, true));
  elements.treeExpand.dataset.expanded = "false";
  elements.treeExpand.textContent = "Tout déplier";
}

function readNbt(input) {
  let offset = 0;
  const view = new DataView(input);
  const decoder = new TextDecoder();
  const readString = () => {
    const length = view.getUint16(offset);
    offset += 2;
    const value = decoder.decode(new Uint8Array(input, offset, length));
    offset += length;
    return value;
  };
  const readPayload = type => {
    switch (type) {
      case 1: { const value = view.getInt8(offset); offset += 1; return value; }
      case 2: { const value = view.getInt16(offset); offset += 2; return value; }
      case 3: { const value = view.getInt32(offset); offset += 4; return value; }
      case 4: { const value = Number(view.getBigInt64(offset)); offset += 8; return value; }
      case 5: { const value = view.getFloat32(offset); offset += 4; return value; }
      case 6: { const value = view.getFloat64(offset); offset += 8; return value; }
      case 7: { const length = view.getInt32(offset); offset += 4; const value = new Uint8Array(input, offset, length); offset += length; return value; }
      case 8: return readString();
      case 9: {
        const childType = view.getUint8(offset++);
        const length = view.getInt32(offset);
        offset += 4;
        return Array.from({ length }, () => readPayload(childType));
      }
      case 10: {
        const compound = {};
        while (true) {
          const childType = view.getUint8(offset++);
          if (childType === 0) return compound;
          compound[readString()] = readPayload(childType);
        }
      }
      case 11: {
        const length = view.getInt32(offset);
        offset += 4;
        const values = Array.from({ length }, () => view.getInt32(offset));
        offset += length * 4;
        return values;
      }
      case 12: {
        const length = view.getInt32(offset);
        offset += 4;
        const values = Array.from({ length }, () => Number(view.getBigInt64(offset)));
        offset += length * 8;
        return values;
      }
      default: throw new Error(`Type NBT inconnu : ${type}`);
    }
  };
  const rootType = view.getUint8(offset++);
  if (rootType !== 10) throw new Error("Le contenu de l’inventaire n’est pas un tag NBT.");
  readString();
  return readPayload(rootType);
}

async function decodeInventoryData(encoded) {
  const binary = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
  const format = binary[0] === 0x1f && binary[1] === 0x8b ? "gzip" : "deflate";
  if (typeof DecompressionStream === "undefined") throw new Error("La décompression NBT n’est pas prise en charge par ce navigateur.");
  const stream = new Blob([binary]).stream().pipeThrough(new DecompressionStream(format));
  return readNbt(await new Response(stream).arrayBuffer());
}

function normalizeNbtId(value) {
  if (typeof value !== "string" || !value) return null;
  return value.replace(/^minecraft:/i, "").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toUpperCase();
}

function accumulateNbtItems(value, result) {
  if (!value || typeof value !== "object") return;
  if (!Array.isArray(value)) {
    const internalId = value.tag?.ExtraAttributes?.id || value.ExtraAttributes?.id;
    const vanillaId = value.id;
    const id = normalizeNbtId(internalId || vanillaId);
    const quantity = Number(value.Count ?? value.count ?? 0);
    if (id && quantity > 0) result[id] = (result[id] || 0) + quantity;
    for (const child of Object.values(value)) accumulateNbtItems(child, result);
  } else {
    value.forEach(child => accumulateNbtItems(child, result));
  }
}

async function importProfile(profile, uuid) {
  const normalizedUuid = uuid.replaceAll("-", "").toLowerCase();
  const memberEntry = Object.entries(profile.members || {}).find(([key]) =>
    key.replaceAll("-", "").toLowerCase() === normalizedUuid
  );
  const member = memberEntry?.[1];
  if (!member) throw new Error("Ce profil ne contient pas ce joueur.");
  const imported = {};
  let decodedContainers = 0;

  async function walk(value, field = "") {
    if (!value || typeof value !== "object") return;
    if (NBT_INVENTORY_FIELDS.has(field)) {
      if (typeof value.data === "string" && value.data) {
        accumulateNbtItems(await decodeInventoryData(value.data), imported);
        decodedContainers += 1;
        return;
      }
      for (const [key, child] of Object.entries(value)) await walk(child, key);
      return;
    }
    if (Array.isArray(value)) {
      for (const child of value) await walk(child, field);
    } else {
      for (const [key, child] of Object.entries(value)) {
        if (NBT_INVENTORY_FIELDS.has(key)) await walk(child, key);
      }
    }
  }

  await walk(member);
  if (!decodedContainers) throw new Error("Aucun inventaire lisible dans ce profil. Vérifie les permissions d’API et le profil choisi.");
  const totalItems = Object.values(imported).reduce((sum, amount) => sum + amount, 0);
  if (!totalItems) throw new Error("L’inventaire a été lu, mais aucun objet n’a pu être reconnu.");
  inventory = { ...inventory, ...imported };
  saveInventory();
  renderPlan();
  return { decodedContainers, totalItems, itemTypes: Object.keys(imported).length };
}

async function fetchProfiles(apiKey, uuid) {
  const url = new URL("https://api.hypixel.net/v2/skyblock/profiles");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("uuid", uuid.replaceAll("-", ""));
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok || !body.success) {
    const reason = body.cause || `Erreur HTTP ${response.status}`;
    throw new Error(reason);
  }
  const normalizedUuid = uuid.replaceAll("-", "").toLowerCase();
  const profiles = (body.profiles || []).filter(profile =>
    Object.keys(profile.members || {}).some(key => key.replaceAll("-", "").toLowerCase() === normalizedUuid)
  );
  if (!profiles.length) throw new Error("Aucun profil SkyBlock trouvé pour cet UUID.");
  return profiles;
}

async function initialize() {
  elements.visualPack.value = visualPack;
  try {
    const response = await fetch("./recipes.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    items = data.items || [];
    itemById = new Map(items.map(item => [item.id, item]));
    visualsById = new Map(Object.entries(data.visuals || {}));
    const ingredientIds = new Set(items.flatMap(item =>
      item.recipes.flatMap(recipe => recipe.ingredients.map(ingredient => ingredient.id))
    ));
    baseResourceIds = new Set([...ingredientIds].filter(id => !itemById.has(id)));
    const options = document.createDocumentFragment();
    for (const id of [...baseResourceIds].sort((first, second) =>
      getItemName(first).localeCompare(getItemName(second), "fr")
    )) {
      const visual = visualsById.get(id);
      const option = document.createElement("option");
      option.value = visual?.name || getItemName(id);
      option.label = id;
      options.append(option);
    }
    elements.inventoryOptions.append(options);
    renderInventory();
    elements.status.textContent = `${formatNumber(data.recipesTotal)} recettes · ${formatNumber(items.length)} objets`;
  } catch (error) {
    elements.status.textContent = "Recettes indisponibles";
    elements.plannerMessage.textContent = "Impossible de charger les recettes. Ouvre l’application via un serveur local ou vérifie recipes.json.";
    console.error("Chargement de la base de recettes impossible.", error);
  }
}

elements.visualPack.addEventListener("change", () => {
  visualPack = elements.visualPack.value === "hypixel" ? "hypixel" : "fursky";
  try {
    localStorage.setItem(VISUAL_PACK_KEY, visualPack);
  } catch (error) {
    console.error("Impossible de sauvegarder le pack visuel.", error);
  }
  renderInventory();
  if (selectedItem) renderPlan();
  updateSuggestions();
});

elements.inventoryAddForm.addEventListener("submit", event => {
  event.preventDefault();
  const item = findInventoryItem(elements.inventorySearch.value);
  if (!item) {
    elements.inventoryMessage.textContent = "Choisis un objet SkyBlock reconnu dans la liste de suggestions.";
    return;
  }
  const amount = Math.min(999999999, Math.max(1, Math.floor(Number(elements.inventoryAmount.value) || 1)));
  inventory[item.id] = getStock(item.id, inventory) + amount;
  saveInventory();
  renderInventory();
  if (selectedItem) renderPlan();
  elements.inventoryAddForm.reset();
  elements.inventoryAmount.value = "1";
  elements.inventoryMessage.textContent = `${item.name} ajouté à ton inventaire.`;
});

elements.search.addEventListener("input", () => {
  if (selectedItem && elements.search.value !== selectedItem.name) {
    selectedItem = null;
    elements.results.hidden = true;
  }
  updateSuggestions();
});
elements.search.addEventListener("focus", updateSuggestions);
elements.search.addEventListener("keydown", event => {
  if (event.key === "Escape") elements.suggestions.hidden = true;
  if (event.key === "Enter" && !elements.suggestions.hidden) {
    event.preventDefault();
    const first = elements.suggestions.querySelector("button");
    first?.click();
  }
});
document.addEventListener("click", event => {
  if (!event.target.closest(".search-field")) elements.suggestions.hidden = true;
});

elements.plannerForm.addEventListener("submit", event => {
  event.preventDefault();
  const item = findMatchingItem(elements.search.value);
  if (!item) {
    elements.plannerMessage.textContent = "Choisis un objet dans les suggestions pour lancer le calcul.";
    return;
  }
  chooseItem(item);
});

document.querySelectorAll("[data-step]").forEach(button => {
  button.addEventListener("click", () => {
    elements.quantity.value = String(Math.max(1, (Number(elements.quantity.value) || 1) + Number(button.dataset.step)));
    if (selectedItem) renderPlan();
  });
});
elements.quantity.addEventListener("change", () => selectedItem && renderPlan());
elements.recipeChoice.addEventListener("change", () => {
  if (!selectedItem) return;
  recipeChoices[selectedItem.id] = Number(elements.recipeChoice.value);
  renderPlan();
});
function setTreeZoom(value) {
  treeZoom = Math.min(1.5, Math.max(0.6, Math.round(value * 10) / 10));
  elements.tree.style.zoom = String(treeZoom);
  elements.treeZoomValue.textContent = `${Math.round(treeZoom * 100)} %`;
  elements.treeZoomOut.disabled = treeZoom <= 0.6;
  elements.treeZoomIn.disabled = treeZoom >= 1.5;
}

function expandTree(expand) {
  const branches = [...elements.tree.querySelectorAll("details.tree-branch")];
  branches.forEach((branch, index) => { branch.open = expand || index === 0; });
  elements.treeExpand.dataset.expanded = String(expand);
  elements.treeExpand.textContent = expand ? "Tout replier" : "Tout déplier";
}

function fitTreeToWidth() {
  setTreeZoom(1);
  const availableWidth = elements.treeViewport.clientWidth - 48;
  const contentWidth = elements.tree.scrollWidth;
  if (availableWidth > 0 && contentWidth > 0) {
    setTreeZoom(Math.min(1, availableWidth / contentWidth));
  }
}

elements.treeZoomOut.addEventListener("click", () => setTreeZoom(treeZoom - 0.1));
elements.treeZoomIn.addEventListener("click", () => setTreeZoom(treeZoom + 0.1));
elements.treeZoomReset.addEventListener("click", fitTreeToWidth);
elements.treeExpand.addEventListener("click", () =>
  expandTree(elements.treeExpand.dataset.expanded !== "true")
);
elements.treeFullscreen.addEventListener("click", async () => {
  elements.treeMessage.textContent = "";
  try {
    if (document.fullscreenElement === elements.treePanel) {
      await document.exitFullscreen();
      updateTreeFullscreenControl();
    } else if (elements.treePanel.requestFullscreen) {
      expandTree(true);
      await elements.treePanel.requestFullscreen();
      updateTreeFullscreenControl();
      window.setTimeout(fitTreeToWidth, 100);
    } else {
      elements.treeMessage.textContent = "Le plein écran n’est pas pris en charge par ce navigateur.";
    }
  } catch (error) {
    elements.treeMessage.textContent = "Impossible d’ouvrir l’arbre en plein écran. Vérifie les permissions du navigateur.";
    console.error("Passage de l’arbre en plein écran impossible.", error);
  }
});
function updateTreeFullscreenControl() {
  const isFullscreen = document.fullscreenElement === elements.treePanel;
  elements.treeFullscreen.setAttribute("aria-pressed", String(isFullscreen));
  elements.treeFullscreen.innerHTML = isFullscreen
    ? 'Quitter le plein écran <span aria-hidden="true">⤡</span>'
    : 'Plein écran <span aria-hidden="true">⤢</span>';
  if (isFullscreen) elements.treeViewport.focus();
}
document.addEventListener("fullscreenchange", updateTreeFullscreenControl);
elements.clearInventory.addEventListener("click", () => {
  inventory = {};
  saveInventory();
  renderPlan();
});

elements.apiForm.addEventListener("submit", async event => {
  event.preventDefault();
  elements.apiMessage.textContent = "";
  elements.profilePickerWrap.hidden = true;
  elements.importProfile.hidden = true;
  elements.loadProfiles.disabled = true;
  try {
    const uuid = elements.uuid.value.trim();
    if (!/^[\da-f]{32}$|^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(uuid)) {
      throw new Error("Saisis un UUID Minecraft valide.");
    }
    loadedProfiles = await fetchProfiles(elements.apiKey.value.trim(), uuid);
    elements.profilePicker.replaceChildren();
    for (const profile of loadedProfiles) {
      const option = document.createElement("option");
      option.value = profile.profile_id;
      option.textContent = `${profile.cute_name || "Profil"}${profile.selected ? " · sélectionné" : ""}`;
      elements.profilePicker.append(option);
    }
    const selected = loadedProfiles.find(profile => profile.selected);
    if (selected) elements.profilePicker.value = selected.profile_id;
    elements.profilePickerWrap.hidden = false;
    elements.importProfile.hidden = false;
    elements.apiMessage.textContent = "Profil(s) chargé(s). Sélectionne le profil à importer.";
  } catch (error) {
    elements.apiMessage.textContent = `Import impossible : ${error.message}`;
  } finally {
    elements.loadProfiles.disabled = false;
  }
});

elements.importProfile.addEventListener("click", async () => {
  const profile = loadedProfiles.find(item => item.profile_id === elements.profilePicker.value);
  if (!profile) return;
  elements.importProfile.disabled = true;
  elements.apiMessage.textContent = "Lecture des inventaires du profil…";
  try {
    const result = await importProfile(profile, elements.uuid.value.trim().toLowerCase());
    elements.apiMessage.textContent = `${formatNumber(result.itemTypes)} types d’objets importés depuis ${formatNumber(result.decodedContainers)} inventaire(s).`;
  } catch (error) {
    elements.apiMessage.textContent = `Import impossible : ${error.message}`;
  } finally {
    elements.importProfile.disabled = false;
  }
});

initialize();
