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
let webAudioInitAttempted = false;

// YouTube player state
let currentYouTubeVideoId = null;
let isYouTubePlaying = false;

function tryInitAudioContext() {
  // Only try once per page load
  if (webAudioInitAttempted) {
    return;
  }
  
  webAudioInitAttempted = true;
  
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
    
    useWebAudio = true;
    console.log("Web Audio API initialized - volume control enabled for iOS");
  } catch (error) {
    console.warn("Web Audio API failed:", error.message);
    useWebAudio = false;
    
    // Set native volume as fallback
    const volumeSlider = document.getElementById("js-volume");
    if (volumeSlider) {
      try {
        musicPlayer.volume = volumeSlider.value / 100;
      } catch (e) {
        console.log("Native volume control not available (iOS)");
      }
    }
  }
}

// Extract YouTube video ID from URL
function extractYouTubeVideoId(url) {
  // Handle different YouTube URL formats
  const patterns = [
    // Standard watch URL: youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})(?:[&?]|$)/,
    // Short URL: youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?]|$)/,
    // Embed URL: youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?:[&?]|$)/,
    // Live URL: youtube.com/live/VIDEO_ID
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})(?:[&?]|$)/,
    // Playlist URL: extract first video if present
    /(?:youtube\.com\/watch\?.*[&?]v=)([a-zA-Z0-9_-]{11})/,
    // Mobile URL: m.youtube.com
    /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})(?:[&?]|$)/,
    // Direct video ID (11 characters)
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

// Validate YouTube URL type
function getYouTubeUrlType(url) {
  if (url.includes('/results?') || url.includes('search_query=')) {
    return 'search';
  }
  if (url.includes('/playlist?') && !url.includes('&v=')) {
    return 'playlist_only';
  }
  if (url.includes('/channel/') || url.includes('/c/') || url.includes('/@')) {
    return 'channel';
  }
  return 'video';
}

// Play YouTube video
export function playYouTubeVideo() {
  const urlInput = document.getElementById("js-youtube-url");
  const errorMsg = document.getElementById("js-youtube-error");
  const iframe = document.getElementById("js-youtube-iframe");
  const playerWrapper = document.getElementById("js-youtube-player-wrapper");
  const placeholder = document.getElementById("js-youtube-placeholder");
  
  const url = urlInput.value.trim();
  
  if (!url) {
    errorMsg.textContent = "Please enter a YouTube URL";
    errorMsg.classList.remove("hidden");
    return;
  }
  
  // Check URL type
  const urlType = getYouTubeUrlType(url);
  
  if (urlType === 'search') {
    errorMsg.textContent = "Search URLs not supported. Please open a video and paste its URL.";
    errorMsg.classList.remove("hidden");
    return;
  }
  
  if (urlType === 'playlist_only') {
    errorMsg.textContent = "Please paste a specific video URL, not a playlist URL.";
    errorMsg.classList.remove("hidden");
    return;
  }
  
  if (urlType === 'channel') {
    errorMsg.textContent = "Channel URLs not supported. Please paste a specific video URL.";
    errorMsg.classList.remove("hidden");
    return;
  }
  
  const videoId = extractYouTubeVideoId(url);
  
  if (!videoId) {
    errorMsg.textContent = "Invalid YouTube video URL. Please paste a link like: youtube.com/watch?v=...";
    errorMsg.classList.remove("hidden");
    return;
  }
  
  // Hide error message
  errorMsg.classList.add("hidden");
  
  // Stop preset audio if playing
  musicPlayer.pause();
  
  // Update iframe source with autoplay and live stream support
  // Add mute=0 to allow unmuted autoplay, loop for non-live videos
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&mute=0&playsinline=1`;
  
  // Show player, hide placeholder
  playerWrapper.classList.remove("hidden");
  placeholder.classList.add("hidden");
  
  currentYouTubeVideoId = videoId;
  isYouTubePlaying = true;
  
  console.log("Playing YouTube video:", videoId);
}

// Stop YouTube video
export function stopYouTubeVideo() {
  const iframe = document.getElementById("js-youtube-iframe");
  const playerWrapper = document.getElementById("js-youtube-player-wrapper");
  const placeholder = document.getElementById("js-youtube-placeholder");
  
  // Clear iframe source to stop playback
  iframe.src = "";
  
  // Hide player, show placeholder
  playerWrapper.classList.add("hidden");
  placeholder.classList.remove("hidden");
  
  currentYouTubeVideoId = null;
  isYouTubePlaying = false;
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
    // Check if it's a streaming URL
    const isStreaming = trackUrl.startsWith('http');
    
    // Set the audio source
    musicPlayer.src = trackUrl;
    
    // Resume audio context if it exists and is suspended
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(err => console.log("Resume failed:", err));
    }
    
    if (isStreaming) {
      // For streaming sources, play immediately then init Web Audio
      musicPlayer.play()
        .then(() => {
          // Initialize Web Audio API after playback starts (works better with CORS)
          if (!webAudioInitAttempted) {
            setTimeout(() => tryInitAudioContext(), 100);
          }
        })
        .catch((error) => {
          console.error("Streaming play failed:", error);
        });
    } else {
      // For local files, initialize Web Audio first
      if (!webAudioInitAttempted) {
        tryInitAudioContext();
      }
      
      musicPlayer.load();
      musicPlayer.play().catch((error) => {
        console.error("Autoplay failed:", error);
      });
    }
  }
}

export function pauseMusic() {
  musicPlayer.pause();
}

export function stopMusic() {
  musicPlayer.pause();
  musicPlayer.currentTime = 0;
  
  // Also stop YouTube if playing
  stopYouTubeVideo();
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
  
  // Update volume display
  const volumeDisplay = document.getElementById("js-volume-display");
  if (volumeDisplay) {
    volumeDisplay.textContent = e.target.value;
  }
  
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
  
  // Note: YouTube iframe API doesn't support volume control via parent page
  // Users will need to use YouTube's native controls
}
