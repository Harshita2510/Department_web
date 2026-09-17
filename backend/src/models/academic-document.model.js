import mongoose from 'mongoose';

const academicAssetSchema=new mongoose.Schema({
  provider:{type:String,enum:['cloudinary'],default:'cloudinary'},publicId:{type:String,required:true},resourceType:{type:String,enum:['image'],default:'image'},
  url:{type:String,required:true},name:{type:String,required:true},mimeType:{type:String,enum:['application/pdf','image/jpeg','image/png','image/webp'],required:true},
  size:{type:Number,required:true},width:Number,height:Number,format:String
},{_id:false});
const timetableSlotSchema=new mongoose.Schema({
  asset:{type:academicAssetSchema,default:null},status:{type:String,enum:['missing','draft','submitted','published','changes_requested'],default:'missing'},
  uploadedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},approvedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},submittedAt:Date,publishedAt:Date
},{_id:false});
const timetableFilesSchema=new mongoose.Schema({
  classTable:{type:timetableSlotSchema,default:()=>({})},mst1:{type:timetableSlotSchema,default:()=>({})},mst2:{type:timetableSlotSchema,default:()=>({})},mst3:{type:timetableSlotSchema,default:()=>({})},endSemester:{type:timetableSlotSchema,default:()=>({})}
},{_id:false});

const academicDocumentSchema = new mongoose.Schema({
  resourceType: { type:String, enum:['syllabus','timetable','academic-calendar'], required:true, index:true },
  programme: { type:String, enum:['ug-cse','pg-cse','institute-wide'], required:true },
  semester: { type:Number, min:1, max:8, default:null },
  academicYear: { type:String, match:/^\d{4}-\d{2}$/, default:null },
  term: { type:String, enum:['odd','even','annual'], default:null },
  title: { type:String, required:true, trim:true, maxlength:200 },
  documentUrl: { type:String, default:'' },
  editors:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
  timetableFiles:{type:timetableFilesSchema,default:()=>({})},
  status: { type:String, enum:['draft','published'], default:'draft', index:true },
  isCurrent: { type:Boolean, default:false, index:true },
  createdBy: { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  updatedBy: { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  publishedAt: Date
}, { timestamps:true });

academicDocumentSchema.index({ resourceType:1, programme:1, semester:1, academicYear:1, term:1 }, { unique:true });
academicDocumentSchema.index({ resourceType:1, status:1, isCurrent:-1, academicYear:-1, term:1 });

academicDocumentSchema.pre('validate', function validateShape(next) {
  const isCalendar=this.resourceType==='academic-calendar';
  if(isCalendar&&(this.programme!=='institute-wide'||this.semester!==null))return next(new Error('Academic calendars must be institute-wide without a semester number'));
  if(!isCalendar&&(this.programme==='institute-wide'||!this.semester))return next(new Error('Syllabus and timetable records require a programme and semester'));
  next();
});

export const AcademicDocument=mongoose.model('AcademicDocument',academicDocumentSchema);
