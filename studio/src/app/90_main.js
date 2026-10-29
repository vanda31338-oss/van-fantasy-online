// Boot: draw something at once, then capabilities, catalog, channels, projects.
(function () {
  const App = window.App;
  async function boot() {
    // frame 0 right away: the desert scene from the example, no network needed
    try {
      const cv = App.$('#bootCanvas'); const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
      const s = LSE.SAMPLE.scenes[1]; const built = LSE.Scene.build(Object.assign({ id: s.id, name: s.name }, s.spec), { palette: LSE.SAMPLE.palette });
      const draw = (now) => { if (!cv.isConnected) return; App.drawScenePreview(ctx, built, now / 1000); requestAnimationFrame(draw); }; requestAnimationFrame(draw);
    } catch (e) { /* splash is decoration */ }
    App.$('#brand').onclick = () => { App.st.view = 'home'; App.st.project = null; App.st.pid = null; App.loadProjects().then(App.render); };
    App.$('#gear').onclick = () => App.openSettings();
    App.$('#chChip').onclick = () => App.openSettings();
    App.$('#jobChip').onclick = () => App.toast('พิมพ์ "ทำงานค้าง" ในแชต Claude Code เพื่อให้ทำงานที่รออยู่', 'warn');
    const fonts = LSE.loadFonts();
    try { await App.initCaps(); } catch (e) { /* treated as absent */ }
    App.renderNotice();
    try { await LSE.LPC.load('lpc/'); } catch (e) { App.toast(App.errText(e), 'err'); }
    await Promise.all([App.loadChannels(), App.loadProjects(), App.loadLibrary(), fonts]);
    App.watchJobs();
    App.render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
