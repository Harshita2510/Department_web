import mongoose from 'mongoose';

const syllabusAssetSchema = new mongoose.Schema({
  provider: { type:String, enum:['cloudinary'], default:'cloudinary' },
  publicId: { type:String, required:true },
  resourceType: { type:String, enum:['image'], default:'image' },
  url: { type:String, required:true },
  name: { type:String, required:true },
  mimeType: { type:String, required:true },
  size: { type:Number, required:true },
  width:Number, height:Number, format:String
}, { _id:false });

const academicSubjectSchema = new mongoose.Schema({
  programme: { type:String, enum:['ug-cse','pg-cse'], required:true, index:true },
  semester: { type:Number, min:1, max:8, required:true, index:true },
  subjectCode: { type:String, trim:true, uppercase:true, maxlength:30, default:'' },
  name: { type:String, trim:true, required:true, maxlength:160 },
  normalizedName: { type:String, required:true },
  sortOrder: { type:Number, min:0, max:999, default:0 },
  editors: [{ type:mongoose.Schema.Types.ObjectId, ref:'User' }],
  syllabus: { type:syllabusAssetSchema, default:null },
  syllabusStatus: { type:String, enum:['missing','draft','submitted','published','changes_requested'], default:'missing', index:true },
  uploadedBy: { type:mongoose.Schema.Types.ObjectId, ref:'User' },
  submittedAt:Date, approvedBy:{ type:mongoose.Schema.Types.ObjectId, ref:'User' }, publishedAt:Date,
  active: { type:Boolean, default:true, index:true },
  createdBy: { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  updatedBy: { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true }
}, { timestamps:true });

academicSubjectSchema.index({ programme:1, semester:1, normalizedName:1 }, { unique:true });
academicSubjectSchema.index({ editors:1, active:1 });
academicSubjectSchema.index({ programme:1, semester:1, active:1, sortOrder:1, name:1 });

academicSubjectSchema.pre('validate', function validateProgramme(next) {
  this.normalizedName=this.name.trim().toLowerCase().replace(/\s+/g,' ');
  if(this.programme==='pg-cse'&&this.semester>4)return next(new Error('PG CSE has only four semesters'));
  next();
});

export const AcademicSubject=mongoose.model('AcademicSubject',academicSubjectSchema);
