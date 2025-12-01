// music.js
const musicPlayer = document.getElementById("js-music-player");
const musicTracks = {
  lofi: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  ambient: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  classical: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  jazz: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  nature: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
};

export function playMusic() {
  const select = document.getElementById("js-music-select");
  const trackId = select.value;

  if (!trackId) {
    musicPlayer.pause();
    return;
  }

  const trackUrl = musicTracks[trackId];
  if (trackUrl) {
    musicPlayer.src = trackUrl;
    // Attempt to play and catch any potential autoplay errors
    musicPlayer.play().catch((error) => {
      console.error("Autoplay failed:", error);
    });
  }
}

export function pauseMusic() {
  musicPlayer.pause();
}

export function stopMusic() {
  musicPlayer.pause();
  musicPlayer.currentTime = 0;
}

export function openMusicModal() {
  const modal = document.getElementById("js-music-modal");
  modal.classList.add("open");
}

export function closeMusicModal() {
  const modal = document.getElementById("js-music-modal");
  modal.classList.remove("open");
}

export function handleVolumeChange(e) {
  musicPlayer.volume = e.target.value / 100;
}
