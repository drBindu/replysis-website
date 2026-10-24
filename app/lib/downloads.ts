// Where each app is downloaded from. Shared by the home page and /start.
//
// The Microsoft Store listing, not a file on this site: installs with no security warning and updates itself.
export const WINDOWS_DOWNLOAD = "https://apps.microsoft.com/detail/9N13GQC3MKK9";
// Signed with Azure Trusted Signing, so no SmartScreen warning. Bump this URL's version alongside every new
// signed release: it stays pinned rather than tracking "latest" so an unsigned build can never start
// showing the warning without anyone deciding that.
export const WINDOWS_DIRECT_DOWNLOAD = "https://github.com/drBindu/replysis-windows/releases/download/v1.0.51/Replysis-win-Setup.exe";
export const MAC_DOWNLOAD = "https://github.com/drBindu/replysis-mac/releases/latest/download/InterviewCopilot-mac.dmg";
