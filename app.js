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
  id: "TG_guest_user",
  raw_id: "guest_user",
  first_name: "Player",
  username: "@player",
  photo_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmZ3dl2NZJPLDStjwXI8wbVfPMFeGzGVrr5YLxhk8MUtqCpxb1bOfE4_Y&s=10"
};

let userBalance = 0;
let currentSelectedMode = "";
let currentSelectedMatch = null;
let selectedTeamNo = 1;
let selectedSlotNo = 1;
let tempStepData = { ff_name: "", ff_uid: "" };
let activeMatchUnsubscribe = null;
let startParam = "";

// BOT USERNAME
const BOT_USERNAME = "YourBotUsername_bot"; 

const tg = window.Telegram?.WebApp;

// MULTI-LANGUAGE TRANSLATION DICTIONARY
const TRANSLATIONS = {
  en: {
    last_winner: "Latest Winner",
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
    current_balance_lbl: "Account Balance: ",
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
    total_referrals: "Total Referrals (৳2 Bonus Each)",
    referral_link_label: "Your Referral Link (Share with friends to earn):",
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
    no_matches_found: "No active matches available for this category.",
    bkash_instruction: "Make Payment to bKash Merchant Number:",
    nagad_instruction: "Send Money to Nagad Personal Number:",
    dep_amount_ph: "Deposit Amount (Min ৳50)",
    trxid_ph: "Enter Transaction ID (TrxID)",
    withdraw_num_ph: "Enter Account Number",
    withdraw_amt_ph: "Withdraw Amount (Min ৳100)",
    loading_matches: "Loading matches...",
    no_live_msg: "No live room IDs available for your joined matches yet.",
    room_pending_msg: "⏳ Room ID & Password will be provided 10 minutes before the match starts.",
    copied_msg: "Copied to clipboard!",
    dep_success_msg: "Deposit request submitted successfully!\nIt will be verified and credited within 30 minutes.",
    min_dep_alert: "Minimum deposit amount is ৳50",
    invalid_trx_alert: "Please enter a valid Transaction ID (e.g., 9J87X6Y5Z4)!\nFake or demo IDs are not allowed.",
    total_prize: "Total Prize",
    entry_fee: "Entry Fee",
    slots_joined: "Slots Joined",
    btn_joined: "Joined",
    btn_full: "Match Full",
    btn_join: "Join Match",
    no_history: "No transaction history found.",
    view_details: "View Details",
    view_match: "View Match",
    select_team: "Select Team & Slot",
    match_rules: "Match Rules & Details"
  },
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
    current_balance_lbl: "অ্যাকাউন্ট ব্যালেন্স: ",
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
    total_referrals: "মোট রেফারেল (প্রতি রেফারে ৳২)",
    referral_link_label: "আপনার রেফারেল লিংক (বন্ধুকে দিয়ে রেফার করুন ও টাকা জিতুন):",
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
    no_matches_found: "এই ক্যাটাগরিতে বর্তমানে কোনো ম্যাচ চালু নেই।",
    bkash_instruction: "bKash মার্চেন্ট নাম্বারে (Make Payment) করুন:",
    nagad_instruction: "নগদ পার্সোনাল নাম্বারে (Send Money) করুন:",
    dep_amount_ph: "ডিপোজিট পরিমাণ (সর্বনিম্ন ৳৫০)",
    trxid_ph: "Transaction ID (TrxID) দিন",
    withdraw_num_ph: "একাউন্ট নম্বর লিখুন",
    withdraw_amt_ph: "উইথড্র পরিমাণ (সর্বনিম্ন ৳১০০)",
    loading_matches: "ম্যাচ লোড হচ্ছে...",
    no_live_msg: "আপনার জয়েন করা কোনো ম্যাচের রুম আইডি এখনো প্রকাশ করা হয়নি।",
    room_pending_msg: "⏳ রুম আইডি ও পাসওয়ার্ড খেলা শুরুর ১০ মিনিট আগে এখানে দেওয়া হবে।",
    copied_msg: "কপি করা হয়েছে!",
    dep_success_msg: "ডিপোজিট রিকোয়েস্ট সফলভাবে জমা নেওয়া হয়েছে!\n৩০ মিনিটের মধ্যে ভেরিফাই করে একাউন্টে টাকা যোগ করে দেওয়া হবে।",
    min_dep_alert: "সর্বনিম্ন ডিপোজিট পরিমাণ ৳৫০",
    invalid_trx_alert: "সঠিক Transaction ID দিন! (যেমন: 9J87X6Y5Z4)\nকোনো ভুয়া বা ডেমো TrxID গ্রহণযোগ্য নয়।",
    total_prize: "মোট প্রাইজ",
    entry_fee: "এন্ট্রি ফি",
    slots_joined: "প্লেয়ার জয়েন",
    btn_joined: "জয়েন করা হয়েছে",
    btn_full: "ম্যাচ ফুল",
    btn_join: "জয়েন করুন",
    no_history: "কোনো লেনদেনের ইতিহাস পাওয়া যায়নি।",
    view_details: "View Details",
    view_match: "View Match",
    select_team: "টিম ও স্লট সিলেক্ট করুন",
    match_rules: "ম্যাচ নিয়ম ও বিস্তারিত"
  }
};

// Default Language is ENGLISH (en)
let currentLang = localStorage.getItem("user_language") || "en";

// Category Configurations
const MODE_CONFIGS = {
  'lone_wolf_1v1': { title: 'Lone Wolf Solo (1V1)', maxSlots: 2, teamSize: 1 },
  'lone_wolf_2v2': { title: 'Lone Wolf Duo (2V2)', maxSlots: 4, teamSize: 2 },
  'clash_squad_4v4': { title: 'Clash Squad (4V4)', maxSlots: 8, teamSize: 4 },
  'br_solo': { title: 'Battle Royale Solo', maxSlots: 48, teamSize: 1 },
  'br_duo': { title: 'Battle Royale Duo', maxSlots: 48, teamSize: 2 },
  'br_squad': { title: 'Battle Royale Squad', maxSlots: 48, teamSize: 4 }
};

// Global Store for Matches Data
let loadedMatchesMap = {};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
      const u = tg.initDataUnsafe.user;
      currentUser.raw_id = u.id.toString();
      currentUser.id = `TG_${u.id}`; 
      currentUser.first_name = u.first_name || "Player";
      currentUser.username = u.username ? `@${u.username}` : `@user_${u.id}`;
      if (u.photo_url) currentUser.photo_url = u.photo_url;
    }
    if (tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
      startParam = tg.initDataUnsafe.start_param;
    }
    setupTelegramBackButton();
  }

  // Load Saved Language
  const langSelect = document.getElementById("language-selector");
  if (langSelect) langSelect.value = currentLang;
  applyLanguage(currentLang);

  renderHeaderProfile();
  initUserAccount();
  listenLiveMatches();
  listenTransactionHistory();
  fixWalletInputSpacing();
});

function setupTelegramBackButton() {
  if (!tg || !tg.BackButton) return;

  tg.BackButton.onClick(() => {
    const matchesView = document.getElementById("matches-list-view");
    if (matchesView && !matchesView.classList.contains("hidden")) {
      backToCategories();
    } else {
      navigateTo('home');
    }
  });
}

// LANGUAGE SWITCHER SYSTEM
window.changeLanguage = function(lang) {
  currentLang = lang;
  localStorage.setItem("user_language", lang);
  applyLanguage(lang);
};

function applyLanguage(lang) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.innerText = dict[key];
    }
  });

  const depAmt = document.getElementById("dep-amount");
  const depTrx = document.getElementById("dep-trxid");
  const wNum = document.getElementById("withdraw-number");
  const wAmt = document.getElementById("withdraw-amount");

  if (depAmt) depAmt.placeholder = dict.dep_amount_ph;
  if (depTrx) depTrx.placeholder = dict.trxid_ph;
  if (wNum) wNum.placeholder = dict.withdraw_num_ph;
  if (wAmt) wAmt.placeholder = dict.withdraw_amt_ph;

  if (currentSelectedMode) {
    listenCategoryMatches(currentSelectedMode);
  }
  listenLiveMatches();
  listenTransactionHistory();
}

function fixWalletInputSpacing() {
  const inputs = document.querySelectorAll("#dep-amount, #dep-trxid, #withdraw-number, #withdraw-amount");
  inputs.forEach(input => {
    input.style.marginBottom = "12px";
    input.style.marginTop = "4px";
    input.style.padding = "10px 12px";
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
  if (profId) profId.innerText = `${currentUser.username} (${currentUser.id})`;
}

// --- NAVIGATION HANDLERS ---
window.navigateTo = function(pageId, element) {
  document.querySelectorAll(".page-section").forEach(sec => sec.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));

  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) targetPage.classList.add("active");
  if (element) element.classList.add("active");

  if (tg && tg.BackButton) {
    if (pageId === 'home') {
      tg.BackButton.hide();
    } else {
      tg.BackButton.show();
    }
  }
};

// --- FIRESTORE REALTIME USER ACCOUNT ---
function initUserAccount() {
  const userRef = doc(db, "users", currentUser.id);
  onSnapshot(userRef, async (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      userBalance = data.balance || 0;
      
      const playedEl = document.getElementById("stat-played");
      const winsEl = document.getElementById("stat-wins");
      const refCountEl = document.getElementById("stat-referrals");
      const refLinkInput = document.getElementById("referral-link-input");

      if (playedEl) playedEl.innerText = data.matchesPlayed || 0;
      if (winsEl) winsEl.innerText = data.wins || 0;
      if (refCountEl) refCountEl.innerText = data.referralsCount || 0;
      if (refLinkInput) refLinkInput.value = `https://t.me/${BOT_USERNAME}?start=ref_${currentUser.id}`;
    } else {
      let initialBalance = 0;
      let referredBy = null;

      if (startParam) {
        const refId = startParam.replace("ref_", "").trim();
        if (refId && refId !== currentUser.id) {
          referredBy = refId;
          initialBalance = 1;
        }
      }

      await setDoc(userRef, {
        telegram_id: currentUser.raw_id,
        name: currentUser.first_name,
        username: currentUser.username,
        balance: initialBalance,
        matchesPlayed: 0,
        wins: 0,
        referredBy: referredBy,
        referralsCount: 0,
        createdAt: Date.now()
      });

      userBalance = initialBalance;

      if (referredBy) {
        rewardReferrer(referredBy);
      }
    }
    updateBalanceDisplays();
  });
}

async function rewardReferrer(referrerId) {
  const referrerRef = doc(db, "users", referrerId);
  try {
    await runTransaction(db, async (transaction) => {
      const refSnap = await transaction.get(referrerRef);
      if (refSnap.exists()) {
        const refData = refSnap.data();
        const curBal = refData.balance || 0;
        const curRefs = refData.referralsCount || 0;
        transaction.update(referrerRef, {
          balance: curBal + 2,
          referralsCount: curRefs + 1
        });
      }
    });
  } catch (e) {
    console.error("Referral bonus error:", e);
  }
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

// --- CATEGORY MATCHES LISTENERS ---
window.openCategoryMatches = function(categoryKey) {
  currentSelectedMode = categoryKey;
  const grid = document.getElementById("category-list-view");
  const matchesView = document.getElementById("matches-list-view");

  if (grid) grid.classList.add("hidden");
  if (matchesView) matchesView.classList.remove("hidden");

  const config = MODE_CONFIGS[categoryKey] || { title: 'Matches', maxSlots: 48 };
  const titleEl = document.getElementById("selected-category-title");
  if (titleEl) titleEl.innerText = config.title;

  if (tg && tg.BackButton) tg.BackButton.show();

  listenCategoryMatches(categoryKey);
};

window.backToCategories = function() {
  if (activeMatchUnsubscribe) activeMatchUnsubscribe();
  
  const matchesView = document.getElementById("matches-list-view");
  const grid = document.getElementById("category-list-view");

  if (matchesView) matchesView.classList.add("hidden");
  if (grid) grid.classList.remove("hidden");

  if (tg && tg.BackButton) tg.BackButton.hide();
};

function listenCategoryMatches(categoryKey) {
  if (activeMatchUnsubscribe) activeMatchUnsubscribe();

  const container = document.getElementById("active-matches-container");
  if (!container) return;

  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  container.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-sub);">${dict.loading_matches}</div>`;

  const config = MODE_CONFIGS[categoryKey] || { maxSlots: 48, teamSize: 1 };
  const q = collection(db, "tournaments");

  activeMatchUnsubscribe = onSnapshot(q, (snapshot) => {
    container.innerHTML = "";
    let hasActiveMatches = false;

    snapshot.forEach((docSnap) => {
      const match = { id: docSnap.id, ...docSnap.data() };
      loadedMatchesMap[match.id] = match;

      const matchCategory = (match.category || "").trim();
      if (matchCategory !== categoryKey) return;
      if (match.status && match.status !== "active") return;

      hasActiveMatches = true;
      const players = match.players || [];
      const joinedCount = players.length;
      const maxSlots = match.maxSlots || config.maxSlots;
      const isJoined = players.some(p => p.id === currentUser.id);
      const isFull = joinedCount >= maxSlots;
      const progressPercent = Math.min(100, (joinedCount / maxSlots) * 100);

      // Room credentials with direct COPY buttons
      let roomInfoHTML = "";
      if (isJoined) {
        if (match.roomId && match.roomPass) {
          roomInfoHTML = `
            <div style="background: rgba(46, 213, 115, 0.12); border: 1px solid #2ed573; border-radius: 8px; padding: 10px; margin: 10px 0;">
              <div style="color: #2ed573; font-weight: bold; margin-bottom: 8px; text-align: center;">🔑 Room Credentials</div>
              <div class="copy-number-box" style="margin-bottom: 6px;">
                <span>ID: <strong id="card-room-id-${match.id}">${match.roomId}</strong></span>
                <button onclick="copyNumber('card-room-id-${match.id}')"><i class="fa-solid fa-copy"></i> ${dict.copy}</button>
              </div>
              <div class="copy-number-box">
                <span>Pass: <strong id="card-room-pass-${match.id}">${match.roomPass}</strong></span>
                <button onclick="copyNumber('card-room-pass-${match.id}')"><i class="fa-solid fa-copy"></i> ${dict.copy}</button>
              </div>
            </div>
          `;
        } else {
          roomInfoHTML = `
            <div style="background: rgba(255, 171, 0, 0.1); border: 1px solid #ffab00; border-radius: 8px; padding: 8px; margin: 10px 0; text-align: center; font-size: 12px; color: #ffab00;">
              ${dict.room_pending_msg}
            </div>
          `;
        }
      }

      const card = document.createElement("div");
      card.className = "tournament-card";
      card.innerHTML = `
        <div class="card-header">
          <h3>${match.title || "Free Fire Tournament"}</h3>
          <span class="match-time"><i class="fa-regular fa-clock"></i> ${match.matchTime || "Today"}</span>
        </div>
        
        <div class="prize-pool-grid">
          <div class="prize-item">
            <span class="prize-rank">${dict.total_prize}</span>
            <span class="prize-val">৳ ${match.totalPrize || 0}</span>
          </div>
        </div>
        
        <div class="entry-fee-box">
          <span>${dict.entry_fee}:</span>
          <strong class="prize-val">৳ ${match.entryFee || 0}</strong>
        </div>

        <div class="slots-progress">
          <div class="progress-info">
            <span>${dict.slots_joined}</span>
            <span>${joinedCount}/${maxSlots}</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
          </div>
        </div>

        ${roomInfoHTML}

        <!-- TWO NEW ACTION BUTTONS -->
        <div style="display: flex; gap: 8px; margin-top: 12px; margin-bottom: 8px;">
          <button class="btn-primary-glow" style="flex: 1; background: #2f3542; font-size: 12px; padding: 8px;" onclick="openMatchDetailsModal('${match.id}')">
            <i class="fa-solid fa-eye"></i> ${dict.view_details}
          </button>
          <button class="btn-primary-glow" style="flex: 1; background: #ff4757; font-size: 12px; padding: 8px;" onclick="openYouTubeChannel()">
            <i class="fa-solid fa-play"></i> ${dict.view_match}
          </button>
        </div>

        <button class="btn-primary-glow" ${isJoined || isFull ? 'disabled' : ''} onclick="openJoinModal('${match.id}', ${match.entryFee || 0}, ${maxSlots}, ${config.teamSize})">
          ${isJoined ? dict.btn_joined : (isFull ? dict.btn_full : dict.btn_join)}
        </button>
      `;
      container.appendChild(card);
    });

    if (!hasActiveMatches) {
      container.innerHTML = `<div class="empty-matches-msg" style="text-align:center; padding: 30px; color: var(--text-sub);">${dict.no_matches_found}</div>`;
    }
  }, (error) => {
    console.error("Firestore Match Error:", error);
  });
}

// --- MATCH DETAILS MODAL & YOUTUBE ---
window.openMatchDetailsModal = function(matchId) {
  const match = loadedMatchesMap[matchId];
  const contentEl = document.getElementById("match-details-content");
  if (match && contentEl) {
    const details = match.description || match.rules || "এই ম্যাচের জন্য কোনো বিশেষ কমেন্ট বা নির্দেশিকা দেওয়া হয়নি। নিয়ম মাফিক গেম খেলুন।";
    contentEl.innerText = details;
    document.getElementById("details-modal").classList.remove("hidden");
  }
};

window.closeDetailsModal = function() {
  document.getElementById("details-modal").classList.add("hidden");
};

window.openYouTubeChannel = function() {
  const ytUrl = "https://youtube.com/@dark-team-1m?si=a1sk1zpbZurXwvp5";
  if (window.Telegram?.WebApp?.openLink) {
    window.Telegram.WebApp.openLink(ytUrl);
  } else {
    window.open(ytUrl, "_blank");
  }
};

// --- LIVE TAB FIRESTORE LISTENER ---
function listenLiveMatches() {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  onSnapshot(collection(db, "tournaments"), (snapshot) => {
    const container = document.getElementById("live-matches-container");
    if (!container) return;
    container.innerHTML = "";

    let hasLiveMatches = false;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const players = data.players || [];
      const isJoined = players.some(p => p.id === currentUser.id);

      if (isJoined && data.roomId && data.roomPass) {
        hasLiveMatches = true;
        const card = document.createElement("div");
        card.className = "wallet-action-card";
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h4 style="color: var(--gold-color);">${data.title || "Live Free Fire Match"}</h4>
            <span class="status-badge approved">LIVE</span>
          </div>
          <div class="copy-number-box" style="margin-bottom: 6px;">
            <span>Room ID: <strong id="room-id-${docSnap.id}">${data.roomId}</strong></span>
            <button onclick="copyNumber('room-id-${docSnap.id}')"><i class="fa-solid fa-copy"></i> ${dict.copy}</button>
          </div>
          <div class="copy-number-box">
            <span>Password: <strong id="room-pass-${docSnap.id}">${data.roomPass}</strong></span>
            <button onclick="copyNumber('room-pass-${docSnap.id}')"><i class="fa-solid fa-copy"></i> ${dict.copy}</button>
          </div>
        `;
        container.appendChild(card);
      }
    });

    if (!hasLiveMatches) {
      container.innerHTML = `<p style="color: var(--text-sub); text-align: center; margin-top: 30px;">${dict.no_live_msg}</p>`;
    }
  });
}

// --- WALLET & HISTORY ---
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
  const instructionText = document.getElementById("dep-instruction-text");
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  if (method === 'bkash') {
    if (phoneElement) phoneElement.innerText = '01816640707';
    if (instructionText) instructionText.innerText = dict.bkash_instruction;
  } else {
    if (phoneElement) phoneElement.innerText = '01323431323';
    if (instructionText) instructionText.innerText = dict.nagad_instruction;
  }
};

window.copyNumber = function(elementId) {
  const el = document.getElementById(elementId);
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  if (el) {
    const textToCopy = el.value || el.innerText;
    navigator.clipboard.writeText(textToCopy);
    alert(dict.copied_msg);
  }
};

window.submitDeposit = async function() {
  const amountInput = document.getElementById("dep-amount");
  const trxInput = document.getElementById("dep-trxid");

  const amount = parseFloat(amountInput.value);
  let trxid = trxInput.value.trim().toUpperCase();
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  if (!amount || isNaN(amount) || amount < 50) {
    return alert(dict.min_dep_alert);
  }

  const trxRegex = /^[A-Z0-9]{8,12}$/;

  if (!trxid || !trxRegex.test(trxid) || /^(.)\1+$/.test(trxid) || trxid.includes("TEST")) {
    return alert(dict.invalid_trx_alert);
  }

  try {
    const depDocId = `${currentUser.id}_${Date.now()}`;
    const depRef = doc(db, "deposits", depDocId);

    await setDoc(depRef, {
      user_id: currentUser.id,
      telegram_id: currentUser.raw_id,
      user_name: currentUser.first_name,
      amount: amount,
      trx_id: trxid,
      type: "Deposit",
      status: "Pending",
      timestamp: Date.now()
    });

    alert(dict.dep_success_msg);
    amountInput.value = "";
    trxInput.value = "";
  } catch (err) {
    console.error("Deposit Error:", err);
    alert("Error: " + err.message);
  }
};

window.submitWithdraw = async function() {
  const method = document.getElementById("withdraw-method").value;
  const num = document.getElementById("withdraw-number").value.trim();
  const amount = parseFloat(document.getElementById("withdraw-amount").value);

  if (!num) return alert("Enter account number!");
  if (!amount || amount < 100) return alert("Minimum withdrawal is ৳100");
  if (amount > userBalance) return alert("Insufficient balance!");

  const userRef = doc(db, "users", currentUser.id);
  const reqRef = doc(db, "withdrawals", `${currentUser.id}_${Date.now()}`);

  try {
    await runTransaction(db, async (transaction) => {
      const uSnap = await transaction.get(userRef);
      const curBal = uSnap.data().balance || 0;

      if (curBal < amount) throw new Error("Insufficient balance!");

      transaction.update(userRef, { balance: curBal - amount });
      transaction.set(reqRef, {
        user_id: currentUser.id,
        telegram_id: currentUser.raw_id,
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

function listenTransactionHistory() {
  const container = document.getElementById("history-list-container");
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  let depositsList = [];
  let withdrawalsList = [];

  const updateHistoryUI = () => {
    if (!container) return;
    const combined = [...depositsList, ...withdrawalsList].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    container.innerHTML = "";

    if (combined.length === 0) {
      container.innerHTML = `<p class="limit-note" style="text-align:center;">${dict.no_history}</p>`;
      return;
    }

    combined.forEach(tx => {
      const statusClass = (tx.status || "pending").toLowerCase();
      const formattedDate = tx.timestamp ? new Date(tx.timestamp).toLocaleDateString(currentLang === 'bn' ? "bn-BD" : "en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
      }) : "N/A";

      const item = document.createElement("div");
      item.className = "history-item";
      item.style.marginBottom = "8px";
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

// --- MULTI-STEP JOIN WIZARD & TEAM/SLOT SELECTION ---
window.openJoinModal = function(matchId, entryFee, maxSlots, teamSize = 1) {
  if (userBalance < entryFee) {
    alert("Insufficient balance! Please deposit from wallet.");
    navigateTo('wallet', document.querySelectorAll(".nav-item")[2]);
    return;
  }

  currentSelectedMatch = { id: matchId, fee: entryFee, maxSlots: maxSlots, teamSize: teamSize };
  const feeEl = document.getElementById("modal-entry-fee");
  if (feeEl) feeEl.innerText = entryFee;
  
  if (teamSize > 1) {
    renderTeamSlots(matchId, maxSlots, teamSize);
    showWizardStepInternal(0);
  } else {
    selectedTeamNo = 1;
    selectedSlotNo = 1;
    showWizardStepInternal(1);
  }
  
  document.getElementById("join-modal").classList.remove("hidden");
};

function renderTeamSlots(matchId, maxSlots, teamSize) {
  const container = document.getElementById("team-slots-container");
  if (!container) return;
  container.innerHTML = "";

  const match = loadedMatchesMap[matchId] || {};
  const players = match.players || [];
  const totalTeams = Math.ceil(maxSlots / teamSize);

  selectedTeamNo = null;
  selectedSlotNo = null;

  for (let t = 1; t <= totalTeams; t++) {
    const teamBox = document.createElement("div");
    teamBox.style.cssText = "background: rgba(255,255,255,0.05); border-radius: 8px; padding: 10px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.1);";
    
    let slotsHTML = `<div style="font-weight: bold; font-size: 13px; color: var(--gold-color); margin-bottom: 6px;">Team ${t}</div><div style="display: flex; gap: 8px; flex-wrap: wrap;">`;

    for (let s = 1; s <= teamSize; s++) {
      const occupiedPlayer = players.find(p => p.teamNo === t && p.slotNo === s);
      const isTaken = !!occupiedPlayer;

      slotsHTML += `
        <button id="btn-slot-${t}-${s}" class="slot-btn" ${isTaken ? 'disabled' : ''} onclick="selectTeamAndSlot(${t}, ${s})" style="flex: 1; min-width: 60px; padding: 6px; font-size: 11px; border-radius: 6px; border: 1px solid ${isTaken ? '#555' : 'var(--gold-color)'}; background: ${isTaken ? '#333' : 'transparent'}; color: ${isTaken ? '#888' : '#fff'};">
          ${isTaken ? occupiedPlayer.name.substring(0, 7) : `Slot ${s}`}
        </button>
      `;
    }
    slotsHTML += `</div>`;
    teamBox.innerHTML = slotsHTML;
    container.appendChild(teamBox);
  }
}

window.selectTeamAndSlot = function(teamNo, slotNo) {
  document.querySelectorAll(".slot-btn").forEach(btn => {
    if (!btn.disabled) {
      btn.style.background = "transparent";
      btn.style.borderColor = "var(--gold-color)";
    }
  });

  const selectedBtn = document.getElementById(`btn-slot-${teamNo}-${slotNo}`);
  if (selectedBtn) {
    selectedBtn.style.background = "var(--gold-color)";
    selectedBtn.style.borderColor = "var(--gold-color)";
    selectedBtn.style.color = "#000";
  }

  selectedTeamNo = teamNo;
  selectedSlotNo = slotNo;
};

window.proceedToCredentialsStep = function() {
  if (!selectedTeamNo || !selectedSlotNo) {
    return alert("অনুগ্রহ করে যেকোনো একটি ফাঁকা টিম স্লট সিলেক্ট করুন!");
  }
  showWizardStepInternal(1);
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
    if (!ign) return alert("Enter Free Fire In-Game Name!");
    tempStepData.ff_name = ign;

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
  if (!uid) return alert("Enter Free Fire UID!");
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

async function processTournamentRegistration() {
  if (!currentSelectedMatch) return;

  const userRef = doc(db, "users", currentUser.id);
  const matchRef = doc(db, "tournaments", currentSelectedMatch.id);

  try {
    await runTransaction(db, async (transaction) => {
      const uSnap = await transaction.get(userRef);
      const mSnap = await transaction.get(matchRef);

      if (!uSnap.exists()) throw new Error("User data not found!");
      if (!mSnap.exists()) throw new Error("Match is no longer available!");

      const curBal = uSnap.data().balance || 0;
      const matchesPlayed = uSnap.data().matchesPlayed || 0;
      const matchData = mSnap.data();
      const players = matchData.players || [];
      const maxSlots = matchData.maxSlots || currentSelectedMatch.maxSlots || 48;

      if (curBal < currentSelectedMatch.fee) throw new Error("Insufficient balance!");
      if (players.length >= maxSlots) throw new Error("Match is already full!");
      if (players.some(p => p.id === currentUser.id)) throw new Error("You have already joined this match!");

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
          teamNo: selectedTeamNo || 1,
          slotNo: selectedSlotNo || 1,
          joinedAt: Date.now()
        })
      });
    });

    alert("Successfully joined the tournament!");
    closeJoinModal();
  } catch (err) {
    alert("Failed to join match: " + err.message);
  }
}
