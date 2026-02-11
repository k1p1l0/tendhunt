import mongoose, { Schema, type InferSchemaType } from "mongoose";

const companyProfileSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true }, // Clerk user ID
    companyName: { type: String, default: "" },
    website: { type: String, default: "" },
    address: { type: String, default: "" },
    linkedinUrl: { type: String, default: "" },
    summary: { type: String, default: "" },
    sectors: [{ type: String }],
    capabilities: [{ type: String }],
    keywords: [{ type: String }],
    certifications: [{ type: String }],
    idealContractDescription: { type: String, default: "" },
    companySize: { type: String, default: "" },
    regions: [{ type: String }],
    // Document references (R2 object keys)
    documentKeys: [{ type: String }],
    // AI generation metadata
    generatedAt: { type: Date },
    lastEditedAt: { type: Date },
    isAIGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type ICompanyProfile = InferSchemaType<typeof companyProfileSchema>;

const CompanyProfile =
  mongoose.models.CompanyProfile ||
  mongoose.model("CompanyProfile", companyProfileSchema);

export default CompanyProfile;
