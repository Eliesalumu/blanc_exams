import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('../dist/',import.meta.url);
const names=fs.readdirSync(root,{recursive:true}).filter(name=>fs.statSync(new URL(name.replaceAll('\\','/'),root)).isFile());
assert.ok(!names.some(name=>/^(server|node_modules|\.env)([\\/]|$)/.test(name)));
let files=0;
for(const name of names){
  if(!/\.(js|json|html|css|txt)$/.test(name))continue;
  const content=fs.readFileSync(new URL(name.replaceAll('\\','/'),root),'utf8');
  assert.ok(!content.includes('OPENAI_API_KEY'),'A secret variable must not be bundled');
  if(process.env.OPENAI_API_KEY)assert.ok(!content.includes(process.env.OPENAI_API_KEY),'Secret value must not be bundled');
  assert.ok(!/\bsk-(?:proj-)?[a-zA-Z0-9_-]{25,}\b/.test(content),'A credential-like value was bundled');
  files++;
}
console.log(JSON.stringify({staticSecurity:'passed',inspectedTextFiles:files,secretValueChecked:!!process.env.OPENAI_API_KEY}));
