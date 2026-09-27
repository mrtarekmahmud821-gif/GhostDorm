import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getFirestore, doc, setDoc, onSnapshot, runTransaction, arrayUnion, collection, query, where 
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
  first_name: "Player",
  username: "@player",
  photo_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmZ3dl2NZJPLDStjwXI8wbVfPMFeGzGVrr5YLxhk8MUtqCpxb1bOfE4_Y&s=10"
};

let userBalance = 0;
let currentSelectedMode = "";
let currentSelectedMatch = null;
let tempStepData = { ff_name: "", ff_uid: "" };
let activeMatchUnsubscribe = null;

// MULTI-LANGUAGE TRANSLATION DICTIONARY
const TRANSLATIONS = {
  bn: {
    last_winner: "সর্বশেষ বিজয়ী",
    no_winner_yet: "এখনো কোনো ফলাফল প্রকাশ হয়নি",
    select_category: "টুর্নামেন্ট ক্যাটাগরি সিলেক্ট করুন",
    max_2_players: "সর্বোচ্চ ২ জন প্লেয়ার",
    max_4_players: "সর্বোচ্চ ৪ জন প্লেয়ার (2v2)",
    max_8_players: "সর্বোচ্চ ৮ জন প্লেয়ার (4v4)",
    max_48_players: "সর্বোচ্চ ৪৮ জন প্লেয়ার",
    max_48_duo: "সর্বোচ্চ ৪৮ জন (Duo)",
    max_48_squad: "সর্বোচ্চ ৪৮ জন (Squad)",
    back_to_categories: "ক্যাটাগরিতে ফিরে যান",
    live_matches: "লাইভ রুম আইডি ও পাসওয়ার্ড",
    current_balance: "বর্তমান একাউন্ট ব্যালেন্স",
    deposit: "ডিপোজিট",
    withdraw: "উইথড্র",
    history: "হিসাব",
    deposit_money: "টাকা ডিপোজিট করুন",
    copy: "কপি",
    submit_deposit: "ডিপোজিট রিকোয়েস্ট পাঠান",
    withdraw_winnings: "টাকা উত্তোলন করুন",
    withdraw_time_note: "উইথড্র রিকোয়েস্ট ১-১২ ঘণ্টার মধ্যে প্রসেস করা হয়।",
    submit_withdraw: "উইথড্র রিকোয়েস্ট পাঠান",
    transaction_history: "লেনদেনের ইতিহাস",
    account_overview: "অ্যাকাউন্ট সামারি",
    matches_played: "মোট খেলেছেন",
    total_wins: "মোট জয়",
    join_tournament: "টুর্নামেন্টে জয়েন করুন",
    enter_ff_details: "আপনার সঠিক Free Fire গেম তথ্য লিখুন:",
    next_step: "পরবর্তী ধাপ",
    confirm_entry: "এন্ট্রি ফি নিশ্চিত করুন",
    fee_deduct_note: "এন্ট্রি ফি আপনার ব্যালেন্স থেকে কেটে নেওয়া হবে।",
    match_entry_fee: "ম্যাচ এন্ট্রি ফি:",
    confirm_pay: "কনফার্ম ও জয়েন করুন",
    nav_home: "হোম",
    nav_live: "লাইভ",
    nav_wallet: "ওয়ালেট",
    nav_profile: "প্রোফাইল",
    no_matches_found: "এই ক্যাটাগরিতে বর্তমানে কোনো ম্যাচ চালু নেই।"
  },
  en: {
    last_winner: "Last Winner",
    no_winner_yet: "No results published yet",
    select_category: "Select Tournament Category",
    max_2_players: "Max 2 Players",
    max_4_players: "Max 4 Players (2v2)",
    max_8_players: "Max 8 Players (4v4)",
    max_48_players: "Max 48 Players",
    max_48_duo: "Max 48 Players (Duo)",
    max_48_squad: "Max 48 Players (Squad)",
    back_to_categories: "Back to Categories",
    live_matches: "Live Room ID & Password",
    current_balance: "Current Account Balance",
    deposit: "Deposit",
    withdraw: "Withdraw",
    history: "History",
    deposit_money: "Deposit Money",
    copy: "Copy",
    submit_deposit: "Submit Deposit Request",
    withdraw_winnings: "Withdraw Winnings",
    withdraw_time_note: "Withdrawal requests are processed within 1-12 hours.",
    submit_withdraw: "Submit Withdrawal Request",
    transaction_history: "Transaction History",
    account_overview: "Account Overview",
    matches_played: "Matches Played",
    total_wins: "Total Wins",
    join_tournament: "Join Tournament",
    enter_ff_details: "Enter your exact Free Fire In-Game credentials:",
    next_step: "Next Step",
    confirm_entry: "Confirm Entry",
    fee_deduct_note: "Entry Fee will be deducted from your account balance.",
    match_entry_fee: "Match Entry Fee:",
    confirm_pay: "Confirm & Join",
    nav_home: "Home",
    nav_live: "Live",
    nav_wallet: "Wallet",
    nav_profile: "Profile",
    no_matches_found: "No active matches available for this category."
  }
};

let currentLang = localStorage.getItem("user_language") || "bn";

// Category Configurations
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

  // Load Saved Language
  const langSelect = document.getElementById("language-selector");
  if (langSelect) langSelect.value = currentLang;
  applyLanguage(currentLang);

  renderHeaderProfile();
  initUserAccount();
  listenLiveMatches();
  listenTransactionHistory();
});

// LANGUAGE SWITCHER SYSTEM
window.changeLanguage = function(lang) {
  currentLang = lang;
  localStorage.setItem("user_language", lang);
  applyLanguage(lang);
};

function applyLanguage(lang) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.bn;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.innerText = dict[key];
    }
  });
}

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

// --- CATEGORY MATCHES & FIRESTORE LISTENERS (FIXED VISIBILITY) ---
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

// এডমিন থেকে দেওয়া ম্যাচ সরাসরি দেখানোর জন্য ফিক্সড ক্যোয়ারি
function listenCategoryMatches(categoryKey) {
  if (activeMatchUnsubscribe) activeMatchUnsubscribe();

  const container = document.getElementById("active-matches-container");
  const config = MODE_CONFIGS[categoryKey] || { maxSlots: 48 };

  // Firestore Composite Index এরর এড়াতে শুধু ক্যাটাগরি ফিল্টার করে পরে ফিল্টারিং করা হয়েছে
  const q = query(
    collection(db, "tournaments"), 
    where("category", "==", categoryKey)
  );

  activeMatchUnsubscribe = onSnapshot(q, (snapshot) => {
    if (!container) return;
    container.innerHTML = "";

    let hasActiveMatches = false;

    snapshot.forEach((docSnap) => {
      const match = { id: docSnap.id, ...docSnap.data() };

      // শুধুমাত্র active ম্যাচ ফিল্টার
      if (match.status && match.status !== "active") return;

      hasActiveMatches = true;
      const players = match.players || [];
      const joinedCount = players.length;
      const maxSlots = match.maxSlots || config.maxSlots;
      const isJoined = players.some(p => p.id === currentUser.id);
      const isFull = joinedCount >= maxSlots;
      const progressPercent = Math.min(100, (joinedCount / maxSlots) * 100);

      const prizeHTML = `
        <div class="prize-item">
          <span class="prize-rank">Total Prize</span>
          <span class="prize-val">৳ ${match.totalPrize || 0}</span>
        </div>
      `;

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

    if (!hasActiveMatches) {
      const noMatchText = TRANSLATIONS[currentLang]?.no_matches_found || "No active matches.";
      container.innerHTML = `<div class="empty-matches-msg" style="text-align:center; padding: 20px; color: var(--text-sub);">${noMatchText}</div>`;
    }
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
      container.innerHTML = `<p style="color: var(--text-sub); text-align: center; margin-top: 30px;">কোনো লাইভ ম্যাচ বর্তমানে চালু নেই।</p>`;
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

// আপডেটেড বিকাশ ও নগদ নাম্বার সেটআপ
window.selectDepMethod = function(method, btn) {
  document.querySelectorAll(".dep-tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  
  const phoneElement = document.getElementById("dep-phone-number");
  const instructionText = document.getElementById("dep-instruction-text");

  if (method === 'bkash') {
    if (phoneElement) phoneElement.innerText = '01816640707';
    if (instructionText) instructionText.innerText = 'bKash মার্চেন্ট নাম্বারে (Make Payment) করুন:';
  } else {
    if (phoneElement) phoneElement.innerText = '01323431323';
    if (instructionText) instructionText.innerText = 'নগদ পার্সোনাল নাম্বারে (Send Money) করুন:';
  }
};

window.copyNumber = function(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    navigator.clipboard.writeText(el.innerText);
    alert("কপি করা হয়েছে!");
  }
};

window.submitDeposit = async function() {
  const amount = parseFloat(document.getElementById("dep-amount").value);
  const trxid = document.getElementById("dep-trxid").value.trim();

  if (!amount || amount < 50) {
    return alert("সর্বনিম্ন ডিপোজিট পরিমাণ ৳৫০");
  }
  if (!trxid) {
    return alert("Transaction ID (TrxID) দিন!");
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

    alert("ডিপোজিট রিকোয়েস্ট সফলভাবে জমা নেওয়া হয়েছে!");
    document.getElementById("dep-amount").value = "";
    document.getElementById("dep-trxid").value = "";
  } catch (err) {
    alert("ব্যর্থ হয়েছে: " + err.message);
  }
};

window.submitWithdraw = async function() {
  const method = document.getElementById("withdraw-method").value;
  const num = document.getElementById("withdraw-number").value.trim();
  const amount = parseFloat(document.getElementById("withdraw-amount").value);

  if (!num) return alert("মোবাইল নম্বর লিখুন!");
  if (!amount || amount < 100) return alert("সর্বনিম্ন উইথড্র ৳১০০");
  if (amount > userBalance) return alert("পর্যাপ্ত ব্যালেন্স নেই!");

  const userRef = doc(db, "users", currentUser.id);
  const reqRef = doc(db, "withdrawals", `${currentUser.id}_${Date.now()}`);

  try {
    await runTransaction(db, async (transaction) => {
      const uSnap = await transaction.get(userRef);
      const curBal = uSnap.data().balance || 0;

      if (curBal < amount) throw new Error("পর্যাপ্ত ব্যালেন্স নেই!");

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

    alert("উইথড্র রিকোয়েস্ট সফলভাবে জমা হয়েছে!");
    document.getElementById("withdraw-number").value = "";
    document.getElementById("withdraw-amount").value = "";
  } catch (err) {
    alert("উইথড্র ব্যর্থ: " + err.message);
  }
};

// Transaction History Listener
function listenTransactionHistory() {
  const container = document.getElementById("history-list-container");

  let depositsList = [];
  let withdrawalsList = [];

  const updateHistoryUI = () => {
    if (!container) return;
    const combined = [...depositsList, ...withdrawalsList].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    container.innerHTML = "";

    if (combined.length === 0) {
      container.innerHTML = `<p class="limit-note" style="text-align:center;">কোনো লেনদেনের ইতিহাস পাওয়া যায়নি।</p>`;
      return;
    }

    combined.forEach(tx => {
      const statusClass = (tx.status || "pending").toLowerCase();
      const formattedDate = tx.timestamp ? new Date(tx.timestamp).toLocaleDateString("bn-BD", {
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

// --- MULTI-STEP JOIN WIZARD ---
window.openJoinModal = function(matchId, entryFee, maxSlots) {
  if (userBalance < entryFee) {
    alert("পর্যাপ্ত ব্যালেন্স নেই! দয়া করে ওয়ালেট থেকে ডিপোজিট করুন।");
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
    if (!ign) return alert("Free Fire In-Game Name দিন!");
    tempStepData.ff_name = ign;

    // Adexium & Monetag Ad Trigger
    try {
      if (window.AdexiumWidget) {
        const widget = new window.AdexiumWidget({wid: '994b631c-6659-4975-a09b-9bb3b4eb0290', adFormat: 'interstitial'});
        widget.autoMode();
      }
    } catch (e) {}

    if (typeof window.show_10373507 === 'function') {
      window.show_10373507().then(() => showWizardStepInternal(2)).catch(() => showWizardStepInternal(2));
    } else {
      showWizardStepInternal(2);
    }
  } else {
    showWizardStepInternal(stepNum);
  }
};

window.confirmMatchJoin = function() {
  const uid = document.getElementById("join-game-uid").value.trim();
  if (!uid) return alert("Free Fire UID লিখুন!");
  tempStepData.ff_uid = uid;

  if (typeof window.showGiga === 'function') {
    window.showGiga()
      .then(() => triggerFinalAdsgramAndJoin())
      .catch(() => triggerFinalAdsgramAndJoin());
  } else {
    triggerFinalAdsgramAndJoin();
  }
};

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

// Atomic Firestore Transaction for Registration
async function processTournamentRegistration() {
  if (!currentSelectedMatch) return;

  const userRef = doc(db, "users", currentUser.id);
  const matchRef = doc(db, "tournaments", currentSelectedMatch.id);

  try {
    await runTransaction(db, async (transaction) => {
      const uSnap = await transaction.get(userRef);
      const mSnap = await transaction.get(matchRef);

      if (!uSnap.exists()) throw new Error("ইউজার ডাটা পাওয়া যায়নি!");
      if (!mSnap.exists()) throw new Error("ম্যাচটি আর উপলব্ধ নেই!");

      const curBal = uSnap.data().balance || 0;
      const matchesPlayed = uSnap.data().matchesPlayed || 0;
      const matchData = mSnap.data();
      const players = matchData.players || [];
      const maxSlots = matchData.maxSlots || currentSelectedMatch.maxSlots || 48;

      if (curBal < currentSelectedMatch.fee) throw new Error("পর্যাপ্ত ব্যালেন্স নেই!");
      if (players.length >= maxSlots) throw new Error("ম্যাচটি ইতিমধ্যে ফুল হয়ে গেছে!");
      if (players.some(p => p.id === currentUser.id)) throw new Error("আপনি ইতিমধ্যে এই ম্যাচে জয়েন করেছেন!");

      transaction.update(userRef, { 
        balance: curBal - currentSelectedMatch.fee,
        matchesPlayed: matchesPlayed + 1 
      });

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

    alert("সাফল্যের সাথে টুর্নামেন্টে জয়েন করা হয়েছে!");
    closeJoinModal();
  } catch (err) {
    alert("জয়েন হতে সমস্যা হয়েছে: " + err.message);
  }
      }
