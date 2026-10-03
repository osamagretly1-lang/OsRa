import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

async function contentKey(filePath){
  const st=await fs.stat(filePath), n=st.size, max=65536;
  const a=await fs.readFile(filePath,{encoding:null});
  const head=a.subarray(0,Math.min(max,n)), tail=a.subarray(Math.max(0,n-max),n);
  const x=Buffer.allocUnsafe(head.length+tail.length+8);x.writeBigUInt64BE(BigInt(n),0);head.copy(x,8);tail.copy(x,8+head.length);
  return crypto.createHash('sha256').update(x).digest('hex');
}

const root='/tmp/osra-v38-fixture';await fs.rm(root,{recursive:true,force:true});await fs.mkdir(`${root}/old/album-a`,{recursive:true});await fs.mkdir(`${root}/new/DCIM/renamed`,{recursive:true});
const a=crypto.randomBytes(180000), b=crypto.randomBytes(90000), changed=Buffer.from(a);changed[12345]^=0xff;
await fs.writeFile(`${root}/old/album-a/IMG_0001.jpg`,a);await fs.writeFile(`${root}/old/album-a/IMG_0002.jpg`,b);
await fs.writeFile(`${root}/new/DCIM/renamed/holiday.jpg`,a);await fs.writeFile(`${root}/new/DCIM/renamed/second-name.jpg`,b);await fs.writeFile(`${root}/new/DCIM/renamed/not-the-same.jpg`,changed);
const old1=await contentKey(`${root}/old/album-a/IMG_0001.jpg`),old2=await contentKey(`${root}/old/album-a/IMG_0002.jpg`);
const new1=await contentKey(`${root}/new/DCIM/renamed/holiday.jpg`),new2=await contentKey(`${root}/new/DCIM/renamed/second-name.jpg`),new3=await contentKey(`${root}/new/DCIM/renamed/not-the-same.jpg`);
if(old1!==new1||old2!==new2||old1===new3||old2===new3)throw new Error('content matching failed');
console.log(JSON.stringify({sameNameOrPathRequired:false,matchedAcrossPhonePaths:2,nonMatchRejected:1,ok:true}));
