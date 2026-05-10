import Script from "next/script";

const script = `
(() => {
  try {
    const key = "zhizhi.theme";
    const stored = window.localStorage.getItem(key);
    const theme = stored === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
`;

export function ThemeScript() {
  return <Script id="zhizhi-theme-script" dangerouslySetInnerHTML={{ __html: script }} />;
}
