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

        // --- PAYMENT VALIDATION (checked first) ---
        if (userData.isPaid !== true) {
            statusMsg.style.color = "#EF4444";
            statusMsg.innerText = "⚠️ Access Denied: Please pay your fees to the admin before checking in.";
            return;
        }
        // --- END PAYMENT VALIDATION ---

        // --- TIME VALIDATION ---
        if (userData.startTime && userData.endTime) {
            const now = new Date();
            const currentMins = (now.getHours() * 60) + now.getMinutes();

            const parseTimeToMins = (timeStr) => {
                const parts = timeStr.split(':');
                if (parts.length !== 2) return 0;
                return (parseInt(parts[0], 10) * 60) + parseInt(parts[1], 10);
            };

            const startMins = parseTimeToMins(userData.startTime);
            const endMins = parseTimeToMins(userData.endTime);

            // Buffer: Allow check-in 15 mins early, or check-out 15 mins late
            if (currentMins < (startMins - 15) || currentMins > (endMins + 15)) {
                statusMsg.style.color = "#EF4444";
                statusMsg.innerText = `Access Denied: Your registered shift is from ${userData.startTime} to ${userData.endTime}. You cannot check in or out at this time.`;
                return;
            }
        }
        // --- END TIME VALIDATION ---

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

// Recovery Logic
document.getElementById("toggleRecover").addEventListener("click", () => {
    const section = document.getElementById("recoverSection");
    if (section.style.display === "block") {
        section.style.display = "none";
        document.getElementById("toggleRecover").innerText = "Forgot your ID?";
    } else {
        section.style.display = "block";
        document.getElementById("toggleRecover").innerText = "Hide Recovery";
    }
});

document.getElementById("btnRecover").addEventListener("click", async () => {
    const phone = document.getElementById("recoverPhone").value.trim();
    const email = document.getElementById("recoverEmail").value.trim().toLowerCase();
    const recoverMsg = document.getElementById("recoverMessage");

    if (!phone || !email) {
        recoverMsg.style.color = "#EF4444";
        recoverMsg.innerText = "Please provide both phone number and email.";
        return;
    }

    recoverMsg.style.color = "var(--text-main)";
    recoverMsg.innerText = "Searching...";

    try {
        const userRef = doc(db, "users", phone);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.email && data.email.toLowerCase() === email) {
                recoverMsg.style.color = "#10B981";
                recoverMsg.innerHTML = `Found it! Your ID is: <br><strong style="font-size:22px; margin-top:8px; display:inline-block; color:var(--accent-primary); letter-spacing:1px;">${data.userId}</strong>`;
            } else {
                recoverMsg.style.color = "#EF4444";
                recoverMsg.innerText = "Email does not match our records for this phone number.";
            }
        } else {
            recoverMsg.style.color = "#EF4444";
            recoverMsg.innerText = "No student found with this phone number.";
        }
    } catch (e) {
        console.error("Recovery error:", e);
        recoverMsg.style.color = "#EF4444";
        recoverMsg.innerText = "An error occurred. Please try again.";
    }
});

// QR Code Scanner Logic
let html5QrcodeScanner = null;
let html5Qrcode = null;

// Simple mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

if (isMobile) {
    document.getElementById("startScanBtn").style.display = "none";
    document.getElementById("uploadScanBtn").style.display = "flex";
}

document.getElementById("startScanBtn").addEventListener("click", () => {
    document.getElementById("startScanBtn").style.display = "none";
    document.getElementById("reader").style.display = "block";

    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
    );

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
});

document.getElementById("uploadScanBtn").addEventListener("click", () => {
    document.getElementById("qrFileInput").click();
});

document.getElementById("qrFileInput").addEventListener("change", (e) => {
    if (e.target.files.length === 0) {
        return;
    }

    const file = e.target.files[0];
    const statusMsg = document.getElementById("statusMessage");
    
    statusMsg.style.color = "var(--text-main)";
    statusMsg.innerText = "Scanning image...";

    if (!html5Qrcode) {
        html5Qrcode = new Html5Qrcode("reader");
    }

    html5Qrcode.scanFile(file, true)
        .then(decodedText => {
            statusMsg.innerText = "";
            processScannedCode(decodedText);
        })
        .catch(err => {
            console.error("Error scanning uploaded image:", err);
            statusMsg.style.color = "#EF4444";
            statusMsg.innerText = "Could not find a valid QR code in the image. Please try again.";
        });
    
    // Clear the input value so the same file can be uploaded again if needed
    e.target.value = "";
});

function onScanSuccess(decodedText, decodedResult) {
    if (html5QrcodeScanner) {
        // Stop scanning
        html5QrcodeScanner.clear().then(() => {
            document.getElementById("reader").style.display = "none";
            processScannedCode(decodedText);
        }).catch(error => {
            console.error("Failed to clear scanner.", error);
            processScannedCode(decodedText);
        });
    } else {
        processScannedCode(decodedText);
    }
}

async function processScannedCode(decodedText) {
    // Handle the scanned code
    document.getElementById("studentId").value = decodedText;
    document.getElementById("reader").style.display = "none";

    const statusMsg = document.getElementById("statusMessage");
    statusMsg.style.color = "var(--text-main)";
    statusMsg.innerText = "Verifying shift timing...";

    try {
        const q = query(collection(db, "users"), where("userId", "==", decodedText));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            statusMsg.style.color = "#EF4444";
            statusMsg.innerText = "Student ID not found.";
            document.getElementById("manualInputGroup").style.display = "block";
            return;
        }

        let userData = null;
        querySnapshot.forEach((docSnap) => {
            userData = docSnap.data();
        });

        // --- PAYMENT CHECK ---
        if (userData.isPaid !== true) {
            statusMsg.style.color = "#EF4444";
            statusMsg.innerText = `⚠️ Access Denied: Please pay your fees to the admin before checking in.`;
            document.getElementById("manualInputGroup").style.display = "block";
            return;
        }
        // --- END PAYMENT CHECK ---

        if (userData.startTime && userData.endTime) {
            const now = new Date();
            const currentMins = (now.getHours() * 60) + now.getMinutes();

            const parseTimeToMins = (timeStr) => {
                const parts = timeStr.split(':');
                if (parts.length !== 2) return 0;
                return (parseInt(parts[0], 10) * 60) + parseInt(parts[1], 10);
            };

            const startMins = parseTimeToMins(userData.startTime);
            const endMins = parseTimeToMins(userData.endTime);

            if (currentMins < (startMins - 15) || currentMins > (endMins + 15)) {
                statusMsg.style.color = "#EF4444";
                statusMsg.innerText = `Access Denied: Your registered shift is from ${userData.startTime} to ${userData.endTime}. You cannot check in or out at this time.`;
                document.getElementById("manualInputGroup").style.display = "block";
                return;
            }
        }

        // Time is valid
        document.getElementById("actionBtns").style.display = "flex";
        document.getElementById("manualInputGroup").style.display = "block";
        statusMsg.style.color = "#10B981";
        statusMsg.innerText = `Verified ${userData.name || decodedText}. Please choose Check In or Check Out.`;

    } catch (e) {
        console.error("Verification error:", e);
        statusMsg.style.color = "#EF4444";
        statusMsg.innerText = "Error verifying student ID.";
        document.getElementById("manualInputGroup").style.display = "block";
    }
}

function onScanFailure(error) {
    // Ignore routine scan failures (when no QR code is in frame)
}

  /* ===============================
     Navbar Hide on Scroll
  =================================*/
  let lastScrollTop = 0;
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    console.log("Navbar scroll listener attached (Checkin) - Debug Mode");
    const handleScroll = () => {
      const scrollTop = Math.max(
        window.pageYOffset, 
        document.documentElement.scrollTop, 
        document.body.scrollTop,
        window.scrollY || 0
      );
      const delta = scrollTop - lastScrollTop;
      if (Math.abs(delta) <= 5) return;

      if (delta > 0 && scrollTop > 20) {
        navbar.classList.add('navbar--hidden');
      } else if (delta < 0) {
        navbar.classList.remove('navbar--hidden');
      }
      lastScrollTop = scrollTop;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
  }
