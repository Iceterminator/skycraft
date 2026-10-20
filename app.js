const STORAGE_KEY = "skycraft.inventory.v1";
const VISUAL_PACK_KEY = "skycraft.visual-pack.v1";
const COMPLETED_CRAFTS_KEY = "skycraft.completed-crafts.v1";
const FORGE_SLOTS_KEY = "skycraft.forge-slots.v1";
const RESOURCE_RANK_KEY = "skycraft.resource-rank.v1";
const MANUAL_MARKET_PRICES_KEY = "skycraft.manual-market-prices.v1";
const MARKET_PRICE_MODE_KEY = "skycraft.market-price-mode.v1";
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
  summaryForge: document.querySelector("#summary-forge"),
  summaryForgeLabel: document.querySelector("#summary-forge-label"),
  forgeSlots: document.querySelector("#forge-slots"),
  inventoryCount: document.querySelector("#inventory-count"),
  materials: document.querySelector("#materials-list"),
  resourceRank: document.querySelector("#resource-rank"),
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
  loadProfiles: document.querySelector("#load-profiles"),
  modeTabs: [...document.querySelectorAll(".mode-tab")],
  calculatorMode: document.querySelector("#calculator-mode"),
  marketMode: document.querySelector("#market-mode"),
  marketForm: document.querySelector("#market-form"),
  marketSearch: document.querySelector("#market-item-search"),
  marketOptions: document.querySelector("#market-item-options"),
  marketQuantity: document.querySelector("#market-quantity"),
  marketPriceMode: document.querySelector("#market-price-mode"),
  marketKeyField: document.querySelector("#market-key-field"),
  marketApiKey: document.querySelector("#market-api-key"),
  marketModeNote: document.querySelector("#market-mode-note"),
  marketManualPrices: document.querySelector("#market-manual-prices"),
  marketManualPriceList: document.querySelector("#market-manual-price-list"),
  marketSubmit: document.querySelector("#market-submit"),
  marketMessage: document.querySelector("#market-message"),
  marketResults: document.querySelector("#market-results"),
  marketResultNote: document.querySelector(".market-result-note"),
  marketTitle: document.querySelector("#market-result-title"),
  marketBadge: document.querySelector("#market-result-badge"),
  marketSummary: document.querySelector("#market-summary"),
  marketPlan: document.querySelector("#market-plan")
};

let items = [];
let itemById = new Map();
let visualsById = new Map();
let forgeTimesById = new Map();
let baseResourceIds = new Set();
let inventory = readInventory();
let visualPack = readVisualPack();
let completedCrafts = readCompletedCrafts();
let forgeSlots = readForgeSlots();
let resourceRank = readResourceRank();
let rankById = new Map();
let treeCardsByKey = new Map();
let selectedItem = null;
let currentPlan = null;
let loadedProfiles = [];
let treeZoom = 1;
let marketItems = [];
let marketItemById = new Map();
let marketCache = null;
let manualMarketPrices = readManualMarketPrices();
let marketRequestId = 0;
const recipeChoices = {};

function readVisualPack() {
  try {
    return localStorage.getItem(VISUAL_PACK_KEY) === "hypixel" ? "hypixel" : "fursky";
  } catch (error) {
    console.warn("Impossible de lire le pack visuel sauvegardé.", error);
    return "fursky";
  }
}

function readManualMarketPrices() {
  try {
    const saved = JSON.parse(localStorage.getItem(MANUAL_MARKET_PRICES_KEY) || "{}");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter(([, price]) =>
      Number.isFinite(price) && price > 0
    ));
  } catch (error) {
    console.warn("Impossible de lire les prix AH manuels sauvegardés.", error);
    return {};
  }
}

function readMarketPriceMode() {
  try {
    return localStorage.getItem(MARKET_PRICE_MODE_KEY) === "manual" ? "manual" : "api";
  } catch (error) {
    console.warn("Impossible de lire le mode de prix sauvegardé.", error);
    return "api";
  }
}

function saveManualMarketPrices() {
  try {
    localStorage.setItem(MANUAL_MARKET_PRICES_KEY, JSON.stringify(manualMarketPrices));
  } catch (error) {
    console.error("Impossible de sauvegarder les prix AH manuels.", error);
    elements.marketMessage.textContent = "Impossible de sauvegarder les prix AH sur cet appareil.";
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

function readCompletedCrafts() {
  try {
    const saved = JSON.parse(localStorage.getItem(COMPLETED_CRAFTS_KEY) || "{}");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter(([, completed]) => completed === true));
  } catch (error) {
    console.warn("Impossible de lire les objets terminés sauvegardés.", error);
    return {};
  }
}

function readForgeSlots() {
  try {
    const saved = Number(localStorage.getItem(FORGE_SLOTS_KEY));
    return Number.isInteger(saved) ? Math.max(1, Math.min(5, saved)) : 1;
  } catch (error) {
    console.warn("Impossible de lire le nombre de slots de forge sauvegardé.", error);
    return 1;
  }
}

function readResourceRank() {
  try {
    const saved = Number(localStorage.getItem(RESOURCE_RANK_KEY));
    return Number.isInteger(saved) && saved >= 0 ? saved : 0;
  } catch (error) {
    console.warn("Impossible de lire le rang de ressources sauvegardé.", error);
    return 0;
  }
}

function saveResourceRank() {
  try {
    localStorage.setItem(RESOURCE_RANK_KEY, String(resourceRank));
  } catch (error) {
    console.error("Impossible de sauvegarder le rang de ressources.", error);
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

function saveCompletedCrafts() {
  try {
    localStorage.setItem(COMPLETED_CRAFTS_KEY, JSON.stringify(completedCrafts));
  } catch (error) {
    elements.plannerMessage.textContent = "Le navigateur n’a pas pu sauvegarder les objets terminés localement.";
    console.error("Impossible de sauvegarder les objets terminés.", error);
  }
}

function saveForgeSlots() {
  try {
    localStorage.setItem(FORGE_SLOTS_KEY, String(forgeSlots));
  } catch (error) {
    elements.plannerMessage.textContent = "Le navigateur n’a pas pu sauvegarder les slots de forge localement.";
    console.error("Impossible de sauvegarder les slots de forge.", error);
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatDuration(seconds) {
  let remaining = Math.max(0, Math.floor(seconds));
  const units = [[86400, "j"], [3600, "h"], [60, "min"], [1, "s"]];
  const parts = [];
  for (const [size, label] of units) {
    const amount = Math.floor(remaining / size);
    if (amount) {
      parts.push(`${formatNumber(amount)} ${label}`);
      remaining %= size;
    }
  }
  return parts.length ? parts.join(" ") : "0 s";
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
  rankById.clear();
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

function getItemRank(id, path = new Set()) {
  const item = itemById.get(id);
  if (!item || path.has(id)) return 0;
  if (rankById.has(id)) return rankById.get(id);

  const recipeIndex = Math.min(Number(recipeChoices[id]) || 0, item.recipes.length - 1);
  const recipe = item.recipes[recipeIndex];
  if (!recipe) return 0;
  path.add(id);
  const ingredientRank = recipe.ingredients.reduce(
    (highest, ingredient) => Math.max(highest, getItemRank(ingredient.id, path)),
    0
  );
  path.delete(id);
  const rank = ingredientRank + 1;
  rankById.set(id, rank);
  return rank;
}

function collectMaterialsAtRank(node, maxRank, materials = {}) {
  for (const child of node.children) {
    if (!itemById.has(child.id) || getItemRank(child.id) <= maxRank || !child.children.length) {
      materials[child.id] = (materials[child.id] || 0) + child.required;
    } else {
      collectMaterialsAtRank(child, maxRank, materials);
    }
  }
  return materials;
}

function addStockAtRank(id, amount, pool, maxRank, path = new Set()) {
  if (amount <= 0) return;
  const item = itemById.get(id);
  const rank = getItemRank(id);
  if (!item || rank <= maxRank || path.has(id)) {
    pool[id] = (pool[id] || 0) + amount;
    return;
  }

  const recipeIndex = Math.min(Number(recipeChoices[id]) || 0, item.recipes.length - 1);
  const recipe = item.recipes[recipeIndex];
  if (!recipe || recipe.output <= 0) {
    pool[id] = (pool[id] || 0) + amount;
    return;
  }
  const batches = Math.floor(amount / recipe.output);
  const leftover = amount - batches * recipe.output;
  if (leftover) pool[id] = (pool[id] || 0) + leftover;
  if (!batches) return;

  path.add(id);
  for (const ingredient of recipe.ingredients) {
    addStockAtRank(ingredient.id, ingredient.quantity * batches, pool, maxRank, path);
  }
  path.delete(id);
}

function normalizeInventoryToRank(maxRank) {
  const pool = {};
  for (const [id, rawAmount] of Object.entries(inventory)) {
    const amount = getStock(id, inventory);
    if (amount > 0) addStockAtRank(id, amount, pool, maxRank);
  }
  return pool;
}

function recipeIngredientCosts(recipe) {
  const costs = new Map();
  for (const ingredient of recipe.ingredients) {
    costs.set(ingredient.id, (costs.get(ingredient.id) || 0) + ingredient.quantity);
  }
  return costs;
}

function availableStockAs(id, pool, maxRank, path = new Set()) {
  const direct = getStock(id, pool);
  const item = itemById.get(id);
  if (!item || getItemRank(id) > maxRank || path.has(id)) return direct;

  const recipeIndex = Math.min(Number(recipeChoices[id]) || 0, item.recipes.length - 1);
  const recipe = item.recipes[recipeIndex];
  if (!recipe || recipe.output <= 0) return direct;
  path.add(id);
  const batches = [...recipeIngredientCosts(recipe)].reduce((available, [ingredientId, quantity]) =>
    Math.min(available, Math.floor(availableStockAs(ingredientId, pool, maxRank, path) / quantity)),
  Number.MAX_SAFE_INTEGER);
  path.delete(id);
  return direct + (batches === Number.MAX_SAFE_INTEGER ? 0 : batches * recipe.output);
}

function consumeStockAs(id, amount, pool, maxRank, path = new Set()) {
  const direct = Math.min(amount, getStock(id, pool));
  pool[id] = getStock(id, pool) - direct;
  const remaining = amount - direct;
  if (!remaining || path.has(id)) return direct;

  const item = itemById.get(id);
  if (!item || getItemRank(id) > maxRank) return direct;
  const recipeIndex = Math.min(Number(recipeChoices[id]) || 0, item.recipes.length - 1);
  const recipe = item.recipes[recipeIndex];
  if (!recipe || recipe.output <= 0) return direct;

  path.add(id);
  const costs = recipeIngredientCosts(recipe);
  const maxBatches = [...costs].reduce((available, [ingredientId, quantity]) =>
    Math.min(available, Math.floor(availableStockAs(ingredientId, pool, maxRank, path) / quantity)),
  Number.MAX_SAFE_INTEGER);
  const batches = Math.min(
    Math.ceil(remaining / recipe.output),
    maxBatches === Number.MAX_SAFE_INTEGER ? 0 : maxBatches
  );
  if (!batches) {
    path.delete(id);
    return direct;
  }

  for (const [ingredientId, quantity] of costs) {
    consumeStockAs(ingredientId, quantity * batches, pool, maxRank, path);
  }
  path.delete(id);
  const produced = batches * recipe.output;
  const credited = Math.min(remaining, produced);
  pool[id] = getStock(id, pool) + produced - credited;
  return direct + credited;
}

function calculateRankMaterials(plan) {
  const required = collectMaterialsAtRank(plan.demandTree, resourceRank);
  const pool = normalizeInventoryToRank(resourceRank);
  const used = {};
  const materialIds = Object.keys(required).sort((first, second) =>
    getItemRank(second) - getItemRank(first) || first.localeCompare(second)
  );
  for (const id of materialIds) {
    used[id] = consumeStockAs(id, required[id], pool, resourceRank);
  }
  return { required, used };
}

function calculatePlan() {
  if (!selectedItem) return null;
  const requested = Math.max(1, Math.min(999999, Math.floor(Number(elements.quantity.value) || 1)));
  elements.quantity.value = String(requested);
  const pool = { ...inventory };
  const totals = {};
  const used = {};
  const tree = makePlan(selectedItem.id, requested, pool, totals, used);
  const demandTree = makePlan(selectedItem.id, requested, {}, {}, {});
  return { tree, demandTree, totals, used, requested, totalForgeSeconds: calculateForgeSeconds(tree, forgeSlots) };
}

function calculateForgeSeconds(root, slots) {
  const groups = [];
  let nextGroupId = 0;

  function addNodeJobs(node) {
    const childGroupIds = node.children.flatMap(addNodeJobs);
    const duration = forgeTimesById.get(node.id) || 0;
    if (!duration || !node.craftCount) return childGroupIds;
    const id = nextGroupId++;
    groups.push({ id, count: node.craftCount, duration, dependencies: childGroupIds });
    return [...childGroupIds, id];
  }

  addNodeJobs(root);
  if (!groups.length) return 0;

  const completed = new Set();
  const pending = new Set(groups.map(group => group.id));
  const remaining = new Map(groups.map(group => [group.id, group.count]));
  const running = new Map(groups.map(group => [group.id, 0]));
  const active = [];
  let elapsed = 0;
  while (pending.size || active.length) {
    for (let index = active.length - 1; index >= 0; index -= 1) {
      if (active[index].finishTime <= elapsed) {
        const [job] = active.splice(index, 1);
        running.set(job.groupId, running.get(job.groupId) - 1);
        if (remaining.get(job.groupId) === 0 && running.get(job.groupId) === 0) {
          pending.delete(job.groupId);
          completed.add(job.groupId);
        }
      }
    }
    const ready = groups
      .filter(group => pending.has(group.id) && remaining.get(group.id) > 0 && group.dependencies.every(id => completed.has(id)))
      .sort((first, second) => second.duration - first.duration || first.id - second.id);
    while (active.length < slots && ready.length) {
      const group = ready[0];
      remaining.set(group.id, remaining.get(group.id) - 1);
      running.set(group.id, running.get(group.id) + 1);
      active.push({ groupId: group.id, finishTime: elapsed + group.duration });
      if (remaining.get(group.id) === 0) ready.shift();
    }
    if (!active.length) break;
    elapsed = Math.min(...active.map(job => job.finishTime));
  }
  return elapsed;
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

function updateNodeCompleteState(nodeKey, isComplete) {
  const card = treeCardsByKey.get(nodeKey);
  if (!card) return;
  card.classList.toggle("is-complete", isComplete);
  const checkbox = card.querySelector(".node-complete-toggle input");
  const label = card.querySelector(".node-complete-toggle");
  if (checkbox) {
    checkbox.checked = isComplete;
    checkbox.setAttribute(
      "aria-label",
      `${isComplete ? "Retirer" : "Marquer"} ${card.dataset.itemName} ${isComplete ? "des objets terminés" : "comme terminé"}`
    );
  }
  if (label) label.title = isComplete ? "Objet marqué comme terminé" : "Marquer cet objet comme terminé";
}

function setSubtreeComplete(node, nodeKey, isComplete) {
  if (isComplete) completedCrafts[nodeKey] = true;
  else delete completedCrafts[nodeKey];
  updateNodeCompleteState(nodeKey, isComplete);
  if (isComplete) {
    node.children.forEach((child, index) =>
      setSubtreeComplete(child, `${nodeKey}/${index}:${child.id}`, true)
    );
  }
}

function updateTreeColumnCounts() {
  for (const children of elements.tree.querySelectorAll(".node-children")) {
    const remaining = [...children.querySelectorAll(":scope > .tree-node > .node-card, :scope > .tree-node > summary > .node-card")]
      .reduce((sum, card) =>
        sum + (card.classList.contains("is-complete") ? 0 : Number(card.dataset.craftCount) || 0), 0
      );
    const label = children.querySelector(":scope > .tree-column-count strong");
    if (label) label.textContent = formatNumber(remaining);
  }
}

function renderTreeNode(node, root = false, nodeKey = `root:${node.id}`) {
  const card = document.createElement("div");
  treeCardsByKey.set(nodeKey, card);
  const isComplete = completedCrafts[nodeKey] === true;
  card.className = `node-card${root ? " node-card-root" : ""}${isComplete ? " is-complete" : ""}`;
  card.dataset.state = node.cycle ? "error" : node.craftCount ? "craft" : node.remaining ? "missing" : "owned";
  card.dataset.nodeKey = nodeKey;
  card.dataset.craftCount = String(node.craftCount || 0);
  card.dataset.itemName = node.name;
  const top = document.createElement("div");
  top.className = "node-topline";
  top.append(createItemIcon(node.id, "item-icon-small"));
  const title = document.createElement("span");
  title.className = "node-title";
  title.textContent = node.name;
  const quantity = document.createElement("span");
  quantity.className = "node-quantity";
  quantity.textContent = `× ${formatNumber(node.required)}`;
  const completionLabel = document.createElement("label");
  completionLabel.className = "node-complete-toggle";
  completionLabel.title = isComplete ? "Objet marqué comme terminé" : "Marquer cet objet comme terminé";
  const completionInput = document.createElement("input");
  completionInput.type = "checkbox";
  completionInput.checked = isComplete;
  completionInput.setAttribute("aria-label", `${isComplete ? "Retirer" : "Marquer"} ${node.name} ${isComplete ? "des objets terminés" : "comme terminé"}`);
  const completionText = document.createElement("span");
  completionText.textContent = "Fait";
  completionLabel.append(completionInput, completionText);
  completionInput.addEventListener("click", event => event.stopPropagation());
  completionInput.addEventListener("change", () => {
    setSubtreeComplete(node, nodeKey, completionInput.checked);
    updateTreeColumnCounts();
    saveCompletedCrafts();
  });
  top.append(title, quantity, completionLabel);

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
  const forgeDuration = forgeTimesById.get(node.id);
  if (forgeDuration && node.craftCount > 0) {
    const forgeDetail = document.createElement("div");
    forgeDetail.className = "node-forge-time";
    forgeDetail.textContent = `Forge · ${formatDuration(forgeDuration * node.craftCount)}`;
    card.append(forgeDetail);
  }
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
    const countLabel = document.createElement("div");
    countLabel.className = "tree-column-count";
    const count = document.createElement("strong");
    count.textContent = formatNumber(node.children.reduce((sum, child, index) =>
      sum + (completedCrafts[`${nodeKey}/${index}:${child.id}`] ? 0 : child.craftCount || 0), 0
    ));
    countLabel.append(document.createTextNode("À fabriquer à ce rang : "), count);
    children.append(countLabel);
    node.children.forEach((child, index) =>
      children.append(renderTreeNode(child, false, `${nodeKey}/${index}:${child.id}`))
    );
    wrapper.append(children);
  }
  return wrapper;
}

function renderMaterials(materials) {
  const materialIds = Object.keys(materials.required)
    .sort((a, b) => getItemName(a).localeCompare(getItemName(b), "fr"));
  elements.materials.replaceChildren();
  elements.inventoryCount.textContent = `${materialIds.length} ${materialIds.length > 1 ? "objets" : "objet"}`;
  if (!materialIds.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = `Aucune ressource de rang ${resourceRank} à réunir pour ce craft.`;
    elements.materials.append(empty);
    return;
  }
  for (const id of materialIds) {
    const needed = materials.required[id];
    const owned = materials.used[id] || 0;
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
    quantity.textContent = `${formatNumber(needed)} requis · rang ${getItemRank(id)}`;
    info.append(name, quantity, createProgress(owned, needed));
    const input = document.createElement("input");
    input.className = "material-stock";
    input.type = "number";
    input.min = "0";
    input.max = "999999999";
    input.step = "1";
    input.inputMode = "numeric";
    input.value = String(getStock(id, inventory));
    input.setAttribute("aria-label", `Quantité possédée directement : ${getItemName(id)}`);
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

function updateResourceRankOptions(plan) {
  let maxRank = 0;
  function visit(node) {
    maxRank = Math.max(maxRank, getItemRank(node.id));
    node.children.forEach(visit);
  }
  plan.demandTree.children.forEach(visit);
  resourceRank = Math.min(resourceRank, maxRank);
  elements.resourceRank.replaceChildren();
  for (let rank = 0; rank <= maxRank; rank += 1) {
    const option = document.createElement("option");
    option.value = String(rank);
    option.textContent = `Rang ${rank}`;
    elements.resourceRank.append(option);
  }
  elements.resourceRank.value = String(resourceRank);
  saveResourceRank();
}

function renderResourceView() {
  if (!currentPlan) return;
  const materials = calculateRankMaterials(currentPlan);
  const materialIds = Object.keys(materials.required);
  const missing = materialIds.reduce((total, id) =>
    total + Math.max(0, materials.required[id] - (materials.used[id] || 0)), 0
  );
  elements.summaryMaterials.textContent = formatNumber(materialIds.length);
  elements.summaryOwned.textContent = formatNumber(sumValues(materials.used));
  elements.summaryMissing.textContent = formatNumber(missing);
  renderMaterials(materials);
}

function renderPlan() {
  if (!selectedItem) return;
  currentPlan = calculatePlan();
  rankById.clear();
  elements.results.hidden = false;
  elements.title.textContent = selectedItem.name;
  elements.badge.textContent = `${formatNumber(currentPlan.requested)} demandé${currentPlan.requested > 1 ? "s" : ""}`;
  elements.summaryForge.textContent = formatDuration(currentPlan.totalForgeSeconds);
  elements.summaryForgeLabel.textContent = `TEMPS ESTIMÉ · ${forgeSlots} SLOT${forgeSlots > 1 ? "S" : ""}`;
  updateResourceRankOptions(currentPlan);
  renderInventory();
  renderResourceView();
  treeCardsByKey = new Map();
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

function populateMarketItems() {
  marketItemById = new Map(items.map(item => [item.id, item]));
  for (const [id, visual] of visualsById) {
    if (!marketItemById.has(id)) {
      marketItemById.set(id, { ...visual, id, name: visual.name || getItemName(id), recipes: [] });
    }
  }
  marketItems = [...marketItemById.values()].sort((first, second) =>
    first.name.localeCompare(second.name, "fr")
  );
  elements.marketOptions.replaceChildren();
  const options = document.createDocumentFragment();
  for (const item of marketItems) {
    const option = document.createElement("option");
    option.value = item.name;
    option.label = item.id;
    options.append(option);
  }
  elements.marketOptions.append(options);
}

function findMatchingMarketItem(query) {
  const normalized = normalizeSearch(query);
  if (!normalized) return null;
  return marketItems.find(item => item.id.toLowerCase() === query.trim().toUpperCase())
    || marketItems.find(item => normalizeSearch(item.name) === normalized)
    || null;
}

function collectMarketItemIds(itemId, result = new Set()) {
  if (result.has(itemId)) return result;
  result.add(itemId);
  const item = itemById.get(itemId);
  for (const recipe of item?.recipes || []) {
    for (const ingredient of recipe.ingredients) collectMarketItemIds(ingredient.id, result);
  }
  return result;
}

function renderManualMarketPrices(itemId) {
  elements.marketManualPriceList.replaceChildren();
  if (!itemId) {
    elements.marketManualPrices.hidden = true;
    return;
  }

  rankById.clear();
  const wantedIds = [...collectMarketItemIds(itemId)].sort((first, second) =>
    getItemRank(first) - getItemRank(second) || getItemName(first).localeCompare(getItemName(second), "fr")
  );
  const rows = document.createDocumentFragment();
  for (const id of wantedIds) {
    const row = document.createElement("label");
    row.className = "market-manual-price-row";
    const icon = createItemIcon(id, "item-icon-tiny");
    const name = document.createElement("span");
    name.className = "market-manual-price-name";
    name.textContent = getItemName(id);
    const rank = document.createElement("span");
    rank.className = "market-manual-price-rank";
    rank.textContent = `R${getItemRank(id)}`;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "any";
    input.inputMode = "decimal";
    input.placeholder = "Prix";
    input.value = manualMarketPrices[id] ?? "";
    input.dataset.marketPriceId = id;
    input.setAttribute("aria-label", `Prix AH unitaire de ${getItemName(id)} en coins`);
    row.append(icon, name, rank, input);
    rows.append(row);
  }
  elements.marketManualPriceList.append(rows);
  elements.marketManualPrices.hidden = false;
}

function normalizeMarketName(value) {
  return normalizeSearch(value).replace(/[^a-z0-9]+/g, " ").trim();
}

async function fetchHypixelJson(path, apiKey) {
  const url = new URL(`https://api.hypixel.net/v2/skyblock/${path}`);
  url.searchParams.set("key", apiKey);
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.cause || `Erreur HTTP ${response.status}`);
  }
  return body;
}

async function fetchBazaarPrices() {
  const response = await fetch("https://api.hypixel.net/v2/skyblock/bazaar");
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.cause || `Erreur HTTP ${response.status} sur le Bazaar`);
  }
  const prices = new Map();
  for (const [id, product] of Object.entries(body.products || {})) {
    const price = Number(product.quick_status?.buyPrice);
    if (Number.isFinite(price) && price > 0) prices.set(id, price);
  }
  return prices;
}

async function fetchAuctionPage(pageNumber, apiKey) {
  return fetchHypixelJson(`auctions?page=${pageNumber}`, apiKey);
}

async function addAuctionPrices(auctions, wantedIds, namesToIds, prices) {
  for (const auction of auctions) {
    if (!auction.bin || !Number.isFinite(auction.starting_bid) || auction.starting_bid <= 0) continue;
    const nameIds = namesToIds.get(normalizeMarketName(auction.item_name));
    if (!nameIds?.size || typeof auction.item_bytes !== "string" || !auction.item_bytes) continue;
    try {
      const contents = await decodeInventoryData(auction.item_bytes);
      const itemsFound = {};
      accumulateNbtItems(contents, itemsFound);
      for (const [id, count] of Object.entries(itemsFound)) {
        if (!nameIds.has(id) || count <= 0) continue;
        const unitPrice = auction.starting_bid / count;
        if (unitPrice > 0 && (!prices.has(id) || unitPrice < prices.get(id))) prices.set(id, unitPrice);
      }
    } catch (error) {
      console.warn("Impossible de lire une annonce AH candidate.", error);
    }
  }
}

async function fetchMarketPrices(wantedIds, apiKey, progress, priceMode) {
  if (priceMode === "manual") {
    const bazaarPrices = await fetchBazaarPrices();
    const auctionPrices = new Map([...wantedIds]
      .filter(id => Number.isFinite(manualMarketPrices[id]) && manualMarketPrices[id] > 0)
      .map(id => [id, manualMarketPrices[id]]));
    progress("Prix Bazaar chargés ; utilisation des prix AH saisis…");
    return { bazaarPrices, auctionPrices, scannedIds: new Set(wantedIds), auctionSource: "AH · prix saisi" };
  }

  const cacheIsFresh = marketCache && Date.now() - marketCache.updatedAt < 60_000;
  const cacheCoversItems = cacheIsFresh && [...wantedIds].every(id => marketCache.scannedIds.has(id));
  if (cacheCoversItems) {
    progress("Prix en cache de moins d’une minute…");
    return marketCache;
  }

  const namesToIds = new Map();
  for (const id of wantedIds) {
    const name = normalizeMarketName(getItemName(id));
    if (!namesToIds.has(name)) namesToIds.set(name, new Set());
    namesToIds.get(name).add(id);
  }

  const [bazaarPrices, firstPage] = await Promise.all([
    fetchBazaarPrices(),
    fetchAuctionPage(0, apiKey)
  ]);
  if (!Number.isInteger(firstPage.totalPages) || firstPage.totalPages < 1) {
    throw new Error("L’API Hypixel n’a pas fourni le nombre de pages AH attendu.");
  }

  const auctionPrices = new Map();
  await addAuctionPrices(firstPage.auctions || [], wantedIds, namesToIds, auctionPrices);
  let completedPages = 1;
  const totalPages = firstPage.totalPages;
  progress(`Analyse de l’AH : page 1/${formatNumber(totalPages)}…`);
  let nextPage = 1;
  const workerCount = Math.min(4, Math.max(0, totalPages - 1));
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextPage < totalPages) {
      const pageNumber = nextPage;
      nextPage += 1;
      const page = await fetchAuctionPage(pageNumber, apiKey);
      await addAuctionPrices(page.auctions || [], wantedIds, namesToIds, auctionPrices);
      completedPages += 1;
      progress(`Analyse de l’AH : page ${formatNumber(completedPages)}/${formatNumber(totalPages)}…`);
    }
  }));

  marketCache = {
    updatedAt: Date.now(),
    bazaarPrices,
    auctionPrices,
    scannedIds: new Set(wantedIds),
    auctionSource: "AH · meilleur BIN"
  };
  return marketCache;
}

function getDirectMarketOptions(itemId, market) {
  const options = [];
  const bazaarPrice = market.bazaarPrices.get(itemId);
  const auctionPrice = market.auctionPrices.get(itemId);
  if (Number.isFinite(bazaarPrice) && bazaarPrice > 0) options.push({ source: "Bazaar", unitPrice: bazaarPrice });
  if (Number.isFinite(auctionPrice) && auctionPrice > 0) {
    options.push({ source: market.auctionSource || "AH · meilleur BIN", unitPrice: auctionPrice });
  }
  return options.sort((first, second) => first.unitPrice - second.unitPrice);
}

function buildMarketPlan(itemId, quantity, market, path = [], counter = { count: 0 }) {
  counter.count += 1;
  if (counter.count > 2500) {
    counter.exceeded = true;
    return null;
  }
  if (path.includes(itemId)) return null;
  const item = marketItemById.get(itemId);
  if (!item) return null;
  const directOptions = getDirectMarketOptions(itemId, market);
  const bestDirect = directOptions[0];
  let best = bestDirect
    ? { mode: "buy", source: bestDirect.source, total: bestDirect.unitPrice * quantity, directOptions, children: [] }
    : null;
  const nextPath = [...path, itemId];

  for (const recipe of item.recipes || []) {
    if (!recipe.output || recipe.output <= 0) continue;
    const batches = Math.ceil(quantity / recipe.output);
    const ingredientTotals = new Map();
    for (const ingredient of recipe.ingredients) {
      ingredientTotals.set(ingredient.id, (ingredientTotals.get(ingredient.id) || 0) + ingredient.quantity * batches);
    }
    const children = [];
    let craftTotal = 0;
    let recipeAvailable = true;
    for (const [ingredientId, ingredientQuantity] of ingredientTotals) {
      const child = buildMarketPlan(ingredientId, ingredientQuantity, market, nextPath, counter);
      if (!child || !Number.isFinite(child.total)) {
        recipeAvailable = false;
        break;
      }
      craftTotal += child.total;
      children.push(child);
    }
    if (recipeAvailable && Number.isFinite(craftTotal) && (!best || craftTotal < best.total)) {
      best = {
        mode: "craft",
        total: craftTotal,
        recipeName: recipe.name,
        batches,
        output: batches * recipe.output,
        directOptions,
        children
      };
    }
  }

  if (best?.mode === "craft") {
    best.rank = 1 + Math.max(0, ...best.children.map(child => child.rank));
  }
  return best
    ? { id: itemId, name: item.name || getItemName(itemId), quantity, rank: best.rank ?? getItemRank(itemId), ...best }
    : { id: itemId, name: item.name || getItemName(itemId), quantity, rank: getItemRank(itemId), mode: "unavailable", total: null, directOptions, children: [] };
}

function formatCoins(value) {
  if (!Number.isFinite(value)) return "Indisponible";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} coins`;
}

function createMarketSummaryCard(label, value, detail, highlighted = false) {
  const card = document.createElement("article");
  card.className = `market-summary-card${highlighted ? " is-highlighted" : ""}`;
  const title = document.createElement("span");
  title.className = "summary-label";
  title.textContent = label;
  const amount = document.createElement("strong");
  amount.textContent = value;
  const note = document.createElement("span");
  note.className = "summary-note";
  note.textContent = detail;
  card.append(title, amount, note);
  return card;
}

function renderMarketNode(node, depth = 0) {
  const card = document.createElement("article");
  card.className = `market-node${depth === 0 ? " market-node-root" : ""}`;
  card.style.setProperty("--market-depth", String(Math.min(depth, 12)));
  const header = document.createElement("div");
  header.className = "market-node-heading";
  const icon = createItemIcon(node.id, "item-icon-tiny");
  const name = document.createElement("strong");
  name.textContent = node.name;
  const quantity = document.createElement("span");
  quantity.className = "market-node-quantity";
  quantity.textContent = `× ${formatNumber(node.quantity)} · rang ${node.rank}`;
  header.append(icon, name, quantity);

  const detail = document.createElement("p");
  detail.className = `market-node-detail ${node.mode}`;
  if (node.mode === "buy") {
    detail.textContent = `${node.source} · ${formatCoins(node.total)} (${formatCoins(node.total / node.quantity)} / unité)`;
  } else if (node.mode === "craft") {
    detail.textContent = `Fabriquer · ${node.recipeName} · ${formatNumber(node.batches)} craft${node.batches > 1 ? "s" : ""} · ${formatCoins(node.total)}`;
  } else {
    detail.textContent = "Prix indisponible : aucun achat ni chemin de fabrication coté par l’API.";
  }
  card.append(header, detail);
  if (node.children.length) {
    const children = document.createElement("div");
    children.className = "market-node-children";
    for (const child of node.children) children.append(renderMarketNode(child, depth + 1));
    card.append(children);
  }
  return card;
}

function renderMarketResults(item, quantity, plan, market) {
  elements.marketTitle.textContent = item.name;
  elements.marketBadge.textContent = `${formatNumber(quantity)} demandé${quantity > 1 ? "s" : ""}`;
  const directAh = market.auctionPrices.get(item.id);
  const directBazaar = market.bazaarPrices.get(item.id);
  elements.marketSummary.replaceChildren(
    createMarketSummaryCard(
      `ACHAT DIRECT · ${market.auctionSource || "AH"}`,
      Number.isFinite(directAh) ? formatCoins(directAh * quantity) : market.auctionSource === "AH · prix saisi" ? "Prix non saisi" : "Aucun BIN coté",
      Number.isFinite(directAh) ? `${formatCoins(directAh)} / unité` : market.auctionSource === "AH · prix saisi" ? "Prix non saisi pour cet objet" : "Annonce BIN introuvable"
    ),
    createMarketSummaryCard(
      "ACHAT DIRECT · BAZAAR",
      Number.isFinite(directBazaar) ? formatCoins(directBazaar * quantity) : "Non échangé",
      Number.isFinite(directBazaar) ? `${formatCoins(directBazaar)} / unité` : "Objet non coté au Bazaar"
    ),
    createMarketSummaryCard(
      "STRATÉGIE LA MOINS CHÈRE",
      Number.isFinite(plan.total) ? formatCoins(plan.total) : "Prix indisponible",
      plan.mode === "craft" ? "Fabrication optimisée par composant" : plan.mode === "buy" ? `Achat direct · ${plan.source}` : "Aucun chemin de coût complet",
      true
    )
  );
  elements.marketResultNote.textContent = market.auctionSource === "AH · prix saisi"
    ? "Prix AH saisis manuellement et prix d’achat immédiat au Bazaar. Les prix vides ne sont pas considérés comme des offres ; taxes et frais éventuels non inclus."
    : "Prix d’achat immédiat au Bazaar et meilleur BIN détecté dans les annonces actives au moment de la recherche, hors taxes et frais éventuels. Les recettes sont évaluées en choisissant le coût estimé le plus bas pour chaque rang.";
  elements.marketPlan.replaceChildren(renderMarketNode(plan));
  elements.marketResults.hidden = false;
}

async function compareMarketPrices() {
  const item = findMatchingMarketItem(elements.marketSearch.value);
  if (!item) {
    elements.marketMessage.textContent = "Choisis un objet reconnu dans la liste des suggestions.";
    return;
  }
  const priceMode = elements.marketPriceMode.value;
  const apiKey = elements.marketApiKey.value.trim() || elements.apiKey.value.trim();
  if (priceMode === "api" && !apiKey) {
    elements.marketMessage.textContent = "Saisis ta clé API Hypixel pour consulter l’AH.";
    return;
  }
  const quantity = Math.min(999999, Math.max(1, Math.floor(Number(elements.marketQuantity.value) || 1)));
  elements.marketQuantity.value = String(quantity);
  const requestId = ++marketRequestId;
  elements.marketSubmit.disabled = true;
  elements.marketResults.hidden = true;
  elements.marketMessage.textContent = "Chargement des prix Bazaar et AH…";
  try {
    const wantedIds = collectMarketItemIds(item.id);
    const market = await fetchMarketPrices(wantedIds, apiKey, message => {
      if (requestId === marketRequestId) elements.marketMessage.textContent = message;
    }, priceMode);
    if (requestId !== marketRequestId) return;
    const counter = { count: 0, exceeded: false };
    rankById.clear();
    const plan = buildMarketPlan(item.id, quantity, market, [], counter);
    if (counter.exceeded) throw new Error("Le calcul du chemin de fabrication a dépassé la limite de sécurité.");
    if (!plan) throw new Error("Le calcul du chemin de fabrication a dépassé la limite de sécurité.");
    renderMarketResults(item, quantity, plan, market);
    elements.marketMessage.textContent = priceMode === "manual"
      ? "Comparaison terminée avec tes prix AH saisis et les prix Bazaar actuels."
      : "Comparaison terminée. Les prix affichés correspondent aux dernières données obtenues.";
  } catch (error) {
    if (requestId === marketRequestId) {
      elements.marketMessage.textContent = `Comparaison impossible : ${error.message}`;
      console.error("Comparaison des prix AH et Bazaar impossible.", error);
    }
  } finally {
    if (requestId === marketRequestId) elements.marketSubmit.disabled = false;
  }
}

async function initialize() {
  elements.visualPack.value = visualPack;
  elements.forgeSlots.value = String(forgeSlots);
  elements.marketPriceMode.value = readMarketPriceMode();
  try {
    const response = await fetch("./recipes.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    items = data.items || [];
    itemById = new Map(items.map(item => [item.id, item]));
    visualsById = new Map(Object.entries(data.visuals || {}));
    populateMarketItems();
    updateMarketPriceMode();
    let forgeDataAvailable = false;
    try {
      const forgeResponse = await fetch("./forge-times.json");
      if (!forgeResponse.ok) throw new Error(`HTTP ${forgeResponse.status}`);
      const forgeData = await forgeResponse.json();
      const durations = forgeData.durations;
      if (!durations || typeof durations !== "object" || Array.isArray(durations)) {
        throw new Error("Format forge-times.json invalide.");
      }
      forgeTimesById = new Map(Object.entries(durations).filter(([, duration]) =>
        Number.isFinite(duration) && duration > 0
      ));
      forgeDataAvailable = true;
    } catch (error) {
      console.error("Chargement des durées de forge impossible.", error);
    }
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
    elements.status.textContent = `${formatNumber(data.recipesTotal)} recettes · ${formatNumber(items.length)} objets${forgeDataAvailable ? ` · ${forgeTimesById.size} durées forge` : " · durées forge indisponibles"}`;
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
  rankById.clear();
  renderPlan();
});
elements.resourceRank.addEventListener("change", () => {
  resourceRank = Math.max(0, Math.floor(Number(elements.resourceRank.value) || 0));
  saveResourceRank();
  renderResourceView();
});
elements.forgeSlots.addEventListener("change", () => {
  forgeSlots = Math.max(1, Math.min(5, Math.floor(Number(elements.forgeSlots.value) || 1)));
  elements.forgeSlots.value = String(forgeSlots);
  saveForgeSlots();
  if (currentPlan) {
    currentPlan.totalForgeSeconds = calculateForgeSeconds(currentPlan.tree, forgeSlots);
    elements.summaryForge.textContent = formatDuration(currentPlan.totalForgeSeconds);
    elements.summaryForgeLabel.textContent = `TEMPS ESTIMÉ · ${forgeSlots} SLOT${forgeSlots > 1 ? "S" : ""}`;
  }
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

function selectMode(mode) {
  const marketIsActive = mode === "market";
  elements.calculatorMode.hidden = marketIsActive;
  elements.marketMode.hidden = !marketIsActive;
  for (const tab of elements.modeTabs) {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  }
}

for (const tab of elements.modeTabs) {
  tab.addEventListener("click", () => selectMode(tab.dataset.mode));
  tab.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = elements.modeTabs.indexOf(tab);
    const nextIndex = event.key === "Home" ? 0
      : event.key === "End" ? elements.modeTabs.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + elements.modeTabs.length) % elements.modeTabs.length;
    elements.modeTabs[nextIndex].focus();
    selectMode(elements.modeTabs[nextIndex].dataset.mode);
  });
}

elements.marketApiKey.addEventListener("input", () => {
  elements.apiKey.value = elements.marketApiKey.value;
});
elements.apiKey.addEventListener("input", () => {
  elements.marketApiKey.value = elements.apiKey.value;
});
function updateMarketPriceMode() {
  const manualMode = elements.marketPriceMode.value === "manual";
  elements.marketKeyField.hidden = manualMode;
  elements.marketApiKey.required = !manualMode;
  elements.marketManualPrices.hidden = !manualMode;
  try {
    localStorage.setItem(MARKET_PRICE_MODE_KEY, manualMode ? "manual" : "api");
  } catch (error) {
    console.warn("Impossible de sauvegarder le mode de prix.", error);
  }
  elements.marketModeNote.textContent = manualMode
    ? "Aucune clé API nécessaire pour l’AH : renseigne les prix par unité ci-dessous. Le prix du Bazaar est récupéré automatiquement."
    : "La clé est utilisée uniquement dans ton navigateur et n’est pas sauvegardée. L’AH est parcouru pour trouver le BIN le moins cher ; l’API peut mettre un moment si le marché contient beaucoup d’annonces.";
  if (manualMode) renderManualMarketPrices(findMatchingMarketItem(elements.marketSearch.value)?.id);
}
elements.marketPriceMode.addEventListener("change", updateMarketPriceMode);
elements.marketSearch.addEventListener("input", () => {
  if (elements.marketPriceMode.value === "manual") {
    renderManualMarketPrices(findMatchingMarketItem(elements.marketSearch.value)?.id);
  }
});
elements.marketSearch.addEventListener("change", () => {
  if (elements.marketPriceMode.value === "manual") {
    renderManualMarketPrices(findMatchingMarketItem(elements.marketSearch.value)?.id);
  }
});
elements.marketManualPriceList.addEventListener("input", event => {
  const input = event.target.closest("input[data-market-price-id]");
  if (!input) return;
  const id = input.dataset.marketPriceId;
  const price = input.value === "" ? NaN : Number(input.value);
  if (Number.isFinite(price) && price > 0) {
    manualMarketPrices[id] = price;
  } else {
    delete manualMarketPrices[id];
  }
  saveManualMarketPrices();
});
elements.marketForm.addEventListener("submit", event => {
  event.preventDefault();
  compareMarketPrices();
});

initialize();
