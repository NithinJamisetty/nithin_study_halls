import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

document.addEventListener("DOMContentLoaded", async () => {
    // Read the ID from the URL hash param ex: ?id=NSH-1234
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('id');

    const loader = document.getElementById("loadingMessage");
    const errorEl = document.getElementById("errorMessage");
    const wrapper = document.getElementById("cardWrapper");

    if (!targetUserId) {
        loader.style.display = "none";
        errorEl.style.display = "block";
        errorEl.innerText = "No ID parameter provided in URL.";
        return;
    }

    try {
        const q = query(collection(db, "users"), where("userId", "==", targetUserId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            loader.style.display = "none";
            errorEl.style.display = "block";
            return;
        }

        let studentData = null;
        querySnapshot.forEach((doc) => {
            studentData = doc.data();
        });

        const dateStr = studentData.registeredAt
            ? new Date(studentData.registeredAt).toLocaleDateString()
            : new Date().toLocaleDateString();

        // Draw the HD Canvas Card
        drawAndRenderIDCard(studentData.name || "Student", studentData.userId, dateStr);

        loader.style.display = "none";
        wrapper.classList.remove("hidden");

        // Download Listener
        document.getElementById("btnDownload").addEventListener("click", () => {
            const canvas = document.getElementById("idCardCanvas");
            const imageURI = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = imageURI;
            link.download = `NithinHalls_ID_${studentData.userId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

    } catch (e) {
        console.error("Error fetching student:", e);
        loader.style.display = "none";
        errorEl.style.display = "block";
        errorEl.innerText = "Connection error. Please try again later.";
    }
});

function drawAndRenderIDCard(studentName, studentId, dateStr) {
    const canvas = document.getElementById("idCardCanvas");
    const ctx = canvas.getContext("2d");

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Background (Gradient)
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#EEF2FF"); // Soft Indigo light
    gradient.addColorStop(1, "#FCE7F3"); // Soft Pink light
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Header Banner
    ctx.fillStyle = "#2D3748";
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, 80, [0, 0, 0, 0]);
    ctx.fill();

    // 3. Draw Logo Text
    ctx.font = "bold 32px Inter, sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("NithinHalls", 40, 50);

    // 4. Draw Title
    ctx.font = "600 20px Inter, sans-serif";
    ctx.fillStyle = "#A0AEC0";
    ctx.fillText("STUDENT IDENTIFICATION", canvas.width - 280, 48);

    // 5. Draw Profile Frame & Generate QR Code
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(50, 130, 140, 140, 16);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#818CF8";
    ctx.stroke();

    const qrCanvas = document.createElement("canvas");
    new QRious({
        element: qrCanvas,
        value: studentId,
        size: 120,
        level: 'H'
    });
    ctx.drawImage(qrCanvas, 60, 140);

    // 6. Draw Student Details
    ctx.fillStyle = "#2D3748";

    // Name
    ctx.font = "bold 36px Inter, sans-serif";
    ctx.fillText(studentName, 230, 150);

    // Membership Info
    ctx.font = "600 16px Inter, sans-serif";
    ctx.fillStyle = "#718096";
    ctx.fillText("MEMBER SINCE: " + dateStr, 230, 180);

    // 7. Draw the ID Box
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(230, 210, 320, 80, 16);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#818CF8";
    ctx.stroke();

    // 8. Draw the actual ID inside the box
    ctx.font = "bold 38px monospace";
    ctx.fillStyle = "#2D3748";
    ctx.textAlign = "center";
    ctx.fillText(studentId, 390, 262);
    ctx.textAlign = "left";
}
