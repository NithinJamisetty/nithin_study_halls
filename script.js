import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBBYbyBDdr7A9vNPIHjh7S2waEhTpCTdIY",
  authDomain: "radha-study-halls.firebaseapp.com",
  projectId: "radha-study-halls",
  storageBucket: "radha-study-halls.firebasestorage.app",
  messagingSenderId: "38343553963",
  appId: "1:38343553963:web:fcbc614aaa081f1e0d58ee",
  measurementId: "G-BZLBHFML74"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const acTotal = 30;
const nonTotal = 20;

let selectedSeat = null;
let selectedSeatId = null;

window.login = function () {
  if (
    document.getElementById("username").value === "admin" &&
    document.getElementById("password").value === "adminbreach"
  ) {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("adminPanel").style.display = "block";
    loadSeats();
  } else {
    document.getElementById("loginErrorModal").style.display = "flex";
  }
};

window.closeLoginErrorModal = function () {
  document.getElementById("loginErrorModal").style.display = "none";
};

window.logout = function () {
  document.getElementById("adminPanel").style.display = "none";
  document.getElementById("loginPage").style.display = "flex";
};

async function loadSeats() {
  createSeats("acSeats", "AC", acTotal);
  createSeats("nonSeats", "NON", nonTotal);
}

function createSeats(containerId, type, total) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  for (let i = 1; i <= total; i++) {
    let seat = document.createElement("div");
    seat.classList.add("seat");
    seat.setAttribute("data-number", i);

    const seatId = `${type}_${i}`;

    getDoc(doc(db, "seats", seatId)).then(async (snap) => {
      let bookings = [];
      if (snap.exists()) {
        const data = snap.data();

        // Backwards compatibility
        if (data.phone && !data.bookings) bookings.push(data);
        else if (data.bookings) bookings = data.bookings;

        let modified = false;
        const now = new Date();

        bookings = bookings.filter(b => {
          let isExpired = false;
          if (b.registeredAt && b.duration) {
            const registeredDate = new Date(b.registeredAt);
            const durationLower = b.duration.toLowerCase();
            let expirationDate = new Date(registeredDate);

            if (durationLower.includes("1 month")) expirationDate.setMonth(expirationDate.getMonth() + 1);
            else if (durationLower.includes("3 month")) expirationDate.setMonth(expirationDate.getMonth() + 3);
            else if (durationLower.includes("6 month")) expirationDate.setMonth(expirationDate.getMonth() + 6);
            else if (durationLower.includes("1 year")) expirationDate.setFullYear(expirationDate.getFullYear() + 1);
            else expirationDate = new Date(3000, 0, 1);

            if (now > expirationDate) isExpired = true;
          }

          if (isExpired) {
            modified = true;
            setDoc(doc(db, "users", b.phone || "unknown"), { status: "Completed" }, { merge: true }).catch(console.error);
            return false;
          }
          return true;
        });

        if (modified) {
          await setDoc(doc(db, "seats", seatId), { bookings: bookings });
        }

        if (bookings.length >= 3) {
          seat.classList.add('booked');
          seat.classList.remove('male', 'female', 'mixed', 'semi-booked');
        } else if (bookings.length > 0) {
          let hasMale = false;
          let hasFemale = false;
          bookings.forEach(b => {
            const g = (b.gender || "").trim().toLowerCase();
            if (g === "male") hasMale = true;
            if (g === "female") hasFemale = true;
          });

          seat.classList.remove('booked', 'male', 'female', 'mixed', 'semi-booked');
          if (hasMale && hasFemale) seat.classList.add('mixed');
          else if (hasMale) seat.classList.add('male');
          else if (hasFemale) seat.classList.add('female');
          else seat.classList.add('booked'); // fallback for legacy data missing gender
        } else {
          seat.classList.remove('booked', 'male', 'female', 'mixed', 'semi-booked');
        }
      }
      updateCounts();
    });

    seat.onclick = async function () {
      try {
        const ref = doc(db, "seats", seatId);
        const snap = await getDoc(ref);

        let bookings = [];
        if (snap.exists()) {
          const data = snap.data();
          if (data.phone && !data.bookings) bookings.push(data);
          else if (data.bookings) bookings = data.bookings;
        }

        if (bookings.length > 0) {
          // Seat is booked, show details
          selectedSeat = seat;
          selectedSeatId = seatId;

          const modalSeatIdEl = document.getElementById("modalSeatId");
          if (modalSeatIdEl) {
            modalSeatIdEl.innerText = seatId.replace('_', ' ');
          }

          let htmlList = `<div style="display:flex; flex-direction:column; gap:15px; width:100%;">`;
          bookings.forEach((studentData, index) => {
            const dateStr = studentData.registeredAt ? new Date(studentData.registeredAt).toLocaleString() : 'N/A';
            const timeStr = studentData.time || 'N/A';
            htmlList += `
              <div style="background: #fdfdfd; padding: 15px; border-radius: 8px; border: 1px solid #eaeaea; text-align: left;">
                <p><strong>Name:</strong> ${studentData.name || 'N/A'}</p>
                <p><strong>Phone:</strong> ${studentData.phone || 'N/A'}</p>
                <p><strong>Time:</strong> <span style="color:#2f5d50; font-weight:bold;">${timeStr}</span></p>
                <p><strong>Duration:</strong> ${studentData.duration || 'N/A'}</p>
                <p><strong>Registered:</strong> ${dateStr}</p>
                <button onclick="forceVacateBooking('${seatId}', '${studentData.phone || ''}')" style="margin-top: 10px; background: #e74c3c; width: 100%; border-radius: 6px; padding: 8px;">Vacate This Slot</button>
              </div>
            `;
          });
          htmlList += `</div>`;

          // We will need to inject this into the modal body
          const detailsContainer = document.getElementById("studentDetailsContainer");
          if (detailsContainer) {
            detailsContainer.innerHTML = htmlList;
          }

          document.getElementById("studentModal").style.display = "flex";
        } else {
          // Seat is empty
          const msgEl = document.getElementById("seatModalMessage");
          if (msgEl) {
            msgEl.innerHTML = `Seat <strong>${seatId.replace('_', ' ')}</strong> is currently empty.<br><br><span style="font-size:13px; color:#888;">Users can book this seat via the main Registration page.</span>`;
          }
          document.getElementById("seatModal").style.display = "flex";
        }
      } catch (err) {
        console.error("Error opening seat modal:", err);
      }
    };

    container.appendChild(seat);
  }
}

window.closeStudentModal = function () {
  document.getElementById("studentModal").style.display = "none";
};

window.closeSeatModal = function () {
  document.getElementById("seatModal").style.display = "none";
};

window.openAddUserModal = function () {
  document.getElementById("addUserModal").style.display = "flex";
};

window.closeAddUserModal = function () {
  document.getElementById("addUserModal").style.display = "none";
};

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  // If manual entry was just "Morning", convert it arbitrarily or return 0.
  // We'll try to parse "HH:mm"
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0; // Invalid time format for exact checking
  const hours = parseInt(parts[0], 10);
  const mins = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(mins)) return 0;
  return (hours * 60) + mins;
}

document.getElementById("adminAddUserForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("adminRegName").value;
  const phone = document.getElementById("adminRegPhone").value;
  const gender = document.getElementById("adminRegGender").value;
  const seatId = document.getElementById("adminRegSeat").value;
  const duration = document.getElementById("adminRegDuration").value;

  // Note: For full robustness, manual add should also ask for start/end time.
  // For now, we will just assign a dummy time string if it's admin manual add,
  // or we can just bypass the overlap check for Admin overrides.
  const time = "Admin Assigned";

  const userData = {
    name: name,
    phone: phone,
    gender: gender,
    seatId: seatId,
    duration: duration,
    time: time,
    status: "Active",
    registeredAt: new Date().toISOString()
  };

  try {
    const seatRef = doc(db, "seats", seatId);
    const snap = await getDoc(seatRef);

    let bookings = [];
    if (snap.exists()) {
      const data = snap.data();
      if (data.phone && !data.bookings) bookings.push(data);
      else if (data.bookings) bookings = data.bookings;
    }

    // 1. Append to Seat Bookings (Admin override bypasses exact time conflict checks for now, trusting the admin)
    bookings.push(userData);
    await setDoc(seatRef, { bookings: bookings });

    // 2. Add to permanent Users array
    await setDoc(doc(db, "users", phone), userData);

    closeAddUserModal();
    document.getElementById("adminAddUserForm").reset();

    // Hard refresh UI
    createSeats("acSeats", "AC", acTotal);
    createSeats("nonSeats", "NON", nonTotal);

    if (document.getElementById("usersSection").style.display === "block") {
      loadUsers();
    }
  } catch (err) {
    console.error(err);
    alert("Error saving manual user.");
  }
});

window.forceVacateBooking = async function (seatId, userPhone) {
  if (confirm("Are you sure you want to vacate this specific time slot?")) {
    const ref = doc(db, "seats", seatId);

    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        let bookings = [];
        if (data.phone && !data.bookings) bookings.push(data);
        else if (data.bookings) bookings = data.bookings;

        // Filter out the specific user
        bookings = bookings.filter(b => b.phone !== userPhone);

        // Update the seat array
        await setDoc(ref, { bookings: bookings });

        // Update User status in permanent table
        await setDoc(doc(db, "users", userPhone), { status: "Completed" }, { merge: true });

        if (document.getElementById("usersSection").style.display === "block") {
          loadUsers();
        }

        // Close modal and refresh map
        document.getElementById("studentModal").style.display = "none";

        const seatVisual = document.querySelector(`.seat[data-number="${seatId.split('_')[1]}"]`); // Approximate find
        // Safer to just re-render seats:
        loadSeats();
      }
    } catch (e) { console.error("Error vacating user:", e); }
  }
};

window.resetAll = async function () {
  const snapshot = await getDocs(collection(db, "seats"));
  snapshot.forEach(async (d) => {
    await setDoc(doc(db, "seats", d.id), {});
  });
  loadSeats();
};

function updateCounts() {
  let acBooked = document.querySelectorAll("#acSeats .booked, #acSeats .male, #acSeats .female, #acSeats .mixed").length;
  let nonBooked = document.querySelectorAll("#nonSeats .booked, #nonSeats .male, #nonSeats .female, #nonSeats .mixed").length;

  document.getElementById("acBooked").innerText = acBooked;
  document.getElementById("acAvailable").innerText = acTotal - acBooked;

  document.getElementById("nonBooked").innerText = nonBooked;
  document.getElementById("nonAvailable").innerText = nonTotal - nonBooked;
}

window.addEventListener("click", function (e) {
  const modal = document.getElementById("studentModal");
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

window.addEventListener('scroll', () => {
  reveals.forEach(el => {
    const windowHeight = window.innerHeight;
    const elementTop = el.getBoundingClientRect().top;
    const visible = 100;

    if (elementTop < windowHeight - visible) {
      el.classList.add('active');
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {

  const text = "Focused.";
  const typingElement = document.getElementById("typing");
  if (typingElement) {
    const text = "Focused.";
    let i = 0;

    function type() {
      if (i < text.length) {
        typingElement.innerHTML += text.charAt(i);
        i++;
        setTimeout(type, 120);
      }
    }

    type();
  }

});
window.showDashboardHome = function () {
  document.getElementById("dashboardHome").style.display = "grid";
  document.getElementById("seatSection").style.display = "none";
  document.getElementById("enquirySection").style.display = "none";
  document.getElementById("usersSection").style.display = "none";
};

window.openHomeSection = function (section) {
  document.getElementById("dashboardHome").style.display = "none";
  window.showSection(section);
};

window.showSection = function (section) {
  const seatSection = document.getElementById("seatSection");
  const enquirySection = document.getElementById("enquirySection");
  const usersSection = document.getElementById("usersSection");

  seatSection.style.display = "none";
  enquirySection.style.display = "none";
  usersSection.style.display = "none";

  if (section === "seats") {
    seatSection.style.display = "block";
  } else if (section === "users") {
    usersSection.style.display = "block";
    loadUsers();
  } else {
    enquirySection.style.display = "block";
    loadEnquiries();
  }
};

async function loadUsers() {
  try {
    // 1. Sync check: Make sure all bookings from Seats are safely backed up in Users
    const seatsSnap = await getDocs(collection(db, "seats"));
    for (const seatDoc of seatsSnap.docs) {
      const data = seatDoc.data();

      let bookingsToSync = [];
      if (data && data.phone && !data.bookings) bookingsToSync.push(data);
      else if (data && data.bookings) bookingsToSync = data.bookings;

      for (const b of bookingsToSync) {
        if (b.phone) {
          const userData = { ...b, status: b.status || "Active", seatId: seatDoc.id };
          await setDoc(doc(db, "users", b.phone), userData, { merge: true });
        }
      }
    }

    // 2. Now load all Users from the permanent collection
    const snapshot = await getDocs(collection(db, "users"));
    const table = document.getElementById("usersTable");
    table.innerHTML = "";

    snapshot.forEach(docSnap => {
      const item = docSnap.data();
      const userId = docSnap.id;

      const statusBadge = item.status === "Completed"
        ? `<span class="status contacted" style="background: #eef4f2; color: #2f5d50;">✔ Completed</span>`
        : `<span class="status pending" style="background: #e3f2fd; color: #1976d2;">Active</span>`;

      const actionButton = item.status !== "Completed"
        ? `<button onclick="markUserCompleted('${userId}')" class="mark-btn" style="background: #2f5d50;">Mark Completed</button> <button onclick="deleteUser('${userId}')" class="mark-btn" style="background: #e74c3c;">Delete</button>`
        : `<button onclick="markUserActive('${userId}')" class="mark-btn" style="background: #ffaa00;">Mark Active</button> <button onclick="deleteUser('${userId}')" class="mark-btn" style="background: #e74c3c;">Delete</button>`;

      const row = `
        <tr>
          <td>${item.name || 'N/A'}</td>
          <td>${item.email || 'N/A'}</td>
          <td>${item.phone || 'N/A'}</td>
          <td style="text-transform: capitalize;">${item.gender || 'N/A'}</td>
          <td>${(item.seatId || '').replace('_', ' ')}</td>
          <td>${statusBadge}</td>
          <td style="display: flex; gap: 5px;">${actionButton}</td>
        </tr>
      `;
      table.innerHTML += row;
    });
  } catch (error) {
    console.error("Error loading users:", error);
  }
}

window.markUserCompleted = async function (id) {
  try {
    // 1. First get the user to find out which seat they occupy
    const userSnap = await getDoc(doc(db, "users", id));
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const seatId = userData.seatId;

      if (seatId) {
        // 2. Clear them from that seat's active booking array so the slot opens up immediately
        const seatRef = doc(db, "seats", seatId);
        const seatSnap = await getDoc(seatRef);
        if (seatSnap.exists()) {
          const seatData = seatSnap.data();
          let bookings = [];
          if (seatData.phone && !seatData.bookings) bookings.push(seatData);
          else if (seatData.bookings) bookings = seatData.bookings;

          bookings = bookings.filter(b => b.phone !== id);
          await setDoc(seatRef, { bookings: bookings });

          // Refresh the map secretly in the background
          loadSeats();
        }
      }
    }

    // 3. Mark them as completed in the permanent roster
    await setDoc(doc(db, "users", id), { status: "Completed" }, { merge: true });

    // Refresh table and show success
    loadUsers();
    document.getElementById("subscriptionClosedModal").style.display = "flex";
  } catch (e) { console.error("Error marking complete:", e); }
};

window.closeSubscriptionModal = function () {
  document.getElementById("subscriptionClosedModal").style.display = "none";
};

window.markUserActive = async function (id) {
  try {
    // 1. Get the user to find their seat
    const userSnap = await getDoc(doc(db, "users", id));
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const seatId = userData.seatId;

      if (seatId) {
        // 2. Add them back to the active booking array for that seat
        const seatRef = doc(db, "seats", seatId);
        const seatSnap = await getDoc(seatRef);
        let bookings = [];
        if (seatSnap.exists()) {
          const seatData = seatSnap.data();
          if (seatData.phone && !seatData.bookings) bookings.push(seatData);
          else if (seatData.bookings) bookings = seatData.bookings;
        }

        // Ensure they aren't already in the bookings array
        if (!bookings.some(b => b.phone === id)) {
          // We need their booking info to restore. In a real app we'd fetch the exact registration time.
          // For now, we restore from the userData document.
          bookings.push({
            name: userData.name,
            phone: userData.phone,
            gender: userData.gender,
            duration: userData.duration || "Restored",
            time: userData.time || "Restored",
            registeredAt: userData.registeredAt || new Date().toISOString()
          });
          await setDoc(seatRef, { bookings: bookings }, { merge: true });

          // Refresh seat grid in the background
          loadSeats();
        }
      }
    }

    // 3. Update their status in the users collection
    await setDoc(doc(db, "users", id), { status: "Active" }, { merge: true });
    loadUsers();
  } catch (e) { console.error("Error marking active:", e); }
};

let userIdToDelete = null;

window.deleteUser = function (id) {
  userIdToDelete = id;
  document.getElementById("deleteConfirmModal").style.display = "flex";
};

window.closeDeleteConfirmModal = function () {
  userIdToDelete = null;
  document.getElementById("deleteConfirmModal").style.display = "none";
};

window.confirmDeleteUser = async function () {
  if (!userIdToDelete) return;
  const id = userIdToDelete;

  try {
    // 1. First get the user to find out which seat they occupy
    const userSnap = await getDoc(doc(db, "users", id));
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const seatId = userData.seatId;

      if (seatId) {
        // 2. Clear them from that seat's active booking array so the slot opens up immediately
        const seatRef = doc(db, "seats", seatId);
        const seatSnap = await getDoc(seatRef);
        if (seatSnap.exists()) {
          const seatData = seatSnap.data();
          let bookings = [];
          if (seatData.phone && !seatData.bookings) bookings.push(seatData);
          else if (seatData.bookings) bookings = seatData.bookings;

          bookings = bookings.filter(b => b.phone !== id);
          await setDoc(seatRef, { bookings: bookings });

          // Refresh the map secretly in the background
          loadSeats();
        }
      }
    }

    // 3. Delete from the permanent roster
    await deleteDoc(doc(db, "users", id));

    // Close modal and refresh table
    closeDeleteConfirmModal();
    loadUsers();
  } catch (e) {
    console.error("Error deleting user:", e);
    alert("There was an error deleting this user.");
    closeDeleteConfirmModal();
  }
};

async function loadEnquiries() {
  try {
    const response = await fetch("https://rsh-backend-production.up.railway.app/enquiries");
    const data = await response.json();

    const table = document.getElementById("enquiryTable");
    table.innerHTML = "";

    data.reverse().forEach(item => {
      const statusBadge = item.status === "Contacted"
        ? `<span class="status contacted">✔ Contacted</span>`
        : `<span class="status pending">Pending</span>`;

      const actionButton = item.status === "Pending"
        ? `<button onclick="markContacted('${item._id}')" class="mark-btn">Mark Contacted</button>`
        : "";
      const row = `
          <tr>
            <td>${item.name}</td>
            <td>${item.email}</td>
            <td>${item.phone}</td>
            <td>${item.message}</td>
            <td>${item.status}</td>
            <td>${new Date(item.createdAt).toLocaleString()}</td>
            <td>
            <button onclick="deleteEnquiry('${item._id}')">
              Delete
            </button>
          </tr>
        `;
      table.innerHTML += row;
    });

  } catch (error) {
    console.log(error);
  }
}
window.deleteEnquiry = async function (id) {
  try {
    const response = await fetch(
      `https://rsh-backend-production.up.railway.app/enquiry/${id}`,
      {
        method: "DELETE"
      }
    );

    const result = await response.json();
    console.log(result);

    loadEnquiries();

  } catch (error) {
    console.error("Delete error:", error);
  }
}
window.markContacted = async function (id) {
  await fetch(`https://rsh-backend-production.up.railway.app/enquiry/${id}`, {
    method: "PUT"
  });
  loadEnquiries();
}
