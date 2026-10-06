import mongoose from 'mongoose';

export const homepageDefaults={
  heroEyebrow:'Welcome',
  heroTitle:'Overview & Academic Mission',
  heroOverview:'Established in the year 1983, the Department of Computer Engineering is a pioneer in its field within Madhya Pradesh and Central India, offering undergraduate, postgraduate, and recognized Ph.D. programs under QIP. The department envisions itself as a premier center of education, research, and development for the advancement of knowledge in Computer Engineering to best serve the needs of students, industry, and society. With a foundational strength built on service, honesty, and quality, it aims to achieve its academic mission through the total commitment and cooperative involvement of its highly qualified, experienced, and enthusiastic faculty, staff, and students.',
  highlights:[
    {value:'8',label:'UG semesters'},
    {value:'4',label:'PG semesters'},
    {value:'1983',label:'Established'}
  ],
  imageCaptionTitle:'Computer Engineering Department',
  imageCaptionSubtitle:'SGSITS, Indore · Official photograph',
  departmentPhone:'+91 94250 32185',
  departmentEmail:'hodcse@sgsits.ac.in',
  visionHeading:'Computing excellence.',
  visionText:'To become a centre of excellence for creating competent human resource in the field of Computer Engineering meeting the dynamic societal and industrial needs.',
  missionHeading:'Our mission',
  missionItems:[
    'To produce technically competent professionals in Computer Engineering having a blend of theoretical knowledge and practical skills.',
    'To encourage innovation, research and analytical activities with professional ethics and responsibilities through quality education.',
    'To provide learning ambience in collaboration with industries to keep pace with dynamic technological advancements and promote spirit of entrepreneurship.',
    'To motivate students to apply knowledge to resolve societal and environmental challenges and engage in continuous learning towards sustainable development.'
  ],
  programOutcomes:[
    {code:'PO1',title:'Engineering knowledge',description:'Apply knowledge of mathematics and science with fundamentals of Computer Engineering to be able to solve complex engineering problems related to CE.'},
    {code:'PO2',title:'Problem analysis',description:'Identify, formulate, review research literature and analyze complex engineering problems related to CE and reach substantiated conclusions using first principles of mathematics, natural sciences and engineering sciences.'},
    {code:'PO3',title:'Design/Development of solutions',description:'Design solutions for complex engineering problems related to CE and design system components or processes that meet the specified needs with appropriate consideration for public health and safety and cultural, societal and environmental considerations.'},
    {code:'PO4',title:'Conduct investigations of complex problems',description:'Use research-based knowledge and research methods including design of experiments, analysis and interpretation of data, and synthesis of the information to provide valid conclusions.'},
    {code:'PO5',title:'Modern tool usage',description:'Create, select and apply appropriate techniques, resources and modern engineering and IT tools including prediction and modeling to computer engineering related complex engineering activities with an understanding of the limitations.'},
    {code:'PO6',title:'The engineer and society',description:'Apply reasoning informed by contextual knowledge to assess societal, health, safety, legal and cultural issues and the consequent responsibilities relevant to CE professional engineering practice.'},
    {code:'PO7',title:'Environment and sustainability',description:'Understand the impact of CE professional engineering solutions in societal and environmental contexts and demonstrate the knowledge of, and need for, sustainable development.'},
    {code:'PO8',title:'Ethics',description:'Apply ethical principles and commit to professional ethics and responsibilities and norms of engineering practice.'},
    {code:'PO9',title:'Individual and team work',description:'Function effectively as an individual and as a member or leader in diverse teams and in multi-disciplinary settings.'},
    {code:'PO10',title:'Communication',description:'Communicate effectively on complex engineering activities with the engineering community and society at large, including being able to comprehend and write effective reports and design documentation, make effective presentations, and give and receive clear instructions.'},
    {code:'PO11',title:'Project management and finance',description:'Demonstrate knowledge and understanding of engineering management principles and apply these to one’s own work, as a member and leader in a team, to manage projects and in multi-disciplinary environments.'},
    {code:'PO12',title:'Life-long learning',description:'Recognize the need for and have the preparation and ability to engage in independent and life-long learning in the broadest context of technological change.'}
  ]
};

const highlightSchema=new mongoose.Schema({value:{type:String,required:true,trim:true},label:{type:String,required:true,trim:true}},{_id:false});
const programOutcomeSchema=new mongoose.Schema({code:{type:String,required:true,trim:true},title:{type:String,required:true,trim:true},description:{type:String,required:true,trim:true}},{_id:false});
const homepageSettingsSchema=new mongoose.Schema({
  key:{type:String,default:'homepage',unique:true,immutable:true},
  heroEyebrow:{type:String,required:true,trim:true},heroTitle:{type:String,required:true,trim:true},heroOverview:{type:String,required:true,trim:true},
  highlights:{type:[highlightSchema],required:true},
  imageCaptionTitle:{type:String,required:true,trim:true},imageCaptionSubtitle:{type:String,required:true,trim:true},
  departmentPhone:{type:String,required:true,trim:true},departmentEmail:{type:String,required:true,trim:true,lowercase:true},
  visionHeading:{type:String,required:true,trim:true},visionText:{type:String,required:true,trim:true},
  missionHeading:{type:String,required:true,trim:true},missionItems:{type:[String],required:true},
  programOutcomes:{type:[programOutcomeSchema],required:true},
  updatedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}
},{timestamps:true});

export const HomepageSettings=mongoose.model('HomepageSettings',homepageSettingsSchema);
