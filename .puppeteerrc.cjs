// Skip Chromium download. The ERD generator (prisma-erd-generator) outputs Markdown
// (docs/ERD.md), which renders Mermaid WITHOUT Chromium — so the download is unnecessary
// and is skipped to keep installs fast and the Docker build safe. To switch ERD output to
// .svg/.png later, set skipDownload to false (or remove this file) and reinstall.
module.exports = { skipDownload: true };
