const cfg = window.SITE_CONFIG || {};
const audioDir = (cfg.audioDirectory || 'audio').replace(/\/$/, '');
/* Which file each player plays for each sample. The learned maskers and SSN were uploaded
   as sample-01 at three MCRs: Sample 01 = 0 dB, Sample 02 = 5 dB, Sample 03 = 10 dB.
   Edit this table (not the file names) if a file is added or renamed. */
const SAMPLES = {
  'sample-01': {
    reference: 'sample-01_reference.wav',
    babble: 'sample-01_babble.wav',
    ssn: 'sample-01_ssn_0db.wav',
    stoi: 'sample-01_stoi_0db.wav',
    'ctc-stoi': 'sample-01_ctc-stoi_0db.wav'
  },
  'sample-02': {
    reference: 'sample-02_reference.wav',
    babble: 'sample-02_babble.wav',
    ssn: 'sample-01_ssn_5db.wav',
    stoi: 'sample-01_stoi_5db.wav',
    'ctc-stoi': 'sample-01_ctc-stoi_5db.wav'
  },
  'sample-03': {
    reference: 'sample-03_reference.wav',
    babble: 'sample-03_babble.wav',
    ssn: 'sample-01_ssn_10db.wav',
    stoi: 'sample-01_stoi_10db.wav',
    'ctc-stoi': 'sample-01-ctc-stoi_10db.wav'
  }
};
/* The three buttons of the comparison part (data-mcr="0", "5", "10") select the same samples. */
const MCR_TO_SAMPLE = { '0': 'sample-01', '5': 'sample-02', '10': 'sample-03' };
let sample = 'sample-01';
let scene = 'nb';
const players = ['reference','babble','ssn','stoi','ctc-stoi'];
function audioPath(kind) {
  return `${audioDir}/${SAMPLES[sample][kind]}`;
}
function updateAudio() {
  players.forEach(kind => {
    const player = document.getElementById(`${kind}-player`);
    const status = document.getElementById(`${kind}-status`);
    const path = audioPath(kind);
    player.pause(); player.removeAttribute('src'); player.load();
    player.dataset.path = path;
    status.textContent = 'Audio file not added yet · ' + path;
    status.classList.remove('ready');
    // Load only when a visitor presses play; a missing audio file never becomes a fake demo.
    player.onclick = () => { if (!player.getAttribute('src')) { player.src = path; player.load(); } };
    player.onplay = () => { if (!player.getAttribute('src')) player.src = path; };
    player.oncanplay = () => { status.textContent = 'Audio ready'; status.classList.add('ready'); };
    player.onerror = () => { status.textContent = 'Audio unavailable · Add ' + path; status.classList.remove('ready'); };
  });
}
// Browsers may not dispatch click reliably for their native audio UI. Probe actual file availability
// before setting the source, without downloading the WAV into memory.
async function probeAudio() {
  const requestId = ++probeAudio.requestId;
  await Promise.all(players.map(async kind => {
    const player = document.getElementById(`${kind}-player`);
    const status = document.getElementById(`${kind}-status`);
    const path = audioPath(kind);
    try {
      const res = await fetch(path, { method: 'HEAD' });
      if (requestId !== probeAudio.requestId) return;
      if (!res.ok || !(res.headers.get('content-type') || '').match(/audio|octet-stream/i)) return;
      player.src = path;
      status.textContent = 'Ready to play';
      status.classList.add('ready');
    } catch (_) { /* A local file:// preview may block fetch; hosting on GitHub Pages resolves this. */ }
  }));
}
probeAudio.requestId = 0;
function refreshAudio() { updateAudio(); probeAudio(); }
// The dropdown and the three buttons always show the same sample.
function selectSample(value) {
  if (!SAMPLES[value]) return;
  sample = value;
  document.getElementById('sample').value = value;
  document.querySelectorAll('[data-mcr]').forEach(b => {
    const yes = MCR_TO_SAMPLE[b.dataset.mcr] === value;
    b.classList.toggle('active', yes); b.setAttribute('aria-pressed', String(yes));
  });
  refreshAudio();
}
document.getElementById('sample').addEventListener('change', e => selectSample(e.target.value));
document.querySelectorAll('[data-mcr]').forEach(button => button.addEventListener('click', () => {
  selectSample(MCR_TO_SAMPLE[button.dataset.mcr]);
}));
const data = {
  nb: [ ['Mixture',1.72,3.22], ['SSN',11.43,8.31], ['White noise',22.08,24.29], ['STOI-only',59.38,58.72], ['CTC + STOI',63.75,56.99] ],
  b:  [ ['Mixture',18.53,11.96], ['SSN',28.05,27.66], ['White noise',54.55,45.32], ['STOI-only',79.86,72.50], ['CTC + STOI',81.13,73.03] ]
};
function renderBars() {
  const bars = document.getElementById('bars'); bars.replaceChildren();
  data[scene].forEach(([label,fc,wh]) => {
    const row=document.createElement('div'); row.className='bar-row';
    const title=document.createElement('div'); title.className='bar-label'; title.textContent=label;
    const tracks=document.createElement('div'); tracks.className='bar-tracks';
    [['FastConformer',fc,'fc'],['Whisper',wh,'wh']].forEach(([name,value,cls])=>{
      const line=document.createElement('div'); line.className='bar-line';
      const key=document.createElement('span'); key.className='bar-key'; key.textContent=name;
      const track=document.createElement('div'); track.className='bar-track';
      const fill=document.createElement('span'); fill.className='bar-fill '+cls; fill.style.width=value+'%';
      const val=document.createElement('strong'); val.textContent=value.toFixed(2)+'%';
      track.append(fill); line.append(key,track,val); tracks.append(line);
    }); row.append(title,tracks);bars.append(row);
  });
  bars.setAttribute('aria-label', 'Corpus WER in '+(scene==='nb'?'no-babble':'babble')+' conditions at 5 dB MCR for mixture, SSN, white noise, STOI-only, and CTC plus STOI.');
}
document.querySelectorAll('[data-scene]').forEach(button=>button.addEventListener('click',()=>{
  scene=button.dataset.scene;
  document.querySelectorAll('[data-scene]').forEach(b=>{const yes=b===button;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});
  renderBars();
}));
function setLinks(selector,url,label) {
  document.querySelectorAll(selector).forEach(el=>{
    if (url) {el.href=url; el.target='_blank';el.rel='noopener noreferrer';}
    else {el.href=selector==='[data-code-link]'?'#citation':'#citation';el.title=label+' link not configured yet';}
  });
}
setLinks('[data-paper-link]',cfg.paperUrl,'Paper');
setLinks('[data-code-link]',cfg.codeUrl,'Code');
document.getElementById('copy-bib').addEventListener('click',async()=>{
  const status=document.getElementById('copy-status');
  try { await navigator.clipboard.writeText(document.getElementById('bibtex').textContent);status.textContent='Citation copied.'; }
  catch (_) {status.textContent='Select the BibTeX text above to copy it.';}
});
selectSample(sample);renderBars();
