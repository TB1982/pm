// i18n-shared.js — VAS 系列頁面共用翻譯 + 下拉選單邏輯
// 載入順序：此檔必須在各頁的 i18n-xxx.js 之前載入

window.VASShared = (function () {

  // ── 共用翻譯資料 ─────────────────────────────────────────────
  var sharedT = {
    zh: {
      footer: '由 GitHub 部署　｜　Claude Code 傾力打造　｜　<a href="mailto:babelon1882@gmail.com" class="hover:text-white/50 transition-colors">Nova</a> 最後更新於 2026',
      privacyLink: '隱私權政策',
      navGuide: '操作手冊', navGuideShort: '操作',
      navInsight: '設計洞察', navInsightShort: '設計',
      navMilestone: '里程碑',  navMilestoneShort: '里程碑'
    },
    en: {
      footer: 'Deployed via GitHub　｜　Built with Claude Code　｜　Last updated 2026 by <a href="mailto:babelon1882@gmail.com" class="hover:text-white/50 transition-colors">Nova</a>',
      privacyLink: 'Privacy Policy',
      navGuide: 'User Guide',      navGuideShort: 'Guide',
      navInsight: 'Design Insights', navInsightShort: 'Insights',
      navMilestone: 'Milestones',  navMilestoneShort: 'Milestone'
    },
    ja: {
      footer: 'GitHub でデプロイ　｜　Claude Code で構築　｜　2026年 <a href="mailto:babelon1882@gmail.com" class="hover:text-white/50 transition-colors">Nova</a> 最終更新',
      privacyLink: 'プライバシーポリシー',
      navGuide: '操作マニュアル', navGuideShort: '操作',
      navInsight: 'デザインの洞察', navInsightShort: '洞察',
      navMilestone: 'マイルストーン', navMilestoneShort: 'マイル'
    }
  };

  var labelMap = { zh: '中', en: 'EN', ja: '日' };

  // ── 下拉選單 UI 更新 ─────────────────────────────────────────
  function updateDropdown(lang) {
    var label = document.getElementById('langDropdownLabel');
    if (label) label.textContent = labelMap[lang] || lang;
    document.querySelectorAll('.lang-opt').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }

  // ── 下拉選單事件綁定 + 語言恢復 ─────────────────────────────
  // applyFn(lang) 由各頁自行提供
  function initDropdown(applyFn) {
    var btn  = document.getElementById('langDropdownBtn');
    var menu = document.getElementById('langDropdownMenu');
    if (!btn || !menu) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !menu.classList.contains('open');
      menu.classList.toggle('open', willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    });

    document.querySelectorAll('.lang-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        applyFn(opt.dataset.lang);
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', function () {
      if (menu.classList.contains('open')) {
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    // 恢復上次語言選擇
    try {
      var saved = localStorage.getItem('vasLang');
      if (saved && labelMap[saved]) applyFn(saved);
    } catch (e) {}
  }

  return { sharedT: sharedT, initDropdown: initDropdown, updateDropdown: updateDropdown };

})();
