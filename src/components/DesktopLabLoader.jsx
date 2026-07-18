import { useEffect, useState } from "preact/hooks";

export default function DesktopLabLoader() {
  const [Lab, setLab] = useState(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 900px)");
    let cancelled = false;

    const loadForDesktop = async () => {
      if (!media.matches || Lab) return;
      const module = await import("./CounterfactualLab.jsx");
      if (!cancelled) setLab(() => module.default);
    };

    loadForDesktop();
    media.addEventListener?.("change", loadForDesktop);
    return () => {
      cancelled = true;
      media.removeEventListener?.("change", loadForDesktop);
    };
  }, [Lab]);

  if (!Lab) {
    return (
      <div class="lab-loader" aria-live="polite">
        <span />
        <p>Calibrating counterfactual instrument…</p>
      </div>
    );
  }

  return <Lab />;
}
