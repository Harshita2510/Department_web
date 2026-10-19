import { facultyPhotoUrl } from './shared/faculty-photo.js';
import { $, initials } from './shared/dom.js';
import { facultyService } from './services/faculty.service.js';

const params = new URLSearchParams(window.location.search);
let facultyId = (params.get('facultyId') || '').trim().toUpperCase();
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
  const safePhoto = facultyPhotoUrl(profile.photoUrl,380);
  if (safePhoto) {
    $('#publicAvatar').style.backgroundImage = `url("${safePhoto}")`;
    $('#publicInitials').style.visibility = 'hidden';
  } else {
    $('#publicAvatar').style.backgroundImage = '';
    $('#publicInitials').style.visibility = '';
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

async function resolveSinglePublishedProfile(){
  const records=await facultyService.listPublic();
  if(records.length!==1||!records[0]?.facultyId)return false;
  facultyId=String(records[0].facultyId).trim().toUpperCase();
  const url=new URL(window.location.href);
  url.searchParams.set('facultyId',facultyId);
  window.history.replaceState({},'',url);
  return true;
}

async function loadProfile(){
  if(!facultyId&&!ownPreview){
    try{
      // Supports old generic links only when there is one unambiguous public
      // result. With multiple profiles, never guess which person was meant.
      if(!await resolveSinglePublishedProfile()){
        $('#profileEmptyMessage').textContent='No faculty employee ID was included in this link. Open the profile from the faculty directory.';
        $('#profileEmpty').hidden=false;
        return;
      }
    }catch{
      $('#profileEmptyMessage').textContent='The faculty directory could not be checked. Open the profile from the faculty directory.';
      $('#profileEmpty').hidden=false;
      return;
    }
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
