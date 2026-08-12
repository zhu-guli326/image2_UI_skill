const feedback = document.querySelector('#feedback');
const chips = document.querySelectorAll('.chip');
const tabs = document.querySelectorAll('.tab');
const saveButton = document.querySelector('.save-button');
const search = document.querySelector('#search-input');

const previewParams = new URLSearchParams(window.location.search);
if (previewParams.has('embed')) {
  document.documentElement.classList.add('embed-mode');
  const fitEmbedPreview = () => {
    const scale = Math.min(window.innerWidth / 390, window.innerHeight / 693.3333);
    document.documentElement.style.setProperty('--embed-scale', String(scale));
  };
  fitEmbedPreview();
  window.addEventListener('resize', fitEmbedPreview);
}

chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    chips.forEach((item) => item.classList.toggle('is-selected', item === chip));
    feedback.textContent = `${chip.dataset.filter} selected`;
  });
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      if (active) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    });
    feedback.textContent = `${tab.dataset.tab} is open`;
  });
});

saveButton.addEventListener('click', () => {
  const saved = saveButton.classList.toggle('is-saved');
  saveButton.setAttribute('aria-pressed', String(saved));
  saveButton.setAttribute('aria-label', saved ? 'Remove Lefkada journal entry from saved' : 'Save Lefkada journal entry');
  feedback.textContent = saved ? 'Lefkada saved to your journal' : 'Lefkada removed from saved';
});

document.querySelectorAll('.discovery').forEach((item) => {
  item.addEventListener('click', () => {
    feedback.textContent = `${item.dataset.place} opened`;
  });
});

search.addEventListener('input', () => {
  feedback.textContent = search.value ? `Looking for “${search.value}”` : 'Search cleared';
});
