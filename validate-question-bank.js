"use strict";
const fs=require("fs");
const vm=require("vm");
const path=require("path");

const root=__dirname;
const index=fs.readFileSync(path.join(root,"index.html"),"utf8");
const files=[...index.matchAll(/<script src="(questions-\d+\.js)"><\/script>/g)].map(m=>m[1]);
const context={window:{QUESTION_BANK:[]}};
vm.createContext(context);
for(const file of files){
  const full=path.join(root,file);
  if(!fs.existsSync(full))throw new Error(`Missing question file: ${file}`);
  vm.runInContext(fs.readFileSync(full,"utf8"),context,{filename:file});
}
const bank=context.window.QUESTION_BANK;
const errors=[];
const validSections=new Set(["法令","基礎物理・化学","乙2の性質・消火"]);
const officialSourcePrefixes=["e-Gov法令検索","総務省消防庁","一般財団法人消防試験研究センター"];
if(bank.length!==150)errors.push(`Expected 150 questions, loaded ${bank.length}`);
const ids=new Set();
for(const [i,q] of bank.entries()){
  if(!q||typeof q!=="object"){errors.push(`#${i+1}: invalid question object`);continue;}
  if(typeof q.id!=="string"||!q.id.trim())errors.push(`#${i+1}: missing id`);
  else if(ids.has(q.id))errors.push(`${q.id}: duplicate id`);
  else ids.add(q.id);
  if(!Array.isArray(q.choices)||q.choices.length!==5)errors.push(`${q.id}: choices must contain exactly 5 items`);
  if(!Number.isInteger(q.answer)||q.answer<0||q.answer>4)errors.push(`${q.id}: answer must be integer 0..4`);
  for(const key of ["section","category","question","explanation","detail","source"]){if(typeof q[key]!=="string"||!q[key].trim())errors.push(`${q.id}: missing ${key}`);}
  if(!validSections.has(q.section))errors.push(`${q.id}: invalid section`);
  if(typeof q.source==="string"&&!officialSourcePrefixes.some(prefix=>q.source.startsWith(prefix)))errors.push(`${q.id}: source must name an official source`);
  if(Array.isArray(q.choices)&&new Set(q.choices).size!==q.choices.length)errors.push(`${q.id}: duplicate choices`);
  if(Array.isArray(q.choices)&&Number.isInteger(q.answer)&&!q.choices[q.answer])errors.push(`${q.id}: answer does not select a choice`);
  for(const key of ["image","detailImage"]){if(q[key]){const full=path.join(root,q[key]);if(!fs.existsSync(full))errors.push(`${q.id}: missing referenced image ${q[key]}`);}}
}
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log(`OK: ${bank.length} questions loaded from ${files.length} files; IDs unique; all 5-choice; answers valid; sections and official sources valid; required fields and image references valid.`);
