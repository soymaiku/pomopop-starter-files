// video-bg.js
// NOTE: This file is NOT imported/used. Video background functionality
// is handled directly in app.js with the correct element IDs.
// This file is kept for reference only.

document.addEventListener("DOMContentLoaded", () => {
  const videoBtn = document.getElementById("js-video-bg-btn");
  const videoModal = document.getElementById("js-video-modal");
  const closeBtn = document.getElementById("js-close-video");
  const videoOptions = document.querySelectorAll(".video-option");
  const bgVideo = document.getElementById("bg-video");

  if (!videoBtn || !videoModal || !bgVideo) {
    console.warn("Video background elements not found");
    return;
  }

  // Open Modal
  videoBtn.addEventListener("click", () => {
    videoModal.classList.add("open");
  });

  // Close Modal Function
  const closeModal = () => {
    videoModal.classList.remove("open");
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

  // Handle Video Selection
  videoOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const videoFile = option.getAttribute("data-video");

      // Remove active class from all options
      videoOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");

      if (videoFile === "off") {
        bgVideo.style.display = "none";
        bgVideo.pause();
        bgVideo.src = "";
        document.body.classList.remove("video-active");
      } else {
        // Set video source directly (no <source> element needed)
        bgVideo.src = videoFile;
        bgVideo.load();
        bgVideo.style.display = "block";

        bgVideo.onloadeddata = () => {
          document.body.classList.add("video-active");
          bgVideo.play().catch((e) => console.log("Video play failed:", e));
        };

        bgVideo.onerror = () => {
          console.error("Failed to load video:", videoFile);
          option.classList.remove("active");
          document.body.classList.remove("video-active");
          bgVideo.style.display = "none";
        };
      }
      closeModal();
    });
  });
});
