import mongoose from 'mongoose';

const paperAssetSchema=new mongoose.Schema({
  provider:{type:String,enum:['cloudinary'],default:'cloudinary'},publicId:{type:String,required:true},resourceType:{type:String,enum:['image'],default:'image'},
  url:{type:String,required:true},name:{type:String,required:true},mimeType:{type:String,enum:['application/pdf'],required:true},size:{type:Number,required:true},format:String
},{_id:false});

const questionPaperSchema=new mongoose.Schema({
  programme:{type:String,enum:['ug-cse','pg-cse'],required:true,index:true},
  semester:{type:Number,min:1,max:8,required:true,index:true},
  subjectCode:{type:String,trim:true,uppercase:true,maxlength:30,default:''},
  subjectName:{type:String,trim:true,maxlength:160,required:true},
  examType:{type:String,enum:['mid-sem','end-sem'],required:true,index:true},
  academicYear:{type:String,match:/^\d{4}-\d{2}$/,required:true,index:true},
  asset:{type:paperAssetSchema,default:null},
  status:{type:String,enum:['draft','published'],default:'draft',index:true},
  createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  updatedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  publishedAt:Date
},{timestamps:true});

questionPaperSchema.index({programme:1,semester:1,subjectCode:1,subjectName:1,examType:1,academicYear:1},{unique:true});
questionPaperSchema.index({status:1,programme:1,semester:1,subjectName:1,academicYear:-1});
questionPaperSchema.pre('validate',function validateProgramme(next){
  if(this.programme==='pg-cse'&&this.semester>4)return next(new Error('PG CE has only four semesters'));
  const [start,end]=String(this.academicYear||'').split('-').map(Number);
  if(Number.isFinite(start)&&Number.isFinite(end)&&end!==(start+1)%100)return next(new Error('Academic year must contain consecutive years'));
  next();
});

export const QuestionPaper=mongoose.model('QuestionPaper',questionPaperSchema);
