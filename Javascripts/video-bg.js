document.addEventListener("DOMContentLoaded", () => {
  const videoBtn = document.getElementById("video-bg-btn");
  const videoModal = document.getElementById("video-modal");
  const closeBtn = document.querySelector(".close-video-modal");
  const videoOptions = document.querySelectorAll(".video-option");
  const bgVideo = document.getElementById("bg-video");
  const bgSource = bgVideo.querySelector("source");

  // Preload video metadata for faster playback
  bgVideo.preload = "metadata";

  // Open Modal
  videoBtn.addEventListener("click", () => {
    // Using .open class as per existing style conventions
    videoModal.classList.add("open");
    videoModal.style.display = "block";
  });

  // Close Modal Function
  const closeModal = () => {
    videoModal.classList.remove("open");
    videoModal.style.display = "none";
  };

  // Close on X button
  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  // Close on click outside
  window.addEventListener("click", (e) => {
    if (e.target === videoModal) {
      closeModal();
    }
  });

  // Handle Video Selection with optimized loading
  videoOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const videoFile = option.getAttribute("data-video");
      if (videoFile === "off") {
        bgVideo.style.display = "none";
        bgVideo.pause();
      } else {
        bgSource.src = videoFile;
        bgVideo.preload = "auto"; // Load entire video when selected
        bgVideo.load();
        bgVideo.style.display = "block";
        // Wait for video to be ready before playing
        bgVideo.oncanplay = () => {
          bgVideo.play().catch(err => console.log("Autoplay prevented:", err));
        };
      }
      closeModal();
    });
  });
});

