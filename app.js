"use strict";
const QUESTION_BANK=window.QUESTION_BANK||[];
const STORAGE_KEY = "otsu2_review_ids_v11";
const REVIEW_CORRECT_KEY = "otsu2_review_correct_ids_v11";

const el = id => document.getElementById(id);
const screens = ["startScreen","quizScreen","resultScreen","reviewScreen"];

let quiz = [];
let currentIndex = 0;
let currentResult = null;
let mode = "normal";

function showScreen(id){
 screens.forEach(screenId => el(screenId).classList.toggle("hidden", screenId !== id));
}

function loadReviewIds(){
 try{
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  return Array.isArray(raw) ? [...new Set(raw.filter(v => typeof v === "string"))] : [];
 }catch{
  return [];
 }
}

function saveReviewIds(ids){
 localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(ids)]));
}

function loadReviewCorrectIds(){
 try{
  const raw = JSON.parse(localStorage.getItem(REVIEW_CORRECT_KEY) || "[]");
  return Array.isArray(raw) ? [...new Set(raw.filter(v => typeof v === "string"))] : [];
 }catch{
  return [];
 }
}

function saveReviewCorrectIds(ids){
 localStorage.setItem(REVIEW_CORRECT_KEY, JSON.stringify([...new Set(ids)]));
}

function markReviewCorrect(id){
 const ids = loadReviewCorrectIds();
 if(!ids.includes(id)){
  ids.push(id);
  saveReviewCorrectIds(ids);
 }
}

function clearReviewCorrect(id){
 const ids = loadReviewCorrectIds().filter(savedId => savedId !== id);
 saveReviewCorrectIds(ids);
}

function addReview(id){
 const ids = loadReviewIds();
 clearReviewCorrect(id);
 if(ids.includes(id)) return false;
 ids.push(id);
 saveReviewIds(ids);
 return true;
}

function startQuiz(){
 mode = "normal";
 const requested = Number(el("questionCount").value);
 quiz = [...QUESTION_BANK].sort(() => Math.random() - 0.5).slice(0, Math.min(requested, QUESTION_BANK.length));
 currentIndex = 0;
 showScreen("quizScreen");
 showQuestion();
}

function showQuestion(){
 const q = quiz[currentIndex];
 el("progress").textContent = `${mode === "review" ? "復習 " : ""}第${currentIndex + 1}問 / ${quiz.length}問`;
 el("questionText").textContent = q.question;
 el("choices").innerHTML = "";
 q.choices.forEach((choice, i) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "choice";
  button.textContent = `${i + 1}. ${choice}`;
  button.addEventListener("click", () => answer(i));
  el("choices").appendChild(button);
 });
}

function answer(selected){
 const q = quiz[currentIndex];
 currentResult = {q, selected};
 if(mode === "review" && selected === q.answer){
  markReviewCorrect(q.id);
 }else if(selected !== q.answer){
  addReview(q.id);
 }
 el("resultTitle").textContent = selected === q.answer ? "⭕ 正解" : selected === null ? "確認しましょう" : "❌ 不正解";
 el("answerInfo").innerHTML = `正しい答え：${q.answer + 1}. ${q.choices[q.answer]}<br>` + (selected === null ? "今回の回答：わからない" : `あなたの回答：${selected + 1}. ${q.choices[selected]}`);
 el("explanation").textContent = `解説：${q.explanation}`;
 el("detailBox").textContent = q.detail;
 el("detailBox").classList.add("hidden");
 el("categoryInfo").textContent = `分野：${q.category} / 重要度：${q.importance}`;
 el("sourceInfo").textContent = `参考：${q.source}`;
 el("bookmarkStatus").textContent = selected !== q.answer ? "復習候補に自動登録しました。" : "";
 showScreen("resultScreen");
}

function nextQuestion(){
 if(currentIndex < quiz.length - 1){
  currentIndex++;
  showScreen("quizScreen");
  showQuestion();
 }else{
  alert(mode === "review" ? "復習を終了しました" : "終了しました");
  showScreen("startScreen");
 }
}

function bookmarkCurrent(){
 if(!currentResult) return;
 const added = addReview(currentResult.q.id);
 el("bookmarkStatus").textContent = added ? "復習候補に保存しました。" : "すでに復習候補にあります。";
}

function openReview(){
 showScreen("reviewScreen");
 el("reviewStatus").textContent = "";
 renderReviewList();
}

function renderReviewList(){
 const ids = loadReviewIds();
 const valid = ids.map(id => QUESTION_BANK.find(q => q.id === id)).filter(Boolean);
 const correctCount = valid.filter(q => loadReviewCorrectIds().includes(q.id)).length;
 el("reviewCount").textContent = `現在の復習候補：${valid.length}問（復習で正解・チェックOFF：${correctCount}問）`;
 el("reviewList").innerHTML = "";
 if(valid.length === 0){
  el("reviewList").innerHTML = "<p>復習候補はありません。</p>";
  return;
 }
 valid.forEach(q => {
  const row = document.createElement("div");
  row.className = "review-item";
  const label = document.createElement("label");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.className = "reviewCheck";
  box.value = q.id;
  box.checked = !loadReviewCorrectIds().includes(q.id);
  label.append(box, document.createTextNode(` ${q.tag}（${q.category}）`));
  row.appendChild(label);
  el("reviewList").appendChild(row);
 });
}

function checkedReviewIds(){
 return [...document.querySelectorAll(".reviewCheck:checked")].map(x => x.value);
}

function startReview(){
 const ids = checkedReviewIds();
 if(ids.length === 0){
  el("reviewStatus").textContent = "復習する問題を選択してください。";
  return;
 }
 mode = "review";
 quiz = ids.map(id => QUESTION_BANK.find(q => q.id === id)).filter(Boolean);
 currentIndex = 0;
 showScreen("quizScreen");
 showQuestion();
}

function deleteSelected(){
 const selected = checkedReviewIds();
 const status = el("reviewStatus");
 if(selected.length === 0){
  status.textContent = "削除する問題を選択してください。";
  return;
 }
 const before = loadReviewIds();
 const remaining = before.filter(id => !selected.includes(id));
 saveReviewIds(remaining);
 saveReviewCorrectIds(loadReviewCorrectIds().filter(id => !selected.includes(id)));
 renderReviewList();
 status.textContent = `選択削除を実行：${before.length}問 → ${remaining.length}問`;
}

function deleteAll(){
 const before = loadReviewIds();
 const status = el("reviewStatus");
 if(before.length === 0){
  status.textContent = "削除する復習候補がありません。";
  return;
 }
 localStorage.removeItem(STORAGE_KEY);
 localStorage.removeItem(REVIEW_CORRECT_KEY);
 renderReviewList();
 status.textContent = `すべて削除を実行：${before.length}問 → 0問`;
}

el("startButton").addEventListener("click", startQuiz);
el("openReviewButton").addEventListener("click", openReview);
el("unknownButton").addEventListener("click", () => answer(null));
el("quitButton").addEventListener("click", () => showScreen("startScreen"));
el("detailButton").addEventListener("click", () => el("detailBox").classList.remove("hidden"));
el("bookmarkButton").addEventListener("click", bookmarkCurrent);
el("nextButton").addEventListener("click", nextQuestion);
el("selectAllButton").addEventListener("click", () => document.querySelectorAll(".reviewCheck").forEach(x => x.checked = true));
el("clearAllChecksButton").addEventListener("click", () => document.querySelectorAll(".reviewCheck").forEach(x => x.checked = false));
el("startReviewButton").addEventListener("click", startReview);
el("reviewTopButton").addEventListener("click", () => showScreen("startScreen"));

document.addEventListener("keydown", event => {
 const focused = document.activeElement?.tagName;
 if(["BUTTON","SELECT","INPUT"].includes(focused)) return;
 if(!el("startScreen").classList.contains("hidden") && event.key === "Enter"){
  event.preventDefault();
  startQuiz();
  return;
 }
 if(!el("quizScreen").classList.contains("hidden")){
  if(["1","2","3","4","5"].includes(event.key)) answer(Number(event.key) - 1);
  else if(event.key.toLowerCase() === "w") answer(null);
  return;
 }
 if(!el("resultScreen").classList.contains("hidden")){
  if(event.key === "Enter"){ event.preventDefault(); nextQuestion(); }
  else if(event.key.toLowerCase() === "r") bookmarkCurrent();
  else if(event.key.toLowerCase() === "e") el("detailBox").classList.remove("hidden");
 }
});
