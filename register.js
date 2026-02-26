import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const nonTotal = 25; // Adjusted to match the HTML in admin.html which says 25

let selectedSeatId = null;

document.addEventListener("DOMContentLoaded", () => {
    loadSeats();

    // Expose switch to window for HTML onclick
    window.switchSeatTab = function (type) {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(t => t.classList.remove('active'));

        if (type === 'AC') {
            tabs[0].classList.add('active');
            document.getElementById('acSeatsGrid').style.display = 'grid';
            document.getElementById('nonSeatsGrid').style.display = 'none';
        } else {
            tabs[1].classList.add('active');
            document.getElementById('acSeatsGrid').style.display = 'none';
            document.getElementById('nonSeatsGrid').style.display = 'grid';
        }
    };

    function parseTimeToMinutes(timeStr) {
        // e.g "09:00" or "14:30"
        if (!timeStr) return 0;
        const parts = timeStr.split(':');
        if (parts.length !== 2) return 0;
        const hours = parseInt(parts[0], 10);
        const mins = parseInt(parts[1], 10);
        return (hours * 60) + mins;
    }

    document.getElementById("registerForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!selectedSeatId) {
            alert("Please select a seat first.");
            return;
        }

        const name = document.getElementById("regName").value;
        const email = document.getElementById("regEmail").value;
        const phone = document.getElementById("regPhone").value;
        const age = document.getElementById("regAge").value;
        const gender = document.querySelector('input[name="gender"]:checked').value;
        const startTime = document.getElementById("regStartTime").value;
        const endTime = document.getElementById("regEndTime").value;
        const time = `${startTime} to ${endTime}`;
        const duration = document.getElementById("regDuration").value;

        // Validation for start vs end
        const startMins = parseTimeToMinutes(startTime);
        const endMins = parseTimeToMinutes(endTime);

        if (startMins >= endMins) {
            alert("End time must be after Start time.");
            return;
        }

        const submitBtn = document.getElementById("submitBtn");
        submitBtn.innerText = "Registering...";
        submitBtn.disabled = true;

        try {
            const userData = {
                gender: gender,
                name: name,
                email: email,
                phone: phone,
                age: age,
                time: time,
                startTime: startTime,
                endTime: endTime,
                duration: duration,
                seatId: selectedSeatId,
                status: "Active",
                registeredAt: new Date().toISOString()
            };

            const seatRef = doc(db, "seats", selectedSeatId);
            const snap = await getDoc(seatRef);

            let bookings = [];
            if (snap.exists()) {
                const data = snap.data();
                if (data.phone && !data.bookings) bookings.push(data); // Legacy fallback
                else if (data.bookings) bookings = data.bookings;
            }

            // Check for overlaps
            for (const b of bookings) {
                if (b.startTime && b.endTime) {
                    const bStart = parseTimeToMinutes(b.startTime);
                    const bEnd = parseTimeToMinutes(b.endTime);

                    // Overlap logic: (StartA < EndB) and (EndA > StartB)
                    if (startMins < bEnd && endMins > bStart) {
                        alert(`Sorry, this seat is already booked from ${b.time}. Please select a different time or seat.`);
                        submitBtn.innerText = "Complete Registration";
                        submitBtn.disabled = false;
                        return; // Abort save
                    }
                }
            }

            // No overlap! Append and save.
            bookings.push(userData);
            await setDoc(seatRef, { bookings: bookings });

            // Save to permanent users collection
            const userRef = doc(db, "users", phone);
            await setDoc(userRef, userData, { merge: true });

            // Show success modal
            document.getElementById("successModal").style.display = "flex";

        } catch (error) {
            console.error("Error writing document: ", error);
            alert("Registration failed. Please try again.");
            submitBtn.innerText = "Complete Registration";
            submitBtn.disabled = false;
        }
    });
});

async function loadSeats() {
    await createSeats("acSeatsGrid", "AC", acTotal);
    await createSeats("nonSeatsGrid", "NON", nonTotal);

    // Hide loader, show app
    document.getElementById("loadingOverlay").style.display = "none";
    document.getElementById("mainContainer").style.display = "flex";
}

async function createSeats(containerId, type, total) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    for (let i = 1; i <= total; i++) {
        let seat = document.createElement("div");
        seat.classList.add("mini-seat");
        seat.innerText = i;
        seat.setAttribute("data-id", `${type}_${i}`);

        const seatId = `${type}_${i}`;

        // Read from DB
        try {
            const snap = await getDoc(doc(db, "seats", seatId));
            let bookings = [];

            if (snap.exists()) {
                const data = snap.data();

                // Backwards compatibility: If it's an old 1:1 seat, convert it to an array
                if (data.phone && !data.bookings) {
                    bookings.push(data);
                } else if (data.bookings) {
                    bookings = data.bookings;
                }

                // Filter out expired bookings
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
                        // Update users table in background
                        setDoc(doc(db, "users", b.phone || "unknown"), { status: "Completed" }, { merge: true }).catch(console.error);
                        return false; // Remove from bookings array
                    }
                    return true; // Keep
                });

                // Save back to DB if we cleaned out expired seats
                if (modified) {
                    await setDoc(doc(db, "seats", seatId), { bookings: bookings });
                }

                if (bookings.length >= 3) {
                    seat.classList.add("booked");
                    seat.classList.remove("male", "female", "mixed", "semi-booked");
                } else if (bookings.length > 0) {
                    let hasMale = false;
                    let hasFemale = false;
                    bookings.forEach(b => {
                        if (b.gender && b.gender.toLowerCase() === "male") hasMale = true;
                        if (b.gender && b.gender.toLowerCase() === "female") hasFemale = true;
                    });

                    seat.classList.remove("booked", "male", "female", "mixed", "semi-booked");
                    if (hasMale && hasFemale) seat.classList.add("mixed");
                    else if (hasMale) seat.classList.add("male");
                    else if (hasFemale) seat.classList.add("female");
                } else {
                    seat.classList.remove("booked", "male", "female", "mixed", "semi-booked");
                }
            }
        } catch (e) {
            console.error("Failed to load seat data", e);
        }

        seat.onclick = function () {
            // Don't do anything if booked
            if (seat.classList.contains("booked")) return;

            // Deselect all others
            document.querySelectorAll('.mini-seat').forEach(s => s.classList.remove('selected'));

            // Select this one
            seat.classList.add('selected');
            selectedSeatId = seatId;

            // Update UI
            const displaySpan = document.getElementById("displaySelectedSeat");
            const infoBox = document.getElementById("selectedSeatInfo");
            displaySpan.innerText = `${type} Seat ${i}`;
            infoBox.style.display = "block";

            // Enable Submit button
            document.getElementById("submitBtn").disabled = false;
        };

        container.appendChild(seat);
    }
}
