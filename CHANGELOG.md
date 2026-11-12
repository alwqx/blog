# Changelog

## Unreleased

### Fixed

- Verify pending draft updates before advancing synchronization fingerprints, retry unapplied updates, and preserve conflicting remote edits.
- Distinguish token acquisition failures from uncertain draft writes so authentication failures do not leave blocked creation journals.
- Validate preview article IDs and confine automatic output paths, including existing directory symlinks.
- Resolve site-root, email, and telephone links without treating them as local Markdown files, and preserve table column alignment.
- Skip Markdown notes without front matter and keep unrelated incomplete article metadata from blocking explicitly selected articles.

### Added

- Add a local Node.js CLI to preview Markdown articles and create or update WeChat Official Account drafts, with explicit article opt-in and manual publication in WeChat.
- Convert, compress, upload, and cache article images and covers, and use Hugo's generated article URLs for source links.
- Persist draft mappings and operation journals to avoid duplicate drafts, protect manual edits, and recover uncertain API results.
- Migrate the custom mdnice `wechat-format` theme from commit `6fb9ed2cd2aee57e6d9683cd0fd07461f4b5ee79`, with global, article, and command-line theme selection.
- Document local credentials, IP allowlisting, preview and sync commands, draft recovery, and theme attribution.
