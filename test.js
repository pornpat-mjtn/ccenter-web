fetch('https://app-web-39s.pages.dev/api/auth', { method: 'POST', body: '{}' })
  .then(r => r.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
