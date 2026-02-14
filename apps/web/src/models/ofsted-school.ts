import mongoose, { Schema, type InferSchemaType } from "mongoose";

const inspectionEntrySchema = new Schema(
  {
    inspectionNumber: { type: String, required: true },
    inspectionDate: { type: Date, required: true },
    publicationDate: { type: Date },
    inspectionType: { type: String },
    inspectionTypeGrouping: { type: String },
    reportUrl: { type: String },
    overallEffectiveness: { type: Number, min: 1, max: 4 },
    qualityOfEducation: { type: Number, min: 1, max: 4 },
    behaviourAndAttitudes: { type: Number, min: 1, max: 4 },
    personalDevelopment: { type: Number, min: 1, max: 4 },
    leadershipAndManagement: { type: Number, min: 1, max: 4 },
    safeguarding: { type: String },
    earlyYears: { type: Number, min: 1, max: 4 },
    sixthForm: { type: Number, min: 1, max: 4 },
    categoryOfConcern: { type: String },
    era: { type: String, enum: ["pre2019", "2019-2024", "post2024"] },
  },
  { _id: false }
);

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

    inspectionHistory: { type: [inspectionEntrySchema], default: [] },

    lastDowngradeDate: { type: Date },
    ratingDirection: {
      type: String,
      enum: ["improved", "downgraded", "unchanged", null],
    },
    downgradeType: { type: String },

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
ofstedSchoolSchema.index({ lastDowngradeDate: -1 });
ofstedSchoolSchema.index({ ratingDirection: 1 });
ofstedSchoolSchema.index({ "inspectionHistory.inspectionDate": -1 });

export type InspectionEntry = InferSchemaType<typeof inspectionEntrySchema>;
export type IOfstedSchool = InferSchemaType<typeof ofstedSchoolSchema>;

const OfstedSchool =
  mongoose.models.OfstedSchool ||
  mongoose.model("OfstedSchool", ofstedSchoolSchema);

export default OfstedSchool;
