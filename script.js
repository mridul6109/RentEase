
"use strict";

const $ = id => document.getElementById(id);

const STORAGE_ACCOUNTS = "rentEaseAccounts";
const STORAGE_ROOMS = "rentEaseRooms";

function loadData(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    alert("Browser storage is full. Try smaller photos or delete some old listings.");
    return false;
  }
}

let accounts = loadData(STORAGE_ACCOUNTS);
let rooms = loadData(STORAGE_ROOMS);
let currentUser = null;
let selectedRole = "buyer";
let selectedImages = [];
let selectedCategory = "All";
let detailsReturnScreen = "buyerScreen";

const screenIds = [
  "authScreen",
  "dashboardScreen",
  "buyerScreen",
  "ownerScreen",
  "detailsScreen"
];

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showScreen(screenId) {
  if (!screenIds.includes(screenId)) return;

  screenIds.forEach(id => {
    $(id).classList.toggle("hidden", id !== screenId);
  });

  updateHeader();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateHeader() {
  const loggedIn = Boolean(currentUser);

  $("headerUser").textContent = loggedIn
    ? `Hello, ${currentUser.name}`
    : "";

  $("dashboardBtn").classList.toggle(
    "hidden",
    !loggedIn || !$("dashboardScreen").classList.contains("hidden") === false
  );

  $("logoutBtn").classList.toggle("hidden", !loggedIn);
}

function showMessage(id, message, success = false) {
  const element = $(id);
  element.textContent = message;
  element.classList.toggle("success", success);
}

function switchRole(role) {
  selectedRole = role;

  $("buyerRoleBtn").classList.toggle("active", role === "buyer");
  $("ownerRoleBtn").classList.toggle("active", role === "owner");

  $("selectedRoleText").textContent =
    role === "buyer" ? "Buyer account selected" : "Owner account selected";

  $("loginForm").querySelector('button[type="submit"]').textContent =
    role === "buyer" ? "Login as Buyer" : "Login as Owner";

  $("signupForm").querySelector('button[type="submit"]').textContent =
    role === "buyer" ? "Create Buyer Account" : "Create Owner Account";

  showMessage("loginMessage", "");
  showMessage("signupMessage", "");
}

function switchAuth(mode) {
  const loginMode = mode === "login";

  $("loginForm").classList.toggle("hidden", !loginMode);
  $("signupForm").classList.toggle("hidden", loginMode);
  $("loginTab").classList.toggle("active", loginMode);
  $("signupTab").classList.toggle("active", !loginMode);

  showMessage("loginMessage", "");
  showMessage("signupMessage", "");
}

function loginUser(account) {
  currentUser = {
    name: account.name,
    phone: account.phone,
    email: account.email,
    role: account.role || "buyer"
  };

  openDashboard();
}

function openDashboard() {
  if (!currentUser) {
    showScreen("authScreen");
    return;
  }

  $("dashboardName").textContent = currentUser.name;
  $("dashboardEmail").textContent = currentUser.email;
  $("accountName").textContent = currentUser.name;
  $("accountEmail").textContent = currentUser.email;
  $("accountRole").textContent =
    currentUser.role === "owner" ? "OWNER ACCOUNT" : "BUYER ACCOUNT";

  $("buyerChoice").classList.toggle(
    "hidden",
    currentUser.role !== "buyer"
  );

  $("ownerChoice").classList.toggle(
    "hidden",
    currentUser.role !== "owner"
  );

  showScreen("dashboardScreen");
}

$("buyerRoleBtn").addEventListener("click", () => switchRole("buyer"));
$("ownerRoleBtn").addEventListener("click", () => switchRole("owner"));

$("loginTab").addEventListener("click", () => switchAuth("login"));
$("signupTab").addEventListener("click", () => switchAuth("signup"));
$("goSignup").addEventListener("click", () => switchAuth("signup"));
$("goLogin").addEventListener("click", () => switchAuth("login"));

$("loginForm").addEventListener("submit", event => {
  event.preventDefault();

  const email = $("loginEmail").value.trim().toLowerCase();
  const password = $("loginPassword").value;

  const account = accounts.find(item =>
    item.email.toLowerCase() === email &&
    item.password === password &&
    (item.role || "buyer") === selectedRole
  );

  if (!account) {
    showMessage(
      "loginMessage",
      `No ${selectedRole} account found with these details. Check your account type, email and password.`
    );
    return;
  }

  $("loginForm").reset();
  showMessage("loginMessage", "");
  loginUser(account);
});

$("signupForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("signupName").value.trim();
  const phone = $("signupPhone").value.trim();
  const email = $("signupEmail").value.trim().toLowerCase();
  const password = $("signupPassword").value;

  if (!name || !phone || !email || !password) {
    showMessage("signupMessage", "Please fill in every field.");
    return;
  }

  if (password.length < 6) {
    showMessage("signupMessage", "Password must contain at least 6 characters.");
    return;
  }

  const alreadyExists = accounts.some(item =>
    item.email.toLowerCase() === email &&
    (item.role || "buyer") === selectedRole
  );

  if (alreadyExists) {
    showMessage(
      "signupMessage",
      `This email already has a ${selectedRole} account. Please login.`
    );
    return;
  }

  const newAccount = {
    name,
    phone,
    email,
    password,
    role: selectedRole
  };

  const updatedAccounts = [...accounts, newAccount];

  if (!saveData(STORAGE_ACCOUNTS, updatedAccounts)) return;

  accounts = updatedAccounts;
  $("signupForm").reset();
  showMessage("signupMessage", "");
  loginUser(newAccount);
});

$("dashboardBtn").addEventListener("click", openDashboard);

$("logoutBtn").addEventListener("click", () => {
  currentUser = null;
  selectedImages = [];
  $("loginForm").reset();
  $("signupForm").reset();
  $("roomForm").reset();
  $("imagePreviews").innerHTML = "";
  switchRole("buyer");
  switchAuth("login");
  showScreen("authScreen");
});

$("homeLogo").addEventListener("click", event => {
  event.preventDefault();

  if (currentUser) {
    openDashboard();
  } else {
    showScreen("authScreen");
  }
});

function formatRent(value) {
  return Number(value).toLocaleString("en-IN");
}

function roomImage(room) {
  return room.images && room.images.length ? room.images[0] : "";
}

function getSelectedAmenities() {
  return Array.from(
    document.querySelectorAll('input[name="amenityFilter"]:checked')
  ).map(input => input.value);
}

function roomCardHTML(room) {
  const image = roomImage(room);
  const imageHTML = image
    ? `<img src="${image}" alt="${escapeHTML(room.name)}">`
    : `<div class="room-card-placeholder"></div>`;

  const amenities = (room.amenities || []).slice(0, 3);
  const available = room.available !== false;

  return `
    <article class="room-card" data-room-id="${escapeHTML(room.id)}" tabindex="0" role="button">
      ${imageHTML}
      <div class="room-card-body">
        <span class="availability-status ${available ? "available" : "unavailable"}">
          ${available ? "Available" : "Not available"}
        </span>
        <h3>${escapeHTML(room.name)}</h3>
        <p class="room-location">⌖ ${escapeHTML(room.location)}</p>
        <div class="room-card-bottom">
          <span class="price">₹${formatRent(room.rent)} <small>/ month</small></span>
          <span class="type-tag">${escapeHTML(room.roomType)}</span>
        </div>
        <div class="room-card-meta">
          ${amenities.map(item => `<span>${escapeHTML(item)}</span>`).join("")}
        </div>
        <p class="muted">Listed by ${escapeHTML(room.owner)}</p>
      </div>
    </article>
  `;
}

function renderBuyerRooms() {
  if (!currentUser || currentUser.role !== "buyer") return;

  const search = $("searchInput").value.trim().toLowerCase();
  const minValue = $("minBudget").value.trim();
  const maxValue = $("maxBudget").value.trim();
  const minBudget = minValue === "" ? 0 : Number(minValue);
  const maxBudget = maxValue === "" ? Infinity : Number(maxValue);
  const type = $("typeFilter").value;
  const gender = $("genderFilter").value;
  const amenities = getSelectedAmenities();
  const availableOnly = $("availableOnly").checked;

  let filteredRooms = rooms.filter(room => {
    const searchText = [
      room.name,
      room.location,
      room.roomType,
      room.owner
    ].join(" ").toLowerCase();

    const matchesSearch = searchText.includes(search);
    const matchesMin = Number(room.rent) >= minBudget;
    const matchesMax = Number(room.rent) <= maxBudget;
    const matchesType = type === "All" || room.roomType === type;
    const matchesCategory =
      selectedCategory === "All" || room.roomType === selectedCategory;

    const roomGender = room.genderPreference || "Anyone";
    const matchesGender =
      gender === "All" ||
      roomGender === "Anyone" ||
      roomGender === gender;

    const roomAmenities = room.amenities || [];
    const matchesAmenities = amenities.every(item =>
      roomAmenities.includes(item)
    );

    const matchesAvailability =
      !availableOnly || room.available !== false;

    return matchesSearch &&
      matchesMin &&
      matchesMax &&
      matchesType &&
      matchesCategory &&
      matchesGender &&
      matchesAmenities &&
      matchesAvailability;
  });

  const sort = $("sortFilter").value;

  if (sort === "low-high") {
    filteredRooms.sort((a, b) => Number(a.rent) - Number(b.rent));
  } else if (sort === "high-low") {
    filteredRooms.sort((a, b) => Number(b.rent) - Number(a.rent));
  } else if (sort === "name") {
    filteredRooms.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "oldest") {
    filteredRooms.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  } else {
    filteredRooms.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  $("roomCount").textContent =
    `${filteredRooms.length} room${filteredRooms.length === 1 ? "" : "s"} found`;

  $("roomContainer").innerHTML = filteredRooms.length
    ? filteredRooms.map(roomCardHTML).join("")
    : `<div class="empty-state">No rooms match these filters. Try changing your search or clearing some filters.</div>`;

  const active = [];

  if (search) active.push(`Search: ${search}`);
  if (minValue) active.push(`Min: ₹${formatRent(minBudget)}`);
  if (maxValue) active.push(`Max: ₹${formatRent(maxBudget)}`);
  if (type !== "All") active.push(type);
  if (selectedCategory !== "All") active.push(selectedCategory);
  if (gender !== "All") active.push(gender);
  amenities.forEach(item => active.push(item));
  if (availableOnly) active.push("Available only");

  $("activeFilters").innerHTML = active
    .map(item => `<span class="filter-tag">${escapeHTML(item)}</span>`)
    .join("");
}

$("openBuyer").addEventListener("click", () => {
  if (!currentUser || currentUser.role !== "buyer") return;
  renderBuyerRooms();
  showScreen("buyerScreen");
});

$("openOwner").addEventListener("click", () => {
  if (!currentUser || currentUser.role !== "owner") return;
  displayOwnerRooms();
  showScreen("ownerScreen");
});

$("buyerBack").addEventListener("click", openDashboard);
$("ownerBack").addEventListener("click", openDashboard);

$("searchBtn").addEventListener("click", renderBuyerRooms);
$("applyFilters").addEventListener("click", renderBuyerRooms);
$("sortFilter").addEventListener("change", renderBuyerRooms);
$("genderFilter").addEventListener("change", renderBuyerRooms);
$("availableOnly").addEventListener("change", renderBuyerRooms);

$("typeFilter").addEventListener("change", () => {
  selectedCategory = "All";

  document.querySelectorAll(".category-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.category === "All");
  });

  renderBuyerRooms();
});

$("searchInput").addEventListener("input", renderBuyerRooms);
$("minBudget").addEventListener("input", renderBuyerRooms);
$("maxBudget").addEventListener("input", renderBuyerRooms);

document.querySelectorAll('input[name="amenityFilter"]').forEach(input => {
  input.addEventListener("change", renderBuyerRooms);
});

document.querySelectorAll(".category-chip").forEach(button => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category;

    document.querySelectorAll(".category-chip").forEach(chip => {
      chip.classList.toggle("active", chip === button);
    });

    $("typeFilter").value = "All";
    renderBuyerRooms();
  });
});

$("clearFilters").addEventListener("click", () => {
  $("searchInput").value = "";
  $("minBudget").value = "";
  $("maxBudget").value = "";
  $("typeFilter").value = "All";
  $("genderFilter").value = "All";
  $("availableOnly").checked = false;
  $("sortFilter").value = "newest";

  document.querySelectorAll('input[name="amenityFilter"]').forEach(input => {
    input.checked = false;
  });

  selectedCategory = "All";

  document.querySelectorAll(".category-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.category === "All");
  });

  renderBuyerRooms();
});

$("searchInput").addEventListener("keydown", event => {
  if (event.key === "Enter") renderBuyerRooms();
});

$("maxBudget").addEventListener("keydown", event => {
  if (event.key === "Enter") renderBuyerRooms();
});

$("minBudget").addEventListener("keydown", event => {
  if (event.key === "Enter") renderBuyerRooms();
});

function showRoomDetails(roomId, returnScreen) {
  const room = rooms.find(item => item.id === roomId);
  if (!room) return;

  detailsReturnScreen = returnScreen;

  const images = room.images || [];
  const mainImage = images[0] || "";
  const phoneLink = String(room.phone || "").replace(/[^\d+]/g, "");

  $("detailsContent").innerHTML = `
    <div class="details-layout">
      <div>
        <img id="detailsMainImage" class="details-main-image" src="${mainImage}" alt="${escapeHTML(room.name)}">
        <div class="details-thumbnails">
          ${images.map((image, index) => `
            <img src="${image}" data-image-index="${index}" class="${index === 0 ? "active" : ""}" alt="Room photo ${index + 1}">
          `).join("")}
        </div>
      </div>

      <div class="details-info">
        <span class="type-tag">${escapeHTML(room.roomType)}</span>
        <h1>${escapeHTML(room.name)}</h1>
        <p class="room-location">⌖ ${escapeHTML(room.location)}</p>
        <div class="details-rent">₹${formatRent(room.rent)} <small>/ month</small></div>

        <div class="detail-row"><strong>Owner:</strong> ${escapeHTML(room.owner)}</div>
        <div class="detail-row"><strong>Room type:</strong> ${escapeHTML(room.roomType)}</div>
        <div class="detail-row"><strong>Contact:</strong> ${escapeHTML(room.phone)}</div>
        <div class="detail-row"><strong>Tenant preference:</strong> ${escapeHTML(room.genderPreference || "Anyone")}</div>
        <div class="detail-row"><strong>Availability:</strong> ${room.available === false ? "Currently unavailable" : "Available"}</div>
        <div class="detail-row"><strong>Amenities:</strong> ${escapeHTML((room.amenities || []).join(", ") || "Not specified")}</div>

        <h3>Description</h3>
        <p class="detail-description">${escapeHTML(room.description || "No description provided.")}</p>

        <a class="btn contact-btn" href="tel:${escapeHTML(phoneLink)}">Call Owner</a>
      </div>
    </div>
  `;

  if (!mainImage) {
    $("detailsMainImage").style.display = "none";
  }

  showScreen("detailsScreen");
}

$("roomContainer").addEventListener("click", event => {
  const card = event.target.closest("[data-room-id]");
  if (card) showRoomDetails(card.dataset.roomId, "buyerScreen");
});

$("roomContainer").addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;

  const card = event.target.closest("[data-room-id]");
  if (!card) return;

  event.preventDefault();
  showRoomDetails(card.dataset.roomId, "buyerScreen");
});

$("detailsContent").addEventListener("click", event => {
  const thumbnail = event.target.closest("[data-image-index]");
  if (!thumbnail) return;

  $("detailsMainImage").src = thumbnail.src;

  $("detailsContent").querySelectorAll(".details-thumbnails img")
    .forEach(image => image.classList.remove("active"));

  thumbnail.classList.add("active");
});

$("detailsBack").addEventListener("click", () => {
  if (detailsReturnScreen === "ownerScreen") {
    displayOwnerRooms();
  } else {
    renderBuyerRooms();
  }

  showScreen(detailsReturnScreen);
});

function displayOwnerRooms() {
  if (!currentUser || currentUser.role !== "owner") return;

  const myRooms = rooms.filter(room =>
    room.ownerEmail === currentUser.email
  );

  if (!myRooms.length) {
    $("ownerRoomContainer").innerHTML =
      `<div class="empty-state">You haven't published any rooms yet.</div>`;
    return;
  }

  $("ownerRoomContainer").innerHTML = myRooms.map(room => `
    <div class="owner-listing">
      <strong>${escapeHTML(room.name)}</strong>
      <small>${escapeHTML(room.location)} · ₹${formatRent(room.rent)} / month</small>
      <small>${room.available === false ? "Unavailable" : "Available"}</small>
      <div class="owner-list-actions">
        <button class="btn outline small" type="button" data-room-id="${escapeHTML(room.id)}">View</button>
        <button class="delete-btn" type="button" data-delete-id="${escapeHTML(room.id)}">Delete</button>
      </div>
    </div>
  `).join("");
}

$("ownerRoomContainer").addEventListener("click", event => {
  const viewButton = event.target.closest("[data-room-id]");
  const deleteButton = event.target.closest("[data-delete-id]");

  if (viewButton) {
    showRoomDetails(viewButton.dataset.roomId, "ownerScreen");
    return;
  }

  if (deleteButton) {
    const roomId = deleteButton.dataset.deleteId;

    if (!window.confirm("Are you sure you want to delete this room listing?")) {
      return;
    }

    const updatedRooms = rooms.filter(room =>
      !(room.id === roomId && room.ownerEmail === currentUser.email)
    );

    if (saveData(STORAGE_ROOMS, updatedRooms)) {
      rooms = updatedRooms;
      displayOwnerRooms();
    }
  }
});

$("roomImage").addEventListener("change", async event => {
  const files = Array.from(event.target.files || []);

  selectedImages = [];
  $("imagePreviews").innerHTML = "";
  showMessage("formMessage", "");

  if (files.length > 3) {
    showMessage("formMessage", "Please select a maximum of 3 photos.");
    event.target.value = "";
    return;
  }

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      showMessage("formMessage", "Please select image files only.");
      event.target.value = "";
      return;
    }

    if (file.size > 1024 * 1024) {
      showMessage("formMessage", `${file.name} is larger than 1 MB. Choose a smaller photo.`);
      event.target.value = "";
      return;
    }
  }

  try {
    selectedImages = await Promise.all(files.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read one of the selected photos."));
      reader.readAsDataURL(file);
    })));

    $("imagePreviews").innerHTML = selectedImages.map((image, index) => `
      <div class="preview-item">
        <img src="${image}" alt="Selected room photo ${index + 1}">
        <button type="button" data-remove-image="${index}" aria-label="Remove photo">×</button>
      </div>
    `).join("");
  } catch (error) {
    selectedImages = [];
    showMessage("formMessage", error.message);
  }
});

$("imagePreviews").addEventListener("click", event => {
  const button = event.target.closest("[data-remove-image]");
  if (!button) return;

  const index = Number(button.dataset.removeImage);
  selectedImages.splice(index, 1);

  $("imagePreviews").innerHTML = selectedImages.map((image, imageIndex) => `
    <div class="preview-item">
      <img src="${image}" alt="Selected room photo ${imageIndex + 1}">
      <button type="button" data-remove-image="${imageIndex}" aria-label="Remove photo">×</button>
    </div>
  `).join("");

  $("roomImage").value = "";
});

$("roomForm").addEventListener("submit", event => {
  event.preventDefault();

  if (!currentUser || currentUser.role !== "owner") {
    showScreen("authScreen");
    return;
  }

  const name = $("roomName").value.trim();
  const location = $("location").value.trim();
  const rent = Number($("rent").value);
  const roomType = $("roomType").value;
  const description = $("description").value.trim();
  const phone = $("ownerPhone").value.trim();

  if (!name || !location || !roomType || !phone || !Number.isFinite(rent) || rent <= 0) {
    showMessage("formMessage", "Please complete all required fields with valid details.");
    return;
  }

  const amenities = Array.from(
    document.querySelectorAll('input[name="roomAmenity"]:checked')
  ).map(input => input.value);

  const newRoom = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    location,
    rent,
    roomType,
    description,
    owner: currentUser.name,
    ownerEmail: currentUser.email,
    phone,
    images: [...selectedImages],
    genderPreference: $("genderPreference").value,
    amenities,
    available: $("roomAvailable").checked,
    createdAt: Date.now()
  };

  const updatedRooms = [...rooms, newRoom];

  if (!saveData(STORAGE_ROOMS, updatedRooms)) return;

  rooms = updatedRooms;
  $("roomForm").reset();
  selectedImages = [];
  $("imagePreviews").innerHTML = "";

  showMessage("formMessage", "Your room has been published successfully!", true);
  displayOwnerRooms();
});

switchRole("buyer");
switchAuth("login");
showScreen("authScreen");
