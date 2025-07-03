// script.js

// Helper: Get random page and movie
async function fetchRandomMovie() {
  // TMDB: discover/movie endpoint, sort by popularity, filter for poster, vote average, etc.
  const totalPages = 500; // TMDB max for discover
  const page = Math.floor(Math.random() * totalPages) + 1;
  const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}` +
    `&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page=${page}` +
    `&primary_release_date.gte=${yearRange.start}-01-01&primary_release_date.lte=${yearRange.end}-12-31` +
    `&with_original_language=${language}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error('No movies found');
  // Pick a random movie from the page
  let movie;
  let tries = 0;
  do {
    movie = data.results[Math.floor(Math.random() * data.results.length)];
    tries++;
  } while ((!movie.poster_path || !movie.title || !movie.vote_average) && tries < 10);
  if (!movie.poster_path) throw new Error('No valid movie poster found');
  return movie;
}

// Helper: Get IMDb rating (TMDB provides vote_average, not IMDb)
function getRatingString(vote) {
  return vote ? `${vote.toFixed(1)} / 10` : 'N/A';
}

// DOM Elements
const card = document.getElementById('movie-card');
const cardFront = card.querySelector('.card-front');
const cardBack = card.querySelector('.card-back');
const titleDiv = document.getElementById('movie-title');
const ratingDiv = document.getElementById('movie-rating');
const posterCarousel = document.getElementById('poster-carousel');

let isFlipped = false;
let isLoading = false;

// Year filter state
let yearRange = { start: 2015, end: 2025 };
const yearChip = document.getElementById('year-chip');
const yearBottomsheet = document.getElementById('year-bottomsheet');
const startYearInput = document.getElementById('start-year-input');
const endYearInput = document.getElementById('end-year-input');
const confirmYearBtn = document.getElementById('confirm-year-btn');

let language = 'en';
const languageSelect = document.getElementById('language-select');

function updateYearChip() {
  yearChip.textContent = `${yearRange.start}–${yearRange.end}`;
}

// Show/hide bottomsheet with GSAP
function showBottomsheet() {
  yearBottomsheet.classList.add('active');
  yearBottomsheet.classList.remove('hidden');
  if (window.gsap) {
    gsap.fromTo(yearBottomsheet, { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' });
  }
}
function hideBottomsheet() {
  if (window.gsap) {
    gsap.to(yearBottomsheet, { y: 100, opacity: 0, duration: 0.4, ease: 'power2.in', onComplete: () => {
      yearBottomsheet.classList.remove('active');
      yearBottomsheet.classList.add('hidden');
    }});
  } else {
    yearBottomsheet.classList.remove('active');
    yearBottomsheet.classList.add('hidden');
  }
}

// Chip click opens bottomsheet
yearChip.addEventListener('click', () => {
  startYearInput.value = yearRange.start;
  endYearInput.value = yearRange.end;
  languageSelect.value = language;
  showBottomsheet();
});

// Confirm updates year range and closes bottomsheet
confirmYearBtn.addEventListener('click', () => {
  const start = parseInt(startYearInput.value, 10);
  const end = parseInt(endYearInput.value, 10);
  const lang = languageSelect.value;
  if (start >= 1900 && end >= start && end <= 2100) {
    yearRange.start = start;
    yearRange.end = end;
    language = lang;
    updateYearChip();
    hideBottomsheet();
    // Reload movie with new year range
    setTimeout(() => {
      card.click();
    }, 450); // Wait for bottomsheet animation to finish
  } else {
    alert('Please enter a valid year range.');
  }
});

// Hide bottomsheet on outside click
window.addEventListener('click', (e) => {
  if (yearBottomsheet.classList.contains('active') && !yearBottomsheet.contains(e.target) && e.target !== yearChip) {
    hideBottomsheet();
  }
});

updateYearChip();

// Magical sparkles effect
function showSparkles() {
  const sparkle = document.createElement('div');
  sparkle.className = 'sparkle';
  sparkle.style.position = 'absolute';
  sparkle.style.left = `${Math.random() * 90 + 5}%`;
  sparkle.style.top = `${Math.random() * 90 + 5}%`;
  sparkle.style.width = '16px';
  sparkle.style.height = '16px';
  sparkle.style.pointerEvents = 'none';
  sparkle.style.zIndex = 1000;
  sparkle.style.background = 'radial-gradient(circle, #fff7b2 0%, #a78bfa 80%, transparent 100%)';
  sparkle.style.borderRadius = '50%';
  sparkle.style.opacity = 0.8;
  sparkle.style.filter = 'blur(1px)';
  card.appendChild(sparkle);
  setTimeout(() => {
    sparkle.style.transition = 'opacity 0.7s';
    sparkle.style.opacity = 0;
    setTimeout(() => sparkle.remove(), 700);
  }, 400);
}

function typewriterEffect(element, text, speed = 0.04) {
  if (!window.gsap) {
    element.textContent = text;
    return;
  }
  element.textContent = '';
  gsap.to(element, {
    duration: text.length * speed,
    text: { value: text },
    ease: 'none',
    snap: { text: 1 },
    onStart: () => { element.textContent = ''; },
    onUpdate: function() {
      // GSAP's text plugin is not included by default, so fallback to manual typewriter
      if (!gsap.plugins.text) {
        const currentLength = Math.ceil(this.progress() * text.length);
        element.textContent = text.slice(0, currentLength);
      }
    },
    onComplete: function() {
      element.textContent = text;
    }
  });
}

function ditherPosterOut(oldImg, onComplete) {
  if (window.gsap && oldImg) {
    gsap.to(oldImg, {
      filter: 'contrast(200%) brightness(50%) saturate(300%) hue-rotate(180deg)',
      opacity: 0,
      duration: 0.8,
      ease: 'power2.in',
      onComplete: () => {
        if (oldImg.parentNode) {
          oldImg.parentNode.removeChild(oldImg);
        }
        if (onComplete) onComplete();
      }
    });
  } else {
    // Fallback without GSAP
    if (oldImg && oldImg.parentNode) {
      oldImg.parentNode.removeChild(oldImg);
    }
    if (onComplete) onComplete();
  }
}

function createParticleMorph(oldPosterUrl, newPosterUrl, newMovie) {
  // Create particle container
  const particleContainer = document.createElement('div');
  particleContainer.className = 'particle-container';
  particleContainer.style.cssText = `
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    overflow: hidden;
  `;
  
  // Create old poster particles
  const oldParticles = [];
  const particleCount = 50; // Number of particles
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'morph-particle';
    particle.style.cssText = `
      position: absolute;
      width: 20px;
      height: 20px;
      background: url('${oldPosterUrl}') no-repeat;
      background-size: 100% 100%;
      border-radius: 50%;
      pointer-events: none;
    `;
    
    // Random initial position
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    particle.style.left = x + '%';
    particle.style.top = y + '%';
    
    oldParticles.push(particle);
    particleContainer.appendChild(particle);
  }
  
  posterCarousel.appendChild(particleContainer);
  
  // Phase 1: Scatter particles
  if (window.gsap) {
    const scatterTl = gsap.timeline();
    
    oldParticles.forEach((particle, index) => {
      scatterTl.to(particle, {
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200,
        rotation: Math.random() * 360,
        scale: 0.1,
        opacity: 0.3,
        duration: 0.8,
        ease: 'power2.in',
        delay: index * 0.01
      }, 0);
    });
    
    // Phase 2: Morph to new poster
    scatterTl.to(oldParticles, {
      backgroundImage: `url('${newPosterUrl}')`,
      scale: 1,
      opacity: 1,
      duration: 0.5,
      ease: 'power2.out'
    }, 0.8);
    
    // Phase 3: Reassemble into new poster
    scatterTl.to(oldParticles, {
      x: 0,
      y: 0,
      rotation: 0,
      duration: 1.2,
      ease: 'power2.out',
      onComplete: () => {
        // Remove particles and show final image
        posterCarousel.removeChild(particleContainer);
        const finalImg = document.createElement('img');
        finalImg.src = newPosterUrl;
        finalImg.alt = newMovie.title;
        finalImg.className = 'movie-poster-full carousel-slide';
        posterCarousel.appendChild(finalImg);
        
        // Update title and rating
        typewriterEffect(titleDiv, newMovie.title);
        ratingDiv.textContent = `⭐ ${getRatingString(newMovie.vote_average)}`;
      }
    }, 1.3);
    
  } else {
    // Fallback without GSAP
    const finalImg = document.createElement('img');
    finalImg.src = newPosterUrl;
    finalImg.alt = newMovie.title;
    finalImg.className = 'movie-poster-full carousel-slide';
    posterCarousel.appendChild(finalImg);
    typewriterEffect(titleDiv, newMovie.title);
    ratingDiv.textContent = `⭐ ${getRatingString(newMovie.vote_average)}`;
  }
}

function particleMorphTransition(newPosterUrl, newMovie) {
  // Get the old poster if it exists
  const oldImg = posterCarousel.querySelector('img');
  const oldPosterUrl = oldImg ? oldImg.src : null;
  
  // Clear container
  posterCarousel.innerHTML = '';
  
  if (oldPosterUrl) {
    // Morph from old to new poster
    createParticleMorph(oldPosterUrl, newPosterUrl, newMovie);
  } else {
    // First time, just show the poster
    const newImg = document.createElement('img');
    newImg.src = newPosterUrl;
    newImg.alt = newMovie.title;
    newImg.className = 'movie-poster-full carousel-slide';
    posterCarousel.appendChild(newImg);
    typewriterEffect(titleDiv, newMovie.title);
    ratingDiv.textContent = `⭐ ${getRatingString(newMovie.vote_average)}`;
  }
}

function seamlessTransition(newPosterUrl, newMovie) {
  // Get the old poster if it exists
  const oldImg = posterCarousel.querySelector('img');
  
  // Create new image element
  const newImg = document.createElement('img');
  newImg.src = newPosterUrl;
  newImg.alt = newMovie.title;
  newImg.className = 'movie-poster-full carousel-slide';
  
  // Set initial state for seamless transition
  newImg.style.opacity = '0';
  newImg.style.transform = 'scale(1.1)';
  newImg.style.filter = 'blur(10px)';
  
  posterCarousel.appendChild(newImg);
  
  if (window.gsap) {
    const tl = gsap.timeline();
    
    // Fade out old poster with scale and blur
    if (oldImg) {
      tl.to(oldImg, {
        opacity: 0,
        scale: 0.95,
        filter: 'blur(8px)',
        duration: 0.6,
        ease: 'power2.inOut'
      }, 0);
    }
    
    // Fade in new poster with scale and blur
    tl.to(newImg, {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      duration: 0.8,
      ease: 'power2.out'
    }, oldImg ? 0.2 : 0);
    
    // Remove old poster and update content
    tl.call(() => {
      if (oldImg && oldImg.parentNode) {
        oldImg.parentNode.removeChild(oldImg);
      }
      typewriterEffect(titleDiv, newMovie.title);
      ratingDiv.textContent = `⭐ ${getRatingString(newMovie.vote_average)}`;
    }, null, null, 0.8);
    
  } else {
    // Fallback without GSAP
    if (oldImg && oldImg.parentNode) {
      oldImg.parentNode.removeChild(oldImg);
    }
    newImg.style.opacity = '1';
    newImg.style.transform = 'scale(1)';
    newImg.style.filter = 'blur(0px)';
    typewriterEffect(titleDiv, newMovie.title);
    ratingDiv.textContent = `⭐ ${getRatingString(newMovie.vote_average)}`;
  }
}

// Card click handler
card.addEventListener('click', async () => {
  if (isLoading) return;
  isLoading = true;
  titleDiv.textContent = '';
  ratingDiv.textContent = '';
  cardBack.classList.remove('hidden');
  cardFront.classList.add('hidden');

  let attempts = 0;
  let loaded = false;
  let lastError = null;
  let newPosterUrl = '';
  let newMovie = null;
  while (attempts < 3 && !loaded) {
    try {
      const movie = await fetchRandomMovie();
      const posterPath = movie.poster_path && movie.poster_path.startsWith('/') ? movie.poster_path : `/${movie.poster_path}`;
      const posterUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;
      console.log('Attempt', attempts + 1, 'Movie:', movie);
      console.log('Poster URL:', posterUrl);
      // Create image element and check if it loads
      await new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Poster image failed to load'));
        img.src = posterUrl;
      });
      newPosterUrl = posterUrl;
      newMovie = movie;
      loaded = true;
    } catch (err) {
      console.error('Error in attempt', attempts + 1, err);
      lastError = err;
      attempts++;
    }
  }
  if (loaded) {
    // Animate poster transition with seamless effect
    seamlessTransition(newPosterUrl, newMovie);
    isFlipped = true;
  } else {
    posterCarousel.innerHTML = `<div class="text-xl text-red-200">Failed to load movie poster after 3 attempts.<br>${lastError ? lastError.message : ''}</div>`;
    isFlipped = true;
  }
  isLoading = false;
});

// Optional: double click to reset
card.addEventListener('dblclick', () => {
  if (!isFlipped) return;
  cardBack.classList.add('hidden');
  cardFront.classList.remove('hidden');
  titleDiv.textContent = '';
  ratingDiv.textContent = '';
  isFlipped = false;
}); 