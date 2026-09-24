import mongoose from 'mongoose';

const profileFields = {
  title: String, fullName: String, designation: String, department: String, email: String,
  phone: String, office: String, officeHours: String, bio: String, photoUrl: String, photoPublicId: String,
  highestQualification: String, areaOfSpecialisation: String,
  scholarUrl: String, orcidUrl: String, linkedinUrl: String, websiteUrl: String,
  qualifications: [String], researchInterests: [String], coursesTaught: [String],
  experienceYears: Number, scholarsSupervised: Number, researchSummary: String,
  publications: [{ title: String, year: Number, type: String, venue: String, url: String }],
  achievements: [{ title: String, year: Number, category: String, description: String }]
};

const facultyProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  facultyId: { type: String, required: true, uppercase: true, unique: true, index: true },
  draft: { type: profileFields, default: {} },
  approvedSnapshot: { type: profileFields, default: null },
  reviewStatus: { type: String, enum: ['draft', 'submitted', 'approved', 'changes_requested'], default: 'draft', index: true },
  submittedAt: Date, reviewedAt: Date, publishedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, minimize: false });

facultyProfileSchema.index({ 'draft.department': 1, reviewStatus: 1 });
export const FacultyProfile = mongoose.model('FacultyProfile', facultyProfileSchema);
