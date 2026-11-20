/* AI Assignment Evaluator - static app for GitHub Pages. Settings live in config.json. */
const DEFAULTS={model:"claude-sonnet-5-5",maxTokens:4000,maxImagesPerCall:20,maxPagesStudent:12,maxPagesKey:20,maxPagesQuestionPaper:15,imageMaxPx:1600,engine:"ollama",ollamaUrl:"http://localhost:11434",ollamaModel:"qwen2.5vl:7b",numCtx:16384};
let CFG={...DEFAULTS};
const S={qp:[],key:[],ans:[]},$=id=>document.getElementById(id);let results=[];

const SYSTEM=`You are a strict but fair examiner. You will receive a question paper, an answer key with marking scheme, and ONE student's answer script (text and/or page images, possibly handwritten).
Rules:
- Award marks per question exactly as the marking scheme says; partial marks are allowed.
- For each question give a short remark explaining why marks were lost, or "Full marks".
- If an answer is missing or illegible, award 0 for it and say so in the remark.
- Do not invent questions that are not in the question paper.
Reply with ONLY a JSON object, no markdown, in this shape:
{"max_total":number,"total":number,"summary":"2 sentences on overall performance","questions":[{"q":"Q1","max":number,"awarded":number,"remark":"reason"}]}`;

/* ---------- init, tabs, uploads ---------- */
(async()=>{try{const r=await fetch('config.json');if(r.ok)CFG={...DEFAULTS,...await r.json()}}catch(e){}
 $('model').value=CFG.model;$('engine').value=localStorage.getItem('eng')||CFG.engine;$('ourl').value=CFG.ollamaUrl;$('omodel').value=localStorage.getItem('om')||CFG.ollamaModel;showEngine();$('apikey').value=sessionStorage.getItem('ak')||'';$('gk').value=sessionStorage.getItem('gk')||'';refresh()})();
function showEngine(){const e=$('engine').value;$('oll').hidden=e!=='ollama';$('kw').hidden=e!=='keyword';$('cld').hidden=e!=='claude'}
$('engine').onchange=()=>{localStorage.setItem('eng',$('engine').value);showEngine()};
$('omodel').oninput=e=>localStorage.setItem('om',e.target.value);
$('apikey').oninput=e=>sessionStorage.setItem('ak',e.target.value);
$('gk').oninput=e=>sessionStorage.setItem('gk',e.target.value);
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('.tab,.panel').forEach(e=>e.classList.remove('on'));
 b.classList.add('on');$(b.dataset.t).classList.add('on');refresh()});
document.querySelectorAll('.drop').forEach(d=>{
 const k=d.dataset.for,inp=$('f_'+k);
 d.onclick=()=>inp.click();
 d.ondragover=e=>{e.preventDefault();d.classList.add('over')};
 d.ondragleave=()=>d.classList.remove('over');
 d.ondrop=e=>{e.preventDefault();d.classList.remove('over');add(k,e.dataTransfer.files)};
 inp.onchange=()=>{add(k,inp.files);inp.value=''}});

async function add(k,fl){
 for(const f of fl){
  if(k==='ans'&&/\.zip$/i.test(f.name)){
   try{const z=await JSZip.loadAsync(f);
    for(const e of Object.values(z.files)){
     const base=e.name.split('/').pop();
     if(e.dir||!base||e.name.includes('__MACOSX')||base.startsWith('.'))continue;
     const t=mimeOf(base);if(!t)continue;
     S.ans.push(new File([await e.async('blob')],base,{type:t}))}
   }catch(err){alert('Could not open the zip: '+err.message)}
  }else S[k].push(f)}
 draw(k)}
function mimeOf(n){const x=(n.split('.').pop()||'').toLowerCase();
 return {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',pdf:'application/pdf',txt:'text/plain',md:'text/plain'}[x]}
function draw(k){const ul=$('l_'+k);ul.innerHTML='';
 S[k].forEach((f,i)=>{const li=document.createElement('li'),n=document.createElement('span'),x=document.createElement('a');
  n.textContent=f.name;x.textContent='remove';x.href='#';x.onclick=e=>{e.preventDefault();S[k].splice(i,1);draw(k)};li.append(n,x);ul.append(li)});refresh()}
function refresh(){const ok=S.qp.length&&S.key.length&&S.ans.length;
 $('status').textContent=ok?`Ready: ${S.ans.length} answer file(s) will be evaluated.`:'Add the question paper, the answer key and the student files first.';
 $('go').disabled=!ok}

/* ---------- Google Drive (public folder via Drive API v3) ---------- */
$('fetchDrive').onclick=async()=>{
 const msg=$('driveMsg'),link=$('gl').value.trim(),key=$('gk').value.trim();
 const m=link.match(/folders\/([\w-]+)/)||link.match(/[?&]id=([\w-]+)/);
 if(!m)return msg.textContent='Could not find a folder id in that link.';
 if(!key)return msg.textContent='Enter a Google API key first (see README.md).';
 try{
  let files=[],tok='';
  do{const q=encodeURIComponent(`'${m[1]}' in parents and trashed=false`);
   const r=await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,mimeType)&pageSize=200&key=${key}`+(tok?`&pageToken=${tok}`:''));
   const j=await r.json();if(!r.ok)throw new Error(j.error?.message||r.status);
   files.push(...j.files);tok=j.nextPageToken||''}while(tok);
  let n=0;
  for(const f of files){
   msg.textContent=`Downloading ${++n} of ${files.length}: ${f.name}`;
   let url,name=f.name,type=f.mimeType;
   if(type==='application/vnd.google-apps.document'||type==='application/vnd.google-apps.presentation'){
    url=`https://www.googleapis.com/drive/v3/files/${f.id}/export?mimeType=application/pdf&key=${key}`;name+='.pdf';type='application/pdf'}
   else if(type==='application/pdf'||type.startsWith('image/')||type.startsWith('text/')){
    url=`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${key}`}
   else continue;
   const r=await fetch(url);if(!r.ok)throw new Error(`${f.name}: HTTP ${r.status}`);
   S.ans.push(new File([await r.blob()],name,{type}))}
  msg.textContent=`Done. ${S.ans.length} file(s) loaded.`;draw('ans');
 }catch(e){msg.textContent='Drive fetch failed: '+e.message+'. You can upload the files manually instead.';msg.className='note bad'}};

/* ---------- reading documents ---------- */
pdfjsLib.GlobalWorkerOptions.workerSrc=window.PDFW||'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
function canvasB64(src){const sc=Math.min(1,CFG.imageMaxPx/Math.max(src.width,src.height)),c=document.createElement('canvas');
 c.width=Math.round(src.width*sc);c.height=Math.round(src.height*sc);const x=c.getContext('2d');
 x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(src,0,0,c.width,c.height);
 return {media_type:'image/jpeg',data:c.toDataURL('image/jpeg',.8).split(',')[1]}}
async function readDoc(f,maxPages){
 const d={name:f.name,text:'',images:[]};
 if(f.type.startsWith('image/')){d.images.push(canvasB64(await createImageBitmap(f)));return d}
 if(/\.pdf$/i.test(f.name)){
  const pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;
  for(let p=1;p<=Math.min(pdf.numPages,maxPages);p++){
   const pg=await pdf.getPage(p),tc=await pg.getTextContent(),t=tc.items.map(i=>i.str+(i.hasEOL?'\n':' ')).join('');
   d.text+=`\n--- page ${p} ---\n${t}`;
   if(t.trim().length<30){const vp=pg.getViewport({scale:1.5}),c=document.createElement('canvas');
    c.width=vp.width;c.height=vp.height;await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;d.images.push(canvasB64(c))}}
  return d}
 d.text=await f.text();return d}
async function readAll(fs,mp){const o=[];for(const f of fs)o.push(await readDoc(f,mp));return o}
function blocks(label,docs){const b=[];
 for(const d of docs){
  if(d.text.trim())b.push({type:'text',text:`=== ${label}: ${d.name} (text) ===\n${d.text.slice(0,40000)}`});
  for(const im of d.images){b.push({type:'text',text:`=== ${label}: ${d.name} (page image) ===`});
   b.push({type:'image',source:{type:'base64',media_type:im.media_type,data:im.data}})}}
 return b}

/* ---------- Claude API ---------- */
async function callClaude(content){
 for(let attempt=0;attempt<3;attempt++){
  const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{
   'content-type':'application/json','x-api-key':$('apikey').value.trim(),'anthropic-version':'2023-06-01',
   'anthropic-dangerous-direct-browser-access':'true'},
   body:JSON.stringify({model:$('model').value.trim(),max_tokens:CFG.maxTokens,system:SYSTEM,messages:[{role:'user',content}]})});
  const j=await r.json();
  if(r.ok)return j.content.filter(b=>b.type==='text').map(b=>b.text).join('');
  if((r.status===429||r.status===529)&&attempt<2){await new Promise(z=>setTimeout(z,4000*(attempt+1)));continue}
  throw new Error(j.error?.message||('HTTP '+r.status))}}
async function callOllama(content){
 let text='',images=[];
 for(const b of content){if(b.type==='text')text+=b.text+'\n\n';else{images.push(b.source.data);text+=`[image ${images.length} attached]\n`}}
 const url=$('ourl').value.trim().replace(/\/$/,'');let r;
 try{r=await fetch(url+'/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
  model:$('omodel').value.trim(),stream:false,format:'json',options:{temperature:0,num_ctx:CFG.numCtx},
  messages:[{role:'system',content:SYSTEM},{role:'user',content:text,...(images.length?{images}:{})}]})})}
 catch(e){throw new Error(`Cannot reach Ollama at ${url}. Is Ollama running, and is OLLAMA_ORIGINS set? (see README.md)`)}
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(j.error||('HTTP '+r.status));
 return j.message?.content||''}
const callModel=c=>$('engine').value==='claude'?callClaude(c):callOllama(c);

/* ---- offline keyword marking (no AI) ---- */
const norm=s=>s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ');
const hit=(t,p)=>p.split('/').some(a=>{a=norm(a).trim();return a&&t.includes(a)});
function parseScheme(docs){const out=[];
 for(const d of docs)for(const line of d.text.split(/\r?\n/)){
  const m=line.match(/^\s*([A-Za-z]*\.?\s*\d+[a-z]?)\s*\|\s*([\d.]+)\s*\|\s*(.+?)\s*$/);
  if(m){let q=m[1].replace(/[\s.]/g,'');if(/^\d/.test(q))q='Q'+q;
   out.push({q,max:+m[2],points:m[3].split(',').map(s=>s.trim()).filter(Boolean)})}}
 return out}
function segments(text){const re=/(?:^|\n)\s*(?:q(?:uestion)?|ans(?:wer)?)?\.?\s*(\d+)\s*[.):\-]/gi,pos=[];let m;
 while((m=re.exec(text)))pos.push({n:+m[1],i:m.index,end:re.lastIndex});
 const seg={};pos.forEach((p,k)=>{if(!(p.n in seg))seg[p.n]=text.slice(p.end,k+1<pos.length?pos[k+1].i:undefined)});return seg}
function keywordEval(name,key,st){
 const sch=parseScheme(key);
 if(!sch.length)throw new Error('No marking lines found in the answer key. Use lines like: Q1 | 5 | point one, point two/alternative');
 if(st.text.trim().length<20)throw new Error('No readable text in this file (scanned/handwritten). Use the Local AI engine with a vision model.');
 const seg=segments(st.text);
 const qs=sch.map(s=>{const n=+(s.q.match(/\d+/)||[0])[0],t=norm(seg[n]!==undefined?seg[n]:st.text);
  const miss=s.points.filter(p=>!hit(t,p)),got=s.points.length-miss.length;
  return {q:s.q,max:s.max,awarded:Math.min(s.max,Math.round(s.max*got/s.points.length*2)/2),
   remark:miss.length?`Matched ${got} of ${s.points.length} points. Missing: ${miss.join('; ')}`:'Full marks'}});
 const total=qs.reduce((a,q)=>a+q.awarded,0),max=qs.reduce((a,q)=>a+q.max,0);
 return {name,questions:qs,total:+total.toFixed(2),max_total:max,summary:`Keyword marking: ${total.toFixed(1)} of ${max}.`,error:null}}

function parseJSON(raw){raw=raw.replace(/^```(?:json)?|```$/gm,'').trim();
 const a=raw.indexOf('{'),b=raw.lastIndexOf('}');if(a<0||b<0)throw new Error('Model did not return JSON');
 return JSON.parse(raw.slice(a,b+1))}

async function evalStudent(qp,key,f){
 const name=f.name.replace(/\.[^.]+$/,'');
 try{
  const st=await readDoc(f,CFG.maxPagesStudent);
  if($('engine').value==='keyword')return keywordEval(name,key,st);
  let c=[...blocks('QUESTION PAPER',qp),...blocks('ANSWER KEY AND MARKING SCHEME',key),...blocks(`STUDENT ANSWER SCRIPT (${name})`,[st])];
  let imgs=0;c=c.filter((b,i)=>{ if(b.type==='image'){imgs++;return imgs<=CFG.maxImagesPerCall}
   const nx=c[i+1];return !(nx&&nx.type==='image'&&imgs>=CFG.maxImagesPerCall)});
  c.push({type:'text',text:'Now evaluate this student and reply with the JSON only.'});
  let data,err;
  for(let t=0;t<2;t++){try{data=parseJSON(await callModel(c));break}catch(e){err=e}}
  if(!data)throw err;
  const qs=(data.questions||[]).map(q=>({q:String(q.q),max:+q.max||0,awarded:+q.awarded||0,remark:String(q.remark||'')}));
  const total=qs.reduce((s,q)=>s+q.awarded,0),max=qs.reduce((s,q)=>s+q.max,0)||+data.max_total||0;
  return {name,questions:qs,total:+total.toFixed(2),max_total:+max.toFixed(2),summary:String(data.summary||''),error:null}
 }catch(e){return {name,questions:[],total:0,max_total:0,summary:'Could not be evaluated: '+e.message,error:e.message}}}

$('go').onclick=async()=>{
 const eng=$('engine').value;
 if(eng==='claude'&&!$('apikey').value.trim())return alert('Enter your Anthropic API key in Settings.');
 if(eng==='ollama'){try{const r=await fetch($('ourl').value.trim().replace(/\/$/,'')+'/api/tags');if(!r.ok)throw 0}
  catch(e){return alert('Cannot reach Ollama. Start it, and allow this page with OLLAMA_ORIGINS (see README.md).')}}
 const go=$('go');go.disabled=true;results=[];$('res').hidden=false;$('res').tBodies[0].innerHTML='';$('dl1').hidden=$('dl2').hidden=true;
 $('log').textContent='Reading question paper and answer key…';
 let qp,key;try{qp=await readAll(S.qp,CFG.maxPagesQuestionPaper);key=await readAll(S.key,CFG.maxPagesKey)}
 catch(e){$('log').textContent='Could not read the files: '+e.message;go.disabled=false;return}
 for(let i=0;i<S.ans.length;i++){
  $('log').textContent=`Evaluating ${i+1} of ${S.ans.length}: ${S.ans[i].name}`;$('pb').style.width=(i/S.ans.length*100)+'%';
  const r=await evalStudent(qp,key,S.ans[i]);results.push(r);
  const tr=$('res').tBodies[0].insertRow();
  [r.name,r.error?'–':r.total,r.error?'–':r.max_total,r.error||!r.max_total?'–':(r.total/r.max_total*100).toFixed(1),r.summary]
   .forEach(v=>{const td=tr.insertCell();td.textContent=v;if(r.error)td.className='bad'})}
 $('pb').style.width='100%';$('log').textContent='Done. Download the two Excel files below.';
 go.disabled=false;$('dl1').hidden=$('dl2').hidden=false};

/* ---------- Excel export ---------- */
function saveXlsx(rows,sheet,file,widths){const ws=XLSX.utils.json_to_sheet(rows);ws['!cols']=widths.map(w=>({wch:w}));
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,sheet);XLSX.writeFile(wb,file)}
$('dl1').onclick=()=>{
 const qs=[...new Set(results.flatMap(r=>r.questions.map(q=>q.q)))];
 saveXlsx(results.map(r=>{const o={Student:r.name};
  qs.forEach(q=>{const x=r.questions.find(z=>z.q===q);o[q]=x?x.awarded:''});
  o['Total']=r.error?'Error':r.total;o['Out of']=r.max_total;o['Percentage']=r.max_total?+(r.total/r.max_total*100).toFixed(1):'';return o}),
  'Results','evaluation-results.xlsx',[26,...qs.map(()=>8),10,10,12])};
$('dl2').onclick=()=>saveXlsx(results.flatMap(r=>r.error?[{Student:r.name,Question:'-','Max marks':'','Marks awarded':'','Marks lost':'',Remarks:r.summary}]:
 [...r.questions.map(q=>({Student:r.name,Question:q.q,'Max marks':q.max,'Marks awarded':q.awarded,'Marks lost':+(q.max-q.awarded).toFixed(2),Remarks:q.remark})),
  {Student:r.name,Question:'Overall','Max marks':r.max_total,'Marks awarded':r.total,'Marks lost':+(r.max_total-r.total).toFixed(2),Remarks:r.summary}]),
 'Remarks','evaluation-remarks.xlsx',[26,10,11,14,11,80]);
