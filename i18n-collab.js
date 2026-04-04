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
      c2Tag: '仿生語言 · Biomimetic Language',
      c2Title: '三個字說完一份規格',
      c2p1: '「捕蠅草。」這三個字第一次出現在開發文件裡的時候，它不是比喻，它是規格。Nova 用捕蠅草描述呼吸燈感知到使用者拖曳檔案靠近時的整套行為：偵測、張開、收納、等待。三個字，等於一整段功能說明。',
      c2p2: '這是 Nova 在研究人機協作時發展出來的概念——仿生語言。當兩個人（或一個人和一個 AI）合作夠深、夠久，語言會開始壓縮。不需要每次都解釋完整的脈絡，因為那個脈絡已經活在共同的記憶裡。「捕蠅草」不需要展開，聽到的人已經知道它的全部含義。',
      c2p3: '這不是你可以預先設計的東西。它是協作深度的副產品——當你們走得夠遠，語言自然會變得更精準、更濃縮。',
      c2boxTitle: '仿生語言的條件',
      c2boxDesc: '共同的失敗經驗 + 共同的術語沉澱 + 足夠多的迭代。沒有捷徑，只有時間和誠實的溝通。',
      c3Tag: '並行協作 · Concurrent Session Rule',
      c3Title: '那天 merge 一直衝突',
      c3p1: 'VAS 有兩個版本同時在開發：Tauri（付費）和 Electron（免費）。它們共用同一份前端代碼放在 <code class="text-purple-300/80 text-xs">src/</code> 目錄裡。有一天，Nova 正在用 Tauri session 處理 Rust 的 bug，中途急著切到 Electron session 去同步修一個 UI 問題——兩個 session 同時碰了 <code class="text-purple-300/80 text-xs">src/</code>。',
      c3p2: 'merge conflict 反覆出現。不是代碼寫錯，而是兩個 Claude 在不知道彼此存在的情況下同時修改了同一條路徑。那次之後，Concurrent Session Rule 成為 CLAUDE.md 的核心條款：<code class="text-purple-300/80 text-xs">src/</code> 的修改，任何時刻只能有一個 session 在動；結構性變更必須先 merge 到 main，另一個 session 才能繼續。',
      c3p3: '這條規則不是在限制 Claude，而是在定義兩個 Claude 實例之間的協議——讓並行工作成為可能，而不是互相傷害。',
      c3boxTitle: '規則的本質',
      c3boxDesc: '規則不是因為不信任。規則是因為兩個沒有共享記憶的實例，需要一個共同遵守的交通規則才能在同一條路上安全行駛。',
      c4Tag: '文件架構 · Document Architecture',
      c4Title: 'SDD 四千行之後',
      c4p1: '最初只有一份文件：SDD。規格寫在裡面，測試案例寫在裡面，踩過的坑寫在裡面，歷史紀錄也寫在裡面。Sprint 一個一個走，文件一行一行長，到了某個時間點它超過了四千行。',
      c4p2: '搜尋一個關鍵字，結果散落在十個地方。想確認某個 IPC 合約，得先在四千行裡定位自己。每次開新 session，把文件摘要塞進 context 都是一場博弈——塞太多 AI 反應變慢，塞太少 AI 容易遺漏關鍵資訊。',
      c4p3: '那次之後，SDD 被拆成四份：SDD 只放規格與 Sprint 計畫；TDD 只放測試案例；KM 只放踩過的坑；Archive 放退役的歷史。不是為了整齊，而是讓每份文件都有唯一的使命，讓 Claude 在每次 session 開始時能精準載入它真正需要的那一份。',
      c4boxTitle: '文件結構決定思考速度',
      c4boxDesc: '一份混亂的文件不只是難找——它會讓 AI 在每次回應之前先花算力在定位自己。拆分文件，是在替每次協作對話降低啟動成本。',
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
      c2Tag: 'Biomimetic Language',
      c2Title: 'Three words that contain an entire spec',
      c2p1: '"Venus flytrap." The first time those words appeared in a development document, they weren\'t a metaphor — they were a spec. Nova used it to describe the breathing light\'s entire behavior when it sensed a user dragging a file nearby: detect, open, capture, wait. Three words equalling a full paragraph of functional requirements.',
      c2p2: 'This is a concept Nova developed while researching human-AI collaboration — biomimetic language. When two collaborators (or a human and an AI) work together deeply and long enough, language starts to compress. There\'s no need to re-explain full context every time, because that context already lives in shared memory. "Venus flytrap" needs no unpacking — the listener already knows its full meaning.',
      c2p3: "This isn't something you can design in advance. It's a byproduct of collaboration depth — when you've gone far enough together, language naturally becomes more precise and more concentrated.",
      c2boxTitle: 'The conditions for biomimetic language',
      c2boxDesc: 'Shared failures + shared terminology sediment + enough iterations. No shortcuts. Only time and honest communication.',
      c3Tag: 'Concurrent Session Rule',
      c3Title: 'The day merge kept conflicting',
      c3p1: 'VAS had two versions in development simultaneously: Tauri (paid) and Electron (free). They shared the same frontend code in the <code class="text-purple-300/80 text-xs">src/</code> directory. One day, Nova was using the Tauri session to fix a Rust bug, then urgently switched to the Electron session to sync a UI fix — both sessions touched <code class="text-purple-300/80 text-xs">src/</code> at the same time.',
      c3p2: 'Merge conflicts kept appearing. Not because of wrong code, but because two Claude instances, unaware of each other\'s existence, had simultaneously modified the same path. After that, the Concurrent Session Rule became a core clause in CLAUDE.md: <code class="text-purple-300/80 text-xs">src/</code> modifications can only have one active session at any time; structural changes must be merged to main before the other session can continue.',
      c3p3: "This rule isn't about restricting Claude — it's about defining a protocol between two Claude instances, so parallel work becomes possible rather than destructive.",
      c3boxTitle: 'The essence of rules',
      c3boxDesc: "Rules aren't born from distrust. They exist because two instances with no shared memory need a common traffic protocol to travel safely on the same road.",
      c4Tag: 'Document Architecture',
      c4Title: 'After SDD hit four thousand lines',
      c4p1: 'At first there was only one document: SDD. Specs lived there. Test cases lived there. Pitfalls lived there. History lived there. Sprint after sprint, line after line, until one day it crossed four thousand lines.',
      c4p2: "Search for a keyword and results scatter across ten locations. Trying to confirm an IPC contract meant first locating yourself within four thousand lines. Every new session, loading the document summary into context became a gamble — too much and Claude slows down, too little and Claude misses critical information.",
      c4p3: 'After that, SDD was split into four: SDD holds only specs and Sprint plans; TDD holds only test cases; KM holds only pitfalls; Archive holds retired history. Not for tidiness, but so each document has a single mission — so Claude can load precisely what it needs at the start of each session.',
      c4boxTitle: 'Document structure determines thinking speed',
      c4boxDesc: "A chaotic document isn't just hard to search — it makes the AI spend compute on self-location before every response. Splitting documents lowers the startup cost of every collaboration session.",
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
      c2Tag: '仿生言語 · Biomimetic Language',
      c2Title: '3語で仕様書一冊分',
      c2p1: '「ハエトリソウ。」その3語が開発ドキュメントに初めて登場したとき、それは比喩ではなく仕様でした。Nova はハエトリソウを使って、ユーザーがファイルをドラッグして近づけたときの呼吸ライトの動作全体を表現しました：感知、開く、取り込む、待機。3語で、一段落の機能説明と同じ。',
      c2p2: 'これは Nova が人と AI の協働を研究する中で発展させた概念——仿生言語です。二人（または人と AI）が十分に深く、十分に長く協力すると、言語が圧縮され始めます。毎回完全な文脈を説明する必要がなくなるのは、その文脈がすでに共有記憶の中に生きているからです。「ハエトリソウ」を展開する必要はない——聞いた人はすでにその全意味を知っています。',
      c2p3: 'これは事前に設計できるものではありません。協働の深さの副産物——十分に遠くまで一緒に歩んできたとき、言語は自然とより精確に、より凝縮されていきます。',
      c2boxTitle: '仿生言語の条件',
      c2boxDesc: '共通の失敗体験 + 共通の用語の蓄積 + 十分な反復。近道はなく、時間と誠実なコミュニケーションだけ。',
      c3Tag: '並行協働 · Concurrent Session Rule',
      c3Title: 'あの日、merge が何度も衝突した',
      c3p1: 'VAS は同時に二つのバージョンを開発していました：Tauri（有料）と Electron（無料）。両者は <code class="text-purple-300/80 text-xs">src/</code> ディレクトリに同じフロントエンドコードを共有していました。ある日、Nova が Tauri セッションで Rust のバグを修正していた途中、Electron セッションに切り替えて UI の問題を同期修正しようとしました——二つのセッションが同時に <code class="text-purple-300/80 text-xs">src/</code> に触れました。',
      c3p2: 'merge conflict が繰り返し発生しました。コードが間違っているのではなく、お互いの存在を知らない二つの Claude が同じパスを同時に変更したためです。その後、Concurrent Session Rule が CLAUDE.md の核心条項になりました：<code class="text-purple-300/80 text-xs">src/</code> の変更は、いかなる時も一つのセッションだけが担当する；構造的な変更は先に main にマージしてから、もう一方のセッションが続行できる。',
      c3p3: 'このルールは Claude を制限するためではありません——二つの Claude インスタンス間のプロトコルを定義して、並行作業を可能にするためです。互いを傷つけないように。',
      c3boxTitle: 'ルールの本質',
      c3boxDesc: 'ルールは不信任から生まれるのではありません。共有記憶を持たない二つのインスタンスが、同じ道を安全に走るために共通の交通ルールが必要だから存在します。',
      c4Tag: '文書アーキテクチャ · Document Architecture',
      c4Title: 'SDD が四千行を超えた後',
      c4p1: '最初は一つのドキュメントだけでした：SDD。仕様もそこに、テストケースもそこに、踏んだ落とし穴もそこに、履歴もそこに。Sprint ごとに、一行一行と増え、ある時点で四千行を超えました。',
      c4p2: 'キーワードを検索すると、結果が十箇所に散らばります。IPC コントラクトを確認しようとすると、まず四千行の中で自分の位置を特定しなければなりません。新しいセッションを開くたびに、ドキュメントの要約を context に詰め込むことはギャンブルでした——多すぎると AI が遅くなり、少なすぎると AI が重要な情報を見落とします。',
      c4p3: 'その後、SDD は四つに分割されました：SDD は仕様と Sprint 計画のみ；TDD はテストケースのみ；KM は踩んだ落とし穴のみ；Archive は退役した履歴。整理のためではなく、各ドキュメントに唯一の使命を持たせるため——Claude が各セッション開始時に本当に必要なものだけを正確に読み込めるように。',
      c4boxTitle: '文書構造が思考速度を決める',
      c4boxDesc: '混乱したドキュメントは見つけにくいだけでなく——AI がすべての応答前に自己位置特定に計算資源を使わせます。文書を分割することは、すべての協働セッションの起動コストを下げることです。',
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
