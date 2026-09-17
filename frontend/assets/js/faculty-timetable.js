import { escapeHtml } from './shared/dom.js';
import { academicDocumentService } from './services/academic-document.service.js';

const $=(selector)=>document.querySelector(selector);
const slots={classTable:'Class timetable',mst1:'MST 1',mst2:'MST 2',mst3:'MST 3',endSemester:'End Semester'};
let records=[];let target=null;let timer;
function notify(message){const toast=$('#portalToast');toast.textContent=message;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove('show'),3600)}
function render(){
  $('#timetableAssignmentCount').textContent=records.length;$('#facultyTimetableEmpty').classList.toggle('show',!records.length);
  $('#facultyTimetableList').innerHTML=records.map((record)=>`<article class="faculty-timetable-card"><header><h3>${record.programme==='ug-cse'?'B.Tech CSE':'M.Tech CSE'} · Semester ${record.semester}</h3><p>${escapeHtml(record.academicYear||'Current semester')}</p></header><div class="faculty-timetable-slots">${Object.entries(slots).map(([slot,label])=>{const file=record.timetableFiles?.[slot];const state=file?.status||'missing';return `<section class="faculty-timetable-slot"><strong>${label}</strong><small>${file?.asset?escapeHtml(file.asset.name):'No file uploaded'}</small><span class="${state==='published'?'published':''}">${escapeHtml(state.replace('_',' '))}</span><button type="button" data-faculty-timetable="${record._id}" data-slot="${slot}">${file?.asset?'Replace & submit':'Upload & submit'}</button></section>`}).join('')}</div></article>`).join('');
}
async function load(){try{records=await academicDocumentService.listManaged('timetable');render()}catch(error){notify(error.message)}}
$('#facultyTimetableList').addEventListener('click',(event)=>{const button=event.target.closest('[data-faculty-timetable]');if(!button)return;target={id:button.dataset.facultyTimetable,slot:button.dataset.slot};$('#facultyTimetableFile').click()});
$('#facultyTimetableFile').addEventListener('change',async(event)=>{const file=event.target.files[0];event.target.value='';if(!file||!target)return;if(file.size>10*1024*1024){notify('Timetable files must be 10 MB or smaller.');return}if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)){notify('Choose a PDF, JPG, PNG or WebP file.');return}try{notify('Uploading timetable…');await academicDocumentService.uploadTimetable(target.id,target.slot,file);await load();notify('Timetable submitted for administrator review.')}catch(error){notify(error.message)}});
load();
