/**
 * api/models/NyayCaseLog.js
 *
 * MongoDB model for the NyayAI case registry.
 * Replaces the flat _log.yaml file that previously lived on the workspace volume.
 *
 * One document per case per firm (identified by companySlug + slug).
 * All advocates at the firm share the same registry.
 */

const mongoose = require('mongoose');

const NyayCaseLogSchema = new mongoose.Schema(
  {
    // Firm / user ownership
    companySlug: { type: String, required: true, index: true },
    createdBy:   { type: String, required: true },          // LibreChat user _id (string)

    // Case identity
    slug:        { type: String, required: true },
    causeTitle:  { type: String, default: '' },
    client:      { type: String, default: '' },
    caseType:    { type: String, default: '' },
    role:        { type: String, default: '' },             // petitioner/respondent/etc.
    court:       { type: String, default: '' },
    caseNumber:  { type: String, default: '' },

    // Status
    status:      {
      type: String,
      enum: ['pre-litigation', 'active', 'execution', 'appeal', 'closed'],
      default: 'active',
    },
    stage:       { type: String, default: '' },

    // Risk & materiality
    risk:        {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'pending'],
      default: 'pending',
    },
    materiality: { type: String, default: 'none' },
    exposureRange: { type: String, default: '' },

    // Limitation
    limitation: {
      causeOfActionDate: { type: String, default: '' },
      cutoffDate:        { type: String, default: '' },
      urgency:           { type: String, default: 'monitor' },
      condOnationNeeded: { type: Boolean, default: false },
    },

    // Outside advocate
    outsideAdvocate: {
      firm:          { type: String, default: '' },
      lead:          { type: String, default: '' },
      email:         { type: String, default: '' },
      vakalatnama:   { type: String, default: 'pending' },
    },

    // Legal hold
    legalHold: {
      issued:      { type: Boolean, default: false },
      issuedDate:  { type: String, default: '' },
      released:    { type: String, default: null },
    },

    // Scheduling
    nextHearing:  { type: String, default: '' },
    nextDeadline: { type: String, default: '' },

    // Closure (populated when status=closed)
    closed:     { type: String, default: null },   // YYYY-MM-DD
    outcome:    { type: String, default: null },
    finalCost:  { type: String, default: null },

    // Free-form extra fields the skill may write
    extra: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  },
);

// One case slug per firm
NyayCaseLogSchema.index({ companySlug: 1, slug: 1 }, { unique: true });
// Active portfolio queries
NyayCaseLogSchema.index({ companySlug: 1, status: 1 });

const NyayCaseLog =
  mongoose.models.NyayCaseLog || mongoose.model('NyayCaseLog', NyayCaseLogSchema);

module.exports = NyayCaseLog;
