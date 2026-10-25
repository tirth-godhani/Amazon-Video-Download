# Privacy Policy for Amazon Video Saver

**Last Updated:** October 2026

## 1. Overview
Amazon Video Saver is a browser extension designed to help users download product videos from Amazon listing pages for offline personal reference.

## 2. Information Collection and Use
Amazon Video Saver **does not collect, transmit, store, or sell any personal information or browsing history**.

- **No Remote Servers:** The extension communicates exclusively between the user's browser, local storage, and the Amazon pages the user visits.
- **Local Storage:** The extension only uses local browser storage (`chrome.storage.local`) to persist user interface preferences (such as preferred video quality).
- **Download Management:** Video files are downloaded directly from Amazon's media CDN to the user's local disk via the standard browser `chrome.downloads` API.
- **No Analytics / Telemetry:** There are no analytics libraries, third-party trackers, or monitoring services embedded in the extension.

## 3. Permissions Justification
- **activeTab:** Used to inspect media elements and inject the download button on the currently active Amazon product page.
- **downloads:** Used to save video files directly to the user's Downloads folder.
- **storage:** Used to save user preferences locally.
- **offscreen:** Used for media stream processing in compliance with Chrome Manifest V3 guidelines.
- **Host Permissions:** Restricted strictly to official Amazon product domains and Amazon content delivery networks (e.g. `m.media-amazon.com`).

## 4. Contact
For questions or inquiries regarding this privacy policy, open an issue in the project repository.
