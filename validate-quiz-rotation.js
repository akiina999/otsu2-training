"use strict";
const assert=require("assert");
const fs=require("fs");
const vm=require("vm");
const elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{id,value:"10",textContent:"",innerHTML:"",classList:{toggle(){},add(){},remove(){}},append(){},appendChild(){},addEventListener(){},parentElement:{append(){}},querySelectorAll(){return [];}});return elements.get(id);}
const context={window:{QUESTION_BANK:[],scrollTo(){},requestAnimationFrame(fn){fn();}},document:{getElementById:element,querySelectorAll(){return [];},createElement(){return element(`created-${elements.size}`);},addEventListener(){}},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},requestAnimationFrame(fn){fn();},console};
vm.createContext(context);
vm.runInContext(fs.readFileSync("app.js","utf8")+"\nglobalThis.__rotation=QuizRotation;",context,{filename:"app.js"});
const {next}=context.__rotation;
const ids=Array.from({length:150},(_,i)=>`q-${i+1}`);
let state=null;const firstCycle=[];
for(let i=0;i<15;i++){const result=next(state,ids,10,()=>0.5);state=result.state;assert.equal(new Set(result.selectedIds).size,10,"a session must not contain duplicates");firstCycle.push(...result.selectedIds);}
assert.equal(new Set(firstCycle).size,150,"10 questions x 15 sessions must complete one unique cycle");
const sixteenth=next(state,ids,10,()=>0.5);assert.equal(sixteenth.state.cycle,2,"the 16th 10-question session starts a new cycle");
for(const count of [20,30,50]){let rotation=null;const seen=[];for(let i=0;i<Math.ceil(150/count);i++){const result=next(rotation,ids,count,()=>0.5);rotation=result.state;assert.equal(new Set(result.selectedIds).size,result.selectedIds.length,`${count}-question session must not duplicate IDs`);seen.push(...result.selectedIds);}assert.equal(new Set(seen.slice(0,150)).size,150,`${count}-question sessions must cover the first cycle without duplicates`);}
const boundary={remainingIds:ids.slice(0,5),knownIds:[...ids],cycle:1};const boundaryResult=next(boundary,ids,10,()=>0.5);assert.equal(new Set(boundaryResult.selectedIds).size,10,"cycle boundary must not duplicate IDs in one session");assert.deepEqual(boundaryResult.selectedIds.slice(0,5),ids.slice(0,5),"remaining IDs are served first");
const expandedIds=[...ids,"q-new"];const expanded=next(state,expandedIds,10,()=>0.5);assert(expanded.state.remainingIds.includes("q-new")||expanded.selectedIds.includes("q-new"),"new IDs must be treated as unasked");const reduced=next(expanded.state,ids.slice(0,149),10,()=>0.5);assert(!reduced.state.remainingIds.includes("q-150"),"deleted IDs must be discarded safely");
console.log("OK: normal quiz rotation covers persistence state, cycle boundaries, 10/20/30/50 sessions, and bank changes.");
