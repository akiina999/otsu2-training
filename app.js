"use strict";
const QUESTION_BANK=window.QUESTION_BANK||[];
const STORAGE_KEY="otsu2_review_ids_v11";
const REVIEW_CORRECT_KEY="otsu2_review_correct_ids_v11";
const HISTORY_KEY="otsu2_answer_history_v1";
const el=id=>document.getElementById(id);
const screens=["startScreen","quizScreen","resultScreen","reviewScreen"];
let quiz=[];
let currentIndex=0;
let currentResult=null;
let mode="normal";
let answerLocked=false;

function showScreen(id){
 screens.forEach(screenId=>el(screenId).classList.toggle("hidden",screenId!==id));
 if(id==="startScreen")renderWeaknessSummary();
 requestAnimationFrame(()=>window.scrollTo(0,0));
}
function loadIds(key){try{const raw=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(raw)?[...new Set(raw.filter(v=>typeof v==="string"))]:[];}catch{return [];}}
function saveIds(key,ids){localStorage.setItem(key,JSON.stringify([...new Set(ids)]));}
function loadReviewIds(){return loadIds(STORAGE_KEY);}
function saveReviewIds(ids){saveIds(STORAGE_KEY,ids);}
function loadReviewCorrectIds(){return loadIds(REVIEW_CORRECT_KEY);}
function saveReviewCorrectIds(ids){saveIds(REVIEW_CORRECT_KEY,ids);}
function markReviewCorrect(id){const ids=loadReviewCorrectIds();if(!ids.includes(id)){ids.push(id);saveReviewCorrectIds(ids);}}
function clearReviewCorrect(id){saveReviewCorrectIds(loadReviewCorrectIds().filter(savedId=>savedId!==id));}
function addReview(id){const ids=loadReviewIds();clearReviewCorrect(id);if(ids.includes(id))return false;ids.push(id);saveReviewIds(ids);return true;}
function getSection(q){
 if(q.section)return q.section;
 if(q.category==="法令基礎"||q.category==="指定数量")return "法令";
 if(q.category==="基礎物理"||q.category==="基礎化学"||q.category==="基礎物理・化学")return "基礎物理・化学";
 return "乙2の性質・消火";
}
function renderOptionalImage(containerId,src,alt){
 const container=el(containerId);
 container.innerHTML="";
 if(typeof src!=="string"||src.trim()===""){container.classList.add("hidden");return;}
 const img=document.createElement("img");
 img.src=src;
 img.alt=typeof alt==="string"&&alt.trim()?alt:"問題の参考図";
 img.loading="eager";
 img.addEventListener("error",()=>{container.innerHTML="";container.classList.add("hidden");});
 container.appendChild(img);
 container.classList.remove("hidden");
}

function loadHistory(){
 try{
  const raw=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");
  if(!Array.isArray(raw))return [];
  return raw.filter(x=>x&&typeof x==="object"&&typeof x.questionId==="string"&&["correct","wrong","unknown"].includes(x.result));
 }catch{return [];}
}
function saveHistory(history){localStorage.setItem(HISTORY_KEY,JSON.stringify(history.slice(-1000)));}
function recordAnswer(q,selected){
 const result=selected===null?"unknown":selected===q.answer?"correct":"wrong";
 const history=loadHistory();
 history.push({questionId:q.id,result,at:Date.now()});
 saveHistory(history);
}
function weaknessLabels(q){
 const labels=[];
 const seen=new Set();
 const add=(type,value)=>{
  if(typeof value!=="string"||!value.trim())return;
  const clean=value.trim();
  const key=`${type}:${clean}`;
  if(seen.has(key))return;
  seen.add(key);labels.push({type,value:clean});
 };
 add("section",getSection(q));
 add("category",q.category);
 if(Array.isArray(q.tags))q.tags.forEach(tag=>add("tag",tag));
 else add("tag",q.tag);
 return labels;
}
function buildWeaknessStats(){
 const history=loadHistory();
 const byId=new Map(QUESTION_BANK.map(q=>[q.id,q]));
 const stats=new Map();
 history.forEach((entry,index)=>{
  const q=byId.get(entry.questionId);if(!q)return;
  const recentWeight=1+Math.max(0,index-(history.length-20))*0.02;
  weaknessLabels(q).forEach(label=>{
   const key=`${label.type}:${label.value}`;
   if(!stats.has(key))stats.set(key,{...label,total:0,correct:0,wrong:0,unknown:0,score:0});
   const s=stats.get(key);s.total++;s[entry.result]++;
   if(entry.result==="wrong")s.score+=1*recentWeight;
   else if(entry.result==="unknown")s.score+=1.3*recentWeight;
   else s.score-=0.35*recentWeight;
  });
 });
 return [...stats.values()].map(s=>({...s,accuracy:s.total?s.correct/s.total:0}));
}
function topWeaknesses(){
 const sorted=buildWeaknessStats()
  .filter(s=>s.type!=="section"&&s.total>=2&&(s.wrong+s.unknown)>0)
  .sort((a,b)=>(b.score-a.score)||(a.accuracy-b.accuracy)||(b.total-a.total));
 const result=[];const values=new Set();
 for(const item of sorted){if(values.has(item.value))continue;values.add(item.value);result.push(item);if(result.length===3)break;}
 return result;
}
function renderWeaknessSummary(){
 const summary=el("weaknessSummary"),list=el("weaknessList"),button=el("startWeaknessButton");
 if(!summary||!list||!button)return;
 const history=loadHistory();
 const weak=topWeaknesses();
 list.innerHTML="";
 if(history.length<5){summary.textContent=`まだ学習履歴が少ないため、あと${5-history.length}問ほど解くと苦手傾向を表示します。`;button.disabled=true;return;}
 if(weak.length===0){summary.textContent="現在ははっきりした苦手分野がありません。もう少し解くと分析が安定します。";button.disabled=true;return;}
 summary.textContent=`解答履歴 ${history.length}件から、現在の苦手上位${weak.length}分野です。`;
 weak.forEach((s,i)=>{
  const li=document.createElement("li");
  const mark=i===0?"🔴":i===1?"🟠":"🟡";
  li.textContent=`${mark} ${s.value}　正答率 ${Math.round(s.accuracy*100)}%（${s.total}回）`;
  list.appendChild(li);
 });
 button.disabled=false;
}
function startWeaknessQuiz(){
 const weak=topWeaknesses();
 if(!weak.length)return;
 const weakValues=new Set(weak.map(x=>x.value));
 const candidates=QUESTION_BANK.filter(q=>weaknessLabels(q).some(label=>weakValues.has(label.value)));
 const history=loadHistory();
 const perQuestion=new Map();
 history.forEach(h=>{if(!perQuestion.has(h.questionId))perQuestion.set(h.questionId,{wrong:0,unknown:0,correct:0});perQuestion.get(h.questionId)[h.result]++;});
 candidates.sort((a,b)=>{
  const sa=perQuestion.get(a.id)||{wrong:0,unknown:0,correct:0};
  const sb=perQuestion.get(b.id)||{wrong:0,unknown:0,correct:0};
  const wa=sa.unknown*3+sa.wrong*2-sa.correct;
  const wb=sb.unknown*3+sb.wrong*2-sb.correct;
  return wb-wa||Math.random()-.5;
 });
 const selected=[];
 for(const q of candidates){selected.push(q);if(selected.length===10)break;}
 if(selected.length<10){
  for(const q of [...QUESTION_BANK].sort(()=>Math.random()-.5)){if(!selected.includes(q)){selected.push(q);if(selected.length===10)break;}}
 }
 mode="weakness";quiz=selected;currentIndex=0;showScreen("quizScreen");showQuestion();
}

function validateQuestionBank(){
 const ids=new Set();
 const errors=[];
 QUESTION_BANK.forEach((q,index)=>{
  if(!q||typeof q!=="object")errors.push(`${index+1}番目の問題データが不正です`);
  else{
   if(!q.id||ids.has(q.id))errors.push(`問題IDが未設定または重複しています: ${q.id||index+1}`);
   ids.add(q.id);
   if(!Array.isArray(q.choices)||q.choices.length!==5)errors.push(`${q.id}: 選択肢が5個ではありません`);
   if(!Number.isInteger(q.answer)||q.answer<0||q.answer>4)errors.push(`${q.id}: 正解番号が不正です`);
   ["image","imageAlt","detailImage","detailImageAlt"].forEach(key=>{if(q[key]!==undefined&&typeof q[key]!=="string")errors.push(`${q.id}: ${key}は文字列で指定してください`);});
  }
 });
 if(errors.length)console.error("問題データ検証エラー",errors);
}
validateQuestionBank();
el("questionBankCount").textContent=`収録問題数：${QUESTION_BANK.length}問`;
renderWeaknessSummary();

function startQuiz(){
 mode="normal";
 const requested=Number(el("questionCount").value);
 quiz=[...QUESTION_BANK].sort(()=>Math.random()-.5).slice(0,Math.min(requested,QUESTION_BANK.length));
 currentIndex=0;showScreen("quizScreen");showQuestion();
}
function showQuestion(){
 answerLocked=false;
 const q=quiz[currentIndex];
 const prefix=mode==="review"?"復習 ":mode==="weakness"?"苦手克服 ":"";
 el("progress").textContent=`${prefix}第${currentIndex+1}問 / ${quiz.length}問`;
 el("sectionInfo").textContent=`区分：${getSection(q)}`;
 el("questionText").textContent=q.question;
 renderOptionalImage("questionMedia",q.image,q.imageAlt);
 el("choices").innerHTML="";
 q.choices.forEach((choice,i)=>{
  const button=document.createElement("button");button.type="button";button.className="choice";button.textContent=`${i+1}. ${choice}`;button.addEventListener("click",()=>answer(i));el("choices").appendChild(button);
 });
}
function answer(selected){
 if(answerLocked)return;answerLocked=true;
 const q=quiz[currentIndex];currentResult={q,selected};recordAnswer(q,selected);
 if(mode==="review"&&selected===q.answer)markReviewCorrect(q.id);else if(selected!==q.answer)addReview(q.id);
 el("resultTitle").textContent=selected===q.answer?"⭕ 正解":selected===null?"確認しましょう":"❌ 不正解";
 el("answerInfo").innerHTML=`正しい答え：${q.answer+1}. ${q.choices[q.answer]}<br>`+(selected===null?"今回の回答：わからない":`あなたの回答：${selected+1}. ${q.choices[selected]}`);
 el("explanation").textContent=`解説：${q.explanation}`;el("detailBox").textContent=q.detail;
 renderOptionalImage("detailMedia",q.detailImage,q.detailImageAlt);
 el("categoryInfo").textContent=`区分：${getSection(q)} / 分野：${q.category} / 重要度：${q.importance}`;
 el("sourceInfo").textContent=`参考：${q.source}`;
 el("bookmarkStatus").textContent=selected!==q.answer?"復習候補に自動登録しました。":"";
 showScreen("resultScreen");
}
function nextQuestion(){if(currentIndex<quiz.length-1){currentIndex++;showScreen("quizScreen");showQuestion();}else showScreen("startScreen");}
function bookmarkCurrent(){if(!currentResult)return;const added=addReview(currentResult.q.id);el("bookmarkStatus").textContent=added?"復習候補に保存しました。":"すでに復習候補にあります。";}
function openReview(){showScreen("reviewScreen");el("reviewStatus").textContent="";renderReviewList();}
function renderReviewList(){
 const ids=loadReviewIds();const correctIds=loadReviewCorrectIds();const valid=ids.map(id=>QUESTION_BANK.find(q=>q.id===id)).filter(Boolean);const correctCount=valid.filter(q=>correctIds.includes(q.id)).length;
 el("reviewCount").textContent=`現在の復習候補：${valid.length}問（復習で正解・チェックOFF：${correctCount}問）`;el("reviewList").innerHTML="";
 if(valid.length===0){el("reviewList").innerHTML="<p>復習候補はありません。</p>";return;}
 valid.forEach(q=>{const row=document.createElement("div");row.className="review-item";const label=document.createElement("label");const box=document.createElement("input");box.type="checkbox";box.className="reviewCheck";box.value=q.id;box.checked=!correctIds.includes(q.id);label.append(box,document.createTextNode(` [${getSection(q)}] ${q.tag}（${q.category}）`));row.appendChild(label);el("reviewList").appendChild(row);});
}
function checkedReviewIds(){return [...document.querySelectorAll(".reviewCheck:checked")].map(x=>x.value);}
function allVisibleReviewIds(){return [...document.querySelectorAll(".reviewCheck")].map(x=>x.value);}
function startReview(){const ids=checkedReviewIds();if(ids.length===0){el("reviewStatus").textContent="復習する問題を選択してください。";return;}mode="review";quiz=ids.map(id=>QUESTION_BANK.find(q=>q.id===id)).filter(Boolean);currentIndex=0;showScreen("quizScreen");showQuestion();}
function removeReviewIds(targetIds,messageLabel){const status=el("reviewStatus");if(targetIds.length===0){status.textContent=`${messageLabel}する問題がありません。`;return;}const before=loadReviewIds();const remaining=before.filter(id=>!targetIds.includes(id));saveReviewIds(remaining);saveReviewCorrectIds(loadReviewCorrectIds().filter(id=>!targetIds.includes(id)));renderReviewList();status.textContent=`${messageLabel}：${before.length}問 → ${remaining.length}問`;}
function deleteSelected(){removeReviewIds(checkedReviewIds(),"選択削除を実行");}
function deleteUnchecked(){const checked=new Set(checkedReviewIds());const unchecked=allVisibleReviewIds().filter(id=>!checked.has(id));removeReviewIds(unchecked,"非選択削除を実行");}
function deleteAll(){const before=loadReviewIds();const status=el("reviewStatus");if(before.length===0){status.textContent="削除する復習候補がありません。";return;}localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(REVIEW_CORRECT_KEY);renderReviewList();status.textContent=`すべて削除を実行：${before.length}問 → 0問`;}

el("startButton").addEventListener("click",startQuiz);
el("openReviewButton").addEventListener("click",openReview);
el("startWeaknessButton").addEventListener("click",startWeaknessQuiz);
el("unknownButton").addEventListener("click",()=>answer(null));
el("quitButton").addEventListener("click",()=>showScreen("startScreen"));
el("bookmarkButton").addEventListener("click",bookmarkCurrent);
el("nextButton").addEventListener("click",nextQuestion);
el("selectAllButton").addEventListener("click",()=>document.querySelectorAll(".reviewCheck").forEach(x=>x.checked=true));
el("clearAllChecksButton").addEventListener("click",()=>document.querySelectorAll(".reviewCheck").forEach(x=>x.checked=false));
el("startReviewButton").addEventListener("click",startReview);
el("reviewTopButton").addEventListener("click",()=>showScreen("startScreen"));

document.addEventListener("keydown",event=>{
 const focused=document.activeElement?.tagName;if(["BUTTON","SELECT","INPUT"].includes(focused))return;
 if(!el("startScreen").classList.contains("hidden")&&event.key==="Enter"){event.preventDefault();startQuiz();return;}
 if(!el("quizScreen").classList.contains("hidden")){if(["1","2","3","4","5"].includes(event.key))answer(Number(event.key)-1);else if(event.key.toLowerCase()==="w")answer(null);return;}
 if(!el("resultScreen").classList.contains("hidden")){if(event.key==="Enter"){event.preventDefault();nextQuestion();}else if(event.key.toLowerCase()==="r")bookmarkCurrent();}
});
