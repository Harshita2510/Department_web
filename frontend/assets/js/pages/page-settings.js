import { pageSettingsService } from '../services/page-settings.service.js';

function setText(selector,value){const node=document.querySelector(selector);if(node&&value)node.textContent=value}
function safeHttps(value){try{const url=new URL(value);return url.protocol==='https:'?url.href:''}catch{return ''}}

async function apply(){
  const file=location.pathname.split('/').pop()||'';
  const page=file==='admissions.html'?'admission':file==='research.html'?'research':file==='events.html'?'events':file==='placements.html'?'placements':'';
  if(!page)return;
  try{
    const value=await pageSettingsService.getPublic(page);
    if(page==='admission'){
      setText('.admissions-kicker',value.eyebrow);setText('.admissions-intro h1',`${value.title} ${value.accent}`);setText('.admissions-intro-copy p',value.description);
      const cards=document.querySelectorAll('.admission-card');
      [[value.undergraduateTitle,value.undergraduateDescription],[value.postgraduateTitle,value.postgraduateDescription],[value.doctoralTitle,value.doctoralDescription],[value.officialTitle,value.officialDescription]].forEach(([title,description],index)=>{if(cards[index]){cards[index].querySelector('h2').textContent=title;cards[index].querySelector('p').textContent=description}});
      if(cards[3])cards[3].href=safeHttps(value.officialUrl)||cards[3].href;
    }
    if(page==='research'){
      setText('.research-kicker',value.eyebrow);setText('.research-opening h1',value.title);setText('.research-description',value.description);
      document.querySelectorAll('.research-focus-card').forEach((card,index)=>{setText(`.research-focus-card:nth-child(${index+1}) h2`,value[`area${index+1}Title`]);setText(`.research-focus-card:nth-child(${index+1}) p`,value[`area${index+1}Description`])});
      const resources=document.querySelectorAll('.research-resource');
      if(resources[0])resources[0].querySelector('h3').textContent=value.laboratoriesTitle;
      if(resources[1])resources[1].querySelector('h3').textContent=value.publicationsTitle;
      if(resources[2])resources[2].querySelector('h3').textContent=value.projectsTitle;
    }
    if(page==='events'){
      setText('.page-hero .eyebrow',value.eyebrow);setText('.page-hero h1',value.title);setText('.page-hero p',value.description);setText('.events-section .section-heading span',value.sectionLabel);setText('.events-section .section-heading h2',value.sectionTitle);
    }
    if(page==='placements'){
      setText('.placement-hero .eyebrow',value.eyebrow);setText('.placement-hero h1',value.title);setText('.placement-hero-description',value.description);setText('.placement-intro .kicker',value.sectionLabel);setText('.placement-intro h2',value.sectionTitle);setText('.placement-intro-description',value.sectionDescription);
    }
  }catch{
    // Keep the server-rendered defaults when page settings are unavailable.
  }
}
apply();
