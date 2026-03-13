import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, query, collection, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

async function togglePresence(isPresent) {
    const studentIdInput = document.getElementById("studentId").value.trim().toUpperCase();
    const statusMsg = document.getElementById("statusMessage");

    if (!studentIdInput) {
        statusMsg.style.color = "#EF4444";
        statusMsg.innerText = "Please enter a valid Student ID (e.g., NSH-1234).";
        return;
    }

    statusMsg.style.color = "var(--text-main)";
    statusMsg.innerText = "Processing...";

    try {
        // Find user by userId field in users collection
        const q = query(collection(db, "users"), where("userId", "==", studentIdInput));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            statusMsg.style.color = "#EF4444";
            statusMsg.innerText = "Student ID not found.";
            return;
        }

        let userDocId = null;
        let userData = null;

        querySnapshot.forEach((docSnap) => {
            userDocId = docSnap.id; // Usually their phone number
            userData = docSnap.data();
        });

        const seatId = userData.seatId;

        // 1. Update user document
        await setDoc(doc(db, "users", userDocId), { isPresent: isPresent }, { merge: true });

        // 2. Update seat booking document
        if (seatId) {
            const seatRef = doc(db, "seats", seatId);
            const seatSnap = await getDoc(seatRef);

            if (seatSnap.exists()) {
                const seatData = seatSnap.data();
                let bookings = [];

                if (seatData.phone && !seatData.bookings) bookings.push(seatData);
                else if (seatData.bookings) bookings = seatData.bookings;

                // Update the matching booking
                let updated = false;
                for (let i = 0; i < bookings.length; i++) {
                    if (bookings[i].userId === studentIdInput || bookings[i].phone === userData.phone) {
                        bookings[i].isPresent = isPresent;
                        updated = true;
                    }
                }

                if (updated) {
                    await setDoc(seatRef, { bookings: bookings }, { merge: true });
                }
            }
        }

        statusMsg.style.color = "#10B981";
        statusMsg.innerText = isPresent ? "Successfully checked IN. Have a great study session!" : "Successfully checked OUT. See you next time!";

    } catch (e) {
        console.error("Error toggling presence:", e);
        statusMsg.style.color = "#EF4444";
        statusMsg.innerText = "An error occurred. Please try again.";
    }
}

document.getElementById("btnIn").addEventListener("click", () => togglePresence(true));
document.getElementById("btnOut").addEventListener("click", () => togglePresence(false));
