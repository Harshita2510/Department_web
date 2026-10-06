import { questionPaperService } from '../services/question-paper.service.js';
import { escapeHtml } from '../shared/dom.js';
import { safeHttpsUrl } from '../shared/security.js';
import { bindResourceDocumentViewer } from '../components/resource-document-viewer.js';

const $=(selector)=>document.querySelector(selector);
const roman=['I','II','III','IV','V','VI','VII','VIII'];
const eyeIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>';
const downloadIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M5 20h14"></path></svg>';
let papers=[];

const menuToggle=$('#menuToggle');const mainNav=$('.main-nav');
menuToggle?.addEventListener('click',()=>{const open=mainNav.classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));document.body.classList.toggle('no-scroll',open)});
document.querySelectorAll('.nav-group>button').forEach((button)=>button.addEventListener('click',()=>{const group=button.parentElement;const open=group.classList.toggle('open');button.setAttribute('aria-expanded',String(open));document.querySelectorAll('.nav-group').forEach((item)=>{if(item!==group){item.classList.remove('open');item.querySelector('button')?.setAttribute('aria-expanded','false')}})}));

function sizeLabel(bytes){return Number(bytes)>=1024*1024?`${(Number(bytes)/(1024*1024)).toFixed(1)} MB`:`${Math.max(1,Math.round(Number(bytes||0)/1024))} KB`}
function paperRow(item){
  const url=safeHttpsUrl(item.asset?.url);if(!url)return '';
  const title=`${item.subjectCode?`${item.subjectCode} — `:''}${item.subjectName} · ${item.examType==='mid-sem'?'Mid-Sem':'End-Sem'} ${item.academicYear}`;
  return `<li class="resource-document"><span class="document-icon" aria-hidden="true">PDF</span><span class="document-copy"><strong>${escapeHtml(item.examType==='mid-sem'?'Mid-Sem examination':'End-Sem examination')}</strong><small>${escapeHtml(item.academicYear)} · ${escapeHtml(item.asset.name||'Question paper PDF')}</small></span><span class="document-size">${escapeHtml(sizeLabel(item.asset.size))}</span><span class="document-actions"><button class="document-action document-view" type="button" data-resource-view data-url="${escapeHtml(url)}" data-title="${escapeHtml(title)}" data-mime-type="application/pdf">${eyeIcon}<span>View</span></button><a class="document-action document-download" href="${escapeHtml(url)}" download aria-label="Download ${escapeHtml(title)}">${downloadIcon}</a></span></li>`;
}
function render(){
  const programme=$('#paperProgramme').value,semester=$('#paperSemester').value,examType=$('#paperExamType').value,query=$('#paperSearch').value.trim().toLocaleLowerCase();
  const visible=papers.filter((item)=>(programme==='all'||item.programme===programme)&&(semester==='all'||String(item.semester)===semester)&&(examType==='all'||item.examType===examType)&&(!query||`${item.subjectCode} ${item.subjectName} ${item.academicYear}`.toLocaleLowerCase().includes(query)));
  const grouped=visible.reduce((map,item)=>{const key=`${item.programme}|${item.semester}|${item.subjectCode}|${item.subjectName}`;map.set(key,[...(map.get(key)||[]),item]);return map},new Map());
  $('#questionPaperList').innerHTML=grouped.size?[...grouped.entries()].map(([key,items])=>{const [programmeId,semesterNumber,code,name]=key.split('|');return `<article class="paper-subject-card"><header><span>${programmeId==='ug-cse'?'B.Tech':'M.Tech'} · Semester ${roman[Number(semesterNumber)-1]}</span><h2>${escapeHtml(code?`${code} — ${name}`:name)}</h2></header><ol>${items.map(paperRow).join('')}</ol></article>`}).join(''):'<div class="timetable-public-empty"><strong>No question papers match these filters.</strong><span>Published Mid-Sem and End-Sem papers will appear here.</span></div>';
}
async function load(){try{papers=await questionPaperService.listPublic();render()}catch{$('#questionPaperList').innerHTML='<div class="timetable-public-empty"><strong>Question papers could not be loaded.</strong><span>Please try again after the API is available.</span></div>'}}
['#paperProgramme','#paperSemester','#paperExamType'].forEach((selector)=>$(selector).addEventListener('change',render));
$('#paperSearch').addEventListener('input',render);
bindResourceDocumentViewer($('#questionPaperList'));
load();
$('#currentYear').textContent=new Date().getFullYear();
