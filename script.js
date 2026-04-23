const workerUrl = 'https://gartic-highlights-gallery.angrylizard.workers.dev/';
const bucketUrl = 'https://pub-d4b8e6479ecd4cfd8ca22220375fc499.r2.dev';

let stats = {};
let userVotes = {}; // Track user's personal votes: {imagePath: 'favorite' | 'bad' | null}



// Load user votes from localStorage
function loadUserVotes() {
  const saved = localStorage.getItem('userVotes');
  userVotes = saved ? JSON.parse(saved) : {};
}

// Save user votes to localStorage
function saveUserVotes() {
  localStorage.setItem('userVotes', JSON.stringify(userVotes));
}

async function fetchList() {
  try {
    const response = await fetch(`${workerUrl}list`);
    const data = await response.json();
    buildGallery(data.dates, data.stats);
    stats = data.stats;
  } catch (error) {
    console.error('Error fetching list:', error);
  }
}

function buildGallery(dates, stats) {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';
  dates.forEach(dateObj => {
    const section = document.createElement('div');
    section.className = 'date-section';
    section.innerHTML = `<h2>${dateObj.date}</h2>`;
    
    // Add folder subsection
    if (dateObj.items.length > 0) {
      dateObj.items.forEach(item => {
        const files = generateFileList(dateObj.date, item.name, item.count);
        
        const folderSubsection = document.createElement('div');
        folderSubsection.className = 'category-subsection';
        
        const folderHeader = document.createElement('h3');
        folderHeader.textContent = item.name === '' ? 'Individual Images' : item.name;
        folderSubsection.appendChild(folderHeader);
        
        const folderGrid = document.createElement('div');
        folderGrid.className = 'image-grid';
        
        files.forEach(file => {
          createImageElement(folderGrid, file, dateObj.date, item.name, item.count);
        });
        folderSubsection.appendChild(folderGrid);
        section.appendChild(folderSubsection);
      });
      
    }
    
    gallery.appendChild(section);
  });
}

function generateFileList(date, name, count) {
    if (name != '') {
        // For folders: compilation, comic, and all frames
        const basePath = `${date}/${name}`;
        let files = [
            `${basePath}/compilation.webp`,
            `${basePath}/comic.webp`
        ];
        for (let i = 1; i <= count; i++) {
            files.push(`${basePath}/frame${i}.webp`);
        }
        return files;
    } else {
        let files = [];
        for (let i = 1; i <= count; i++) {
            files.push(`${date}/${i}.webp`);
        }
        return files;
    }
}

function createImageElement(container, imagePath, date, name, frameCount) {
  const imgDiv = document.createElement('div');
  imgDiv.className = 'image-item';
  imgDiv.style.position = 'relative';
  imgDiv.style.display = 'inline-block';
  imgDiv.style.cursor = 'pointer';
  
  const img = document.createElement('img');
  img.src = `${bucketUrl}/${imagePath}`;
  img.loading = 'lazy';
  img.style.display = 'block';
  img.style.height = '262px';
  img.style.width = 'auto';
  
  const buttons = document.createElement('div');
  buttons.className = 'buttons';
  buttons.style.position = 'absolute';
  buttons.style.bottom = '0';
  buttons.style.left = '0';
  buttons.style.right = '0';
  buttons.style.display = 'flex';
  buttons.style.gap = '5px';
  buttons.style.padding = '5px';
  buttons.style.background = 'rgba(0,0,0,0.5)';
  buttons.style.justifyContent = 'space-between';
  
  const favBtn = document.createElement('button');
  const badBtn = document.createElement('button');
  favBtn.style.flex = '1';
  badBtn.style.flex = '1';
  favBtn.style.padding = '5px';
  badBtn.style.padding = '5px';
  
  // Update button text with vote counts
  function updateButtonTexts() {
    const voteData = stats[imagePath] || {favorite: 0, bad: 0};
    const userVote = userVotes[imagePath];
    
    favBtn.textContent = `❤ ${voteData.favorite}`;
    badBtn.textContent = `👎 ${voteData.bad}`;
    
    if (userVote === 'favorite') {
      favBtn.style.fontWeight = 'bold';
      favBtn.style.opacity = '1';
    } else {
      favBtn.style.fontWeight = 'normal';
      favBtn.style.opacity = '0.7';
    }
    
    if (userVote === 'bad') {
      badBtn.style.fontWeight = 'bold';
      badBtn.style.opacity = '1';
    } else {
      badBtn.style.fontWeight = 'normal';
      badBtn.style.opacity = '0.7';
    }
  }
  
  updateButtonTexts();
  
  favBtn.onclick = (e) => {
    e.stopPropagation();
    markImage(imagePath, 'favorite', updateButtonTexts);
  };
  badBtn.onclick = (e) => {
    e.stopPropagation();
    markImage(imagePath, 'bad', updateButtonTexts);
  };
  
  buttons.appendChild(favBtn);
  buttons.appendChild(badBtn);
  
  img.onclick = () => showModal(img.src);
  
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

function showModal(src) {
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
  buttons.style.left = '50%';
  buttons.style.transform = 'translateX(-50%)';
  buttons.style.display = 'flex';
  buttons.style.gap = '10px';
  
  const favBtn = document.createElement('button');
  const badBtn = document.createElement('button');
  favBtn.textContent = '❤ Favorite';
  badBtn.textContent = '👎 Mark Bad';
  favBtn.style.padding = '10px 20px';
  badBtn.style.padding = '10px 20px';
  favBtn.style.cursor = 'pointer';
  badBtn.style.cursor = 'pointer';
  
  favBtn.onclick = (e) => {
    e.stopPropagation();
    markImage(src.replace('images/', '').replace(/\.webp$/, ''), 'favorite', () => {});
  };
  badBtn.onclick = (e) => {
    e.stopPropagation();
    markImage(src.replace('images/', '').replace(/\.webp$/, ''), 'bad', () => {});
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
  fetchList();
  const columnsInput = document.getElementById('columns');
  if (columnsInput) {
    columnsInput.addEventListener('input', () => {
      document.documentElement.style.setProperty('--columns', columnsInput.value);
    });
  }
});