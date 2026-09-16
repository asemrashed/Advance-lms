/** Same-origin download helper used by student course + resource pages. */
export function triggerBrowserDownload(url: string, fileName?: string) {
  const link = document.createElement("a");
  link.href = url;
  if (fileName) link.download = fileName;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
