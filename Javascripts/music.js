// music.js
const musicPlayer = document.getElementById("js-music-player");
const musicTracks = {
  lofi: "https://usa9.fastcast4u.com/proxy/jamz?mp=/1",
  rain: "./Audio/rain.wav",
  classical: "https://c32.radioboss.fm:8332/autodj",
  jazz: "https://listen.radioking.com/radio/637990/stream/700915",
  nature: "",
};

// Web Audio API setup for iOS volume control
let audioContext;
let sourceNode;
let gainNode;
let currentTrackUrl = null;

function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    
    // Connect the audio element to Web Audio API
    if (!sourceNode) {
      sourceNode = audioContext.createMediaElementSource(musicPlayer);
      sourceNode.connect(gainNode);
    }
  }
}

export function playMusic() {
  const select = document.getElementById("js-music-select");
  const trackId = select.value;

  if (!trackId) {
    musicPlayer.pause();
    return;
  }

  const trackUrl = musicTracks[trackId];
  if (trackUrl) {
    // Initialize audio context on user interaction (required for iOS)
    initAudioContext();
    
    // Resume audio context if suspended (iOS requirement)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    musicPlayer.src = trackUrl;
    currentTrackUrl = trackUrl;
    
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
  const volume = e.target.value / 100;
  
  // Use Web Audio API gain node for iOS compatibility
  if (gainNode) {
    gainNode.gain.value = volume;
  }
  
  // Also set native volume for non-iOS devices
  musicPlayer.volume = volume;
}
