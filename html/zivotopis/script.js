const carouselItems = document.querySelectorAll(".carousel-item");
const prevBtn = document.querySelector(".carousel-control.prev");
const nextBtn = document.querySelector(".carousel-control.next");

let currentIndex = 0;

function updateCarousel() {
    carouselItems.forEach((item, index) => {
        item.classList.toggle("active", index === currentIndex);
    });
}

prevBtn.addEventListener("click", () => {
    currentIndex =
        (currentIndex - 1 + carouselItems.length) % carouselItems.length;
    updateCarousel();
});

nextBtn.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % carouselItems.length;
    updateCarousel();
});

updateCarousel();
