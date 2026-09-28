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

// AUTH MONITORING
onAuthStateChanged(auth, (user) => {
  if (user && user.email === ALLOWED_ADMIN_EMAIL && user.uid === ALLOWED_ADMIN_UID) {
    document.getElementById("login-overlay").classList.add("hidden");
    document.getElementById("admin-panel").classList.remove("hidden");
    initAdminData();
  } else {
    if (user) signOut(auth);
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

// MODAL HELPERS
window.closeModal = function(modalId) {
  document.getElementById(modalId).classList.add("hidden");
};

// INITIALIZE ADMIN DATA
function initAdminData() {
  listenAdminMatches();
  listenAdminDeposits();
  listenAdminWithdrawals();
  listenAdminUsers();
}

// --- MATCHES MANAGEMENT ---
window.createNewMatch = async function() {
  const title = document.getElementById("match-title").value.trim();
  const maxSlots = parseInt(document.getElementById("match-slots").value) || 48;
  const category = document.getElementById("match-category").value;
  const matchTime = document.getElementById("match-time").value.trim();
  const entryFee = parseFloat(document.getElementById("match-entry").value) || 0;
  const comment = document.getElementById("match-comment").value.trim();

  // Dynamic Prize Inputs
  const r1 = parseFloat(document.getElementById("prize-rank-1").value) || 0;
  const r2 = parseFloat(document.getElementById("prize-rank-2").value) || 0;
  const r3 = parseFloat(document.getElementById("prize-rank-3").value) || 0;
  const r4 = parseFloat(document.getElementById("prize-rank-4").value) || 0;
  const r5 = parseFloat(document.getElementById("prize-rank-5").value) || 0;

  const totalPrize = r1 + r2 + r3 + r4 + r5;

  if (!title || !matchTime) return alert("সকল প্রয়োজনীয় তথ্য দিন!");

  try {
    const newDocRef = doc(collection(db, "tournaments"));
    await setDoc(newDocRef, {
      title, 
      category, 
      matchTime, 
      entryFee, 
      totalPrize, 
      maxSlots,
      comment,
      prizes: {
        rank1: r1,
        rank2: r2,
        rank3: r3,
        rank4: r4,
        rank5: r5
      },
      status: "active",
      players: [],
      roomId: "",
      roomPass: "",
      winners: {},
      createdAt: Date.now()
    });
    alert("ম্যাচ সফলভাবে পাবলিশ হয়েছে!");
    document.getElementById("match-title").value = "";
    document.getElementById("match-comment").value = "";
  } catch (e) {
    alert("এরর: " + e.message);
  }
};

function listenAdminMatches() {
  onSnapshot(collection(db, "tournaments"), (snap) => {
    const tbody = document.getElementById("admin-matches-table");
    if (!tbody) return;
    tbody.innerHTML = "";
    allMatchesMap = {};

    snap.forEach((docSnap) => {
      const m = docSnap.data();
      const matchId = docSnap.id;
      allMatchesMap[matchId] = m;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong>${m.title}</strong>
          ${m.comment ? `<br><small style="color:var(--gold-color);">${m.comment}</small>` : ''}
        </td>
        <td>${m.category}</td>
        <td>৳${m.entryFee}</td>
        <td>${(m.players || []).length}/${m.maxSlots}</td>
        <td>
          <div style="display:flex; flex-direction:column; gap:4px; max-width: 140px;">
            <input type="text" id="room-id-${matchId}" placeholder="Room ID" value="${m.roomId || ''}" style="padding:4px; font-size:12px; background:#1e1e2d; color:#fff; border:1px solid #333; border-radius:4px;">
            <input type="text" id="room-pass-${matchId}" placeholder="Room Pass" value="${m.roomPass || ''}" style="padding:4px; font-size:12px; background:#1e1e2d; color:#fff; border:1px solid #333; border-radius:4px;">
            <button class="btn-action btn-approve" style="font-size:11px; padding:3px 6px;" onclick="publishRoomDetails('${matchId}')">Save & Alert Bot</button>
          </div>
        </td>
        <td>
          <div style="display:flex; gap:4px; flex-wrap:wrap;">
            <button class="btn-action btn-approve" style="background:#ffa502; color:#000;" onclick="openWinnersModal('${matchId}')"><i class="fa-solid fa-trophy"></i> Winners</button>
            <button class="btn-action" style="background:#70a1ff; color:#000;" onclick="openEditMatchModal('${matchId}')"><i class="fa-solid fa-pen"></i> Edit</button>
            <button class="btn-action btn-delete" onclick="deleteMatch('${matchId}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}

// Publish Room ID & Pass directly + Send Telegram Notification
window.publishRoomDetails = async function(matchId) {
  const roomIdInput = document.getElementById(`room-id-${matchId}`);
  const roomPassInput = document.getElementById(`room-pass-${matchId}`);

  const roomId = roomIdInput ? roomIdInput.value.trim() : "";
  const roomPass = roomPassInput ? roomPassInput.value.trim() : "";

  if (!roomId || !roomPass) {
    return alert("রুম আইডি এবং পাসওয়ার্ড উভয়ই সঠিকভাবে প্রদান করুন!");
  }

  const selectedMatch = allMatchesMap[matchId];
  if (!selectedMatch) return alert("ম্যাচ ডাটা পাওয়া যায়নি!");

  try {
    const matchRef = doc(db, "tournaments", matchId);
    await updateDoc(matchRef, {
      roomId: roomId,
      roomPass: roomPass,
      roomPublishedAt: Date.now()
    });

    alert("রুম আইডি ও পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে!");

    // Send Telegram Notification to joined players
    const joinedPlayers = selectedMatch.players || [];
    if (joinedPlayers.length > 0) {
      await notifyJoinedPlayers(joinedPlayers, selectedMatch.title, roomId, roomPass);
    }
  } catch (e) {
    alert("এরর: " + e.message);
  }
};

// EDIT MATCH
window.openEditMatchModal = function(matchId) {
  const m = allMatchesMap[matchId];
  if (!m) return;

  document.getElementById("edit-match-id").value = matchId;
  document.getElementById("edit-match-title").value = m.title || "";
  document.getElementById("edit-match-time").value = m.matchTime || "";
  document.getElementById("edit-match-entry").value = m.entryFee || 0;
  document.getElementById("edit-match-comment").value = m.comment || "";

  document.getElementById("modal-edit-match").classList.remove("hidden");
};

window.saveMatchEdit = async function() {
  const matchId = document.getElementById("edit-match-id").value;
  const title = document.getElementById("edit-match-title").value.trim();
  const matchTime = document.getElementById("edit-match-time").value.trim();
  const entryFee = parseFloat(document.getElementById("edit-match-entry").value) || 0;
  const comment = document.getElementById("edit-match-comment").value.trim();

  try {
    await updateDoc(doc(db, "tournaments", matchId), {
      title, matchTime, entryFee, comment
    });
    alert("ম্যাচ তথ্য সফলভাবে আপডেট হয়েছে!");
    closeModal("modal-edit-match");
  } catch(e) {
    alert("এরর: " + e.message);
  }
};

window.deleteMatch = async function(id) {
  if (confirm("আপনি কি নিশ্চিত এই ম্যাচটি ডিলিট করতে চান?")) {
    await deleteDoc(doc(db, "tournaments", id));
  }
};

// WINNERS SELECTION & AUTOMATIC PRIZE CREDIT
window.openWinnersModal = function(matchId) {
  const m = allMatchesMap[matchId];
  if (!m) return;

  document.getElementById("winner-match-id").value = matchId;
  const players = m.players || [];

  for (let i = 1; i <= 5; i++) {
    const select = document.getElementById(`select-winner-${i}`);
    select.innerHTML = `<option value="">-- Select Winner (${i}st/nd/rd/th) --</option>`;
    
    players.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.userId || p.id || p.uid || p;
      opt.textContent = `${p.gameName || p.name || p.username || opt.value} (${p.gameUid || ''})`;
      select.appendChild(opt);
    });

    if (m.winners && m.winners[`rank${i}`]) {
      select.value = m.winners[`rank${i}`].userId || "";
    }
  }

  document.getElementById("modal-select-winners").classList.remove("hidden");
};

window.submitMatchWinners = async function() {
  const matchId = document.getElementById("winner-match-id").value;
  const m = allMatchesMap[matchId];
  if (!m) return;

  const prizes = m.prizes || {};
  const winnersData = {};
  const userUpdates = [];

  for (let i = 1; i <= 5; i++) {
    const userId = document.getElementById(`select-winner-${i}`).value;
    const prizeAmount = prizes[`rank${i}`] || 0;

    if (userId) {
      winnersData[`rank${i}`] = {
        userId: userId,
        prize: prizeAmount
      };
      
      // Credit prize money to user
      if (prizeAmount > 0) {
        userUpdates.push({ userId, prizeAmount });
      }
    }
  }

  try {
    // 1. Update Winners in Tournament Document
    await updateDoc(doc(db, "tournaments", matchId), {
      winners: winnersData,
      status: "completed"
    });

    // 2. Add Balance to Each Winner
    for (const win of userUpdates) {
      const uRef = doc(db, "users", win.userId);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        const curBal = uSnap.data().balance || 0;
        const curWins = uSnap.data().wins || 0;
        await updateDoc(uRef, {
          balance: curBal + win.prizeAmount,
          wins: curWins + 1
        });
      }
    }

    alert("উইনার নির্বাচন ও প্রাইস মানি সফলভাবে প্রদান করা হয়েছে!");
    closeModal("modal-select-winners");
  } catch (e) {
    alert("এরর: " + e.message);
  }
};

// --- DEPOSITS MANAGEMENT (WITH DATE & TIME) ---
function listenAdminDeposits() {
  onSnapshot(collection(db, "deposits"), (snap) => {
    const tbody = document.getElementById("admin-deposits-table");
    if (!tbody) return;
    tbody.innerHTML = "";
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      
      // Formatting Date and Time
      let formattedDate = "N/A";
      if (d.createdAt) {
        const dateObj = new Date(d.createdAt);
        formattedDate = dateObj.toLocaleString('bn-BD', { dateStyle: 'short', timeStyle: 'short' });
      } else if (d.timestamp) {
        const dateObj = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
        formattedDate = dateObj.toLocaleString('bn-BD', { dateStyle: 'short', timeStyle: 'short' });
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.user_name || d.user_id}</td>
        <td>৳${d.amount}</td>
        <td><code>${d.trx_id}</code></td>
        <td style="font-size: 11px; color: var(--gold-color);">${formattedDate}</td>
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
    if (!tbody) return;
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
    if (!tbody) return;
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
