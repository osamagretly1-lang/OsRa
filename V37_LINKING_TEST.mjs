import crypto from 'node:crypto';

function contentKey(buf){
  const n=buf.length,max=65536;
  const a=buf.subarray(0,Math.min(max,n));
  const b=buf.subarray(Math.max(0,n-max),n);
  const x=Buffer.allocUnsafe(a.length+b.length+8);
  x.writeBigUInt64BE(BigInt(n),0);a.copy(x,8);b.copy(x,8+a.length);
  return crypto.createHash('sha256').update(x).digest('hex');
}
function addPhotoLink(p,sourceId,relPath,file){
  p.sourceLinks ??=[];
  const k=`${sourceId}::${relPath}`;
  if(p.sourceLinks.some(x=>`${x.sourceId}::${x.relPath}`===k))return false;
  p.sourceLinks.push({sourceId,relPath,name:file.name,size:file.size,lastModified:file.lastModified,contentKey:contentKey(file.bytes)});
  return true;
}

const oldA={id:'ph-a',name:'IMG_001.jpg',size:0,lastModified:111,contentKey:'',sourceLinks:[{sourceId:'old',relPath:'رحلتنا/IMG_001.jpg',name:'IMG_001.jpg',size:0,lastModified:111}]};
const oldB={id:'ph-b',name:'IMG_002.jpg',size:0,lastModified:222,contentKey:'',sourceLinks:[{sourceId:'old',relPath:'خطوبتنا/IMG_002.jpg',name:'IMG_002.jpg',size:0,lastModified:222}]};
const bytesA=Buffer.alloc(120000,7);bytesA.write('OSRA-A',1000);
const bytesB=Buffer.alloc(90000,9);bytesB.write('OSRA-B',2000);
const bytesNew=Buffer.alloc(60000,4);bytesNew.write('OSRA-NEW',500);
oldA.size=bytesA.length;oldA.contentKey=contentKey(bytesA);oldB.size=bytesB.length;oldB.contentKey=contentKey(bytesB);
const records=new Map([[oldA.id,oldA],[oldB.id,oldB]]);
const incoming=[
 {name:'photo_from_backup_renamed.jpg',bytes:bytesA,lastModified:999,relPath:'مجلد جديد/001.jpg'},
 {name:'another_name.webp',bytes:bytesB,lastModified:888,relPath:'مجلد جديد/002.webp'},
 {name:'brand_new.jpg',bytes:bytesNew,lastModified:777,relPath:'مجلد جديد/003.jpg'}
];
let matched=0,added=0;
for(const f of incoming){
  const ck=contentKey(f.bytes);
  const hit=[...records.values()].find(p=>p.contentKey===ck);
  if(hit){ if(addPhotoLink(hit,'new-source',f.relPath,{name:f.name,size:f.bytes.length,lastModified:f.lastModified,bytes:f.bytes})) matched++; }
  else { /* match-only mode: deliberately do NOT create a record */ }
}
if(records.size!==2) throw new Error(`record count changed: ${records.size}`);
if(matched!==2) throw new Error(`expected 2 linked originals, got ${matched}`);
for(const id of ['ph-a','ph-b']) if(!records.get(id).sourceLinks.some(l=>l.sourceId==='new-source')) throw new Error(`source link missing for ${id}`);
if(added!==0) throw new Error('match-only added a new record');
// Explicit add phase: only the unmatched file is eligible to be added.
const unmatched=incoming[2];
const newRecord={id:'ph-new',name:unmatched.name,contentKey:contentKey(unmatched.bytes),sourceLinks:[{sourceId:'new-source',relPath:unmatched.relPath}]};
records.set(newRecord.id,newRecord);
if(records.size!==3) throw new Error('explicit add phase failed');
console.log('PASS: backup-registered originals link by content despite renamed/moved files; no new photo records during match-only; unmatched file adds only in explicit add phase.');
