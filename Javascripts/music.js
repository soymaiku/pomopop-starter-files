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
    const volume = volumeSlider ? volumeSlider.value / 100 : 0.5;
    gainNode.gain.value = volume;
    
    // Also set native volume
    try {
      musicPlayer.volume = volume;
    } catch (e) {
      // Ignore on iOS
    }
    
    useWebAudio = true;
    console.log("Web Audio API initialized successfully");
  } catch (error) {
    console.log("Using standard audio controls:", error.message);
    useWebAudio = false;
    
    // Ensure native volume is set
    const volumeSlider = document.getElementById("js-volume");
    if (volumeSlider) {
      try {
        musicPlayer.volume = volumeSlider.value / 100;
      } catch (e) {
        // Ignore
      }
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
    // Try to initialize Web Audio API on first play (for better volume control)
    if (!audioContext && !useWebAudio) {
      tryInitAudioContext();
    }
    
    // Check if it's a streaming URL
    const isStreaming = trackUrl.startsWith('http');
    
    // Set the audio source
    musicPlayer.src = trackUrl;
    
    if (isStreaming) {
      // For streaming sources, don't call load() - just play directly
      // This prevents delays in streaming playback
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume()
          .then(() => musicPlayer.play())
          .catch((error) => console.error("Play failed:", error));
      } else {
        // Play streaming audio immediately
        musicPlayer.play().catch((error) => {
          console.error("Streaming play failed:", error);
        });
      }
    } else {
      // For local files, use load() for better reliability
      musicPlayer.load();
      
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume()
          .then(() => musicPlayer.play())
          .catch((error) => console.error("Play failed:", error));
      } else {
        musicPlayer.play().catch((error) => {
          console.error("Autoplay failed:", error);
        });
      }
    }
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
