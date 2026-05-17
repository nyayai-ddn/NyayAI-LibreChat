/**
 * api/server/routes/internal/nyayCaseLog.js
 *
 * Internal CRUD routes for the NyayAI case registry (NyayCaseLog collection).
 * Replaces the _log.yaml flat file that previously lived on the workspace volume.
 *
 * Protected by NYAY_SERVICE_KEY.
 *
 * GET  /api/internal/nyay-case-log
 *   ?company_slug=<slug>   required
 *   [&status=active]       optional filter
 *   Returns: { cases: [...] }
 *
 * GET  /api/internal/nyay-case-log/:slug
 *   ?company_slug=<slug>   required
 *   Returns: { case: {...} } or 404
 *
 * POST /api/internal/nyay-case-log
 *   Body: { company_slug, created_by, slug, ...fields }
 *   Creates or fully replaces the case row. Returns: { case: {...} }
 *
 * PATCH /api/internal/nyay-case-log/:slug
 *   ?company_slug=<slug>   required
 *   Body: { ...partial fields }
 *   Updates only supplied fields. Returns: { case: {...} }
 */

const express     = require('express');
const NyayCaseLog = require('~/models/NyayCaseLog');

function requireServiceKey(req, res, next) {
  const serviceKey = process.env.NYAY_SERVICE_KEY;
  if (!serviceKey) {
    return res.status(503).json({ error: 'NYAY_SERVICE_KEY not configured on server.' });
  }
  const provided = req.headers['x-nyay-service-key'];
  if (!provided || provided !== serviceKey) {
    return res.status(401).json({ error: 'Invalid or missing service key.' });
  }
  next();
}

module.exports = function createNyayCaseLogRouter() {
  const router = express.Router();
  router.use(requireServiceKey);

  // ── GET /nyay-case-log ─────────────────────────────────────────────────────
  router.get('/nyay-case-log', async (req, res) => {
    try {
      const { company_slug, status } = req.query;
      if (!company_slug) return res.status(400).json({ error: 'company_slug is required.' });

      const filter = { companySlug: company_slug };
      if (status) filter.status = status;

      const cases = await NyayCaseLog.find(filter)
        .sort({ updatedAt: -1 })
        .lean();

      return res.status(200).json({ cases });
    } catch (err) {
      console.error('[nyayCaseLog] GET list error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── GET /nyay-case-log/:slug ───────────────────────────────────────────────
  router.get('/nyay-case-log/:slug', async (req, res) => {
    try {
      const { company_slug } = req.query;
      if (!company_slug) return res.status(400).json({ error: 'company_slug is required.' });

      const doc = await NyayCaseLog.findOne({
        companySlug: company_slug,
        slug:        req.params.slug,
      }).lean();

      if (!doc) return res.status(404).json({ error: `Case not found: ${req.params.slug}` });
      return res.status(200).json({ case: doc });
    } catch (err) {
      console.error('[nyayCaseLog] GET single error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /nyay-case-log ────────────────────────────────────────────────────
  router.post('/nyay-case-log', async (req, res) => {
    try {
      const { company_slug, created_by, slug } = req.body;
      if (!company_slug || !created_by || !slug) {
        return res.status(400).json({ error: 'company_slug, created_by, and slug are required.' });
      }

      const fields = _sanitiseFields(req.body);

      const doc = await NyayCaseLog.findOneAndUpdate(
        { companySlug: company_slug, slug },
        { $set: { ...fields, companySlug: company_slug, createdBy: created_by, slug } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean();

      return res.status(201).json({ case: doc });
    } catch (err) {
      console.error('[nyayCaseLog] POST error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── PATCH /nyay-case-log/:slug ─────────────────────────────────────────────
  router.patch('/nyay-case-log/:slug', async (req, res) => {
    try {
      const { company_slug } = req.query;
      if (!company_slug) return res.status(400).json({ error: 'company_slug is required.' });

      const fields = _sanitiseFields(req.body);
      const doc = await NyayCaseLog.findOneAndUpdate(
        { companySlug: company_slug, slug: req.params.slug },
        { $set: fields },
        { new: true },
      ).lean();

      if (!doc) return res.status(404).json({ error: `Case not found: ${req.params.slug}` });
      return res.status(200).json({ case: doc });
    } catch (err) {
      console.error('[nyayCaseLog] PATCH error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
};

// Strip read-only / internal fields from a write payload
function _sanitiseFields(body) {
  const { company_slug, created_by, _id, __v, createdAt, updatedAt, ...rest } = body; // eslint-disable-line no-unused-vars
  // Map snake_case keys from the Python backend to camelCase schema fields
  const mapped = {};
  const keyMap = {
    cause_title:       'causeTitle',
    case_type:         'caseType',
    case_number:       'caseNumber',
    exposure_range:    'exposureRange',
    next_hearing:      'nextHearing',
    next_deadline:     'nextDeadline',
    final_cost:        'finalCost',
    outside_advocate:  'outsideAdvocate',
    legal_hold:        'legalHold',
    created_by:        'createdBy',
    company_slug:      'companySlug',
  };
  for (const [k, v] of Object.entries(rest)) {
    mapped[keyMap[k] ?? k] = v;
  }
  return mapped;
}
