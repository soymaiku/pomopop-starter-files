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
let isAudioContextInitialized = false;

function initAudioContext() {
  if (!isAudioContextInitialized) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      
      // Connect the audio element to Web Audio API
      sourceNode = audioContext.createMediaElementSource(musicPlayer);
      sourceNode.connect(gainNode);
      
      // Set initial volume from slider
      const volumeSlider = document.getElementById("js-volume");
      if (volumeSlider) {
        gainNode.gain.value = volumeSlider.value / 100;
      }
      
      isAudioContextInitialized = true;
      console.log("Audio context initialized successfully");
    } catch (error) {
      console.error("Failed to initialize audio context:", error);
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
    // Initialize audio context on first user interaction (required for iOS)
    if (!isAudioContextInitialized) {
      initAudioContext();
    }
    
    // Resume audio context if suspended (iOS requirement)
    if (audioContext && audioContext.state === 'suspended') {
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
  
  // Initialize audio context if user adjusts volume before playing
  if (!isAudioContextInitialized) {
    initAudioContext();
  }
  
  // Use Web Audio API gain node for iOS and streaming audio compatibility
  if (gainNode) {
    gainNode.gain.value = volume;
  }
  
  // Also set native volume for non-iOS devices (fallback)
  try {
    musicPlayer.volume = volume;
  } catch (error) {
    console.log("Native volume control not available");
  }
}
