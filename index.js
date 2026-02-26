document.addEventListener("DOMContentLoaded", function () {

  console.log("Radha Study Halls Premium Website Loaded");

  /* ===============================
     1️⃣ Typing Animation
  =================================*/

  const typingElement = document.getElementById("typing-text");

  if (typingElement) {
    const text = "Focused Space For Serious Aspirants";
    let index = 0;

    function type() {
      if (index < text.length) {
        typingElement.innerHTML += text.charAt(index);
        index++;
        setTimeout(type, 50);
      }
    }

    type();
  }

  /* ===============================
     2️⃣ Scroll Reveal (simple)
  =================================*/

  const reveals = document.querySelectorAll(".reveal");

  window.addEventListener("scroll", () => {
    reveals.forEach(section => {
      const windowHeight = window.innerHeight;
      const elementTop = section.getBoundingClientRect().top;

      if (elementTop < windowHeight - 100) {
        section.classList.add("active");
      }
    });
  });

  /* ===============================
     3️⃣ Cursor Glow Follow
  =================================*/

  const glow = document.querySelector(".cursor-glow");

  if (glow) {
    document.addEventListener("mousemove", e => {
      glow.style.left = e.clientX + "px";
      glow.style.top = e.clientY + "px";
    });
  }

  /* ===============================
     4️⃣ Intersection Observer Fade
  =================================*/

  const faders = document.querySelectorAll('.fade');

  if (faders.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
        }
      });
    }, { threshold: 0.2 });

    faders.forEach(el => observer.observe(el));
  }

});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    document.querySelector(this.getAttribute("href"))
      .scrollIntoView({ behavior: "smooth" });
  });
});

console.log("Website Loaded Successfully");

document.getElementById("enquiryForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const data = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    message: document.getElementById("message").value
  };

  try {
    const response = await fetch("https://rsh-backend-production.up.railway.app/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    document.getElementById("enquirySuccessModal").style.display = "flex";
    document.getElementById("enquiryForm").reset();
  } catch (error) {
    console.log(error);
    alert("Error submitting enquiry");
  }
});

window.closeEnquiryModal = function () {
  document.getElementById("enquirySuccessModal").style.display = "none";
};

// Fade animation
const fades = document.querySelectorAll('.fade-up');

window.addEventListener("scroll", () => {
  fades.forEach(el => {
    const top = el.getBoundingClientRect().top;
    if (top < window.innerHeight - 100) {
      el.classList.add("show");
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {

  const text = "Focused. Space for Serious Aspirants.";
  let i = 0;

  function type() {
    if (i < text.length) {
      document.getElementById("typing").innerHTML += text.charAt(i);
      i++;
      setTimeout(type, 70);
    }
  }

  type();

});