import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ofstedSchoolSchema = new Schema(
  {
    urn: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    phase: { type: String },
    schoolType: { type: String },
    localAuthority: { type: String, index: true },
    region: { type: String },
    postcode: { type: String },
    matUid: { type: String, index: true },
    matName: { type: String },
    overallEffectiveness: { type: Number, min: 1, max: 4 },
    qualityOfEducation: { type: Number, min: 1, max: 4 },
    behaviourAndAttitudes: { type: Number, min: 1, max: 4 },
    personalDevelopment: { type: Number, min: 1, max: 4 },
    leadershipAndManagement: { type: Number, min: 1, max: 4 },
    safeguarding: { type: String },
    inspectionDate: { type: Date },
    publicationDate: { type: Date },
    inspectionType: { type: String },
    reportUrl: { type: String },
    previousOverallEffectiveness: { type: Number, min: 1, max: 4 },
    previousInspectionDate: { type: Date },
    idaciQuintile: { type: Number, min: 1, max: 5 },
    totalPupils: { type: Number },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
      index: true,
    },
  },
  { timestamps: true }
);

ofstedSchoolSchema.index({ overallEffectiveness: 1 });
ofstedSchoolSchema.index({ qualityOfEducation: 1 });

export type IOfstedSchool = InferSchemaType<typeof ofstedSchoolSchema>;

const OfstedSchool =
  mongoose.models.OfstedSchool ||
  mongoose.model("OfstedSchool", ofstedSchoolSchema);

export default OfstedSchool;
