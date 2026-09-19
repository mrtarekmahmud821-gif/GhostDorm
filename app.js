import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, runTransaction, arrayUnion, collection, query, where, orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBObsWUTRpIESXNW_wa2MvoblEmJc27TaQ",
  authDomain: "gift-box-io.firebaseapp.com",
  projectId: "gift-box-io",
  storageBucket: "gift-box-io.firebasestorage.app",
  messagingSenderId: "578138378445",
  appId: "1:578138378445:web:a74b708976e87c150d5984",
  measurementId: "G-FDP0VKK5EL"
};

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Application State
let currentUser = {
  id: "guest_user",
  first_name: "Guest Player",
  username: "@guest",
  photo_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmZ3dl2NZJPLDStjwXI8wbVfPMFeGzGVrr5YLxhk8MUtqCpxb1bOfE4_Y&s=10"
};

let userBalance = 0;
let currentSelectedMode = "";
let currentSelectedMatch = null;
let tempStepData = { ff_name: "", ff_uid: "" };
let activeMatchUnsubscribe = null;

// Category Configurations & Max Limits
const MODE_CONFIGS = {
  'lone_wolf_1v1': { title: 'Lone Wolf Solo (1V1)', maxSlots: 2 },
  'lone_wolf_2v2': { title: 'Lone Wolf Duo (2V2)', maxSlots: 4 },
  'clash_squad_4v4': { title: 'Clash Squad (4V4)', maxSlots: 8 },
  'br_solo': { title: 'Battle Royale Solo', maxSlots: 48 },
  'br_duo': { title: 'Battle Royale Duo', maxSlots: 48 },
  'br_squad': { title: 'Battle Royale Squad', maxSlots: 48 }
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  // Telegram WebApp Integration
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
      const u = tg.initDataUnsafe.user;
      currentUser.id = u.id.toString();
      currentUser.first_name = u.first_name || "Player";
      currentUser.username = u.username ? `@${u.username}` : "@player";
      if (u.photo_url) currentUser.photo_url = u.photo_url;
    }
  }

  // Render User Header Profile
  renderHeaderProfile();

  // Firestore Realtime Listeners
  initUserAccount();
  listenLiveMatches();
  listenTransactionHistory();
});

function renderHeaderProfile() {
  const headerAvatar = document.getElementById("header-user-avatar");
  const headerName = document.getElementById("header-user-name");
  const headerId = document.getElementById("header-user-id");

  if (headerAvatar) headerAvatar.src = currentUser.photo_url;
  if (headerName) headerName.innerText = currentUser.first_name;
  if (headerId) headerId.innerText = currentUser.username;

  const profAvatar = document.getElementById("profile-user-avatar");
  const profName = document.getElementById("profile-user-name");
  const profId = document.getElementById("profile-user-id");

  if (profAvatar) profAvatar.src = currentUser.photo_url;
  if (profName) profName.innerText = currentUser.first_name;
  if (profId) profId.innerText = currentUser.username;
}

// --- NAVIGATION HANDLERS ---
window.navigateTo = function(pageId, element) {
  document.querySelectorAll(".page-section").forEach(sec => sec.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));

  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) targetPage.classList.add("active");
  if (element) element.classList.add("active");
};

// --- FIRESTORE REALTIME USER ACCOUNT ---
function initUserAccount() {
  const userRef = doc(db, "users", currentUser.id);
  onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      userBalance = data.balance || 0;
      
      const playedEl = document.getElementById("stat-played");
      const winsEl = document.getElementById("stat-wins");
      if (playedEl) playedEl.innerText = data.matchesPlayed || 0;
      if (winsEl) winsEl.innerText = data.wins || 0;
    } else {
      setDoc(userRef, {
        name: currentUser.first_name,
        username: currentUser.username,
        balance: 0,
        matchesPlayed: 0,
        wins: 0
      });
      userBalance = 0;
    }
    
    // Update Balance UI
    updateBalanceDisplays();
  });
}

function updateBalanceDisplays() {
  const formattedBal = userBalance.toFixed(2);
  const hBal = document.getElementById("header-balance");
  const pBal = document.getElementById("profile-balance-display");
  const wBal = document.getElementById("wallet-balance-display");

  if (hBal) hBal.innerText = formattedBal;
  if (pBal) pBal.innerText = formattedBal;
  if (wBal) wBal.innerText = formattedBal;
}

// --- CATEGORY MATCHES & FIRESTORE LISTENERS ---
window.openCategoryMatches = function(categoryKey) {
  currentSelectedMode = categoryKey;
  const grid = document.getElementById("category-list-view");
  const matchesView = document.getElementById("matches-list-view");

  if (grid) grid.classList.add("hidden");
  if (matchesView) matchesView.classList.remove("hidden");

  const config = MODE_CONFIGS[categoryKey] || { title: 'Matches', maxSlots: 48 };
  const titleEl = document.getElementById("selected-category-title");
  if (titleEl) titleEl.innerText = config.title;

  listenCategoryMatches(categoryKey);
};

window.backToCategories = function() {
  if (activeMatchUnsubscribe) activeMatchUnsubscribe();
  
  const matchesView = document.getElementById("matches-list-view");
  const grid = document.getElementById("category-list-view");

  if (matchesView) matchesView.classList.add("hidden");
  if (grid) grid.classList.remove("hidden");
};

function listenCategoryMatches(categoryKey) {
  if (activeMatchUnsubscribe) activeMatchUnsubscribe();

  const container = document.getElementById("active-matches-container");
  const config = MODE_CONFIGS[categoryKey] || { maxSlots: 48 };

  // Fetch active matches from Admin Panel for this specific category
  const q = query(
    collection(db, "tournaments"), 
    where("category", "==", categoryKey),
    where("status", "==", "active")
  );

  activeMatchUnsubscribe = onSnapshot(q, (snapshot) => {
    if (!container) return;
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = `<div class="empty-matches-msg">No Active Matches Available for this category.</div>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const match = { id: docSnap.id, ...docSnap.data() };
      const players = match.players || [];
      const joinedCount = players.length;
      const maxSlots = match.maxSlots || config.maxSlots;
      const isJoined = players.some(p => p.id === currentUser.id);
      const isFull = joinedCount >= maxSlots;
      const progressPercent = Math.min(100, (joinedCount / maxSlots) * 100);

      let prizeHTML = "";
      if (match.prizes && Array.isArray(match.prizes)) {
        prizeHTML = match.prizes.map(p => `
          <div class="prize-item">
            <span class="prize-rank">${p.rank}</span>
            <span class="prize-val">${p.val}</span>
          </div>
        `).join("");
      } else {
        prizeHTML = `
          <div class="prize-item">
            <span class="prize-rank">Total Prize</span>
            <span class="prize-val">৳ ${match.totalPrize || 0}</span>
          </div>
        `;
      }

      const card = document.createElement("div");
      card.className = "tournament-card";
      card.innerHTML = `
        <div class="card-header">
          <h3>${match.title || "Free Fire Tournament"}</h3>
          <span class="match-time"><i class="fa-regular fa-clock"></i> ${match.matchTime || "Today"}</span>
        </div>
        
        <div class="prize-pool-grid">${prizeHTML}</div>
        
        <div class="entry-fee-box">
          <span>Entry Fee:</span>
          <strong class="prize-val">৳ ${match.entryFee || 0}</strong>
        </div>

        <div class="slots-progress">
          <div class="progress-info">
            <span>Slots Joined</span>
            <span>${joinedCount}/${maxSlots}</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
          </div>
        </div>

        <button class="btn-primary-glow" ${isJoined || isFull ? 'disabled' : ''} onclick="openJoinModal('${match.id}', ${match.entryFee || 0}, ${maxSlots})">
          ${isJoined ? 'Joined' : (isFull ? 'Match Full' : 'Join Match')}
        </button>
      `;
      container.appendChild(card);
    });
  }, (error) => {
    console.error("Error fetching matches:", error);
  });
}

// --- LIVE MATCHES FIRESTORE LISTENER ---
function listenLiveMatches() {
  onSnapshot(collection(db, "live_matches"), (snapshot) => {
    const container = document.getElementById("live-matches-container");
    if (!container) return;
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = `<p style="color: var(--text-sub); text-align: center; margin-top: 30px;">No Live Matches available right now.</p>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const card = document.createElement("div");
      card.className = "wallet-action-card";
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h4 style="color: var(--gold-color);">${data.title || "Live Free Fire Match"}</h4>
          <span class="status-badge approved">LIVE</span>
        </div>
        <p class="limit-note" style="margin-bottom: 10px;">Time: ${data.time || "Live Now"}</p>
        <div class="copy-number-box" style="margin-bottom: 6px;">
          <span>Room ID: <strong id="room-id-${docSnap.id}">${data.room_id || "N/A"}</strong></span>
          <button onclick="copyNumber('room-id-${docSnap.id}')"><i class="fa-solid fa-copy"></i> Copy</button>
        </div>
        <div class="copy-number-box">
          <span>Password: <strong id="room-pass-${docSnap.id}">${data.room_pass || "N/A"}</strong></span>
          <button onclick="copyNumber('room-pass-${docSnap.id}')"><i class="fa-solid fa-copy"></i> Copy</button>
        </div>
      `;
      container.appendChild(card);
    });
  });
}

// --- WALLET: DEPOSIT, WITHDRAW & HISTORY ---
window.switchWalletTab = function(tabName, evt) {
  document.querySelectorAll(".wallet-tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".wallet-tab-content").forEach(content => content.classList.remove("active"));

  if (evt && evt.currentTarget) {
    evt.currentTarget.classList.add("active");
  }
  const tabEl = document.getElementById(`wallet-tab-${tabName}`);
  if (tabEl) tabEl.classList.add("active");
};

window.selectDepMethod = function(method, btn) {
  document.querySelectorAll(".dep-tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  
  const phoneElement = document.getElementById("dep-phone-number");
  if (phoneElement) {
    phoneElement.innerText = method === 'bkash' ? '01700000000' : '01800000000';
  }
};

window.copyNumber = function(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    navigator.clipboard.writeText(el.innerText);
    alert("Copied to clipboard!");
  }
};

window.submitDeposit = async function() {
  const amount = parseFloat(document.getElementById("dep-amount").value);
  const trxid = document.getElementById("dep-trxid").value.trim();

  if (!amount || amount < 50) {
    return alert("Minimum deposit amount is ৳50.");
  }
  if (!trxid) {
    return alert("Please enter Transaction ID (TrxID).");
  }

  try {
    const depRef = doc(db, "deposits", `${currentUser.id}_${Date.now()}`);
    await setDoc(depRef, {
      user_id: currentUser.id,
      user_name: currentUser.first_name,
      amount: amount,
      trx_id: trxid,
      type: "Deposit",
      status: "Pending",
      timestamp: Date.now()
    });

    alert("Deposit request submitted successfully!");
    document.getElementById("dep-amount").value = "";
    document.getElementById("dep-trxid").value = "";
  } catch (err) {
    alert("Failed to submit deposit: " + err.message);
  }
};

window.submitWithdraw = async function() {
  const method = document.getElementById("withdraw-method").value;
  const num = document.getElementById("withdraw-number").value.trim();
  const amount = parseFloat(document.getElementById("withdraw-amount").value);

  if (!num) {
    return alert("Please enter your account number.");
  }
  if (!amount || amount < 100) {
    return alert("Minimum withdrawal amount is ৳100.");
  }
  if (amount > userBalance) {
    return alert("Insufficient Account Balance!");
  }

  const userRef = doc(db, "users", currentUser.id);
  const reqRef = doc(db, "withdrawals", `${currentUser.id}_${Date.now()}`);

  try {
    await runTransaction(db, async (transaction) => {
      const uSnap = await transaction.get(userRef);
      const curBal = uSnap.data().balance || 0;

      if (curBal < amount) throw new Error("Insufficient Balance!");

      transaction.update(userRef, { balance: curBal - amount });
      transaction.set(reqRef, {
        user_id: currentUser.id,
        user_name: currentUser.first_name,
        method: method,
        account: num,
        amount: amount,
        type: "Withdrawal",
        status: "Pending",
        timestamp: Date.now()
      });
    });

    alert("Withdrawal request submitted successfully!");
    document.getElementById("withdraw-number").value = "";
    document.getElementById("withdraw-amount").value = "";
  } catch (err) {
    alert("Withdrawal failed: " + err.message);
  }
};

// Fixed & Optimized Realtime Transaction History Listener
function listenTransactionHistory() {
  const container = document.getElementById("history-list-container");

  let depositsList = [];
  let withdrawalsList = [];

  const updateHistoryUI = () => {
    if (!container) return;
    const combined = [...depositsList, ...withdrawalsList].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    container.innerHTML = "";

    if (combined.length === 0) {
      container.innerHTML = `<p class="limit-note" style="text-align:center;">No transaction history found.</p>`;
      return;
    }

    combined.forEach(tx => {
      const statusClass = (tx.status || "pending").toLowerCase();
      const formattedDate = tx.timestamp ? new Date(tx.timestamp).toLocaleDateString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
      }) : "N/A";

      const item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML = `
        <div>
          <strong>${tx.type || 'Transaction'} (${tx.method || 'bKash'})</strong>
          <br><span class="limit-note">${formattedDate}</span>
        </div>
        <div style="text-align:right;">
          <strong>৳ ${tx.amount}</strong>
          <br><span class="status-badge ${statusClass}">${tx.status || 'Pending'}</span>
        </div>
      `;
      container.appendChild(item);
    });
  };

  const depQuery = query(collection(db, "deposits"), where("user_id", "==", currentUser.id));
  const withQuery = query(collection(db, "withdrawals"), where("user_id", "==", currentUser.id));

  onSnapshot(depQuery, (snap) => {
    depositsList = [];
    snap.forEach(d => depositsList.push(d.data()));
    updateHistoryUI();
  });

  onSnapshot(withQuery, (snap) => {
    withdrawalsList = [];
    snap.forEach(d => withdrawalsList.push(d.data()));
    updateHistoryUI();
  });
}

// --- MULTI-STEP JOIN WIZARD WITH AD INTEGRATIONS ---
window.openJoinModal = function(matchId, entryFee, maxSlots) {
  if (userBalance < entryFee) {
    alert("Insufficient Balance! Please deposit money to join.");
    navigateTo('wallet', document.querySelectorAll(".nav-item")[2]);
    return;
  }

  currentSelectedMatch = { id: matchId, fee: entryFee, maxSlots: maxSlots };
  const feeEl = document.getElementById("modal-entry-fee");
  if (feeEl) feeEl.innerText = entryFee;
  
  showWizardStepInternal(1);
  document.getElementById("join-modal").classList.remove("hidden");
};

window.closeJoinModal = function() {
  document.getElementById("join-modal").classList.add("hidden");
};

function showWizardStepInternal(stepNum) {
  document.querySelectorAll(".wizard-step").forEach(s => s.classList.remove("active"));
  const stepEl = document.getElementById(`wizard-step-${stepNum}`);
  if (stepEl) stepEl.classList.add("active");
}

window.goToWizardStep = function(stepNum) {
  if (stepNum === 2) {
    const ign = document.getElementById("join-game-name").value.trim();
    if (!ign) return alert("Please enter your In-Game Name!");
    tempStepData.ff_name = ign;

    // Adexium Ad Integration
    try {
      if (window.AdexiumWidget) {
        const widget = new window.AdexiumWidget({wid: '994b631c-6659-4975-a09b-9bb3b4eb0290', adFormat: 'interstitial'});
        widget.autoMode();
      }
    } catch (e) {
      console.log("Adexium failed, fallback to Monetag");
    }

    // Monetag Ad Integration
    if (typeof window.show_10373507 === 'function') {
      window.show_10373507().then(() => showWizardStepInternal(2)).catch(() => showWizardStepInternal(2));
    } else {
      showWizardStepInternal(2);
    }
  } else {
    showWizardStepInternal(stepNum);
  }
};

// Step 2 Trigger -> Gigapub Integration
window.confirmMatchJoin = function() {
  const uid = document.getElementById("join-game-uid").value.trim();
  if (!uid) return alert("Please enter your In-Game UID!");
  tempStepData.ff_uid = uid;

  // Gigapub Integration
  if (typeof window.showGiga === 'function') {
    window.showGiga()
      .then(() => triggerFinalAdsgramAndJoin())
      .catch(() => triggerFinalAdsgramAndJoin());
  } else {
    triggerFinalAdsgramAndJoin();
  }
};

// Final Confirmation -> Adsgram Ad & Firestore Transaction
function triggerFinalAdsgramAndJoin() {
  const AdController = window.Adsgram?.init({ blockId: "234313" });
  if (AdController) {
    AdController.show().then(() => {
      processTournamentRegistration();
    }).catch(() => {
      processTournamentRegistration();
    });
  } else {
    processTournamentRegistration();
  }
}

// Firestore Atomic Transaction for Fair Slot Management & Deductions
async function processTournamentRegistration() {
  if (!currentSelectedMatch) return;

  const userRef = doc(db, "users", currentUser.id);
  const matchRef = doc(db, "tournaments", currentSelectedMatch.id);

  try {
    await runTransaction(db, async (transaction) => {
      const uSnap = await transaction.get(userRef);
      const mSnap = await transaction.get(matchRef);

      if (!uSnap.exists()) throw new Error("User record missing!");
      if (!mSnap.exists()) throw new Error("Match no longer exists!");

      const curBal = uSnap.data().balance || 0;
      const matchesPlayed = uSnap.data().matchesPlayed || 0;
      const matchData = mSnap.data();
      const players = matchData.players || [];
      const maxSlots = matchData.maxSlots || currentSelectedMatch.maxSlots || 48;

      if (curBal < currentSelectedMatch.fee) throw new Error("Insufficient Balance!");
      if (players.length >= maxSlots) throw new Error("Match is already full!");
      if (players.some(p => p.id === currentUser.id)) throw new Error("You have already joined this match!");

      // Deduct balance and update stats
      transaction.update(userRef, { 
        balance: curBal - currentSelectedMatch.fee,
        matchesPlayed: matchesPlayed + 1 
      });

      // Add player to match document
      transaction.update(matchRef, {
        players: arrayUnion({
          id: currentUser.id,
          name: currentUser.first_name,
          ff_name: tempStepData.ff_name,
          ff_uid: tempStepData.ff_uid,
          joinedAt: Date.now()
        })
      });
    });

    alert("Successfully joined the tournament!");
    closeJoinModal();
  } catch (err) {
    alert("Join failed: " + err.message);
  }
      }
