// RentEase - Room and PG listings for Dehradun

const KEYS = {
  accounts: "rentEaseAccounts",
  rooms: "rentEaseRooms",
  reviews: "rentEaseReviews",
  appointments: "rentEaseAppointments"
};

const GRAPH_KEY = "rentEaseLocationGraphV2";
const CLEAN_START_FLAG = "rentEaseEmptyStartV1";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900";

const ALLOWED_AREAS = [
  "prem nagar", "sahastradhara", "raipur", "clement town",
  "mussoorie", "jakhan", "turner road", "laxman chowk",
  "mayur vihar", "doon vihar", "kuthal gate", "patel nagar",
  "ballupur", "rajpur road", "nehru colony", "isbt"
];

const DEFAULT_LOCALITIES = [
  "Prem Nagar",
  "Sahastradhara",
  "Raipur",
  "Clement Town",
  "Mussoorie Road",
  "Jakhan",
  "Turner Road"
];

// --------------------
// Data and state
// --------------------

function loadStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.error("Storage read error:", error);
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    alert("Browser storage is full. Try uploading smaller photos.");
    console.error("Storage save error:", error);
  }
}

let accounts = loadStorage(KEYS.accounts, []);
let rooms = loadStorage(KEYS.rooms, []);
let reviews = loadStorage(KEYS.reviews, {});
let appointments = loadStorage(KEYS.appointments, []);

let currentUser = null;
let selectedRole = "buyer";
let selectedImages = [];
let selectedCompareIds = [];
let currentRoomId = null;
let selectedRating = 5;

if (!Array.isArray(accounts)) accounts = [];
if (!Array.isArray(rooms)) rooms = [];
if (!Array.isArray(appointments)) appointments = [];
if (!reviews || typeof reviews !== "object" || Array.isArray(reviews)) {
  reviews = {};
}

// Clear old sample listings and reviews once.
// New listings added after this will be saved normally.
if (!localStorage.getItem(CLEAN_START_FLAG)) {
  localStorage.removeItem(KEYS.rooms);
  localStorage.removeItem(KEYS.reviews);
  rooms = [];
  reviews = {};
  localStorage.setItem(CLEAN_START_FLAG, "done");
}

function saveAccounts() {
  saveStorage(KEYS.accounts, accounts);
}

function saveRooms() {
  saveStorage(KEYS.rooms, rooms);
}

function saveReviews() {
  saveStorage(KEYS.reviews, reviews);
}

function saveAppointments() {
  saveStorage(KEYS.appointments, appointments);
}

// --------------------
// General helpers
// --------------------

function $(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function formatMoney(amount) {
  return Number(amount).toLocaleString("en-IN");
}

function showMessage(id, message, success = false) {
  const element = $(id);
  if (!element) return;

  element.textContent = message;
  element.style.color = success ? "#286449" : "#a0443b";
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.add("hidden");
  });

  $(screenId).classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateHeader() {
  const loggedIn = Boolean(currentUser);

  $("dashboardBtn").classList.toggle("hidden", !loggedIn);
  $("logoutBtn").classList.toggle("hidden", !loggedIn);

  $("headerUser").textContent = loggedIn
    ? `Hello, ${currentUser.name}`
    : "";
}

function updateRoleButtons() {
  $("buyerRoleBtn").classList.toggle("active", selectedRole === "buyer");
  $("ownerRoleBtn").classList.toggle("active", selectedRole === "owner");

  $("selectedRoleText").textContent =
    selectedRole === "buyer"
      ? "Buyer account selected"
      : "Owner account selected";
}

function switchAuth(mode) {
  const isLogin = mode === "login";

  $("loginForm").classList.toggle("hidden", !isLogin);
  $("signupForm").classList.toggle("hidden", isLogin);

  $("loginTab").classList.toggle("active", isLogin);
  $("signupTab").classList.toggle("active", !isLogin);

  showMessage("loginMessage", "");
  showMessage("signupMessage", "");
}

// --------------------
// Login and signup
// --------------------

function loginUser(event) {
  event.preventDefault();

  const email = $("loginEmail").value.trim().toLowerCase();
  const password = $("loginPassword").value;

  const account = accounts.find(user =>
    user.email.toLowerCase() === email &&
    user.password === password &&
    (user.role || "buyer") === selectedRole
  );

  if (!account) {
    showMessage(
      "loginMessage",
      "Account not found. Check your details and account type."
    );
    return;
  }

  currentUser = account;
  updateHeader();
  openDashboard();
}

function signupUser(event) {
  event.preventDefault();

  const name = $("signupName").value.trim();
  const phone = $("signupPhone").value.trim();
  const email = $("signupEmail").value.trim().toLowerCase();
  const password = $("signupPassword").value;

  if (!/^[0-9]{10}$/.test(phone)) {
    showMessage("signupMessage", "Enter a valid 10-digit phone number.");
    return;
  }

  if (password.length < 6) {
    showMessage("signupMessage", "Password must contain at least 6 characters.");
    return;
  }

  const duplicate = accounts.some(user =>
    user.email.toLowerCase() === email &&
    (user.role || "buyer") === selectedRole
  );

  if (duplicate) {
    showMessage("signupMessage", "An account with this email and role already exists.");
    return;
  }

  const newAccount = {
    id: "user-" + Date.now(),
    name,
    phone,
    email,
    password,
    role: selectedRole
  };

  accounts.push(newAccount);
  saveAccounts();

  currentUser = newAccount;
  updateHeader();
  openDashboard();
}

function logoutUser() {
  currentUser = null;
  selectedCompareIds = [];
  currentRoomId = null;

  updateHeader();
  showScreen("authScreen");
  switchAuth("login");

  $("loginForm").reset();
  $("signupForm").reset();
}

// --------------------
// Dashboard
// --------------------

function openDashboard() {
  if (!currentUser) {
    showScreen("authScreen");
    return;
  }

  $("dashboardName").textContent = currentUser.name;
  $("dashboardEmail").textContent =
    `${currentUser.email} · ${currentUser.role === "owner" ? "Room owner" : "Room seeker"}`;

  $("buyerDashboardCard").classList.toggle(
    "hidden",
    currentUser.role !== "buyer"
  );

  $("ownerDashboardCard").classList.toggle(
    "hidden",
    currentUser.role !== "owner"
  );

  if (currentUser.role === "owner") {
    displayOwnerRooms();
    displayOwnerAppointments();
  }

  showScreen("dashboardScreen");
}

// --------------------
// Priority Queue
// --------------------

// Min-heap: the room with the lowest rent stays at the top.
class RoomMinPriorityQueue {
  constructor() {
    this.heap = [];
  }

  isHigherPriority(a, b) {
    const difference = Number(a.rent) - Number(b.rent);

    if (difference !== 0) {
      return difference < 0;
    }

    return Number(a.createdAt || 0) < Number(b.createdAt || 0);
  }

  enqueue(room) {
    this.heap.push(room);
    this.bubbleUp(this.heap.length - 1);
  }

  bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);

      if (!this.isHigherPriority(this.heap[index], this.heap[parent])) {
        break;
      }

      [this.heap[index], this.heap[parent]] =
        [this.heap[parent], this.heap[index]];

      index = parent;
    }
  }

  dequeue() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const lowestRentRoom = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);

    return lowestRentRoom;
  }

  bubbleDown(index) {
    const length = this.heap.length;

    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (
        left < length &&
        this.isHigherPriority(this.heap[left], this.heap[smallest])
      ) {
        smallest = left;
      }

      if (
        right < length &&
        this.isHigherPriority(this.heap[right], this.heap[smallest])
      ) {
        smallest = right;
      }

      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] =
        [this.heap[smallest], this.heap[index]];

      index = smallest;
    }
  }

  get size() {
    return this.heap.length;
  }
}

// --------------------
// Graph: locality connections
// --------------------

let localityGraph = loadStorage(GRAPH_KEY, {});

if (!localityGraph || typeof localityGraph !== "object" || Array.isArray(localityGraph)) {
  localityGraph = {};
}

DEFAULT_LOCALITIES.forEach(name => {
  if (!localityGraph[name]) {
    localityGraph[name] = [];
  }
});

function saveGraph() {
  saveStorage(GRAPH_KEY, localityGraph);
}

function graphName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function graphKey(value) {
  return graphName(value).toLowerCase();
}

function findGraphName(value) {
  const key = graphKey(value);

  return Object.keys(localityGraph).find(name =>
    graphKey(name) === key
  ) || graphName(value);
}

function graphNeighbours(name) {
  const actual = findGraphName(name);

  return (localityGraph[actual] || []).map(edge => edge.to);
}

function addGraphConnection(fromValue, toValue, distanceValue) {
  const from = findGraphName(fromValue);
  const to = findGraphName(toValue);
  const distance = Number(distanceValue);

  if (!from || !to || graphKey(from) === graphKey(to)) {
    return "Choose two different localities.";
  }

  if (!Number.isFinite(distance) || distance <= 0) {
    return "Enter a valid distance greater than zero.";
  }

  localityGraph[from] ||= [];
  localityGraph[to] ||= [];

  const alreadyExists = localityGraph[from].some(edge =>
    graphKey(edge.to) === graphKey(to)
  );

  if (alreadyExists) {
    return "That connection already exists.";
  }

  localityGraph[from].push({ to, distance });
  localityGraph[to].push({ to: from, distance });

  saveGraph();
  renderLocalityGraph();

  return "Connection added. Both localities are now linked.";
}

function removeGraphConnection(from, to) {
  localityGraph[from] = (localityGraph[from] || []).filter(edge =>
    graphKey(edge.to) !== graphKey(to)
  );

  localityGraph[to] = (localityGraph[to] || []).filter(edge =>
    graphKey(edge.to) !== graphKey(from)
  );

  saveGraph();
  renderLocalityGraph();
}

function renderLocalityGraph() {
  const names = Object.keys(localityGraph);
  const edges = [];

  names.forEach(from => {
    (localityGraph[from] || []).forEach(edge => {
      if (graphKey(from) < graphKey(edge.to)) {
        edges.push({
          from,
          to: edge.to,
          distance: edge.distance
        });
      }
    });
  });

  const visual = $("locationGraphVisual");
  const options = $("graphLocalityOptions");

  if (!visual || !options) return;

  options.innerHTML = names.map(name =>
    `<option value="${escapeHTML(name)}"></option>`
  ).join("");

  if (!edges.length) {
    visual.innerHTML = `
      <div class="graph-empty">
        Add a locality connection to see how areas link together.
      </div>`;
  } else {
    const width = 620;
    const height = 190;
    const cx = width / 2;
    const cy = height / 2;
    const radius = 72;
    const positions = {};

    names.forEach((name, index) => {
      const angle = (2 * Math.PI * index / names.length) - Math.PI / 2;

      positions[name] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle)
      };
    });

    const lines = edges.map(edge => {
      const a = positions[edge.from];
      const b = positions[edge.to];

      return `
        <line
          x1="${a.x}" y1="${a.y}"
          x2="${b.x}" y2="${b.y}"
          class="graph-edge"
        ></line>
        <text
          x="${(a.x + b.x) / 2}"
          y="${(a.y + b.y) / 2 - 5}"
          class="graph-distance"
        >${Number(edge.distance).toFixed(1)} km</text>
      `;
    }).join("");

    const nodes = names.map(name => {
      const point = positions[name];
      const label = name.length > 16
        ? name.slice(0, 15) + "…"
        : name;

      return `
        <g>
          <circle
            cx="${point.x}"
            cy="${point.y}"
            r="8"
            class="graph-node"
          ></circle>
          <text
            x="${point.x}"
            y="${point.y + 22}"
            text-anchor="middle"
            class="graph-label"
          >${escapeHTML(label)}</text>
        </g>
      `;
    }).join("");

    visual.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Locality connections">
        ${lines}
        ${nodes}
      </svg>
    `;
  }

  const list = $("graphConnectionList");

  if (list) {
    list.innerHTML = edges.length
      ? edges.map(edge => `
          <div class="graph-connection">
            <span>
              ${escapeHTML(edge.from)} ↔ ${escapeHTML(edge.to)}
              <small>${Number(edge.distance).toFixed(1)} km</small>
            </span>
            <button
              type="button"
              data-remove-from="${escapeHTML(edge.from)}"
              data-remove-to="${escapeHTML(edge.to)}"
            >Remove</button>
          </div>
        `).join("")
      : `<small class="muted">No connections added yet.</small>`;
  }
}

function connectedAreaNames(selectedArea) {
  if (!selectedArea || !$("includeConnectedAreas").checked) {
    return selectedArea ? [selectedArea] : [];
  }

  const actual = findGraphName(selectedArea);
  return [actual, ...graphNeighbours(actual)];
}

// --------------------
// Buyer search and filters
// --------------------

function getFilteredRooms() {
  const search = $("searchInput").value.trim().toLowerCase();
  const selectedArea = $("locationFilter").value;

  const areasToInclude = connectedAreaNames(selectedArea).map(area =>
    area.toLowerCase()
  );

  const min = Number($("minBudget").value) || 0;
  const max = Number($("maxBudget").value) || Infinity;
  const type = $("typeFilter").value;
  const gender = $("genderFilter").value;
  const availableOnly = $("availableOnly").checked;
  const sort = $("sortFilter").value;

  let result = rooms.filter(room => {
    const searchable = [
      room.name,
      room.location,
      room.description,
      room.roomType,
      room.genderPreference
    ].join(" ").toLowerCase();

    const matchesSearch = !search || searchable.includes(search);
    const roomLocation = room.location.toLowerCase();

    const matchesArea = !selectedArea ||
      areasToInclude.some(area => roomLocation.includes(area));

    const matchesMin = Number(room.rent) >= min;
    const matchesMax = Number(room.rent) <= max;
    const matchesType = !type || room.roomType === type;

    const matchesGender = !gender ||
      room.genderPreference === gender ||
      room.genderPreference === "Any";

    const matchesAvailability = !availableOnly || room.available;

    return matchesSearch &&
      matchesArea &&
      matchesMin &&
      matchesMax &&
      matchesType &&
      matchesGender &&
      matchesAvailability;
  });

  if (sort === "low") {
    // The Priority Queue returns available rooms from lowest rent to highest.
    const queue = new RoomMinPriorityQueue();
    const unavailable = result.filter(room => !room.available);

    result.filter(room => room.available).forEach(room => {
      queue.enqueue(room);
    });

    const ordered = [];

    while (queue.size) {
      ordered.push(queue.dequeue());
    }

    result = [
      ...ordered,
      ...unavailable.sort((a, b) => Number(a.rent) - Number(b.rent))
    ];
  } else if (sort === "high") {
    result.sort((a, b) => Number(b.rent) - Number(a.rent));
  } else if (sort === "name") {
    result.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    result.sort((a, b) =>
      Number(b.createdAt || 0) - Number(a.createdAt || 0)
    );
  }

  return result;
}

function renderBuyerRooms() {
  const result = getFilteredRooms();

  renderLocalityGraph();

  $("roomCount").textContent =
    `${result.length} ${result.length === 1 ? "room" : "rooms"} found`;

  if (result.length === 0) {
    $("roomContainer").innerHTML = `
      <div class="empty-state">
        No rooms match your filters. Try changing your search.
      </div>`;
    return;
  }

  $("roomContainer").innerHTML = result.map(room => {
    const image = room.images?.[0] || FALLBACK_IMAGE;
    const compared = selectedCompareIds.includes(room.id);

    return `
      <article class="room-card">
        <img
          src="${escapeHTML(image)}"
          alt="${escapeHTML(room.name)}"
          onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"
        >

        <div class="room-card-body">
          <div class="room-card-top">
            <h3>${escapeHTML(room.name)}</h3>
            <span class="availability ${room.available ? "" : "unavailable"}">
              ${room.available ? "Available" : "Not available"}
            </span>
          </div>

          <p class="room-location">📍 ${escapeHTML(room.location)}</p>

          <div class="room-rent">
            ₹${formatMoney(room.rent)}
            <small>/ month</small>
          </div>

          <div class="room-meta">
            <span class="pill">${escapeHTML(room.roomType)}</span>
            <span class="pill">${escapeHTML(room.genderPreference)}</span>
          </div>

          <div class="room-meta">
            ${(room.amenities || []).slice(0, 3).map(item =>
              `<span class="pill">${escapeHTML(item)}</span>`
            ).join("")}
          </div>

          <div class="room-card-actions">
            <button
              class="btn btn-primary"
              onclick="showRoomDetails('${room.id}')"
            >View details</button>

            <button
              class="btn ${compared ? "btn-light" : "btn-outline"}"
              onclick="toggleCompare('${room.id}')"
            >${compared ? "✓ Added" : "＋ Compare"}</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function clearFilters() {
  $("searchInput").value = "";
  $("locationFilter").value = "";
  $("minBudget").value = "";
  $("maxBudget").value = "";
  $("typeFilter").value = "";
  $("genderFilter").value = "";
  $("availableOnly").checked = false;
  $("sortFilter").value = "newest";
  $("includeConnectedAreas").checked = false;

  renderBuyerRooms();
}

// --------------------
// Compare rooms
// --------------------

function toggleCompare(roomId) {
  if (selectedCompareIds.includes(roomId)) {
    selectedCompareIds = selectedCompareIds.filter(id => id !== roomId);
  } else {
    if (selectedCompareIds.length >= 2) {
      alert("You can compare only two rooms at a time.");
      return;
    }

    selectedCompareIds.push(roomId);
  }

  renderBuyerRooms();
  renderComparison();
}

function removeCompare(roomId) {
  selectedCompareIds = selectedCompareIds.filter(id => id !== roomId);
  renderBuyerRooms();
  renderComparison();
}

function renderComparison() {
  const selected = selectedCompareIds
    .map(id => rooms.find(room => room.id === id))
    .filter(Boolean);

  if (selected.length === 0) {
    $("compareContent").innerHTML = `
      <div class="empty-state">
        Your comparison is empty. Add a room to get started.
      </div>`;
    return;
  }

  const fields = [
    ["Room name", room => escapeHTML(room.name)],
    ["Location", room => escapeHTML(room.location)],
    ["Monthly rent", room => `₹${formatMoney(room.rent)}`],
    ["Room type", room => escapeHTML(room.roomType)],
    ["Suitable for", room => escapeHTML(room.genderPreference)],
    ["Amenities", room => escapeHTML((room.amenities || []).join(", ") || "Not specified")],
    ["Availability", room => room.available ? "Available" : "Not available"],
    ["Owner", room => escapeHTML(room.owner || "Not specified")],
    ["Contact", room => escapeHTML(room.ownerPhone || "Not specified")]
  ];

  $("compareContent").innerHTML = `
    <table class="compare-table">
      <thead>
        <tr>
          <th>Feature</th>
          ${selected.map(room => `
            <th>
              ${escapeHTML(room.name)}
              <br>
              <button
                class="compare-remove"
                onclick="removeCompare('${room.id}')"
              >Remove room</button>
            </th>
          `).join("")}
        </tr>
      </thead>
      <tbody>
        ${fields.map(([label, getter]) => `
          <tr>
            <td>${label}</td>
            ${selected.map(room => `<td>${getter(room)}</td>`).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>

    <button
      class="btn btn-outline btn-small"
      onclick="clearComparison()"
      style="margin-top:14px"
    >Clear comparison</button>
  `;
}

function clearComparison() {
  selectedCompareIds = [];
  renderBuyerRooms();
  renderComparison();
}

// --------------------
// Room details
// --------------------

function showRoomDetails(roomId) {
  const room = rooms.find(item => item.id === roomId);

  if (!room) {
    alert("This room could not be found.");
    return;
  }

  currentRoomId = roomId;
  selectedRating = 5;

  const images = room.images?.length ? room.images : [FALLBACK_IMAGE];

  const today = new Date();
  const minVisitDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  ).toISOString().split("T")[0];

  const roomReviews = reviews[roomId] || [];

  const average = roomReviews.length
    ? (
        roomReviews.reduce((sum, review) => sum + Number(review.rating), 0) /
        roomReviews.length
      ).toFixed(1)
    : "No ratings";

  const gallery = `
    <div class="detail-gallery">
      <img
        src="${escapeHTML(images[0])}"
        alt="${escapeHTML(room.name)}"
        onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"
      >

      <div class="detail-gallery-side">
        <img
          src="${escapeHTML(images[1] || images[0])}"
          alt="Room photo"
          onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"
        >
        <img
          src="${escapeHTML(images[2] || images[0])}"
          alt="Room photo"
          onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"
        >
      </div>
    </div>
  `;

  const reviewsHTML = roomReviews.length
    ? roomReviews.map(review => `
        <div class="review-item">
          <strong>${escapeHTML(review.name)}</strong>
          <div class="stars">
            ${"★".repeat(Number(review.rating))}${"☆".repeat(5 - Number(review.rating))}
          </div>
          <p>${escapeHTML(review.comment)}</p>
          <small>${escapeHTML(review.date || "")}</small>
        </div>
      `).join("")
    : `<p class="muted">No reviews yet. Be the first to review this room.</p>`;

  const amenitiesHTML = (room.amenities || []).length
    ? room.amenities.map(item =>
        `<span class="pill">${escapeHTML(item)}</span>`
      ).join(" ")
    : `<span class="muted">No amenities listed.</span>`;

  let appointmentSection = "";

  if (currentUser && currentUser.role === "buyer" && room.available &&
      room.ownerId !== currentUser.id) {
    appointmentSection = `
      <section class="detail-section visit-booking">
        <h2>Book a room visit</h2>
        <p class="muted">
          Choose a date and time. The owner will see your request in their dashboard.
        </p>

        <form id="appointmentForm" class="appointment-form">
          <div class="form-two">
            <div>
              <label for="visitDate">Preferred date</label>
              <input
                type="date"
                id="visitDate"
                required
                min="${minVisitDate}"
              >
            </div>

            <div>
              <label for="visitTime">Preferred time</label>
              <input type="time" id="visitTime" required>
            </div>
          </div>

          <label for="visitMessage">Message (optional)</label>
          <textarea
            id="visitMessage"
            rows="2"
            maxlength="300"
            placeholder="Anything the owner should know?"
          ></textarea>

          <button class="btn btn-primary" type="submit">
            Request appointment
          </button>

          <p class="form-message" id="appointmentMessage" aria-live="polite"></p>
        </form>
      </section>
    `;
  } else if (currentUser && currentUser.role === "buyer" && !room.available) {
    appointmentSection = `
      <p class="muted">
        This room is currently unavailable, so visits cannot be requested.
      </p>
    `;
  }

  $("detailsContent").innerHTML = `
    <article class="detail-card">
      ${gallery}

      <div class="detail-body">
        <div class="detail-top">
          <div>
            <span class="eyebrow">DEHRADUN ROOM LISTING</span>
            <h1>${escapeHTML(room.name)}</h1>
            <p class="detail-location">📍 ${escapeHTML(room.location)}</p>
          </div>

          <div class="detail-rent">
            ₹${formatMoney(room.rent)}
            <small>/ month</small>
          </div>
        </div>

        <p class="detail-description">${escapeHTML(room.description)}</p>

        <div class="detail-info-grid">
          <div class="info-box">
            <small>Room type</small>
            <strong>${escapeHTML(room.roomType)}</strong>
          </div>

          <div class="info-box">
            <small>Suitable for</small>
            <strong>${escapeHTML(room.genderPreference)}</strong>
          </div>

          <div class="info-box">
            <small>Availability</small>
            <strong>${room.available ? "Available" : "Not available"}</strong>
          </div>
        </div>

        <section class="detail-section">
          <h2>Facilities and amenities</h2>
          <div class="room-meta">${amenitiesHTML}</div>
        </section>

        ${appointmentSection}

        <div class="owner-contact">
          <strong>Owner: ${escapeHTML(room.owner || "Not specified")}</strong>
          <p>Contact: ${escapeHTML(room.ownerPhone || "Not provided")}</p>
          <small>
            Please verify the details and contact number with the owner before making any payment.
          </small>
        </div>

        <section class="detail-section">
          <h2>Room reviews</h2>

          <div class="review-summary">
            <div class="review-average">${average}</div>
            <div>
              <div class="stars">★★★★★</div>
              <small>${roomReviews.length} review(s)</small>
            </div>
          </div>

          <div>${reviewsHTML}</div>

          ${
            currentUser && currentUser.role === "buyer"
              ? `
                <form class="review-form" id="reviewForm">
                  <h3>Write a review</h3>

                  <label>Your rating</label>
                  <div class="rating-select" id="ratingSelect">
                    ${[1, 2, 3, 4, 5].map(number => `
                      <button
                        type="button"
                        class="rating-star ${number <= selectedRating ? "selected" : ""}"
                        data-rating="${number}"
                        aria-label="${number} stars"
                      >★</button>
                    `).join("")}
                  </div>

                  <label for="reviewComment">Your experience</label>
                  <textarea
                    id="reviewComment"
                    rows="3"
                    placeholder="Share your experience with this room..."
                    required
                    maxlength="500"
                  ></textarea>

                  <button class="btn btn-primary" type="submit">
                    Submit review
                  </button>

                  <p class="form-message" id="reviewMessage"></p>
                </form>
              `
              : `<p class="muted">Login with a buyer account to submit a review.</p>`
          }
        </section>
      </div>
    </article>
  `;

  showScreen("detailsScreen");

  if (currentUser && currentUser.role === "buyer") {
    setupReviewForm(roomId);

    if ($("appointmentForm")) {
      setupAppointmentForm(roomId);
    }
  }
}

// --------------------
// Appointment booking
// --------------------

function setupAppointmentForm(roomId) {
  const form = $("appointmentForm");
  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();

    const room = rooms.find(item => item.id === roomId);

    if (!room || !room.available) {
      showMessage("appointmentMessage", "This room is no longer available.");
      return;
    }

    const date = $("visitDate").value;
    const time = $("visitTime").value;
    const message = $("visitMessage").value.trim();
    const chosenDate = new Date(`${date}T${time}`);

    if (
      !date ||
      !time ||
      Number.isNaN(chosenDate.getTime()) ||
      chosenDate <= new Date()
    ) {
      showMessage("appointmentMessage", "Choose a date and time in the future.");
      return;
    }

    const duplicate = appointments.some(item =>
      item.roomId === roomId &&
      item.buyerId === currentUser.id &&
      ["Pending", "Accepted"].includes(item.status)
    );

    if (duplicate) {
      showMessage(
        "appointmentMessage",
        "You already have an open request for this room."
      );
      return;
    }

    appointments.push({
      id: "visit-" + Date.now(),
      roomId,
      roomName: room.name,
      ownerId: room.ownerId,
      buyerId: currentUser.id,
      buyerName: currentUser.name,
      buyerPhone: currentUser.phone || "Not provided",
      date,
      time,
      message,
      status: "Pending",
      createdAt: Date.now()
    });

    saveAppointments();
    form.reset();

    showMessage(
      "appointmentMessage",
      "Your visit request has been sent to the owner.",
      true
    );
  });
}

// --------------------
// Reviews
// --------------------

function setupReviewForm(roomId) {
  const ratingButtons = document.querySelectorAll(".rating-star");

  ratingButtons.forEach(button => {
    button.addEventListener("click", () => {
      selectedRating = Number(button.dataset.rating);

      ratingButtons.forEach(star => {
        star.classList.toggle(
          "selected",
          Number(star.dataset.rating) <= selectedRating
        );
      });
    });
  });

  $("reviewForm").addEventListener("submit", event => {
    event.preventDefault();

    const comment = $("reviewComment").value.trim();

    if (!comment) {
      showMessage("reviewMessage", "Please write a comment.");
      return;
    }

    if (comment.length < 5) {
      showMessage("reviewMessage", "Please write at least 5 characters.");
      return;
    }

    if (!reviews[roomId]) {
      reviews[roomId] = [];
    }

    const alreadyReviewed = reviews[roomId].some(review =>
      review.userId === currentUser.id
    );

    if (alreadyReviewed) {
      showMessage("reviewMessage", "You have already reviewed this room.");
      return;
    }

    reviews[roomId].push({
      id: "review-" + Date.now(),
      userId: currentUser.id,
      name: currentUser.name,
      rating: selectedRating,
      comment,
      date: new Date().toLocaleDateString("en-IN")
    });

    saveReviews();
    showRoomDetails(roomId);
  });
}

// --------------------
// Owner: add room
// --------------------

function isDehradunArea(location) {
  const normalized = location.toLowerCase();

  return normalized.includes("dehradun") &&
    ALLOWED_AREAS.some(area => normalized.includes(area));
}

function getSelectedAmenities() {
  return [
    ...document.querySelectorAll('input[name="roomAmenity"]:checked')
  ].map(input => input.value);
}

function addRoom(event) {
  event.preventDefault();

  if (!currentUser || currentUser.role !== "owner") {
    alert("Only a logged-in owner can add listings.");
    return;
  }

  const name = $("roomName").value.trim();
  const location = $("location").value.trim();
  const rent = Number($("rent").value);
  const roomType = $("roomType").value;
  const genderPreference = $("genderPreference").value;
  const phone = $("ownerPhone").value.trim();
  const description = $("description").value.trim();

  if (!isDehradunArea(location)) {
    showMessage(
      "formMessage",
      "Please enter a Dehradun location, such as Prem Nagar, Raipur, Sahastradhara Road, Clement Town or Mussoorie Road."
    );
    return;
  }

  if (!/^[0-9]{10}$/.test(phone)) {
    showMessage("formMessage", "Enter a valid 10-digit contact number.");
    return;
  }

  if (rent <= 0 || !Number.isFinite(rent)) {
    showMessage("formMessage", "Enter a valid monthly rent.");
    return;
  }

  const newRoom = {
    id: "room-" + Date.now(),
    name,
    location,
    rent,
    roomType,
    genderPreference,
    amenities: getSelectedAmenities(),
    available: $("roomAvailable").checked,
    description,
    owner: currentUser.name,
    ownerId: currentUser.id,
    ownerPhone: phone,
    images: selectedImages.length
      ? [...selectedImages]
      : [FALLBACK_IMAGE],
    createdAt: Date.now()
  };

  rooms.unshift(newRoom);
  saveRooms();

  $("roomForm").reset();
  $("imagePreviews").innerHTML = "";
  selectedImages = [];

  showMessage("formMessage", "Your room listing has been published!", true);

  displayOwnerRooms();
}

// --------------------
// Owner: upload photos
// --------------------

function readImageAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));

    reader.readAsDataURL(file);
  });
}

async function handleImageUpload(event) {
  const files = [...event.target.files];

  if (files.length > 3) {
    alert("You can upload a maximum of 3 photos.");
    event.target.value = "";
    selectedImages = [];
    $("imagePreviews").innerHTML = "";
    return;
  }

  const validFiles = files.filter(file => {
    if (!file.type.startsWith("image/")) {
      alert(`${file.name} is not an image.`);
      return false;
    }

    if (file.size > 1024 * 1024) {
      alert(`${file.name} is larger than 1 MB.`);
      return false;
    }

    return true;
  });

  $("imagePreviews").innerHTML = "";
  selectedImages = [];

  try {
    selectedImages = await Promise.all(
      validFiles.map(readImageAsDataURL)
    );

    selectedImages.forEach((src, index) => {
      const image = document.createElement("img");

      image.src = src;
      image.alt = `Uploaded room photo ${index + 1}`;

      $("imagePreviews").appendChild(image);
    });
  } catch (error) {
    console.error("Image upload failed:", error);
    alert("One or more photos could not be loaded. Please try again.");

    selectedImages = [];
    $("imagePreviews").innerHTML = "";
    event.target.value = "";
  }
}

// --------------------
// Owner: listings and appointments
// --------------------

function displayOwnerRooms() {
  if (!currentUser) return;

  const myRooms = rooms.filter(room =>
    room.ownerId === currentUser.id
  );

  if (myRooms.length === 0) {
    $("ownerRoomContainer").innerHTML =
      `<p class="muted">You haven't added any rooms yet.</p>`;
    return;
  }

  $("ownerRoomContainer").innerHTML = myRooms.map(room => `
    <div class="owner-listing-item">
      <strong>${escapeHTML(room.name)}</strong>
      <small>
        ${escapeHTML(room.location)} · ₹${formatMoney(room.rent)}/month
      </small>
      <br>
      <button onclick="deleteOwnerRoom('${room.id}')">
        Delete listing
      </button>
    </div>
  `).join("");
}

function displayOwnerAppointments() {
  if (!currentUser || currentUser.role !== "owner") return;

  const myRequests = appointments
    .filter(item => item.ownerId === currentUser.id)
    .sort((a, b) =>
      Number(b.createdAt || 0) - Number(a.createdAt || 0)
    );

  const container = $("ownerAppointmentContainer");
  if (!container) return;

  if (!myRequests.length) {
    container.innerHTML =
      `<p class="muted">No visit requests yet.</p>`;
    return;
  }

  container.innerHTML = myRequests.map(item => `
    <div class="appointment-item">
      <strong>${escapeHTML(item.roomName)}</strong>

      <p>
        ${escapeHTML(item.buyerName)} · ${escapeHTML(item.buyerPhone)}
      </p>

      <p>
        ${escapeHTML(item.date)} at ${escapeHTML(item.time)}
      </p>

      ${item.message
        ? `<p class="appointment-note">${escapeHTML(item.message)}</p>`
        : ""
      }

      <span class="appointment-status status-${item.status.toLowerCase()}">
        ${escapeHTML(item.status)}
      </span>

      ${item.status === "Pending" ? `
        <div class="appointment-actions">
          <button
            class="btn btn-primary btn-small"
            data-appointment-action="Accepted"
            data-id="${escapeHTML(item.id)}"
          >Accept</button>

          <button
            class="btn btn-outline btn-small"
            data-appointment-action="Declined"
            data-id="${escapeHTML(item.id)}"
          >Decline</button>
        </div>
      ` : ""}
    </div>
  `).join("");
}

function updateAppointmentStatus(appointmentId, status) {
  const request = appointments.find(item =>
    item.id === appointmentId
  );

  if (
    !request ||
    request.ownerId !== currentUser?.id ||
    currentUser.role !== "owner"
  ) {
    return;
  }

  if (!["Accepted", "Declined"].includes(status)) {
    return;
  }

  request.status = status;

  saveAppointments();
  displayOwnerAppointments();
}

function deleteOwnerRoom(roomId) {
  const room = rooms.find(item => item.id === roomId);

  if (!room || room.ownerId !== currentUser.id) {
    alert("You can only delete your own listings.");
    return;
  }

  const confirmed = confirm(
    "Are you sure you want to delete this room listing?"
  );

  if (!confirmed) return;

  rooms = rooms.filter(item => item.id !== roomId);
  delete reviews[roomId];

  selectedCompareIds = selectedCompareIds.filter(id =>
    id !== roomId
  );

  saveRooms();
  saveReviews();

  displayOwnerRooms();
  renderComparison();
}

// --------------------
// Navigation and events
// --------------------

$("loginTab").addEventListener("click", () => {
  switchAuth("login");
});

$("signupTab").addEventListener("click", () => {
  switchAuth("signup");
});

$("goSignup").addEventListener("click", event => {
  event.preventDefault();
  switchAuth("signup");
});

$("goLogin").addEventListener("click", event => {
  event.preventDefault();
  switchAuth("login");
});

$("buyerRoleBtn").addEventListener("click", () => {
  selectedRole = "buyer";
  updateRoleButtons();
});

$("ownerRoleBtn").addEventListener("click", () => {
  selectedRole = "owner";
  updateRoleButtons();
});

$("loginForm").addEventListener("submit", loginUser);
$("signupForm").addEventListener("submit", signupUser);

$("logoutBtn").addEventListener("click", logoutUser);
$("dashboardBtn").addEventListener("click", openDashboard);

$("homeLogo").addEventListener("click", event => {
  event.preventDefault();

  if (currentUser) {
    openDashboard();
  } else {
    showScreen("authScreen");
  }
});

$("openBuyer").addEventListener("click", () => {
  if (!currentUser || currentUser.role !== "buyer") return;

  showScreen("buyerScreen");
  renderBuyerRooms();
  renderComparison();
});

$("openOwner").addEventListener("click", () => {
  if (!currentUser || currentUser.role !== "owner") return;

  showScreen("ownerScreen");
  displayOwnerRooms();
  displayOwnerAppointments();
});

$("buyerBack").addEventListener("click", openDashboard);
$("ownerBack").addEventListener("click", openDashboard);

$("detailsBack").addEventListener("click", () => {
  if (currentUser?.role === "buyer") {
    showScreen("buyerScreen");
    renderBuyerRooms();
    renderComparison();
  } else {
    openDashboard();
  }
});

$("searchBtn").addEventListener("click", renderBuyerRooms);

$("graphConnectionForm").addEventListener("submit", event => {
  event.preventDefault();

  const message = addGraphConnection(
    $("graphFrom").value,
    $("graphTo").value,
    $("graphDistance").value
  );

  showMessage(
    "graphMessage",
    message,
    message.startsWith("Connection added")
  );

  if (message.startsWith("Connection added")) {
    $("graphConnectionForm").reset();
    renderBuyerRooms();
  }
});

$("graphConnectionList").addEventListener("click", event => {
  const button = event.target.closest("button[data-remove-from]");
  if (!button) return;

  removeGraphConnection(
    button.dataset.removeFrom,
    button.dataset.removeTo
  );

  renderBuyerRooms();
});

$("ownerAppointmentContainer").addEventListener("click", event => {
  const button = event.target.closest("button[data-appointment-action]");
  if (!button) return;

  updateAppointmentStatus(
    button.dataset.id,
    button.dataset.appointmentAction
  );
});

$("includeConnectedAreas").addEventListener("change", renderBuyerRooms);

$("searchInput").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    renderBuyerRooms();
  }
});

[
  "locationFilter",
  "minBudget",
  "maxBudget",
  "typeFilter",
  "genderFilter",
  "availableOnly",
  "sortFilter"
].forEach(id => {
  $(id).addEventListener("change", renderBuyerRooms);
});

$("minBudget").addEventListener("input", renderBuyerRooms);
$("maxBudget").addEventListener("input", renderBuyerRooms);

$("clearFilters").addEventListener("click", clearFilters);

$("roomForm").addEventListener("submit", addRoom);
$("roomImage").addEventListener("change", handleImageUpload);

// --------------------
// Initial setup
// --------------------

renderLocalityGraph();
updateRoleButtons();
updateHeader();
showScreen("authScreen");
renderComparison();