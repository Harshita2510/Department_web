import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { facultyPhotoUrl } from '../../frontend/assets/js/shared/faculty-photo.js';

const source = (file) => readFile(new URL(`../../frontend/${file}`,import.meta.url),'utf8');

// Execute the actual page scripts against a small DOM test double; no browser dependency.
function pageContext(record, { preview=false, admin=false }={}) {
  const nodes=new Map();
  const allNodes=new Map();
  function node(selector){
    if(!nodes.has(selector))nodes.set(selector,{
      value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,dataset:{},files:[],
      style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},
      attributes:{},listeners:{},
      setAttribute(key,value){this.attributes[key]=value},removeAttribute(key){delete this.attributes[key]},
      addEventListener(event,handler){this.listeners[event]=handler},
      querySelector(child){return node(`${selector} ${child}`)},
      querySelectorAll(child){return allNodes.get(`${selector} ${child}`)||[]},
      focus(){this.focused=true},reset(){},checkValidity(){return true}
    });
    return nodes.get(selector);
  }
  const select=(selector,scope)=>scope?scope.querySelector(selector):node(selector);
  const selectAll=(selector,scope)=>scope?scope.querySelectorAll(selector):(allNodes.get(selector)||[]);
  const document={querySelector:select,querySelectorAll:selectAll,body:node('body'),addEventListener(){}};
  const context={
    document,console,URLSearchParams,URL,Intl,Date,FormData,Blob,Set,Map,Promise,structuredClone,facultyPhotoUrl,
    window:{location:{search:`?facultyId=EMP-001${preview?'&preview=1':''}`,replace(){},href:''},addEventListener(){},dispatchEvent(){},scrollTo(){},open(){}},
    sessionStorage:{getItem:()=>JSON.stringify({facultyId:'EMP-001',role:admin?'admin':'faculty'}),removeItem(){}},
    localStorage:{getItem:()=>null,length:0},
    crypto:{randomUUID:()=> 'test-id'},
    setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},
    $:select,$$:selectAll,
    escapeHtml:(value='')=>String(value).replace(/[&<>"']/g,'_'),
    initials:(value='')=>value.split(/\s+/).slice(0,2).map(word=>word[0]).join(''),
    safeLink:(value)=>value?.startsWith('https://')?value:'',formatDate:()=>'',
    facultyService:{getPublic:async()=>record,getOwn:async()=>record,list:async()=>[],listAccessOptions:async()=>[]},
    authService:{listFacultyAccounts:async()=>[]},placementService:{listAdmin:async()=>[]},contentService:{listAdmin:async()=>[]},uploadService:{},
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}}
  };
  vm.createContext(context);
  return {context,node,allNodes};
}

async function loadScript(file,harness){
  const script=(await source(file)).replace(/^import .*;\r?\n/gm,'');
  vm.runInContext(script,harness.context,{filename:file});
  await new Promise(resolve=>setImmediate(resolve));
}

const fields={fullName:'Test Teacher',designation:'Professor',experienceYears:0,highestQualification:'PhD',areaOfSpecialisation:'Computer vision',email:'teacher@example.org'};
const record={facultyId:'EMP-001',draft:{...fields},approvedSnapshot:{...fields},reviewStatus:'approved',publishedAt:new Date().toISOString()};

test('public profile without photo renders initials and registration fields, including zero experience',async()=>{
  const h=pageContext(record);
  await loadScript('assets/js/faculty-profile.js',h);
  assert.equal(h.node('#publicInitials').textContent,'TT');
  assert.notEqual(h.node('#publicInitials').style.visibility,'hidden');
  assert.equal(h.node('#publicAvatar').style.backgroundImage,undefined);
  assert.equal(h.node('#publicHighestQualification').textContent,'PhD');
  assert.equal(h.node('#publicSpecialisation').textContent,'Computer vision');
  assert.equal(h.node('#experienceValue').textContent,0);
  assert.equal(h.node('#profileContent').hidden,false);
});

test('public profile uses approved content; preview uses own draft',async()=>{
  const changed={...record,draft:{...fields,fullName:'Changed Teacher'}};
  const publicPage=pageContext(changed);
  await loadScript('assets/js/faculty-profile.js',publicPage);
  assert.equal(publicPage.node('#publicName').textContent,'Test Teacher');
  const previewPage=pageContext(changed,{preview:true});
  await loadScript('assets/js/faculty-profile.js',previewPage);
  assert.equal(previewPage.node('#publicName').textContent,'Changed Teacher');
});

test('legacy public profile without new fields still renders its placeholder',async()=>{
  const h=pageContext({...record,approvedSnapshot:{fullName:'Legacy Teacher'}});
  await loadScript('assets/js/faculty-profile.js',h);
  assert.equal(h.node('#publicInitials').textContent,'LT');
  assert.equal(h.node('#highestQualificationWrap').hidden,true);
  assert.equal(h.node('#specialisationWrap').hidden,true);
});

test('faculty portal without photo keeps avatar placeholders and loads new fields',async()=>{
  const h=pageContext(record);
  h.allNodes.set('[data-profile-initials]',[h.node('initials')]);
  await loadScript('assets/js/faculty-portal.js',h);
  assert.equal(h.node('initials').textContent,'TT');
  for(const selector of ['.summary-avatar','#photoPreview']){
    assert.equal(h.node(selector).style.backgroundImage,'');
    assert.equal(h.node(`${selector} [data-profile-initials]`).style.visibility,'');
  }
  assert.equal(h.node('.sidebar-avatar').style.color,'');
  assert.equal(h.node('#highestQualification').value,'PhD');
  assert.equal(h.node('#areaOfSpecialisation').value,'Computer vision');
});

test('public and portal photos hide initials when a photo is present',async()=>{
  const photoFields={...fields,photoUrl:'https://res.cloudinary.com/demo/image/upload/v1/sgsits/faculty/photo.png'};
  const withPhoto={...record,draft:photoFields,approvedSnapshot:photoFields};
  const publicPage=pageContext(withPhoto);
  await loadScript('assets/js/faculty-profile.js',publicPage);
  assert.match(publicPage.node('#publicAvatar').style.backgroundImage,/photo.png/);
  assert.match(publicPage.node('#publicAvatar').style.backgroundImage,/f_auto,q_auto,c_limit,w_380/);
  assert.equal(publicPage.node('#publicInitials').style.visibility,'hidden');
  const portal=pageContext(withPhoto);
  await loadScript('assets/js/faculty-portal.js',portal);
  assert.match(portal.node('#photoPreview').style.backgroundImage,/photo.png/);
  assert.match(portal.node('#photoPreview').style.backgroundImage,/f_auto,q_auto,c_limit,w_216/);
  assert.match(portal.node('.sidebar-avatar').style.backgroundImage,/f_auto,q_auto,c_limit,w_74/);
  assert.match(portal.node('.summary-avatar').style.backgroundImage,/f_auto,q_auto,c_limit,w_156/);
  assert.equal(portal.node('#photoPreview [data-profile-initials]').style.visibility,'hidden');
});

test('registration form preserves requested field order and optional photo/contact',async()=>{
  const html=await source('pages/site-admin.html');
  const form=html.match(/<form id="facultyAccountForm"[\s\S]*?<\/form>/)[0];
  const ids=[...form.matchAll(/<input id="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(ids,['newFacultyName','newFacultyDesignation','newFacultyId','newFacultyExperience','newFacultyQualification','newFacultySpecialisation','newFacultyEmail','newFacultyContact','newFacultyPhoto','newFacultyPassword']);
  for(const id of ['newFacultyContact','newFacultyPhoto'])assert.doesNotMatch(form.match(new RegExp(`<input id="${id}"[^>]*>`))[0],/\brequired\b/);
  assert.match(form,/Login credentials/);assert.match(form,/step="any"/);
});

test('registration API service sends fields and an optional photo as multipart',async()=>{
  const code=(await source('assets/js/services/auth.service.js')).replace(/^import .*;\r?\n/gm,'').replace('export const authService','globalThis.authService');
  let captured;
  const ctx=vm.createContext({FormData,Blob,apiRequest:(path,options)=>{captured={path,...options}}});
  vm.runInContext(code,ctx);
  ctx.authService.createFaculty({facultyId:'EMP-001',experienceYears:3.5});
  assert.equal(captured.path,'/auth/faculty');assert.equal(captured.body.has('file'),false);
  assert.equal(captured.body.get('experienceYears'),'3.5');
  ctx.authService.createFaculty({facultyId:'EMP-001'},new Blob(['photo'],{type:'image/png'}));
  assert.equal(captured.body.get('file').type,'image/png');
});

async function adminForm() {
  const h=pageContext(record,{admin:true});
  await loadScript('assets/js/site-admin.js',h);
  const inputs=Object.entries({fullName:'Test Teacher',designation:'Professor',facultyId:'emp-001',experienceYears:'3.5',highestQualification:'PhD',areaOfSpecialisation:'AI',email:' Teacher@Example.org ',phone:'',temporaryPassword:'Temporary123'}).map(([name,value])=>{
    const input=h.node(`input-${name}`);input.name=name;input.value=value;return input;
  });
  h.allNodes.set('#facultyAccountForm input[name]',inputs);
  h.allNodes.set('#facultyAccountForm input',inputs);
  return {...h,inputs};
}

test('registration disables duplicate submission and presents server errors inline',async()=>{
  const h=await adminForm();
  let reject;let requests=0;
  h.context.authService.createFaculty=()=>{requests++;return new Promise((_resolve,fail)=>{reject=fail})};
  const pending=vm.runInContext('createFacultyAccount()',h.context);
  assert.equal(h.node('#facultyAccountForm button[type="submit"]').disabled,true);
  await vm.runInContext('createFacultyAccount()',h.context);
  assert.equal(requests,1);
  reject(new Error('Employee number is already registered'));
  await pending;
  assert.equal(h.node('#facultyAccountForm button[type="submit"]').disabled,false);
  assert.equal(h.node('#facultyRegistrationError').textContent,'Employee number is already registered');
});

test('invalid registration fields and oversized photos never submit',async()=>{
  const h=await adminForm();let requests=0;
  h.context.authService.createFaculty=async()=>{requests++};
  h.inputs[0].checkValidity=()=>false;h.inputs[0].validationMessage='Name is required';
  await vm.runInContext('createFacultyAccount()',h.context);
  assert.equal(requests,0);assert.equal(h.inputs[0].attributes['aria-invalid'],'true');
  assert.equal(h.node('#facultyAccountForm [data-registration-error="fullName"]').textContent,'Name is required');
  h.inputs[0].checkValidity=()=>true;
  h.node('#newFacultyPhoto').files=[{type:'image/png',name:'photo.png',size:5*1024*1024+1}];
  await vm.runInContext('createFacultyAccount()',h.context);
  assert.equal(requests,0);assert.match(h.node('#newFacultyPhotoError').textContent,/5 MB/);
});

test('successful registration remains successful if list refresh fails',async()=>{
  const h=await adminForm();let fields;
  h.context.authService.createFaculty=async(value)=>{fields=value};
  h.context.facultyService.list=async()=>{throw new Error('Refresh unavailable')};
  await vm.runInContext('createFacultyAccount()',h.context);
  assert.equal(fields.facultyId,'EMP-001');assert.equal(fields.email,'teacher@example.org');
  assert.equal(h.node('#facultyAccountModal').attributes['aria-hidden'],'true');
  assert.match(h.node('#cmsToast').textContent,/Faculty created and published/);
  assert.equal(h.node('#facultyRegistrationError').textContent,'');
});
