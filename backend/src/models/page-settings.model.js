import mongoose from 'mongoose';

export const pageSettingsDefaults={
  admission:{
    eyebrow:'Study Computer Engineering',title:'One discipline.',accent:'Many directions.',description:'Build depth through structured undergraduate, postgraduate and doctoral study, with direct access to semester-wise syllabi and timetables.',
    undergraduateTitle:'B.Tech Computer Engineering',undergraduateDescription:'An undergraduate pathway from mathematical and programming foundations to complete computing systems.',
    postgraduateTitle:'M.Tech Computer Engineering',postgraduateDescription:'Advanced coursework and research for deeper technical specialisation and professional practice.',
    doctoralTitle:'Ph.D. & doctoral research',doctoralDescription:'Original research guided by department faculty across contemporary computing domains.',
    officialTitle:'Official admissions',officialDescription:'Open the institute admission portal for current admission information.',officialUrl:'https://www.sgsits.ac.in/academics-1'
  },
  research:{
    eyebrow:'Research & PhD Scholars',title:'Questions become working knowledge.',description:'Discover department supervisors, scholars, publications, projects and consultancy across systems, software, networks, data and intelligent computing.',
    area1Title:'AI, data & intelligent systems',area1Description:'Research and projects that turn data into useful, responsible computing systems.',
    area2Title:'Networks, security & distributed systems',area2Description:'Resilient connected systems, secure communication and modern infrastructure.',
    area3Title:'Software systems & engineering',area3Description:'Methods, tools and architectures for dependable real-world software.',
    publicationsTitle:'Publications & papers',publicationsDescription:'Research outputs and publication records.',projectsTitle:'Patents & projects',projectsDescription:'Projects and intellectual property.',laboratoriesTitle:'Laboratories',laboratoriesDescription:'Research and learning spaces.'
  },
  events:{eyebrow:'Department life',title:'Events & Activities',description:'Explore workshops, seminars, conferences, technical activities and student events from SGSITS Computer Engineering.',sectionTitle:'Department calendar',sectionLabel:'Published events'},
  placements:{eyebrow:'Training & Placement Office',title:'Past Placements',description:'Browse official placement records by academic year. Each entry opens the administrator-published sheet in a new tab.',sectionLabel:'CE outcomes',sectionTitle:'From the classroom to professional impact.',sectionDescription:'Access verified, year-wise placement records published by the department administrator and opened directly in their original sheets.'}
};

const pageSettingsSchema=new mongoose.Schema({
  page:{type:String,required:true,unique:true,enum:Object.keys(pageSettingsDefaults),immutable:true},
  values:{type:Map,of:String,required:true},
  updatedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}
},{timestamps:true});

export const PageSettings=mongoose.model('PageSettings',pageSettingsSchema);
