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
    // Animate carousel: slide out old, slide in new
    const oldImg = posterCarousel.querySelector('img');
    if (oldImg) {
      oldImg.classList.remove('slide-in');
      oldImg.classList.add('slide-out');
      // After slide out, remove old and add new
      setTimeout(() => {
        posterCarousel.innerHTML = '';
        const newImg = document.createElement('img');
        newImg.src = newPosterUrl;
        newImg.alt = newMovie.title;
        newImg.className = 'movie-poster-full carousel-slide slide-in';
        posterCarousel.appendChild(newImg);
        // After slide in, update title/rating
        setTimeout(() => {
          typewriterEffect(titleDiv, newMovie.title);
          ratingDiv.textContent = `⭐ ${getRatingString(newMovie.vote_average)}`;
        }, 600);
      }, 600);
    } else {
      // First time, just show
      const newImg = document.createElement('img');
      newImg.src = newPosterUrl;
      newImg.alt = newMovie.title;
      newImg.className = 'movie-poster-full carousel-slide slide-in';
      posterCarousel.appendChild(newImg);
      setTimeout(() => {
        typewriterEffect(titleDiv, newMovie.title);
        ratingDiv.textContent = `⭐ ${getRatingString(newMovie.vote_average)}`;
      }, 600);
    }
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