const workerUrl = 'https://gartic-highlights-gallery.angrylizard.workers.dev/';

const display = document.getElementById('number-display');
const updateBtn = document.getElementById('update-btn');

async function fetchNumber() {
  try {
    const response = await fetch(workerUrl);
    const data = await response.json();
    display.textContent = `Random Number: ${data.number}`;
  } catch (error) {
    display.textContent = 'Error fetching number';
    console.error('Fetch error:', error);
  }
}

updateBtn.addEventListener('click', fetchNumber);

// Fetch on load
fetchNumber();