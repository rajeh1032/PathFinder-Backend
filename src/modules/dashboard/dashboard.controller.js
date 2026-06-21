const asyncHandler = require('../../common/utils/asyncHandler');
const { sendSuccess } = require('../../common/utils/apiResponse');
const dashboardService = require('./dashboard.service');

const getOverview = asyncHandler(async (req, res) => {
  const overview = await dashboardService.getOverview();

  return sendSuccess(res, overview, 'Dashboard overview fetched successfully');
});

module.exports = {
  getOverview,
};
