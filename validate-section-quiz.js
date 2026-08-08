"use strict";
const assert=require("assert");
const fs=require("fs");
const vm=require("vm");
const PHYSICS_CHEMISTRY="基礎物理・化学";
const NORMAL_ROTATION_KEY="otsu2_normal_rotation_v1";
const elements=new Map();
function node(){return {value:"10",textContent:"",innerHTML:"",disabled:false,classList:{toggle(){},add(){},remove(){}},append(){},appendChild(){},addEventListener(){},parentElement:{append(){}},querySelectorAll(){return [];}};}
function element(id){if(!elements.has(id))elements.set(id,node());return elements.get(id);}
const storage=new Map([[NORMAL_ROTATION_KEY,JSON.stringify({remainingIds:["saved"],knownIds:["saved"],cycle:4})]]);
const bank=[...Array.from({length:12},(_,i)=>({id:`p-${i}`,section:PHYSICS_CHEMISTRY,choices:["a","b","c","d","e"],answer:0,question:"q",explanation:"e",detail:"d",category:"c",source:"s"})),{id:"law-1",section:"法令",choices:["a","b","c","d","e"],answer:0,question:"q",explanation:"e",detail:"d",category:"c",source:"s"}];
const context={window:{QUESTION_BANK:bank,scrollTo(){},requestAnimationFrame(fn){fn();}},document:{getElementById:element,querySelectorAll(){return [];},createElement:node,addEventListener(){}},localStorage:{getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},requestAnimationFrame(fn){fn();},console};
vm.createContext(context);
vm.runInContext(fs.readFileSync("app.js","utf8")+"\nglobalThis.__sectionQuiz={selectRandomBySection,startPhysicsChemistryQuiz,getQuiz:()=>quiz};",context,{filename:"app.js"});
const {selectRandomBySection,startPhysicsChemistryQuiz,getQuiz}=context.__sectionQuiz;
const selected=selectRandomBySection(bank,PHYSICS_CHEMISTRY,10,()=>0.5);
assert.equal(selected.length,10,"section mode must select at most 10 questions");
assert(selected.every(q=>q.section===PHYSICS_CHEMISTRY),"section mode must only select physics/chemistry questions");
assert.equal(new Set(selected.map(q=>q.id)).size,selected.length,"section mode must not duplicate a question in one session");
assert.equal(selectRandomBySection(bank.slice(0,3),PHYSICS_CHEMISTRY).length,3,"section mode must use all available questions when fewer than 10 exist");
const before=storage.get(NORMAL_ROTATION_KEY);
startPhysicsChemistryQuiz();
assert.equal(storage.get(NORMAL_ROTATION_KEY),before,"section mode must not modify normal rotation storage");
assert(getQuiz().every(q=>q.section===PHYSICS_CHEMISTRY),"started session must only contain physics/chemistry questions");
console.log("OK: physics/chemistry section mode limits to 10, avoids duplicates, and leaves normal rotation storage unchanged.");
