import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

document.addEventListener("DOMContentLoaded", function () {
  console.log("Nithin Study Halls Premium Website Loaded");

  /* ===============================
     1️⃣ Typing Animation
  =================================*/
  const typingElement = document.getElementById("typing-text") || document.getElementById("typing");
  if (typingElement) {
    const text = typingElement.id === "typing" 
      ? "Focused. Space for Serious Aspirants." 
      : "Focused Space For Serious Aspirants";
    let index = 0;

    function type() {
      if (index < text.length) {
        typingElement.innerHTML += text.charAt(index);
        index++;
        setTimeout(type, 70);
      }
    }
    type();
  }

  /* ===============================
     2️⃣ Scroll Reveal 
  =================================*/
  const reveals = document.querySelectorAll(".reveal");
  const revealOnScroll = () => {
    reveals.forEach(section => {
      const windowHeight = window.innerHeight;
      const elementTop = section.getBoundingClientRect().top;
      if (elementTop < windowHeight - 100) {
        section.classList.add("active");
      }
    });
  };
  window.addEventListener("scroll", revealOnScroll);
  revealOnScroll(); // Initial check

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
     4️⃣ Smooth Scroll for Anchor Links
  =================================*/
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId === "#") return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  /* ===============================
     5️⃣ Stat Counters
  =================================*/
  const counters = document.querySelectorAll('.stat-number');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target'), 10);
        const duration = 1500;
        const step = target / (duration / 16);
        let current = 0;

        const tick = () => {
          current += step;
          if (current < target) {
            el.textContent = Math.floor(current);
            requestAnimationFrame(tick);
          } else {
            el.textContent = target;
          }
        };
        tick();
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(el => counterObserver.observe(el));

  /* ===============================
     6️⃣ Star Rating System
  =================================*/
  const stars = document.querySelectorAll('#starRating span');
  const ratingInput = document.getElementById('reviewRating');

  if (stars.length && ratingInput) {
    stars.forEach(star => {
      star.addEventListener('mouseenter', () => {
        const val = parseInt(star.getAttribute('data-val'));
        stars.forEach(s => s.classList.toggle('hovered', parseInt(s.getAttribute('data-val')) <= val));
      });

      star.addEventListener('mouseleave', () => {
        stars.forEach(s => s.classList.remove('hovered'));
      });

      star.addEventListener('click', () => {
        const val = parseInt(star.getAttribute('data-val'));
        ratingInput.value = val;
        stars.forEach(s => s.classList.toggle('active', parseInt(s.getAttribute('data-val')) <= val));
      });
    });
  }

  /* ===============================
     7️⃣ Enquiry Form Submission
  =================================*/
  const enquiryForm = document.getElementById("enquiryForm");
  if (enquiryForm) {
    enquiryForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const btn = enquiryForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = "Sending...";
      btn.disabled = true;

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

        if (response.ok) {
          document.getElementById("enquirySuccessModal").style.display = "flex";
          enquiryForm.reset();
        } else {
          alert("Submission failed. Please try again.");
        }
      } catch (error) {
        console.error("Enquiry Error:", error);
        alert("Server error. Please try again later.");
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  }

  /* ===============================
     8️⃣ Review Form Submission
  =================================*/
  const reviewForm = document.getElementById('reviewForm');
  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('reviewMsg');
      const rating = parseInt(document.getElementById('reviewRating').value, 10);
      const name = document.getElementById('reviewName').value.trim();
      const role = document.getElementById('reviewRole').value.trim();
      const text = document.getElementById('reviewText').value.trim();

      if (rating === 0) {
        msg.style.color = '#EF4444';
        msg.textContent = 'Please select a star rating first.';
        return;
      }

      const btn = reviewForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = "Submitting...";
      btn.disabled = true;
      msg.style.color = 'var(--text-muted)';
      msg.textContent = 'Submitting...';

      try {
        // Switch to Firestore for reliable storage
        const reviewId = "REV-" + Date.now();
        await setDoc(doc(db, "reviews", reviewId), {
          name,
          role,
          text,
          rating,
          createdAt: new Date().toISOString()
        });

        document.getElementById('reviewSuccessModal').style.display = 'flex';
        reviewForm.reset();
        stars.forEach(s => s.classList.remove('active', 'hovered'));
        if (ratingInput) ratingInput.value = 0;
        msg.textContent = "";
      } catch (error) {
        console.error("Review Error:", error);
        msg.style.color = '#EF4444';
        msg.textContent = 'Failed to submit. Try again.';
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  }

  /* ===============================
     9️⃣ Modal Helpers
  =================================*/
  window.closeEnquiryModal = () => document.getElementById("enquirySuccessModal").style.display = "none";
  window.closeReviewModal = () => document.getElementById("reviewSuccessModal").style.display = "none";

  window.addEventListener('click', (e) => {
    const enquiryModal = document.getElementById("enquirySuccessModal");
    const reviewModal = document.getElementById("reviewSuccessModal");
    if (e.target === enquiryModal) enquiryModal.style.display = "none";
    if (e.target === reviewModal) reviewModal.style.display = "none";
  });

  /* ===============================
     10️⃣ Navbar Hide on Scroll
  =================================*/
  let lastScrollTop = 0;
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    console.log("Navbar scroll listener attached - Debug Mode");
    
    const handleScroll = () => {
      // Robust scroll sensing for different browsers and standalone mode
      const scrollTop = Math.max(
        window.pageYOffset, 
        document.documentElement.scrollTop, 
        document.body.scrollTop,
        window.scrollY || 0
      );
      
      const delta = scrollTop - lastScrollTop;
      
      // Minimum delta to avoid jitter
      if (Math.abs(delta) <= 5) return;

      if (delta > 0 && scrollTop > 20) {
        // Scrolling Down
        navbar.classList.add('navbar--hidden');
      } else if (delta < 0) {
        // Scrolling Up
        navbar.classList.remove('navbar--hidden');
      }
      
      lastScrollTop = scrollTop;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Aggressive sensing for mobile standalone
    document.addEventListener('scroll', handleScroll, { passive: true });
  }

});