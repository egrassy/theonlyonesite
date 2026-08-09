const menuToggle = document.querySelector('.drogo-menu-toggle');
const drogoMenu = document.querySelector('.drogo-links');

menuToggle?.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  drogoMenu.classList.toggle('open', !isOpen);
});

drogoMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  drogoMenu.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}));

const artifacts = [...document.querySelectorAll('.artifact')];
const lightbox = document.querySelector('.lightbox');
let activeArtifact = 0;

const showArtifact = (index) => {
  activeArtifact = (index + artifacts.length) % artifacts.length;
  const artifact = artifacts[activeArtifact];
  const image = lightbox.querySelector('img');
  image.src = artifact.href;
  image.alt = artifact.querySelector('img').alt;
  lightbox.querySelector('figcaption').textContent = artifact.dataset.title;
};

artifacts.forEach((artifact, index) => artifact.addEventListener('click', (event) => {
  event.preventDefault();
  showArtifact(index);
  lightbox.showModal();
}));

lightbox?.querySelector('.lightbox-close')?.addEventListener('click', () => lightbox.close());
lightbox?.querySelector('.previous')?.addEventListener('click', () => showArtifact(activeArtifact - 1));
lightbox?.querySelector('.next')?.addEventListener('click', () => showArtifact(activeArtifact + 1));
lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) lightbox.close(); });
document.addEventListener('keydown', (event) => {
  if (!lightbox?.open) return;
  if (event.key === 'ArrowLeft') showArtifact(activeArtifact - 1);
  if (event.key === 'ArrowRight') showArtifact(activeArtifact + 1);
});
