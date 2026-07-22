/** @type {import('puppeteer').Configuration} */
module.exports = {
  skipDownload: !!process.env.PUPPETEER_SKIP_DOWNLOAD,
};
