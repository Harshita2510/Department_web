import mongoose from 'mongoose';
import { PUBLICATION_STATUS } from '../constants/roles.js';

const placementDocumentSchema=new mongoose.Schema({
  provider:{type:String,enum:['cloudinary'],default:'cloudinary'},
  publicId:{type:String,required:true},resourceType:{type:String,enum:['image'],default:'image'},
  url:{type:String,required:true},name:{type:String,required:true},mimeType:{type:String,enum:['application/pdf'],required:true},
  size:{type:Number,required:true},format:String
},{_id:false});

const placementSchema = new mongoose.Schema({
  academicYear: { type: String, required: true, unique: true, match: /^\d{4}-\d{2}$/ },
  sourceType:{type:String,enum:['link','pdf'],default:'link'},
  sheetUrl: { type: String, default:'' },
  document:{type:placementDocumentSchema,default:null},
  status: { type: String, enum: PUBLICATION_STATUS, default: 'draft', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publishedAt: Date
}, { timestamps: true });

placementSchema.index({ status: 1, academicYear: -1 });
export const Placement = mongoose.model('Placement', placementSchema);
