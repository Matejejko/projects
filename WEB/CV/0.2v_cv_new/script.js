// Header scroll effect
const header = document.getElementById("header");
window.addEventListener("scroll", () => {
    if (window.scrollY > 100) {
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }

    const navLinks = document.querySelector('.nav-links');
    if (window.scrollY > 100) {
        navLinks.classList.add('scrolled');
    } else {
        navLinks.classList.remove('scrolled');
    }
});

// Scroll animations
const animateOnScroll = () => {
    const elements = document.querySelectorAll(
        ".timeline-item, .skills-category, .language-item, .project-item, .contact-info, .contact-form, .about-content"
    );

    elements.forEach((element) => {
        const elementPosition = element.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.2;

        if (elementPosition < screenPosition) {
            element.classList.add("visible");
        } else {
            element.classList.remove("visible");
        }
    });
};

// Animate skill bars
const animateSkillBars = () => {
    const skillBars = document.querySelectorAll(".skill-progress");

    skillBars.forEach((bar) => {
        const elementPosition = bar.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.2;

        if (elementPosition < screenPosition) {
            const width = bar.getAttribute("data-width");
            bar.style.width = width + "%";
        } else {
            bar.style.width = "0";
        }
    });
};

// Animate language progress bars
const animateLanguageBars = () => {
    const languageBars = document.querySelectorAll(".language-progress-bar");

    languageBars.forEach((bar) => {
        const elementPosition = bar.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.2;

        if (elementPosition < screenPosition) {
            const width = bar.getAttribute("data-width");
            bar.style.width = width + "%";
        } else {
            bar.style.width = "0";
        }
    });
};

// Run animations on scroll
window.addEventListener("scroll", () => {
    animateOnScroll();
    animateSkillBars();
    animateLanguageBars();
});

// Run animations on page load
window.addEventListener("load", () => {
    animateOnScroll();
    animateSkillBars();
    animateLanguageBars();
});

// Form submission
const contactForm = document.getElementById("contactForm");
contactForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // In a real application, you would send the form data to a server
    // For this demo, we'll just show an alert
    alert("Thank you for your message! I will get back to you soon.");
    contactForm.reset();
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
        e.preventDefault();

        const targetId = this.getAttribute("href");
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: "smooth",
            });
        }
    });
});

(function () {
    function c() {
        var b = a.contentDocument || a.contentWindow.document;
        if (b) {
            var d = b.createElement("script");
            d.innerHTML =
                "window.__CF$cv$params={r:'9522960af6b15ac3',t:'MTc1MDMzMTQ5MS4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";
            b.getElementsByTagName("head")[0].appendChild(d);
        }
    }
    if (document.body) {
        var a = document.createElement("iframe");
        a.height = 1;
        a.width = 1;
        a.style.position = "absolute";
        a.style.top = 0;
        a.style.left = 0;
        a.style.border = "none";
        a.style.visibility = "hidden";
        document.body.appendChild(a);
        if ("loading" !== document.readyState) c();
        else if (window.addEventListener)
            document.addEventListener("DOMContentLoaded", c);
        else {
            var e = document.onreadystatechange || function () {};
            document.onreadystatechange = function (b) {
                e(b);
                "loading" !== document.readyState &&
                    ((document.onreadystatechange = e), c());
            };
        }
    }
})();
// Inside the self-executing function where the glitch effect is defined
(function () {
    // Select all elements with the glitch-text class
    const glitchElements = document.querySelectorAll(".glitch-text");

    glitchElements.forEach((el) => {
        const originalText = el.textContent;

        // Wrap each letter in <span>
        el.innerHTML = [...originalText]
            .map((char) => `<span>${char}</span>`)
            .join("");

        const spans = el.querySelectorAll("span");

        function glitchTo(targetText, toUpper = true) {
            spans.forEach((span, i) => {
                const origChar = targetText[i];
                if (!origChar) return;

                // Stop any previous animations
                if (span.animation) {
                    clearInterval(span.animation);
                }

                let counter = 0;
                const glitchChars = "!<>-_\\/[]{}—=+*^?#________";
                const glitchDuration = 2 + Math.random() * 30;
                const glitchInterval = 10 + Math.random() * 30;

                // Start the glitch animation
                span.animation = setInterval(() => {
                    if (counter >= glitchDuration) {
                        clearInterval(span.animation);
                        span.textContent = toUpper
                            ? origChar.toUpperCase()
                            : origChar.toLowerCase();
                        return;
                    }

                    // During animation, show random glitch characters
                    if (Math.random() < 0.3) {
                        span.textContent =
                            glitchChars[
                                Math.floor(Math.random() * glitchChars.length)
                            ];
                    }
                    counter++;
                }, glitchInterval);
            });
        }

        el.addEventListener("mouseenter", () => {
            glitchTo(originalText, true);
        });

        el.addEventListener("mouseleave", () => {
            glitchTo(originalText, false);
        });
    });
})();
