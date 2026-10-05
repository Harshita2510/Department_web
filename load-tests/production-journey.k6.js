import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const siteUrl=String(__ENV.SITE_URL||'').replace(/\/$/,'');
const apiUrl=String(__ENV.API_URL||`${siteUrl}/api`).replace(/\/$/,'');
if(!siteUrl)throw new Error('Set SITE_URL to the staging website URL');

const duration=__ENV.HOLD_DURATION||'5m';
const target=Number(__ENV.TARGET_VISITORS||800);
const facultyVus=Number(__ENV.FACULTY_VUS||0);
const noticePdf=__ENV.NOTICE_PDF?open(__ENV.NOTICE_PDF,'b'):null;
const applicationFailures=new Rate('application_failures');
const fileDownloads=new Counter('file_downloads');
const journeyDuration=new Trend('journey_duration',true);

const scenarios={
  public_visitors:{
    executor:'ramping-vus',
    exec:'publicJourney',
    startVUs:0,
    stages:[
      {duration:'2m',target:Math.max(1,Math.ceil(target/4))},
      {duration:'3m',target},
      {duration,target},
      {duration:'2m',target:0}
    ],
    gracefulRampDown:'30s'
  }
};

if(facultyVus>0){
  if(!__ENV.FACULTY_ID||!__ENV.FACULTY_PASSWORD)throw new Error('FACULTY_ID and FACULTY_PASSWORD are required when FACULTY_VUS is greater than zero');
  scenarios.faculty_readers={executor:'constant-vus',exec:'facultyJourney',vus:facultyVus,duration,startTime:'1m'};
}

if(noticePdf){
  if(!__ENV.FACULTY_ID||!__ENV.FACULTY_PASSWORD)throw new Error('Faculty credentials are required for the optional upload check');
  scenarios.single_notice_upload={executor:'shared-iterations',exec:'noticeUploadJourney',vus:1,iterations:1,startTime:'2m'};
}

export const options={
  scenarios,
  thresholds:{
    http_req_failed:['rate<0.01'],
    http_req_duration:['p(95)<1500','p(99)<3000'],
    application_failures:['rate<0.01'],
    journey_duration:['p(95)<8000']
  },
  userAgent:'SGSITS-staging-load-test/1.0'
};

function jsonGet(path){
  const response=http.get(`${apiUrl}${path}`,{headers:{accept:'application/json'}});
  const valid=check(response,{[`${path} returned 200`]:(value)=>value.status===200});
  applicationFailures.add(!valid);
  if(!valid)return null;
  try{return response.json()}catch{applicationFailures.add(true);return null}
}

export function publicJourney(){
  const started=Date.now();
  const pages=['/','/pages/notices.html','/pages/faculty.html','/pages/timetable.html','/pages/placements.html'];
  const page=http.get(`${siteUrl}${pages[Math.floor(Math.random()*pages.length)]}`);
  applicationFailures.add(!check(page,{'public page returned 200':(value)=>value.status===200}));

  const responses=http.batch([
    ['GET',`${apiUrl}/content/public?type=notice`,null,{headers:{accept:'application/json'}}],
    ['GET',`${apiUrl}/content/public?type=event`,null,{headers:{accept:'application/json'}}],
    ['GET',`${apiUrl}/faculty/public?limit=12`,null,{headers:{accept:'application/json'}}],
    ['GET',`${apiUrl}/placements/public`,null,{headers:{accept:'application/json'}}],
    ['GET',`${apiUrl}/academic-documents/public?type=timetable`,null,{headers:{accept:'application/json'}}]
  ]);
  responses.forEach((response)=>applicationFailures.add(response.status!==200));

  // A portion of visitors open the newest published notice PDF. This exercises
  // the CDN/file path without turning every virtual user into a downloader.
  if(Math.random()<0.15&&responses[0].status===200){
    let attachmentUrl;
    try{attachmentUrl=responses[0].json('data.0.asset.url')}catch{}
    if(attachmentUrl){
      const file=http.get(attachmentUrl,{responseType:'none'});
      applicationFailures.add(file.status!==200);fileDownloads.add(1);
    }
  }
  journeyDuration.add(Date.now()-started);
  sleep(2+Math.random()*6);
}

let facultySignedIn=false;
function facultyLogin(){
  if(facultySignedIn)return true;
  const response=http.post(`${apiUrl}/auth/login`,JSON.stringify({identifier:__ENV.FACULTY_ID,password:__ENV.FACULTY_PASSWORD}),{headers:{'content-type':'application/json'}});
  facultySignedIn=check(response,{'faculty login succeeded':(value)=>value.status===200});
  applicationFailures.add(!facultySignedIn);
  return facultySignedIn;
}

export function facultyJourney(){
  if(!facultyLogin()){sleep(5);return}
  const me=http.get(`${apiUrl}/auth/me`);
  const profile=http.get(`${apiUrl}/faculty/me`);
  applicationFailures.add(me.status!==200||profile.status!==200);
  sleep(4+Math.random()*8);
}

export function noticeUploadJourney(){
  if(!facultyLogin())return;
  const response=http.post(`${apiUrl}/files/notices`,{file:http.file(noticePdf,'staging-load-test.pdf','application/pdf')});
  applicationFailures.add(!check(response,{'single staging upload succeeded':(value)=>value.status===201}));
}
