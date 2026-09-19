import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, runTransaction, arrayUnion, collection 
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

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

// Language Translations Dictionary
const translations = {
  bn: {
    last_winner: "সর্বশেষ উইনার",
    daily_tournament: "দৈনিক ফ্রি ফায়ার টুর্নামেন্ট",
    entry_fee: "এন্ট্রি ফি:",
    joined_players: "অংশগ্রহণকারী:",
    join_now: "জয়েন করুন (৳১)",
    room_details: "রুমে যোগ দেওয়ার তথ্য (লাইভ)",
    joined_list_title: "প্লেয়ার তালিকা (৪৮ জন)",
    coming_soon: "কামিং সুন! নতুন টাস্ক এবং আর্নিং অপশন শীঘ্রই চালু করা হবে।",
    my_wallet: "মাই ওয়ালেট",
    current_balance: "বর্তমান ব্যালেন্স",
    withdraw: "টাকা উত্তোলন (Withdraw)",
    submit_withdraw: "উত্তোলন রিকুয়েস্ট দিন",
    withdraw_history: "উত্তোলন হিস্টোরি",
    deposit: "ডিপোজিট (Deposit)",
    submit_deposit: "ডিপোজিট রিকুয়েস্ট পাঠান",
    settings: "সেটিংস",
    change_lang: "ভাষা পরিবর্তন:",
    nav_home: "হোম",
    nav_earn: "আর্ন",
    nav_profile: "প্রোফাইল"
  },
  en: {
    last_winner: "Last Winner",
    daily_tournament: "Daily Free Fire Tournament",
    entry_fee: "Entry Fee:",
    joined_players: "Joined:",
    join_now: "Join Now (৳1)",
    room_details: "Room Credentials (Live)",
    joined_list_title: "Player List (48 Slots)",
    coming_soon: "Coming Soon! New tasks will be added shortly.",
    my_wallet: "My Wallet",
    current_balance: "Current Balance",
    withdraw: "Withdraw Funds",
    submit_withdraw: "Request Withdraw",
    withdraw_history: "Withdrawal History",
    deposit: "Deposit Funds",
    submit_deposit: "Submit Deposit",
    settings: "Settings",
    change_lang: "Language:",
    nav_home: "Home",
    nav_earn: "Earn",
    nav_profile: "Profile"
  }
};

// State Variables
let currentUser = {
  id: "guest_user",
  first_name: "Guest Player",
  username: "guest",
  photo_url: "https://via.placeholder.com/45"
};
let userBalance = 0;
let joinedPlayersList = [];
let isUserJoined = false;
let currentSelectedMode = "lone_wolf_solo";
let tempStepData = { ff_name: "", ff_uid: "" };
let matchUnsubscribe = null;

// Initialize Telegram WebApp Data & UI
document.addEventListener("DOMContentLoaded", () => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
      const u = tg.initDataUnsafe.user;
      currentUser.id = u.id.toString();
      currentUser.first_name = u.first_name || "User";
      currentUser.username = u.username ? `@${u.username}` : "";
      if (u.photo_url) currentUser.photo_url = u.photo_url;
    }
  }

  // Update UI Header Profile
  document.getElementById("user-avatar").src = currentUser.photo_url;
  document.getElementById("user-name").innerText = currentUser.first_name;
  document.getElementById("user-username").innerText = currentUser.username;

  // Language Setup
  const savedLang = localStorage.getItem("app_lang");
  if (!savedLang) {
    const langBox = document.getElementById("lang-selector-box");
    if (langBox) langBox.classList.remove("hidden");
  } else {
    applyLanguage(savedLang);
    hideLoadingScreen();
  }

  // Realtime Firebase Listeners
  initUserAccount();
  listenLiveMatches();
});

// Language Functions
window.selectAppLanguage = function(lang) {
  localStorage.setItem("app_lang", lang);
  applyLanguage(lang);
  hideLoadingScreen();
  const selectEl = document.getElementById("app-lang-select");
  if (selectEl) selectEl.value = lang;
};

function applyLanguage(lang) {
  const dict = translations[lang] || translations['bn'];
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.innerText = dict[key];
  });
}

function hideLoadingScreen() {
  const loader = document.getElementById("loading-screen");
  if (loader) loader.classList.add("hidden");
}

// Navigation Functions
window.switchTab = function(pageId, btnEl) {
  document.querySelectorAll(".page-section").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  btnEl.classList.add("active");
};

window.switchDepTab = function(type) {
  document.querySelectorAll(".dep-tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".dep-tab-content").forEach(c => c.classList.remove("active"));
  if (type === 'bkash') {
    if (event && event.target) event.target.classList.add("active");
    document.getElementById("dep-bkash-box").classList.add("active");
  } else {
    if (event && event.target) event.target.classList.add("active");
    document.getElementById("dep-nagad-box").classList.add("active");
  }
};

window.copyToClipboard = function(text) {
  navigator.clipboard.writeText(text);
  alert("কপি হয়েছে: " + text);
};

// Match Category Open & Close Handlers
window.openMatchCategory = function(modeKey) {
  currentSelectedMode = modeKey;
  const grid = document.querySelector(".match-categories-grid");
  if (grid) grid.classList.add("hidden");

  const detailBox = document.getElementById("tournament-detail-box");
  if (detailBox) detailBox.classList.remove("hidden");

  const titles = {
    'lone_wolf_solo': 'Lone Wolf Solo 1V1',
    'lone_wolf_duo': 'Lone Wolf Duo 2V2',
    'clash_squad': 'Clash Squad 4V4',
    'br_solo': 'Battle Royale Solo',
    'br_duo': 'Battle Royale Duo',
    'br_squad': 'Battle Royale Squad'
  };

  const titleEl = document.getElementById("selected-match-title");
  if (titleEl) titleEl.innerText = titles[modeKey] || 'Match Details';

  listenMatchDetails(modeKey);
};

window.closeCategoryDetail = function() {
  const detailBox = document.getElementById("tournament-detail-box");
  if (detailBox) detailBox.classList.add("hidden");

  const grid = document.querySelector(".match-categories-grid");
  if (grid) grid.classList.remove("hidden");
};

// --- FIREBASE FIRESTORE LISTENERS ---
function initUserAccount() {
  const userRef = doc(db, "users", currentUser.id);
  onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      userBalance = snap.data().balance || 0;
    } else {
      setDoc(userRef, {
        name: currentUser.first_name,
        username: currentUser.username,
        balance: 0
      });
      userBalance = 0;
    }
    const balAmt = document.getElementById("balance-amount");
    if (balAmt) balAmt.innerText = userBalance.toFixed(2);

    const profBal = document.getElementById("profile-balance");
    if (profBal) profBal.innerText = userBalance.toFixed(2);

    validateWithdrawBtn();
  });
}

function listenLiveMatches() {
  onSnapshot(collection(db, "live_matches"), (snapshot) => {
    const container = document.getElementById("live-matches-container");
    if (!container) return;
    container.innerHTML = "";
    if (snapshot.empty) {
      container.innerHTML = "<p style='color: var(--text-sub); text-align: center; margin-top: 20px;'>বর্তমানে কোনো লাইভ ম্যাচ নেই</p>";
      return;
    }
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const card = document.createElement("div");
      card.className = "live-match-card";
      card.innerHTML = `
        <div class="live-status-badge"><span class="pulse-dot"></span> LIVE</div>
        <h4>${data.title || "Free Fire Match"}</h4>
        <p class="live-mode-text">ম্যাপ: ${data.map || "Bermuda"} | সময়: ${data.time || "Live"}</p>
        <div class="credentials-container">
          <div class="cred-item">
            <span>Room ID:</span> <strong>${data.room_id || "N/A"}</strong>
            <button onclick="copyToClipboard('${data.room_id || ""}')"><i class="fa-regular fa-copy"></i></button>
          </div>
          <div class="cred-item">
            <span>Password:</span> <strong>${data.room_pass || "N/A"}</strong>
            <button onclick="copyToClipboard('${data.room_pass || ""}')"><i class="fa-regular fa-copy"></i></button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  });
}

function listenMatchDetails(mode) {
  if (matchUnsubscribe) matchUnsubscribe();

  const matchRef = doc(db, "tournaments", mode);
  matchUnsubscribe = onSnapshot(matchRef, (snap) => {
    if (!snap.exists()) {
      joinedPlayersList = [];
      updateSlotUI(0);
      renderSlotsGrid();
      resetJoinButton();
      return;
    }
    const data = snap.data();

    // Update Slots
    joinedPlayersList = data.players || [];
    const count = joinedPlayersList.length;
    updateSlotUI(count);

    // Render Slots Grid List
    renderSlotsGrid();

    // Check if current user is in match
    isUserJoined = joinedPlayersList.some(p => p.id === currentUser.id);
    const joinBtn = document.getElementById("btn-join-match");
    if (joinBtn) {
      if (isUserJoined) {
        joinBtn.disabled = true;
        joinBtn.innerText = "Joined";
      } else if (count >= 48) {
        joinBtn.disabled = true;
        joinBtn.innerText = "Team Full";
      } else {
        joinBtn.disabled = false;
        joinBtn.innerText = "জয়েন করুন (৳১)";
      }
    }
  });
}

function updateSlotUI(count) {
  const slotText = document.getElementById("slot-count-text");
  if (slotText) slotText.innerText = `${count} / 48`;

  const pct = (count / 48) * 100;
  const barFill = document.getElementById("progress-bar-fill");
  if (barFill) barFill.style.width = `${pct}%`;
}

function resetJoinButton() {
  const joinBtn = document.getElementById("btn-join-match");
  if (joinBtn) {
    joinBtn.disabled = false;
    joinBtn.innerText = "জয়েন করুন (৳১)";
  }
}

function renderSlotsGrid() {
  const container = document.getElementById("players-slot-list");
  if (!container) return;
  container.innerHTML = "";
  for (let i = 1; i <= 48; i++) {
    const pData = joinedPlayersList[i - 1];
    const item = document.createElement("div");
    item.className = "slot-item";
    item.innerHTML = `
      <span class="slot-num">#${i}</span>
      <span class="slot-name">${pData ? pData.ff_name : "Empty"}</span>
    `;
    container.appendChild(item);
  }
}

// --- MULTI-STEP JOIN TOURNAMENT & AD INTEGRATION ---
window.openJoinWizard = function() {
  if (userBalance < 1) {
    alert("পর্যাপ্ত ব্যালেন্স নেই! দয়া করে ডিপোজিট করুন।");
    const profileNav = document.querySelectorAll(".nav-item")[3] || document.querySelectorAll(".nav-item")[2];
    switchTab('page-profile', profileNav);
    return;
  }
  document.getElementById("join-modal").classList.remove("hidden");
  showWizardStep(1);
};

window.closeJoinWizard = function() {
  document.getElementById("join-modal").classList.add("hidden");
};

function showWizardStep(stepNum) {
  document.querySelectorAll(".wizard-step").forEach(s => s.classList.remove("active"));
  const currentStep = document.getElementById(`wizard-step-${stepNum}`);
  if (currentStep) currentStep.classList.add("active");
}

// Step 1: In-game Name -> Adexium Ad (Fallback: Monetag)
window.submitStep1 = function() {
  const val = document.getElementById("input-ff-name").value.trim();
  if (!val) return alert("Free Fire গেম নেম অবশ্যই দিতে হবে!");
  tempStepData.ff_name = val;

  // Trigger Adexium Ad
  try {
    if (window.AdexiumWidget) {
      const widget = new AdexiumWidget({wid: '994b631c-6659-4975-a09b-9bb3b4eb0290', adFormat: 'interstitial'});
      widget.autoMode();
    }
  } catch (e) {
    console.log("Adexium failed, triggering Monetag");
  }

  // Monetag Fallback
  if (typeof window.show_10373507 === 'function') {
    window.show_10373507().then(() => {
      showWizardStep(2);
    }).catch(() => showWizardStep(2));
  } else {
    showWizardStep(2);
  }
};

// Step 2: Player UID -> Gigapub
window.submitStep2 = function() {
  const val = document.getElementById("input-ff-uid").value.trim();
  if (!val) return alert("Player UID দিতে হবে!");
  tempStepData.ff_uid = val;

  // Gigapub Trigger
  if (typeof window.showGiga === 'function') {
    window.showGiga()
      .then(() => showWizardStep(3))
      .catch(() => showWizardStep(3));
  } else {
    showWizardStep(3);
  }
};

// Step 3: Final Join Confirmation -> Adsgram Ad & Balance Deduction
window.submitStep3Final = function() {
  // Adsgram Ad SDK Integration (Block Id: 234313)
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
};

// Firestore Transaction for Safe Registration
async function processTournamentRegistration() {
  const userRef = doc(db, "users", currentUser.id);
  const matchMode = currentSelectedMode || "lone_wolf_solo";
  const matchRef = doc(db, "tournaments", matchMode);

  try {
    await runTransaction(db, async (transaction) => {
      const uSnap = await transaction.get(userRef);
      const mSnap = await transaction.get(matchRef);

      if (!uSnap.exists()) throw "User record missing!";

      const curBal = uSnap.data().balance || 0;
      if (curBal < 1) throw "Insufficient Balance!";

      let players = [];
      if (mSnap.exists()) {
        players = mSnap.data().players || [];
      } else {
        transaction.set(matchRef, { players: [] });
      }

      if (players.length >= 48) throw "Match Full!";

      // Deduct Balance ৳1 & Add Player to Array
      transaction.update(userRef, { balance: curBal - 1 });
      transaction.set(matchRef, {
        players: arrayUnion({
          id: currentUser.id,
          ff_name: tempStepData.ff_name,
          ff_uid: tempStepData.ff_uid
        })
      }, { merge: true });
    });

    alert("সফলভাবে টুর্নামেন্টে জয়েন সম্পন্ন হয়েছে!");
    closeJoinWizard();
  } catch (err) {
    alert("ত্রুটি: " + err);
  }
}

// --- WITHDRAW & DEPOSIT LOGIC ---
window.validateWithdrawBtn = function() {
  const methodEl = document.getElementById("withdraw-method");
  const amtEl = document.getElementById("withdraw-amount");
  const btn = document.getElementById("btn-withdraw-submit");
  if (!methodEl || !amtEl || !btn) return;

  const method = methodEl.value;
  const amount = parseFloat(amtEl.value) || 0;

  let min = (method === 'nagad') ? 100 : 20;
  btn.disabled = !(amount >= min && userBalance >= amount);
};

window.handleWithdrawSubmit = async function() {
  const method = document.getElementById("withdraw-method").value;
  const amount = parseFloat(document.getElementById("withdraw-amount").value);
  const account = document.getElementById("withdraw-account").value.trim();

  if (!account) return alert("নম্বর পূরণ করুন!");

  const userRef = doc(db, "users", currentUser.id);
  const reqRef = doc(db, "withdrawals", `${currentUser.id}_${Date.now()}`);

  try {
    await runTransaction(db, async (transaction) => {
      const uSnap = await transaction.get(userRef);
      const curBal = uSnap.data().balance || 0;
      if (curBal < amount) throw "অপর্যাপ্ত ব্যালেন্স!";

      transaction.update(userRef, { balance: curBal - amount });
      transaction.set(reqRef, {
        user_id: currentUser.id,
        user_name: currentUser.first_name,
        method: method,
        amount: amount,
        account: account,
        status: "pending",
        timestamp: Date.now()
      });
    });

    alert("উত্তোলন রিকুয়েস্ট সফলভাবে জমা হয়েছে!");
    document.getElementById("withdraw-amount").value = "";
    document.getElementById("withdraw-account").value = "";
  } catch (e) {
    alert("ব্যর্থ হয়েছে: " + e);
  }
};

window.handleDepositSubmit = async function() {
  const amount = parseFloat(document.getElementById("dep-amount").value);
  const phone = document.getElementById("dep-phone").value.trim();
  const trxi = document.getElementById("dep-trxi").value.trim();

  if (!amount || !phone || !trxi) return alert("সবগুলো ঘর পূরণ করুন!");

  const depRef = doc(db, "deposits", `${currentUser.id}_${Date.now()}`);
  await setDoc(depRef, {
    user_id: currentUser.id,
    user_name: currentUser.first_name,
    amount: amount,
    phone: phone,
    trx_id: trxi,
    status: "pending",
    timestamp: Date.now()
  });

  alert("ডিপোজিট রিকুয়েস্ট সফলভাবে পাঠানো হয়েছে। এডমিন যাচাই করে ব্যালেন্স যোগ করবে।");
  document.getElementById("dep-amount").value = "";
  document.getElementById("dep-phone").value = "";
  document.getElementById("dep-trxi").value = "";
};
