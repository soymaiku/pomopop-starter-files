// music.js
const musicPlayer = document.getElementById("js-music-player");
const musicTracks = {
  lofi: "https://usa9.fastcast4u.com/proxy/jamz?mp=/1",
  rain: "./Audio/rain.wav",
  classical: "https://c32.radioboss.fm:8332/autodj",
  jazz: "https://listen.radioking.com/radio/637990/stream/700915",
  nature: "",
};

// Web Audio API setup for enhanced volume control (optional)
let audioContext;
let sourceNode;
let gainNode;
let useWebAudio = false;

function tryInitAudioContext() {
  // Only try once per page load
  if (useWebAudio || audioContext) {
    return;
  }
  
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
    
    useWebAudio = true;
    console.log("Web Audio API initialized successfully");
  } catch (error) {
    console.log("Using standard audio controls:", error.message);
    useWebAudio = false;
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
    // Try to initialize Web Audio API on first play (for better volume control)
    if (!audioContext && !useWebAudio) {
      tryInitAudioContext();
    }
    
    // Resume audio context if it exists and is suspended
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(err => console.log("Resume failed:", err));
    }
    
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
  const volume = e.target.value / 100;
  
  // If Web Audio is available, use gain node (works on iOS)
  if (useWebAudio && gainNode) {
    gainNode.gain.value = volume;
  }
  
  // Always try native volume (works on desktop/Android)
  try {
    musicPlayer.volume = volume;
  } catch (error) {
    // iOS blocks native volume control, but that's okay
  }
}
