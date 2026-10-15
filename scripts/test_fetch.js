async function test() {
  const r1 = await fetch('http://localhost:3001/');
  console.log('GET / status:', r1.status, 'Content-Type:', r1.headers.get('content-type'));
  const html = await r1.text();
  console.log('HTML preview:\n', html);

  const scriptMatch = html.match(/src="([^"]+)"/);
  console.log('Script match:', scriptMatch ? scriptMatch[1] : 'none');
  if (scriptMatch) {
    const r2 = await fetch('http://localhost:3001' + scriptMatch[1]);
    console.log('GET', scriptMatch[1], 'status:', r2.status, 'Content-Type:', r2.headers.get('content-type'));
    const js = await r2.text();
    console.log('JS length:', js.length, 'JS start:', js.slice(0, 100));
  }
}
test();
