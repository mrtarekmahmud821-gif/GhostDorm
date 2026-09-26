import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, runTransaction 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { notifyJoinedPlayers } from "./telegram-notify.js";

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

// সিকিউরিটি ভেরিফিকেশন কন্ডিশন
const ALLOWED_ADMIN_EMAIL = "tarekmahmud821@gmail.com";
const ALLOWED_ADMIN_UID = "pLzFxDLJHAQHkjkLRZahcFIcCLD2";

// Firebase সংযোগ
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let allMatchesMap = {};

// AUTH MONITORING (দ্বিগুণ সিকিউরিটি চেক)
onAuthStateChanged(auth, (user) => {
  if (user && user.email === ALLOWED_ADMIN_EMAIL && user.uid === ALLOWED_ADMIN_UID) {
    document.getElementById("login-overlay").classList.add("hidden");
    document.getElementById("admin-panel").classList.remove("hidden");
    initAdminData();
  } else {
    if (user) signOut(auth); // শর্ত না মিললে তাৎক্ষণিক সাইন-আউট
    document.getElementById("login-overlay").classList.remove("hidden");
    document.getElementById("admin-panel").classList.add("hidden");
  }
});

// LOGIN & LOGOUT
window.handleAdminLogin = async function() {
  const email = document.getElementById("admin-email").value.trim();
  const pass = document.getElementById("admin-pass").value.trim();

  if (email !== ALLOWED_ADMIN_EMAIL) {
    return alert("অনুমতি নেই! আপনি এডমিন নন।");
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    if (userCredential.user.uid !== ALLOWED_ADMIN_UID) {
      await signOut(auth);
      alert("সিকিউরিটি অ্যালার্ট! অননুমোদিত ইউজার আইডি!");
    }
  } catch (err) {
    alert("লগইন ব্যর্থ হয়েছে: " + err.message);
  }
};

window.handleAdminLogout = function() {
  signOut(auth);
};

// TAB NAVIGATION
window.switchTab = function(tabName, btn) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

  btn.classList.add("active");
  document.getElementById(`tab-${tabName}`).classList.add("active");
};

// INITIALIZE ADMIN DATA
function initAdminData() {
  listenAdminMatches();
  listenAdminLive();
  listenAdminDeposits();
  listenAdminWithdrawals();
  listenAdminUsers();
}

// --- MATCHES MANAGEMENT ---
window.createNewMatch = async function() {
  const title = document.getElementById("match-title").value.trim();
  const category = document.getElementById("match-category").value;
  const matchTime = document.getElementById("match-time").value.trim();
  const entryFee = parseFloat(document.getElementById("match-entry").value) || 0;
  const totalPrize = parseFloat(document.getElementById("match-prize").value) || 0;
  const maxSlots = parseInt(document.getElementById("match-slots").value) || 48;

  if (!title || !matchTime) return alert("সকল প্রয়োজনীয় তথ্য দিন!");

  try {
    const newDocRef = doc(collection(db, "tournaments"));
    await setDoc(newDocRef, {
      title, category, matchTime, entryFee, totalPrize, maxSlots,
      status: "active",
      players: [],
      createdAt: Date.now()
    });
    alert("ম্যাচ সফলভাবে পাবলিশ হয়েছে!");
    document.getElementById("match-title").value = "";
  } catch (e) {
    alert("এরর: " + e.message);
  }
};

function listenAdminMatches() {
  onSnapshot(collection(db, "tournaments"), (snap) => {
    const tbody = document.getElementById("admin-matches-table");
    const matchSelect = document.getElementById("live-match-select");
    tbody.innerHTML = "";
    matchSelect.innerHTML = '<option value="">-- Select Match --</option>';
    allMatchesMap = {};

    snap.forEach((docSnap) => {
      const m = docSnap.data();
      allMatchesMap[docSnap.id] = m;

      // Table Row
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${m.title}</strong></td>
        <td>${m.category}</td>
        <td>৳${m.entryFee}</td>
        <td>${(m.players || []).length}/${m.maxSlots}</td>
        <td>
          <button class="btn-action btn-delete" onclick="deleteMatch('${docSnap.id}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);

      // Populate Live Room Match Selector
      const opt = document.createElement("option");
      opt.value = docSnap.id;
      opt.textContent = `${m.title} (${(m.players || []).length} Players)`;
      matchSelect.appendChild(opt);
    });
  });
}

window.deleteMatch = async function(id) {
  if (confirm("আপনি কি নিশ্চিত এই ম্যাচটি ডিলিট করতে চান?")) {
    await deleteDoc(doc(db, "tournaments", id));
  }
};

// --- LIVE ROOM CODES & TELEGRAM ALERT ---
window.publishLiveMatch = async function() {
  const matchId = document.getElementById("live-match-select").value;
  const room_id = document.getElementById("live-room-id").value.trim();
  const room_pass = document.getElementById("live-room-pass").value.trim();

  if (!matchId || !room_id || !room_pass) {
    return alert("ম্যাচ নির্বাচন করুন এবং রুম আইডি ও পাসওয়ার্ড সঠিকভাবে দিন!");
  }

  const selectedMatch = allMatchesMap[matchId];
  if (!selectedMatch) return alert("ম্যাচ ডাটা পাওয়া যায়নি!");

  try {
    // 1. Save Room ID & Pass to Live Collection
    const newRef = doc(collection(db, "live_matches"));
    await setDoc(newRef, { 
      matchId: matchId,
      title: selectedMatch.title, 
      room_id, 
      room_pass, 
      timestamp: Date.now() 
    });

    alert("লাইভ রুম কোড ওয়েবসাইটে পাবলিশ করা হয়েছে!");

    // 2. Send Telegram Notification strictly to joined players
    await notifyJoinedPlayers(selectedMatch.players || [], selectedMatch.title, room_id, room_pass);

    document.getElementById("live-room-id").value = "";
    document.getElementById("live-room-pass").value = "";
  } catch (e) {
    alert("Error: " + e.message);
  }
};

function listenAdminLive() {
  onSnapshot(collection(db, "live_matches"), (snap) => {
    const tbody = document.getElementById("admin-live-table");
    tbody.innerHTML = "";
    snap.forEach((docSnap) => {
      const l = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${l.title}</td>
        <td><strong>${l.room_id}</strong></td>
        <td><strong>${l.room_pass}</strong></td>
        <td><button class="btn-action btn-delete" onclick="deleteLiveMatch('${docSnap.id}')">Remove</button></td>
      `;
      tbody.appendChild(tr);
    });
  });
}

window.deleteLiveMatch = async function(id) {
  await deleteDoc(doc(db, "live_matches", id));
};

// --- DEPOSITS MANAGEMENT ---
function listenAdminDeposits() {
  onSnapshot(collection(db, "deposits"), (snap) => {
    const tbody = document.getElementById("admin-deposits-table");
    tbody.innerHTML = "";
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.user_name || d.user_id}</td>
        <td>৳${d.amount}</td>
        <td><code>${d.trx_id}</code></td>
        <td><span class="status-badge status-${(d.status||'pending').toLowerCase()}">${d.status}</span></td>
        <td>
          ${d.status === "Pending" ? `
            <button class="btn-action btn-approve" onclick="processDeposit('${docSnap.id}', '${d.user_id}',${d.amount}, 'Approved')">Approve</button>
            <button class="btn-action btn-reject" onclick="processDeposit('${docSnap.id}', '${d.user_id}',${d.amount}, 'Rejected')">Reject</button>
          ` : 'Processed'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}

window.processDeposit = async function(depId, userId, amount, status) {
  const depRef = doc(db, "deposits", depId);
  const userRef = doc(db, "users", userId);

  try {
    await runTransaction(db, async (transaction) => {
      const uSnap = await transaction.get(userRef);
      if (status === "Approved") {
        const currentBal = uSnap.exists() ? (uSnap.data().balance || 0) : 0;
        transaction.update(userRef, { balance: currentBal + amount });
      }
      transaction.update(depRef, { status: status });
    });
    alert(`ডিপোজিট ${status} করা হয়েছে!`);
  } catch (e) { alert("এরর: " + e.message); }
};

// --- WITHDRAWALS MANAGEMENT ---
function listenAdminWithdrawals() {
  onSnapshot(collection(db, "withdrawals"), (snap) => {
    const tbody = document.getElementById("admin-withdrawals-table");
    tbody.innerHTML = "";
    snap.forEach((docSnap) => {
      const w = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${w.user_name || w.user_id}</td>
        <td>${w.method} - ${w.account}</td>
        <td>৳${w.amount}</td>
        <td><span class="status-badge status-${(w.status||'pending').toLowerCase()}">${w.status}</span></td>
        <td>
          ${w.status === "Pending" ? `
            <button class="btn-action btn-approve" onclick="processWithdrawal('${docSnap.id}', '${w.user_id}',${w.amount}, 'Approved')">Approve</button>
            <button class="btn-action btn-reject" onclick="processWithdrawal('${docSnap.id}', '${w.user_id}',${w.amount}, 'Rejected')">Reject</button>
          ` : 'Processed'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}

window.processWithdrawal = async function(wId, userId, amount, status) {
  const wRef = doc(db, "withdrawals", wId);
  const userRef = doc(db, "users", userId);

  try {
    await runTransaction(db, async (transaction) => {
      const uSnap = await transaction.get(userRef);
      if (status === "Rejected") {
        const currentBal = uSnap.exists() ? (uSnap.data().balance || 0) : 0;
        transaction.update(userRef, { balance: currentBal + amount });
      }
      transaction.update(wRef, { status: status });
    });
    alert(`উত্তোলন অনুরোধ ${status} করা হয়েছে!`);
  } catch (e) { alert("এরর: " + e.message); }
};

// --- USERS MANAGEMENT ---
function listenAdminUsers() {
  onSnapshot(collection(db, "users"), (snap) => {
    const tbody = document.getElementById("admin-users-table");
    tbody.innerHTML = "";
    snap.forEach((docSnap) => {
      const u = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${u.name || docSnap.id}</strong><br><small style="color:var(--text-sub);">${u.username||''}</small></td>
        <td>৳${(u.balance||0).toFixed(2)}</td>
        <td>${u.matchesPlayed || 0}</td>
        <td>${u.wins || 0}</td>
        <td>
          <button class="btn-action btn-approve" onclick="editUserPrompt('${docSnap.id}', ${u.balance||0}, ${u.wins||0})">Edit Data</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}

window.editUserPrompt = async function(userId, curBal, curWins) {
  const newBal = prompt("নতুন ব্যালেন্স লিখুন (৳):", curBal);
  if (newBal === null) return;
  
  const newWins = prompt("মোট জয় সংখ্যা লিখুন:", curWins);
  if (newWins === null) return;

  try {
    await updateDoc(doc(db, "users", userId), {
      balance: parseFloat(newBal) || 0,
      wins: parseInt(newWins) || 0
    });
    alert("ইউজার ডাটা আপডেট হয়েছে!");
  } catch (e) { alert("আপডেট ব্যর্থ: " + e.message); }
};
