import mongoose, { Schema, type InferSchemaType } from "mongoose";

const dataSourceSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    orgType: {
      type: String,
      required: true,
      enum: [
        "local_council_london",
        "local_council_metro",
        "local_council_county",
        "local_council_unitary",
        "local_council_district",
        "local_council_sui_generis",
        "nhs_trust_acute",
        "nhs_trust_mental_health",
        "nhs_trust_community",
        "nhs_trust_ambulance",
        "nhs_icb",
        "fire_rescue",
        "police_pcc",
        "combined_authority",
        "national_park",
        "mat",
        "university",
        "fe_college",
        "alb",
      ],
    },
    region: { type: String },
    democracyPortalUrl: { type: String },
    boardPapersUrl: { type: String },
    platform: {
      type: String,
      enum: ["ModernGov", "CMIS", "Custom", "Jadu", "None"],
    },
    website: { type: String },
    parentOrg: { type: String },
    tier: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "abolished", "merged"],
      default: "active",
    },
    successorOrg: { type: String },
  },
  { timestamps: true }
);

export type IDataSource = InferSchemaType<typeof dataSourceSchema>;

const DataSource =
  mongoose.models.DataSource ||
  mongoose.model("DataSource", dataSourceSchema);

export default DataSource;
