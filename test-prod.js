fetch('https://app-web-39s.pages.dev/')
  .then(res => res.text())
  .then(html => {
    if (html.includes('Staff View')) {
      console.log('✅ NEW VERSION: Staff View found!');
    } else if (html.includes('เข้าสู่ระบบจัดการแพลนงาน')) {
      console.log('❌ OLD VERSION: Login Landing Page found!');
    } else {
      console.log('❓ UNKNOWN VERSION');
    }
  })
  .catch(console.error);
