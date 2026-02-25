import { initializeApp } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection 
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

window.login = function() {
  if (
    document.getElementById("username").value === "admin" &&
    document.getElementById("password").value === "adminbreach"
  ) {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("adminPanel").style.display = "block";
    loadSeats();
  } else {
    alert("Invalid Login");
  }
};

window.logout = function() {
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

    getDoc(doc(db, "seats", seatId)).then((snap) => {
      if (snap.exists() && snap.data().gender) {
        seat.classList.add(snap.data().gender);
      }
      updateCounts();
    });

    seat.onclick = async function() {
      const ref = doc(db, "seats", seatId);
      const snap = await getDoc(ref);

      if (snap.exists() && snap.data().gender) {
        await setDoc(ref, {});
        seat.classList.remove("male", "female");
        updateCounts();
      } else {
        selectedSeat = seat;
        selectedSeatId = seatId;
        document.getElementById("genderModal").style.display = "flex";
      }
    };

    container.appendChild(seat);
  }
}

window.selectGender = async function(gender) {
  const ref = doc(db, "seats", selectedSeatId);
  await setDoc(ref, { gender });

  selectedSeat.classList.add(gender);
  document.getElementById("genderModal").style.display = "none";
  updateCounts();
};

window.resetAll = async function() {
  const snapshot = await getDocs(collection(db, "seats"));
  snapshot.forEach(async (d) => {
    await setDoc(doc(db, "seats", d.id), {});
  });
  loadSeats();
};

function updateCounts() {
  let acBooked = document.querySelectorAll("#acSeats .male, #acSeats .female").length;
  let nonBooked = document.querySelectorAll("#nonSeats .male, #nonSeats .female").length;

  document.getElementById("acBooked").innerText = acBooked;
  document.getElementById("acAvailable").innerText = acTotal - acBooked;

  document.getElementById("nonBooked").innerText = nonBooked;
  document.getElementById("nonAvailable").innerText = nonTotal - nonBooked;
}

window.addEventListener("click", function(e){
    const modal = document.getElementById("genderModal");
    if(e.target === modal){
      modal.style.display = "none";
    }
  });

  const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

window.addEventListener('scroll', () => {
    reveals.forEach(el => {
      const windowHeight = window.innerHeight;
      const elementTop = el.getBoundingClientRect().top;
      const visible = 100;
  
      if(elementTop < windowHeight - visible){
        el.classList.add('active');
      }
    });
  });

  document.addEventListener("DOMContentLoaded", function(){

    const text = "Focused.";
    const typingElement = document.getElementById("typing");
    if(typingElement){
      const text = "Focused.";
      let i = 0;
  
    function type(){
        if(i < text.length){
            typingElement.innerHTML += text.charAt(i);
            i++;
            setTimeout(type,120);
        }
    }
  
    type();
  }
  
  });
  window.showSection = function(section){
    const seatSection = document.getElementById("seatSection");
    const enquirySection = document.getElementById("enquirySection");
    const buttons = document.querySelectorAll(".tab-btn");
  
    buttons.forEach(btn => btn.classList.remove("active"));
  
    if(section === "seats"){
      seatSection.style.display = "block";
      enquirySection.style.display = "none";
      buttons[0].classList.add("active");
    } else {
      seatSection.style.display = "none";
      enquirySection.style.display = "block";
      buttons[1].classList.add("active");
      loadEnquiries();
    }
  };
  
  async function loadEnquiries(){
    try{
      const response = await fetch("https://rsh-backend-production.up.railway.app/enquiries");
      const data = await response.json();
  
      const table = document.getElementById("enquiryTable");
      table.innerHTML = "";
  
      data.reverse().forEach(item=>{
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
  
    }catch(error){
      console.log(error);
    }
  } 
  window.deleteEnquiry = async function(id){
    try{
      const response = await fetch(
        `https://rsh-backend-production.up.railway.app/enquiry/${id}`,
        {
          method:"DELETE"
        }
      );
  
      const result = await response.json();
      console.log(result);
  
      loadEnquiries();
  
    }catch(error){
      console.error("Delete error:", error);
    }
  }
  window.markContacted = async function(id){
    await fetch(`https://rsh-backend-production.up.railway.app/enquiry/${id}`,{
      method:"PUT"
    });  
    loadEnquiries();
  }
