const app = document.getElementById('app');
if (!app) {
  throw new Error('#app element is missing from index.html');
}
app.textContent = 'Hello';
