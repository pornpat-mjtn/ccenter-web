fetch('https://app-web-39s.pages.dev/api/auth', { 
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pin: '1234' })
})
  .then(res => res.json())
  .then(data => console.log('API Response:', data))
  .catch(console.error);
