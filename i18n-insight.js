// i18n-insight.js — VAS Design Insights 三語翻譯 (zh / en / ja)
(function () {
  const translations = {
    zh: {
      heroTag: 'VAS · 設計洞察筆記',
      heroH1: '那些沒有寫在<br><span class="gradient-text">功能列表</span>裡的決定',
      heroTagline: '我們都不完美，<br class="sm:hidden">但我們仍然可以攜手並進。',
      heroDesc: '這裡記錄 VAS 開發過程中，那些沒有寫在功能列表裡、但決定了產品質感的設計決策——每一條，都是在重新營造人與工具之間的關係。',

      i1Title: '沒有完美的人機，但有完整的協作關係',
      i1p1: 'OCR 隱私辨識盡可能自動——自動偵測畫面中的敏感文字，自動標記需要遮蔽的區域。但 OCR 有它的極限，辨識不到或辨識錯的地方，不是工具的失敗，是協作的交接點。',
      i1p2: '浮動馬賽克圖層在那裡等著：OCR 沒蓋到的，使用者手動補上。辨識失誤從「錯誤」變成「待確認」，工具的不完美被設計成使用者的控制權。',
      i1p3: '而且遮錯了也沒關係——馬賽克是獨立的浮動物件，undo 一鍵刪除。工具不只承認自己不完美，也承認使用者會手滑。沒有任何決定是不可逆的。',
      i1box1Label: 'OCR 自動',
      i1box1Desc: '盡可能辨識，自動標記敏感區域',
      i1box2Label: '馬賽克補位',
      i1box2Desc: 'OCR 不足的地方，使用者手動接手',
      i1box3Desc: '遮錯了？一鍵刪除，沒有不可逆的決定',

      i2Title: 'QR Code 掃到了，但它有多確定？',
      i2p1: '掃 QR Code 這件事，表面上只有「掃到」和「沒掃到」兩種結果。但 VAS 不這樣看——它看的是辨識信心度，然後根據信心度決定下一步要做什麼。',
      i2p2: '這也是一種人機協作：使用者用截圖的姿態說話，工具讀懂了。不需要語言，不需要按鈕，不需要選單——你怎麼框，就是你想要什麼。工具在讀的不是指令，是行為語言。',
      i2p3: '信心度的高低，有一部分來自演算法，但也來自使用者的操作姿態。想精準偵測 QR Code，自然會盡可能把它框滿、框大——這個動作本身就是意圖的宣告。框得越完整，辨識越準，信心度越高，工具越能直接行動。使用者與工具之間，形成了一種不需要言語的默契。',
      i2p4: '也因為意圖在框選的瞬間就已經明確，QR Code 偵測直接在工具列的矩形截圖工具觸發，不需要進入編輯器才能操作。工具在最早的時間點行動，不讓你多走一步。',
      i2p5: '工具不應該在自己不確定的時候假裝確定。信心度高，就直接行動；信心度模糊，就先問你；信心度太低，靜默交給你判斷。每一個閾值背後，都是一個「我知道自己知道多少」的誠實設計。',
      i2highLabel: '高信心 · 直接行動',
      i2highDesc: '直接開啟網頁或連結，不打擾使用者',
      i2midLabel: '中信心 · 主動詢問',
      i2midDesc: '輕聲問你：「這是你要的連結嗎？」',
      i2lowLabel: '低信心 · 靜默交手',
      i2lowDesc: '不猜測、不行動，直接把圖打開給你判斷',
      i2imgCaption: '實際操作示意',

      i3Title: '呼吸燈讀懂你的意圖，再開口問你',
      i3p1: 'VAS 的呼吸燈不只是等待的象徵——它在偵測環境。當使用者複製了一個網址，呼吸燈會輕輕詢問：「要幫你截這個網頁嗎？」使用者同意，截圖完成，編輯器打開。',
      i3p2: '這個設計源自一個觀察：原本的網頁截圖流程需要複製網址 → 呼叫工具列 → 按截圖 → 貼上網址——四個步驟，全部是「為了工具而做的事」。但使用者複製網址，是為了他自己的事，不是為了 VAS。',
      i3p3: '最好的工具不讓你切換到「工具模式」。它待在你的環境裡，讀懂你在做什麼，然後輕聲問你一句。',
      i3traditionalLabel: '傳統工具思維',
      i3traditionalDesc: '你呼叫 → 它執行',
      i3vasLabel: 'VAS 的方式',
      i3vasDesc: '它感知 → 它詢問 → 你確認',
      i3imgCaption1: '設計手稿',
      i3imgCaption2: '最終實作',

      i4Title: '擺好 pose 在那邊等，工具不應該叫你回來選',
      i4p1: '延遲截圖是為了捕捉滑鼠事件——報錯狀態、hover 效果、debug 瞬間。使用者倒數等待，滑鼠必須留在現場。但原生的雙螢幕選單要求在截圖前先回去工具列選擇要截哪個螢幕——整個 pose 就廢了，等待也沒有意義了。',
      i4p2: 'VAS 捨棄原生選單，改用自製圖層遮罩覆蓋全螢幕：延遲開始之前就決定好，點哪個螢幕就截哪個，按 Enter 合併雙螢幕。倒數期間滑鼠哪都不用去，繼續擺著等就好。',
      i4p3: '更進一步：當使用者設了延遲規則，VAS 默認截取滑鼠當下所在的螢幕——連選都不用選，工具自己判斷。使用者根本不會意識到這個決策發生過。',
      i4step1Label: '延遲截圖',
      i4step1Desc: '為了截滑鼠事件，給自己備戰時間',
      i4step2Label: '自製遮罩',
      i4step2Desc: '延遲開始前就選好螢幕，倒數期間滑鼠不離場',
      i4step3Label: '滑鼠位置默認',
      i4step3Desc: '連選都不用選，工具讀你在哪，就截哪裡',

      i5Title: '功能可以一直加，但底層要先說同一種語言',
      i5p1: '當工具種類越來越多——點、線、面、文字、符號——每個物件都有顏色、線條、大小、方向這些屬性。如果每個工具各自管自己的屬性，加功能就是在還債；但如果這些屬性是共享的、模組化的，改一個地方，全體同步。',
      i5p2: 'VAS 正在進行的重構，核心是兩件事：座標系統統一，讓所有物件說同一種語言；屬性模組化，讓實色、漸層、虛實線、大小、方向這些設定成為可以跨工具套用的共用語彙。',
      i5p3: '這不是在加功能，是在為後面所有功能打地基。地基穩了，之後疊加旋轉、對齊、群組才不會打架。',
      i5p4: '這次重構也連帶讓 Electron 版受惠——底層統一，兩個平台都跑在同一套邏輯上，穩定性自然提升。Electron 雖然不再新增功能，但作為付費入門磚，它需要被好好維護：功能完整、免費、穩定，讓使用者有機會先信任 VAS，再決定要不要升級 Tauri。一次重構，把整個雙平台策略都撐起來了。',
      i5boxTitle: '重構帶來的連鎖效應',
      i5bullets: '<li>· 座標系統統一：所有物件共享同一套空間語言</li><li>· 屬性模組化：實色／漸層／虛實線／大小／方向跨工具通用</li><li>· Tauri 可持續疊加新功能，不會因複雜度打架</li><li>· Electron 穩定性同步提升，入門磚角色得以維持</li>',

      milestoneTeaser: '完整開發歷程 · Electron + Tauri · 路線圖',
      milestoneBtn: '查看產品里程碑 →',
    },

    en: {
      heroTag: 'VAS · Design Insights',
      heroH1: 'Decisions that never made it onto<br>the <span class="gradient-text">feature list</span>',
      heroTagline: 'None of us are perfect — but we can still walk forward together.',
      heroDesc: 'A record of design decisions made during VAS development: choices that never appeared in the feature list, yet shaped the feel of the product. Each one is about rebuilding the relationship between people and their tools.',

      i1Title: 'No perfect human-AI pair — but a complete collaboration',
      i1p1: 'OCR privacy detection is as automatic as possible — detecting sensitive text on screen, auto-marking areas to be hidden. But OCR has its limits. When it misses something or gets it wrong, that\'s not a failure of the tool. That\'s a handoff point.',
      i1p2: 'The floating mosaic layer is there waiting: wherever OCR falls short, the user steps in manually. A recognition error stops being a "mistake" and becomes a "pending review." The tool\'s imperfection is designed as the user\'s control.',
      i1p3: 'And if you cover the wrong area, no problem — mosaics are independent floating objects, deleted with a single undo. The tool doesn\'t just admit its own imperfections; it assumes the user will slip too. Nothing is irreversible.',
      i1box1Label: 'OCR Auto',
      i1box1Desc: 'Recognise as much as possible, auto-mark sensitive areas',
      i1box2Label: 'Mosaic Fill-in',
      i1box2Desc: 'Where OCR falls short, the user takes over manually',
      i1box3Desc: 'Covered the wrong spot? One-tap delete — no irreversible decisions',

      i2Title: 'QR Code detected — but how confident is it?',
      i2p1: 'Scanning a QR code seems like a binary outcome: detected or not. But VAS sees differently — it reads confidence levels, then decides what to do next based on how sure it is.',
      i2p2: 'This is also human-AI collaboration: the user speaks through how they frame the screenshot, and the tool understands. No language, no buttons, no menus — how you frame it is what you want. The tool isn\'t reading commands; it\'s reading behaviour.',
      i2p3: 'Confidence comes partly from the algorithm, but also from how the user frames the shot. To precisely detect a QR code, you naturally try to fill the frame as completely as possible — that action itself declares intent. The more complete the frame, the better the detection, the higher the confidence, the more directly the tool can act. A wordless understanding forms between user and tool.',
      i2p4: 'Because intent is clear the moment you frame the shot, QR code detection triggers directly from the rectangle capture tool in the toolbar — no need to enter the editor. The tool acts at the earliest possible moment, saving you every unnecessary step.',
      i2p5: 'A tool should not pretend to be certain when it isn\'t. High confidence: act directly. Uncertain: ask first. Too low: hand it to you silently. Behind every threshold is an honest design that says "I know exactly how much I know."',
      i2highLabel: 'High confidence · Act directly',
      i2highDesc: 'Opens the page or link immediately, no interruption',
      i2midLabel: 'Mid confidence · Ask first',
      i2midDesc: 'Gently asks: "Is this the link you wanted?"',
      i2lowLabel: 'Low confidence · Silent handoff',
      i2lowDesc: 'No guessing, no action — opens the image for your judgement',
      i2imgCaption: 'How it looks in practice',

      i3Title: 'The breathing light reads your intent — then asks',
      i3p1: 'VAS\'s breathing light isn\'t just a symbol of waiting — it\'s sensing the environment. When a user copies a URL, the light gently asks: "Want me to capture this webpage?" User confirms, screenshot taken, editor opens.',
      i3p2: 'This design came from an observation: the usual webpage screenshot workflow means copy URL → invoke toolbar → press capture → paste URL — four steps, all done "for the tool." But copying a URL is something the user does for themselves, not for VAS.',
      i3p3: 'The best tools don\'t make you switch into "tool mode." They live in your environment, understand what you\'re doing, and ask quietly.',
      i3traditionalLabel: 'Traditional tool thinking',
      i3traditionalDesc: 'You call → it executes',
      i3vasLabel: 'The VAS way',
      i3vasDesc: 'It senses → it asks → you confirm',
      i3imgCaption1: 'Design sketch',
      i3imgCaption2: 'Final implementation',

      i4Title: 'Strike your pose and hold — the tool should not call you back to choose',
      i4p1: 'Delayed capture is for catching mouse events — error states, hover effects, debug moments. The user counts down, mouse must stay in position. But the native dual-screen menu requires returning to the toolbar before capturing to choose which screen — the whole pose collapses, and the wait becomes meaningless.',
      i4p2: 'VAS replaces the native menu with a custom full-screen overlay: decide which screen before the countdown begins, click to select, hit Enter to merge both screens. During the countdown, the mouse doesn\'t need to go anywhere.',
      i4p3: 'Going further: when a user sets a delay rule, VAS defaults to capturing whichever screen the mouse is currently on — no selection needed at all. The user won\'t even notice this decision was made.',
      i4step1Label: 'Delayed capture',
      i4step1Desc: 'Time to get into position before the mouse event fires',
      i4step2Label: 'Custom overlay',
      i4step2Desc: 'Choose the screen before countdown — mouse stays in place',
      i4step3Label: 'Mouse-position default',
      i4step3Desc: 'No selection needed — the tool reads where you are and captures there',

      i5Title: 'Features can keep growing — but the foundation must speak one language first',
      i5p1: 'As tool types multiply — points, lines, areas, text, symbols — every object has colour, stroke, size, and direction properties. If each tool manages its own properties, adding features means accumulating debt. But if these properties are shared and modular, change one thing and everything syncs.',
      i5p2: 'The refactor VAS is undergoing has two core goals: unify the coordinate system so all objects speak the same spatial language; modularise properties so solid fill, gradient, dash style, size, and direction become a shared vocabulary applicable across all tools.',
      i5p3: 'This isn\'t adding features — it\'s laying the foundation for every feature that follows. A stable foundation means rotation, alignment, and grouping can stack without conflict.',
      i5p4: 'This refactor also benefits the Electron version — a unified foundation means both platforms run on the same logic, and stability improves naturally. Electron may not gain new features, but as a free entry point it needs to be maintained: feature-complete, free, stable. Let users build trust in VAS before deciding whether to upgrade to Tauri. One refactor, and the entire dual-platform strategy is supported.',
      i5boxTitle: 'Chain effects of the refactor',
      i5bullets: '<li>· Unified coordinate system: all objects share the same spatial language</li><li>· Modular properties: solid/gradient/dash/size/direction shared across all tools</li><li>· Tauri can keep stacking new features without complexity conflicts</li><li>· Electron stability improves in parallel, preserving its role as the entry point</li>',

      milestoneTeaser: 'Full development history · Electron + Tauri · Roadmap',
      milestoneBtn: 'View Product Milestones →',
    },

    ja: {
      heroTag: 'VAS · デザインの洞察',
      heroH1: '機能リストには載らなかった<br><span class="gradient-text">決断</span>たち',
      heroTagline: '誰も完璧ではない——それでも、共に歩み続けることはできる。',
      heroDesc: 'VAS の開発過程で下された設計上の決断を記録します。機能リストには載らなかったけれど、製品の質感を決定づけたもの——それぞれが、人とツールの関係を再構築する試みです。',

      i1Title: '完璧な人機協働はない——でも、完全な協働関係はある',
      i1p1: 'OCR プライバシー検出は可能な限り自動化されています——画面上の機密テキストを検出し、隠すべき領域を自動的にマーキング。しかし OCR には限界があります。見逃したり誤検出したりした箇所は、ツールの失敗ではなく、協働の受け渡しポイントです。',
      i1p2: 'フローティングモザイクレイヤーが待機しています：OCR がカバーできなかった箇所は、ユーザーが手動で補います。認識エラーは「間違い」から「要確認」へと変わります。ツールの不完全さが、ユーザーのコントロールとして設計されています。',
      i1p3: '間違えてカバーしても大丈夫——モザイクは独立したフローティングオブジェクトで、undo で一発削除できます。ツールは自分の不完全さを認めるだけでなく、ユーザーが操作ミスをすることも前提としています。取り消せない決断は一つもありません。',
      i1box1Label: 'OCR 自動',
      i1box1Desc: 'できる限り認識し、機密領域を自動マーキング',
      i1box2Label: 'モザイク補完',
      i1box2Desc: 'OCR が不十分な箇所はユーザーが手動で補う',
      i1box3Desc: '間違えた？ワンタップで削除——取り消せない決断はない',

      i2Title: 'QR コードを検出した——でも、どのくらい確実？',
      i2p1: 'QR コードのスキャンは表面上、「検出」か「未検出」の二択に見えます。しかし VAS は違う見方をします——認識の信頼度を読み取り、その信頼度に基づいて次のアクションを決めます。',
      i2p2: 'これも一種の人機協働です：ユーザーはスクリーンショットの構図で意図を伝え、ツールはそれを読み取ります。言葉も、ボタンも、メニューも不要——どう切り取るかが、欲しいものの表明です。ツールが読んでいるのは命令ではなく、行動の言語です。',
      i2p3: '信頼度はアルゴリズムの側面もありますが、ユーザーの操作姿勢にも依存します。QR コードを精確に検出したければ、自然とフレームいっぱいに収めようとするでしょう——その動作自体が意図の宣告です。フレームが完全なほど、検出は正確で、信頼度は高く、ツールはより直接的に行動できます。言葉なき了解が、ユーザーとツールの間に生まれます。',
      i2p4: '意図はフレーミングの瞬間に明確なため、QR コード検出はツールバーの矩形キャプチャツールから直接トリガーされます——エディタに入る必要はありません。ツールは最も早いタイミングで行動し、無駄なステップを省きます。',
      i2p5: 'ツールは確信がないときに確信があるふりをすべきではありません。信頼度が高ければ直接行動。不確かなら先に確認。低すぎれば静かにあなたに委ねる。すべての閾値の裏には「自分がどれだけ知っているかを知っている」という誠実な設計があります。',
      i2highLabel: '高信頼度 · 直接行動',
      i2highDesc: 'ページまたはリンクをすぐに開く、邪魔しない',
      i2midLabel: '中信頼度 · まず確認',
      i2midDesc: 'そっと尋ねる：「これがお求めのリンクですか？」',
      i2lowLabel: '低信頼度 · サイレントハンドオフ',
      i2lowDesc: '推測せず、行動せず、画像を開いてあなたに判断させる',
      i2imgCaption: '実際の操作イメージ',

      i3Title: '呼吸ライトがあなたの意図を読み取り、それから問いかける',
      i3p1: 'VAS の呼吸ライトは待機の象徴だけではありません——環境を感知しています。ユーザーが URL をコピーすると、呼吸ライトがそっと尋ねます：「このウェブページをキャプチャしましょうか？」ユーザーが同意すれば、スクリーンショットが完了し、エディタが開きます。',
      i3p2: 'このデザインはある観察から生まれました：従来のウェブページキャプチャの流れは URL をコピー → ツールバーを呼び出す → キャプチャボタンを押す → URL を貼り付け——4 ステップ、すべてが「ツールのためにする作業」です。でも URL をコピーするのは、ユーザー自身のためであり、VAS のためではありません。',
      i3p3: '最良のツールは「ツールモード」への切り替えを要求しません。あなたの環境に溶け込み、何をしているかを理解し、そっと一言添えます。',
      i3traditionalLabel: '従来のツール思考',
      i3traditionalDesc: 'あなたが呼び出す → ツールが実行する',
      i3vasLabel: 'VAS のやり方',
      i3vasDesc: 'ツールが感知する → 問いかける → あなたが確認する',
      i3imgCaption1: 'デザインスケッチ',
      i3imgCaption2: '最終実装',

      i4Title: 'ポーズをとって待つ——ツールが選択のために呼び戻すべきではない',
      i4p1: '遅延キャプチャは、エラー状態、ホバー効果、デバッグの瞬間などのマウスイベントをキャプチャするためのものです。ユーザーはカウントダウン中、マウスを現場に留める必要があります。しかしネイティブのデュアルスクリーンメニューは、キャプチャ前にツールバーに戻ってどの画面を撮るか選択することを要求します——ポーズが崩れ、待機は無意味になります。',
      i4p2: 'VAS はネイティブメニューを捨て、カスタムの全画面オーバーレイを採用しました：カウントダウン開始前に画面を選び、クリックして確定、Enter で両画面を結合。カウントダウン中、マウスはどこにも行く必要がありません。',
      i4p3: 'さらに：ユーザーが遅延ルールを設定すると、VAS はデフォルトでマウスがある画面をキャプチャします——選択すら不要です。ユーザーはこの判断が行われたことに気づかないでしょう。',
      i4step1Label: '遅延キャプチャ',
      i4step1Desc: 'マウスイベントをキャプチャするための準備時間',
      i4step2Label: 'カスタムオーバーレイ',
      i4step2Desc: 'カウントダウン前に画面選択——マウスは現場を離れない',
      i4step3Label: 'マウス位置デフォルト',
      i4step3Desc: '選択不要——ツールがいる場所を読み取り、そこをキャプチャ',

      i5Title: '機能は増やし続けられる——でもまず土台が同じ言語を話す必要がある',
      i5p1: 'ツールの種類が増えるにつれ——点、線、面、テキスト、シンボル——すべてのオブジェクトに色、線、サイズ、方向といったプロパティがあります。各ツールが独自のプロパティを管理すると、機能追加は技術的負債の蓄積になります。しかしこれらのプロパティが共有・モジュール化されていれば、一箇所を変えるだけで全体が同期します。',
      i5p2: 'VAS が進めているリファクタリングの核心は二つ：座標系の統一によってすべてのオブジェクトが同じ空間言語を話せるようにすること；プロパティのモジュール化によって、単色、グラデーション、線のスタイル、サイズ、方向をすべてのツールで共有できる共通語彙にすること。',
      i5p3: 'これは機能追加ではなく、その後のすべての機能のための地盤固めです。土台が安定すれば、回転、整列、グループ化を重ねても衝突しません。',
      i5p4: 'このリファクタリングは Electron 版にも恩恵をもたらします——共通の土台で、両プラットフォームが同じロジックで動き、安定性が自然と向上します。Electron は新機能を追加しませんが、無料の入口として、機能完全・無料・安定を維持し、ユーザーが VAS を信頼してから Tauri へのアップグレードを検討できるようにします。一度のリファクタリングで、デュアルプラットフォーム戦略全体が支えられます。',
      i5boxTitle: 'リファクタリングの連鎖効果',
      i5bullets: '<li>· 座標系の統一：すべてのオブジェクトが同じ空間言語を共有</li><li>· プロパティのモジュール化：単色／グラデーション／線スタイル／サイズ／方向がすべてのツールで通用</li><li>· Tauri は複雑さの衝突なく新機能を積み重ね可能</li><li>· Electron の安定性が同時に向上し、入口としての役割を維持</li>',

      milestoneTeaser: '完全な開発履歴 · Electron + Tauri · ロードマップ',
      milestoneBtn: 'プロダクトマイルストーンを見る →',
    },
  };

  function applyLang(lang) {
    const t = translations[lang];
    if (!t) return;
    document.querySelectorAll('[data-lang-key]').forEach(function (el) {
      var key = el.getAttribute('data-lang-key');
      if (t[key] !== undefined) el.innerHTML = t[key];
    });
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : lang;
    ['zh', 'en', 'ja'].forEach(function (l) {
      var btn = document.getElementById('lang-' + l);
      if (!btn) return;
      btn.classList.toggle('active', l === lang);
      btn.setAttribute('aria-pressed', String(l === lang));
    });
    try { localStorage.setItem('vasLang', lang); } catch (e) {}
  }

  function init() {
    ['zh', 'en', 'ja'].forEach(function (lang) {
      var btn = document.getElementById('lang-' + lang);
      if (btn) btn.addEventListener('click', function () { applyLang(lang); });
    });
    try {
      var saved = localStorage.getItem('vasLang');
      if (saved && translations[saved]) applyLang(saved);
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
