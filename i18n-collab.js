// i18n-collab.js — VAS Collab Notes 頁面翻譯
// 依賴：i18n-shared.js 必須先載入
(function () {
  var pageT = {
    zh: {
      heroTag: 'VAS · 開發協作筆記',
      heroH1: '一行程式碼都不會寫，<br>但我們<span class="gradient-text">做出來了</span>',
      heroTagline: '這不是 Prompt 工程的故事。',
      heroDesc: '這頁記錄的是 VAS 開發途中，Nova 與 Claude 之間協作規則如何從零開始演化。市場上流行著各種 Prompt 技巧與 AI 方法論，但我們全程都不用這些——我們最想說清楚的，是技術與方法論之外，人機協作還需要什麼，才能走到現在這裡。',
      c1Tag: '知識管理 · Knowledge Management',
      c1Title: '那個按鈕說好只要五分鐘',
      c1p1: '開發早期，Nova 交給 Claude 一個看起來很小的任務——加一個按鈕。「這應該很快吧？」結果 Claude 繞了超過一個小時：同樣的坑，用不同的角度踩了三次。不是因為不努力，而是因為沒有記憶。每次 session 開始，都是從空白重來。',
      c1p2: '那次之後，Nova 跟 Claude 定下了一條規則：踩到技術坑，立刻記入 KM 文件，不等功能完成，不等確認是 bug。每個 KM 條目獨立 commit，獨立 push，不與功能代碼混合。',
      c1p3: '到了 Sprint 9 結束，KM 文件已有超過六十條記錄。每一條都是「這裡曾經有人跌倒過」的標記。新 session 開始時不需要重新踩雷——翻開 KM，就知道哪裡有坑。',
      c1boxTitle: '這條規則說的不只是效率',
      c1boxDesc: '記憶不是天賦，是設計。AI 沒有跨 session 的記憶，但文件可以。KM 是讓協作得以延續的人工記憶系統。',
      milestoneTeaser: '完整開發歷程 · Electron + Tauri · 路線圖',
      milestoneBtn: '查看產品里程碑 →'
    },
    en: {
      heroTag: 'VAS · Collab Notes',
      heroH1: 'Neither of us can write a single line of code alone,<br>but together we <span class="gradient-text">built it</span>',
      heroTagline: "This isn't a story about Prompt Engineering.",
      heroDesc: "This page documents how the collaboration rules between Nova and Claude evolved from scratch during VAS development. While the market is full of Prompt techniques and AI methodologies, we used none of them — what we want to explain is what human-AI collaboration needs beyond tools and methods.",
      c1Tag: 'Knowledge Management',
      c1Title: 'The button that was supposed to take five minutes',
      c1p1: "Early in development, Nova gave Claude a small-looking task — add a button. 'This should be quick, right?' Claude spent over an hour going in circles: the same pitfall, from three different angles. Not from lack of effort, but from lack of memory. Every session starts from blank.",
      c1p2: "After that, Nova and Claude established a rule: when you hit a technical pitfall, record it in the KM file immediately — no waiting for the feature to finish, no waiting to confirm it's a bug. Every KM entry gets its own commit, its own push, never mixed with feature code.",
      c1p3: 'By the end of Sprint 9, the KM file had over sixty entries. Each one is a marker that says "someone fell here once." New sessions don\'t need to rediscover the pitfalls — open the KM, and you know where the holes are.',
      c1boxTitle: 'This rule is about more than efficiency',
      c1boxDesc: "Memory isn't a talent, it's a design decision. AI has no cross-session memory, but documents do. KM is an artificial memory system that keeps collaboration alive.",
      milestoneTeaser: 'Full development history · Electron + Tauri · Roadmap',
      milestoneBtn: 'View product milestones →'
    },
    ja: {
      heroTag: 'VAS · 協作ノート',
      heroH1: 'コードは一行も書けないけど、<br>一緒に<span class="gradient-text">作り上げた</span>',
      heroTagline: 'これはプロンプトエンジニアリングの話ではありません。',
      heroDesc: 'このページは VAS 開発中、Nova と Claude の間で協働ルールがゼロからどのように進化したかを記録しています。市場では様々なプロンプト技術や AI 方法論が流行していますが、私たちはそのどれも使いませんでした——技術や方法論を超えて、人と AI の協働に何が必要かを伝えたいと思います。',
      c1Tag: '知識管理 · Knowledge Management',
      c1Title: '5分で終わるはずのボタン',
      c1p1: '開発初期、Nova は Claude に小さそうなタスクを渡しました——ボタンを一つ追加すること。「すぐ終わるよね？」ところが Claude は1時間以上同じ落とし穴を三度踏み続けました。努力が足りないのではなく、記憶がないのです。セッションが始まるたびに白紙からやり直し。',
      c1p2: 'その後、Nova と Claude はルールを決めました：技術的な落とし穴を踏んだら、すぐに KM ファイルへ記録する——機能完成を待たず、バグ確認を待たず。KM エントリは独立してコミット・プッシュし、機能コードと混ぜない。',
      c1p3: 'Sprint 9 が終わる頃には、KM ファイルは六十件以上の記録を持っていました。それぞれが「ここで誰かが転んだ」という印です。新しいセッションは地雷を踏み直す必要がない——KM を開けば、どこに穴があるかわかる。',
      c1boxTitle: 'このルールが言っているのは効率だけではありません',
      c1boxDesc: '記憶は才能ではなく、設計です。AI にはセッションをまたぐ記憶がありませんが、ドキュメントにはあります。KM は協働を継続させるための人工記憶システムです。',
      milestoneTeaser: '完全な開発履歴 · Electron + Tauri · ロードマップ',
      milestoneBtn: '製品マイルストーンを見る →'
    }
  };

  var shared = window.VASShared;

  function applyLang(lang) {
    var t = Object.assign({}, shared.sharedT[lang] || shared.sharedT.zh, pageT[lang] || pageT.zh);
    document.querySelectorAll('[data-lang-key]').forEach(function (el) {
      var key = el.dataset.langKey;
      if (t[key] !== undefined) el.innerHTML = t[key];
    });
    document.documentElement.lang = { zh: 'zh-Hant', en: 'en', ja: 'ja' }[lang] || 'zh-Hant';
    try { localStorage.setItem('vasLang', lang); } catch (e) {}
    shared.updateDropdown(lang);
  }

  document.addEventListener('DOMContentLoaded', function () {
    shared.initDropdown(applyLang);
  });

})();
