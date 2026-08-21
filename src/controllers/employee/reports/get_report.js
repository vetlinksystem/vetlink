const generateReport = require('../../../models/employee/reports/generate_report');

// Named periods the page offers, so a report can be produced with no manual date entry.
const PRESETS = [
  'this-month', 'last-month', 'this-quarter', 'this-year', 'last-12-months', 'all-time'
];

const iso = (d) => d.toISOString().slice(0, 10);

/**
 * Turn a preset name into a {from, to} range. Uses UTC throughout so the range does
 * not shift with the server's timezone.
 */
const resolvePreset = (preset, now = new Date()) => {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const startOfMonth = (yy, mm) => new Date(Date.UTC(yy, mm, 1));
  const endOfMonth = (yy, mm) => new Date(Date.UTC(yy, mm + 1, 0));

  switch (preset) {
    case 'last-month':
      return { from: iso(startOfMonth(y, m - 1)), to: iso(endOfMonth(y, m - 1)) };
    case 'this-quarter': {
      const q = Math.floor(m / 3) * 3;
      return { from: iso(startOfMonth(y, q)), to: iso(endOfMonth(y, q + 2)) };
    }
    case 'this-year':
      return { from: iso(startOfMonth(y, 0)), to: iso(endOfMonth(y, 11)) };
    case 'last-12-months':
      return { from: iso(startOfMonth(y, m - 11)), to: iso(endOfMonth(y, m)) };
    case 'all-time':
      // Wide enough to cover every record the clinic will ever hold.
      return { from: '2000-01-01', to: iso(endOfMonth(y, m)) };
    case 'this-month':
    default:
      return { from: iso(startOfMonth(y, m)), to: iso(endOfMonth(y, m)) };
  }
};

// GET /employee/reports/data?preset=this-month
// GET /employee/reports/data?from=2026-07-01&to=2026-07-31
const getReportController = async (req, res) => {
  try {
    const q = req.query || {};
    let from = String(q.from || '').trim();
    let to = String(q.to || '').trim();

    // A custom range wins; otherwise fall back to a preset so the page can load a
    // report with no input at all.
    if (!from || !to) {
      const preset = PRESETS.includes(String(q.preset)) ? String(q.preset) : 'this-month';
      ({ from, to } = resolvePreset(preset));
    }

    const result = await generateReport({ from, to });
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('Error generating clinic report:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while generating the report.',
      error: error.message
    });
  }
};

module.exports = getReportController;
module.exports.resolvePreset = resolvePreset;
module.exports.PRESETS = PRESETS;
