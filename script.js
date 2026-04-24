const workerUrl = 'https://gartic-highlights-gallery.angrylizard.workers.dev/';
const bucketUrl = 'https://pub-d4b8e6479ecd4cfd8ca22220375fc499.r2.dev';

let stats = {};
let userVotes = {}; // Track user's personal votes: {imagePath: 'favorite' | 'bad' | null}

// SVG Icons
const starEmptySVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
const starFilledSVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/></svg>`;
const blockEmptySVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
const blockFilledSVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="currentColor"/></svg>`;

// Load user votes from localStorage
function loadUserVotes() {
  const saved = localStorage.getItem('userVotes');
  userVotes = saved ? JSON.parse(saved) : {};
}

// Save user votes to localStorage
function saveUserVotes() {
  localStorage.setItem('userVotes', JSON.stringify(userVotes));
}

// Load columns from localStorage
function loadColumns() {
  const saved = localStorage.getItem('galleryColumns');
  if (saved) {
    const columnsInput = document.getElementById('columns');
    columnsInput.value = saved;
    document.documentElement.style.setProperty('--columns', saved);
  }
}

// Save columns to localStorage
function saveColumns() {
  const columnsInput = document.getElementById('columns');
  localStorage.setItem('galleryColumns', columnsInput.value);
  document.documentElement.style.setProperty('--columns', columnsInput.value);
}

function toImageId(date, name, key) {
  return name !== '' ? `${date}/${name}/${key}` : `${date}/${key}`;
}

async function fetchList() {
  try {
    const response = await fetch(`${workerUrl}list`);
    const data = await response.json();
    
    // Build stats map from manifest items directly
    const statsMap = {};
    data.dates.forEach((dateObj) => {
      dateObj.items.forEach((item) => {
        item.images.forEach(data => {
            const imageId = toImageId(dateObj.date, item.name, data.key);
            statsMap[imageId] = {favorite: data.fav || 0, bad: data.bad || 0};
        });
      });
    });
    
    stats = statsMap;
    buildGallery(data.dates);
  } catch (error) {
    console.error('Error fetching list:', error);
  }
}

function buildGallery(dates) {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';
  dates.forEach(dateObj => {
    const section = document.createElement('div');
    section.className = 'date-section';
    section.innerHTML = `<h2>${dateObj.date}</h2>`;
    
    // Add folder subsection
    if (dateObj.items.length > 0) {
      dateObj.items.forEach(item => {
        const images = item.images.map(data => toImageId(dateObj.date, item.name, data.key));
        
        const folderSubsection = document.createElement('div');
        folderSubsection.className = 'category-subsection';
        
        const folderHeader = document.createElement('h3');
        let folderTitle = item.name === '' ? 'Individual Images' : item.name
        folderHeader.textContent = `${dateObj.date} - ${folderTitle} (${item.images.length} objects)`;
        folderSubsection.appendChild(folderHeader);
        
        const folderGrid = document.createElement('div');
        folderGrid.className = 'image-grid';
        
        images.forEach(imageid => {
          createImageElement(folderGrid, imageid, dateObj.date, item.name);
        });
        folderSubsection.appendChild(folderGrid);
        section.appendChild(folderSubsection);
      });
      
    }
    
    gallery.appendChild(section);
  });
}

function createImageElement(container, imageId, date, name) {
  const imgDiv = document.createElement('div');
  imgDiv.className = 'image-item';
  imgDiv.style.position = 'relative';
  imgDiv.style.display = 'inline-block';
  imgDiv.style.cursor = 'pointer';
  
  const img = document.createElement('img');
  // This would display all images ast once, however when user
  // scrolls very fast we don't want to load everything, just what they are looking at for more than a second
  //img.src = `${bucketUrl}/${imageId}.webp`;
  img.loading = 'lazy';
  img.style.display = 'block';
  img.style.height = '262px';
  img.style.width = 'auto';
  img.dataset.src = `${bucketUrl}/${imageId}.webp`;

    let loadTimeout;

    const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
        // start 1s timer when image enters viewport
        loadTimeout = setTimeout(() => {
            img.src = img.dataset.src;
        }, 1000);
        } else {
        // if user scrolls away quickly, cancel loading
        clearTimeout(loadTimeout);
        }
    });
    }, {
    rootMargin: "150px"
    });

    observer.observe(img);
  
  const buttons = document.createElement('div');
  buttons.className = 'buttons';
  
  const favBtn = document.createElement('button');
  favBtn.className = 'icon-button';
  
  const badBtn = document.createElement('button');
  badBtn.className = 'icon-button';
  
  // Update button display
  function updateButtonDisplay() {
    const voteData = stats[imageId] || {favorite: 0, bad: 0};
    const userVote = userVotes[imageId];
    
    // Update favorite button
    favBtn.innerHTML = (userVote === 'favorite' ? starFilledSVG : starEmptySVG) + `<span>${voteData.favorite}</span>`;
    favBtn.classList.toggle('active', userVote === 'favorite');
    
    // Update bad button
    badBtn.innerHTML = (userVote === 'bad' ? blockFilledSVG : blockEmptySVG) + `<span>${voteData.bad}</span>`;
    badBtn.classList.toggle('active', userVote === 'bad');
  }
  
  updateButtonDisplay();
  
  favBtn.onclick = (e) => {
    e.stopPropagation();
    markImage(imageId, 'favorite', updateButtonDisplay);
  };
  
  badBtn.onclick = (e) => {
    e.stopPropagation();
    markImage(imageId, 'bad', updateButtonDisplay);
  };
  
  buttons.appendChild(favBtn);
  buttons.appendChild(badBtn);
  
  img.onclick = () => showModal(img.src, date, imageId);
  
  imgDiv.appendChild(img);
  imgDiv.appendChild(buttons);
  container.appendChild(imgDiv);
}

async function markImage(path, action, callback) {
  const currentVote = userVotes[path];
  let isAdding = false;
  
  // Check if this is a new vote or toggling an existing one
  if (currentVote === action) {
    // User is toggling off their vote
    userVotes[path] = null;
    isAdding = false;
  } else if (currentVote === null || currentVote === undefined) {
    // User is adding a new vote
    userVotes[path] = action;
    isAdding = true;
  } else {
    // User is changing their vote (e.g., from favorite to bad)
    userVotes[path] = action;
    isAdding = true;
  }
  
  // Save to localStorage
  saveUserVotes();
  
  try {
    // Send to server with add/remove indication
    await fetch(`${workerUrl}mark`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({path, action, add: isAdding})
    });
    
    // Update local stats display
    if (!stats[path]) {
      stats[path] = {favorite: 0, bad: 0};
    }
    
    if (isAdding) {
      if (action === 'favorite') {
        stats[path].favorite += 1;
      } else if (action === 'bad') {
        stats[path].bad += 1;
      }
    } else {
      // Toggling off - decrement the count
      if (action === 'favorite' && stats[path].favorite > 0) {
        stats[path].favorite -= 1;
      } else if (action === 'bad' && stats[path].bad > 0) {
        stats[path].bad -= 1;
      }
    }
    
    // Update button display
    if (callback) callback();
  } catch (error) {
    console.error('Error marking image:', error);
    // Revert the vote if API call failed
    userVotes[path] = currentVote;
    saveUserVotes();
  }
}

function showModal(src, date, imageId) {
  const modal = document.createElement('div');
  modal.className = 'fullscreen-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '10000';
  
  const modalContent = document.createElement('div');
  modalContent.style.position = 'relative';
  modalContent.style.maxWidth = '90vw';
  modalContent.style.maxHeight = '90vh';
  
  const img = document.createElement('img');
  img.src = src;
  img.style.maxWidth = '100%';
  img.style.maxHeight = '100%';
  img.style.objectFit = 'contain';
  
  const buttons = document.createElement('div');
  buttons.style.position = 'absolute';
  buttons.style.bottom = '10px';
  buttons.style.right = '10px';
  buttons.style.display = 'flex';
  buttons.style.gap = '8px';
  
  const favBtn = document.createElement('button');
  favBtn.className = 'icon-button';
  
  const badBtn = document.createElement('button');
  badBtn.className = 'icon-button';
  
  // Update button display
  function updateModalButtons() {
    const voteData = stats[imageId] || {favorite: 0, bad: 0};
    const userVote = userVotes[imageId];
    
    favBtn.innerHTML = (userVote === 'favorite' ? starFilledSVG : starEmptySVG) + `<span>${voteData.favorite}</span>`;
    favBtn.classList.toggle('active', userVote === 'favorite');
    
    badBtn.innerHTML = (userVote === 'bad' ? blockFilledSVG : blockEmptySVG) + `<span>${voteData.bad}</span>`;
    badBtn.classList.toggle('active', userVote === 'bad');
  }
  
  updateModalButtons();
  
  favBtn.onclick = (e) => {
    e.stopPropagation();
    markImage(imageId, 'favorite', updateModalButtons);
  };
  badBtn.onclick = (e) => {
    e.stopPropagation();
    markImage(imageId, 'bad', updateModalButtons);
  };
  
  buttons.appendChild(favBtn);
  buttons.appendChild(badBtn);
  
  modalContent.appendChild(img);
  modalContent.appendChild(buttons);
  modal.appendChild(modalContent);
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
  
  document.body.appendChild(modal);
}

document.addEventListener('DOMContentLoaded', () => {
  loadUserVotes();
  loadColumns();
  fetchList();
  
  // Refresh button listener
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', fetchList);
  }
  
  // Columns input listener - only update display, don't fetch
  const columnsInput = document.getElementById('columns');
  if (columnsInput) {
    columnsInput.addEventListener('change', saveColumns);
    columnsInput.addEventListener('input', () => {
      document.documentElement.style.setProperty('--columns', columnsInput.value);
    });
  }
});