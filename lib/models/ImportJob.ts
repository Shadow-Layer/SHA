import mongoose, { Schema } from "mongoose";

const ImportJobSchema = new Schema(
  {
    sourceFileName: { type: String },
    batchId: { type: String },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    totalRows: { type: Number },
    successfulRows: { type: Number },
    failedRows: { type: Number },
    notes: { type: String },
  },
  { timestamps: true },
);

const ImportJob = mongoose.models.ImportJob || mongoose.model("ImportJob", ImportJobSchema);

export default ImportJob;
