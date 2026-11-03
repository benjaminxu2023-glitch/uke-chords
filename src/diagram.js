export const escapeHTML = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function chordDiagramSVG(name,voicing,{size=120}={}) {
  const pressed=voicing.filter(n=>n>0),start=pressed.length&&(Math.min(...pressed)>4||Math.max(...pressed)>5)?Math.min(...pressed):1;
  const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${Number(size)||120}" height="${(Number(size)||120)*1.5}" viewBox="0 0 120 180" role="img" aria-label="${escapeHTML(name)} 按法"><rect width="120" height="180" fill="white"/><g stroke="#172a2a" fill="#172a2a"><text x="60" y="22" text-anchor="middle" stroke="none" font-family="sans-serif" font-size="17">${escapeHTML(name)}</text>`];
  for(let i=0;i<4;i++)parts.push(`<line x1="${30+i*20}" y1="50" x2="${30+i*20}" y2="150"/>`);
  for(let i=0;i<=5;i++)parts.push(`<line x1="30" y1="${50+i*20}" x2="90" y2="${50+i*20}" stroke-width="${i===0&&start===1?4:1}"/>`);
  if(start>1)parts.push(`<text x="2" y="65" stroke="none" font-size="10">${start}fr</text>`);
  voicing.forEach((n,i)=>{
    const x=30+i*20;
    if(n===null)parts.push(`<text x="${x}" y="43" text-anchor="middle" stroke="none">×</text>`);
    else parts.push(`<circle cx="${x}" cy="${n===0?38:60+(n-start)*20}" r="5" fill="${n===0?'none':'#172a2a'}"/>`);
    parts.push(`<text x="${x}" y="170" text-anchor="middle" stroke="none" font-size="12">${'GCEA'[i]}</text>`);
  });return parts.join('')+'</g></svg>';
}
