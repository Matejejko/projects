// ===== HEADER SCROLL EFFECT =====
const header = document.getElementById("header");
window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 80);
});

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");

hamburger.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    hamburger.classList.toggle("open");
    hamburger.setAttribute("aria-expanded", isOpen);
    document.body.style.overflow = isOpen ? "hidden" : "";
});

// Close menu when a nav link is clicked
navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        hamburger.classList.remove("open");
        hamburger.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
    });
});

// ===== ACTIVE NAV LINK HIGHLIGHTING =====
const sections = document.querySelectorAll("section[id]");
const navItems = document.querySelectorAll(".nav-links a");

function highlightNav() {
    const scrollY = window.scrollY + 150;
    sections.forEach((section) => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute("id");
        const link = document.querySelector(`.nav-links a[href="#${id}"]`);
        if (link) {
            link.classList.toggle(
                "active",
                scrollY >= top && scrollY < top + height,
            );
        }
    });
}

window.addEventListener("scroll", highlightNav);
window.addEventListener("load", highlightNav);

// ===== INTERSECTION OBSERVER FOR SCROLL ANIMATIONS =====
const observerOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -60px 0px",
};

const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
        } else {
            // Re-animate when scrolling back up
            entry.target.classList.remove("visible");
        }
    });
}, observerOptions);

// Observe all animatable elements
document
    .querySelectorAll(
        ".timeline-item, .skills-category, .language-item, .project-item, .contact-info, .contact-form, .about-content",
    )
    .forEach((el) => scrollObserver.observe(el));

// ===== SKILL BAR ANIMATIONS =====
const barObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            const bar = entry.target;
            if (entry.isIntersecting) {
                bar.style.width = bar.getAttribute("data-width") + "%";
            } else {
                bar.style.width = "0";
            }
        });
    },
    { threshold: 0.3 },
);

document
    .querySelectorAll(".skill-progress, .language-progress-bar")
    .forEach((bar) => {
        barObserver.observe(bar);
    });

// ===== TYPING EFFECT =====
const typingEl = document.getElementById("typingText");
const phrases = [
    "CS Student at Dual Education",
    "Cloud Developer Intern",
    "Linux & Cloud Enthusiast",
    "Web Developer",
];

let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingSpeed = 80;

function typeEffect() {
    const current = phrases[phraseIndex];

    if (isDeleting) {
        typingEl.textContent = current.substring(0, charIndex - 1);
        charIndex--;
        typingSpeed = 40;
    } else {
        typingEl.textContent = current.substring(0, charIndex + 1);
        charIndex++;
        typingSpeed = 80;
    }

    if (!isDeleting && charIndex === current.length) {
        // Pause at end of phrase
        typingSpeed = 2200;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        typingSpeed = 400;
    }

    setTimeout(typeEffect, typingSpeed);
}

typeEffect();

// ===== COUNTER ANIMATION (About section) =====
const counterObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(
                    counter.getAttribute("data-target"),
                    10,
                );
                animateCounter(counter, target);
                counterObserver.unobserve(counter);
            }
        });
    },
    { threshold: 0.5 },
);

function animateCounter(el, target) {
    let current = 0;
    const step = Math.max(1, Math.floor(target / 30));
    const interval = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(interval);
        }
        el.textContent = current;
    }, 50);
}

document.querySelectorAll(".highlight-number[data-target]").forEach((el) => {
    counterObserver.observe(el);
});

// ===== FORM SUBMISSION =====
const contactForm = document.getElementById("contactForm");
if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const btn = contactForm.querySelector(".submit-btn");
        const original = btn.innerHTML;

        btn.innerHTML = "<span>Sent!</span>";
        btn.style.pointerEvents = "none";

        setTimeout(() => {
            btn.innerHTML = original;
            btn.style.pointerEvents = "";
            contactForm.reset();
        }, 2500);
    });
}

// ===== SMOOTH SCROLLING =====
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 70,
                behavior: "smooth",
            });
        }
    });
});

// ===== GLITCH EFFECT ON NAV LINKS =====
(function () {
    const glitchElements = document.querySelectorAll(".glitch-text");

    glitchElements.forEach((el) => {
        const originalText = el.textContent;

        el.innerHTML = [...originalText]
            .map((char) => `<span>${char}</span>`)
            .join("");

        const spans = el.querySelectorAll("span");

        function glitchTo(targetText, toUpper = true) {
            spans.forEach((span, i) => {
                const origChar = targetText[i];
                if (!origChar) return;

                if (span._glitchAnim) clearInterval(span._glitchAnim);

                let counter = 0;
                const glitchChars = "!<>-_\\/[]{}—=+*^?#________";
                const duration = 2 + Math.random() * 30;
                const interval = 10 + Math.random() * 30;

                span._glitchAnim = setInterval(() => {
                    if (counter >= duration) {
                        clearInterval(span._glitchAnim);
                        span.textContent = toUpper
                            ? origChar.toUpperCase()
                            : origChar.toLowerCase();
                        return;
                    }
                    if (Math.random() < 0.3) {
                        span.textContent =
                            glitchChars[
                                Math.floor(Math.random() * glitchChars.length)
                            ];
                    }
                    counter++;
                }, interval);
            });
        }

        el.addEventListener("mouseenter", () => glitchTo(originalText, true));
        el.addEventListener("mouseleave", () => glitchTo(originalText, false));
    });
})();

// ===== RANDOM GLITCH ON HEADINGS =====
function glitchOnce(el, originalText) {
    const chars = "!<>-_\\/[]{}—=+*^?#________";
    const textArray = originalText.split("");
    const glitchInterval = setInterval(() => {
        el.textContent = textArray
            .map((letter) =>
                Math.random() < 0.3
                    ? chars[Math.floor(Math.random() * chars.length)]
                    : letter,
            )
            .join("");
    }, 50);

    setTimeout(() => {
        clearInterval(glitchInterval);
        el.textContent = originalText;
    }, 600);
}

function randomGlitchLoop(el, originalText) {
    setTimeout(
        () => {
            glitchOnce(el, originalText);
            randomGlitchLoop(el, originalText);
        },
        Math.random() * 8000 + 12000,
    );
}

document.querySelectorAll(".glitch").forEach((el) => {
    randomGlitchLoop(el, el.textContent);
});
