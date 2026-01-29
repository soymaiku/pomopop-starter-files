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

  // Handle Video Selection with improved mobile compatibility
  videoOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const videoFile = option.getAttribute("data-video");
      if (videoFile === "off") {
        bgVideo.style.display = "none";
        bgVideo.pause();
      } else {
        // Remove and re-add source for iOS compatibility
        while (bgVideo.firstChild) bgVideo.removeChild(bgVideo.firstChild);
        const newSource = document.createElement('source');
        newSource.src = videoFile;
        newSource.type = 'video/mp4';
        bgVideo.appendChild(newSource);
        bgVideo.muted = true;
        bgVideo.setAttribute('muted', '');
        bgVideo.setAttribute('playsinline', '');
        bgVideo.setAttribute('autoplay', '');
        bgVideo.preload = "auto";
        bgVideo.style.display = "block";
        // Load and play in the same user gesture
        bgVideo.load();
        setTimeout(() => {
          bgVideo.play().catch(err => console.log("Autoplay prevented:", err));
        }, 50);
      }
      closeModal();
    });
  });
});

