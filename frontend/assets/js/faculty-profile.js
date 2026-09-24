import { facultyPhotoUrl } from './shared/faculty-photo.js';
import { $, initials } from './shared/dom.js';
import { facultyService } from './services/faculty.service.js';

const params = new URLSearchParams(window.location.search);
const facultyId = (params.get('facultyId') || '').trim().toUpperCase();
const preview = params.get('preview') === '1';
const facultySession=JSON.parse(sessionStorage.getItem('sgsitsFacultySession')||'null');
const ownPreview=preview&&facultySession?.role==='faculty'&&(!facultyId||facultyId===facultySession.facultyId?.toUpperCase());
let profile = null;
let employeeNumber = '';

function renderProfile() {
  if (!profile) {
    $('#profileEmpty').hidden = false;
    return;
  }

  $('#profileContent').hidden = false;
  $('#previewBar').hidden = !ownPreview;
  const fullDisplayName = `${profile.title || ''} ${profile.fullName || 'Faculty Member'}`.trim();
  document.title = `${fullDisplayName} — SGSITS Faculty`;
  $('#publicName').textContent = fullDisplayName;
  $('#publicInitials').textContent = initials(profile.fullName);
  $('#publicDesignation').textContent = profile.designation || 'Faculty member';
  if (profile.photoUrl) {
    $('#publicAvatar').style.backgroundImage = `url("${facultyPhotoUrl(profile.photoUrl,380)}")`;
    $('#publicInitials').style.visibility = 'hidden';
  }

  $('#publicEmployeeNumber').textContent = employeeNumber || '—';
  $('#experienceValue').textContent = profile.experienceYears ?? '—';
  $('#publicHighestQualification').textContent = profile.highestQualification || '—';
  $('#publicSpecialisation').textContent = profile.areaOfSpecialisation || '—';
  $('#publicEmail').textContent = profile.email || '—';
  $('#contactWrap').hidden = !profile.phone;
  $('#publicContact').textContent = profile.phone || '';
}

$('#publicYear').textContent = new Date().getFullYear();
async function loadProfile(){
  if(!facultyId&&!ownPreview){
    $('#profileEmptyMessage').textContent='No faculty employee ID was included in this link. Open the profile from the faculty directory.';
    $('#profileEmpty').hidden=false;
    return;
  }
  try{
    const record=ownPreview?await facultyService.getOwn():await facultyService.getPublic(facultyId);
    if(!ownPreview&&record.facultyId?.toUpperCase()!==facultyId)throw new Error('The requested faculty profile did not match the returned record.');
    employeeNumber=record.facultyId||facultyId;
    profile=ownPreview?record.draft:record.approvedSnapshot;
    renderProfile();
  }catch(error){$('#profileEmptyMessage').textContent=error.message||'The profile is not published or could not be loaded.';$('#profileEmpty').hidden=false}
}
loadProfile();
