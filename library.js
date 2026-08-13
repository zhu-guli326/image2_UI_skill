import { getLibraryPreviewDevice, libraryPreviewAssetVersion } from "./library-preview-config.mjs";

const styleGuides = [
  {
    id: "museum", category: "culture", name: "ArtMuse", style: "当代美术馆导览", video: "./assets/cases/museum-app/museum-app-demo.mp4", poster: "./assets/cases/museum-app/museum-app-preview.gif", previewImage: "./assets/cases/museum-app/library-preview-2x.png", preview: "#dce3d6", reference: "画廊导视与展览画册的安静秩序", referenceImage: "./assets/style-references/artmuse-reference.png", prompt: "当代美术馆导览 App 视觉参考：纸张白、低饱和展签色、细线、大量留白，像展览画册和展墙导视；内容优先，图片保留白边，排版克制清晰；无高饱和主色、无厚重阴影、无密集信息流、无复杂装饰。",
    summary: "纸张白、低饱和展签色、细线和大量留白，让内容先于界面被看见。", bestFor: "展览、文化内容、精品零售、品牌故事", tags: ["策展留白", "细线结构", "低饱和"], palette: "纸张白 / 鼠尾草绿 / 展签棕", layout: "单列导览 + 精选内容卡",
    recipe: { principle: "让内容像在展墙上被观看，而不是被一堆控件包围。", image: "图片当作被策展的作品：留出白边，少裁切，不叠加复杂 UI。", type: "标题用正常字重和宽松行距；正文小而清楚。", components: "细边框卡片、轻量 tab、低调箭头和节制的圆角。", motion: "只在切换和选中态提供轻柔反馈。", avoid: "高饱和主色、厚阴影、密集信息流。" }
  },
  {
    id: "fashion", category: "commerce", name: "Vestra", style: "编辑式时尚电商", video: "./assets/cases/fashion-shopping-app/fashion-app-demo.mp4", poster: "./assets/cases/fashion-shopping-app/fashion-app-preview.gif", previewImage: "./assets/cases/fashion-shopping-app/library-preview-2x.png", preview: "#eadfe0", reference: "时装画册的留白节奏，加上轻量化的收藏与浏览流程", referenceImage: "./assets/style-references/vestra-reference.png", prompt: "编辑式时尚电商 App 视觉参考：大幅人物或单品主视觉、柔和粉色调、宽松留白、克制的小字号文案，像设计师时装画册；商品成为画面主角，操作轻量；无拥挤价格标签、无复杂拼贴、无高频动效。",
    summary: "大幅人物视觉、粉色调留白和克制文字，让电商界面先像一本编辑画册。", bestFor: "时装、美妆、生活方式、设计师品牌", tags: ["编辑画册", "人物主视觉", "轻量购物"], palette: "雾粉 / 奶白 / 深巧克力", layout: "沉浸大图 + 轻量商品列表",
    recipe: { principle: "让商品先成为画面主角，操作只在需要时出现。", image: "使用单一人物或单件商品的大图，统一光线与背景。", type: "标题有编辑感，正文则保持小而轻。", components: "圆润相片容器、轻量收藏按钮、单一强调色。", motion: "滑动、收藏和下一张转换要细腻。", avoid: "商品卡塞满价格、折扣和标签。" }
  },
  {
    id: "fufu", category: "commerce", name: "FuFu Bakery", style: "手绘烘焙会员", video: "./demo/fufu-bakery/fufu-bakery-demo.mp4", liveDemo: "./demo/fufu-bakery/index.html", poster: "./demo/fufu-bakery/mobile-preview.png", preview: "#e9e4cc", reference: "黑色蜡笔线稿、狗狗烘焙师与纸白留白，像一张轻松的店内手写菜单", referenceImage: "./demo/fufu-bakery/assets/reference-overview.png", prompt: "手绘烘焙会员 App 视觉参考：暖纸白底，粗而不规则的黑色墨线，浅天蓝围裙和奶油黄面包作为少量色彩；狗狗烘焙师承担主要情绪，文字、价格、状态栏、图标、导航、按钮全由代码呈现；不生成文字、logo、水印、系统状态栏、箭头、菜单图标或伪 UI。",
    summary: "用一位会抱面包的狗狗烘焙师，把点单、门店和会员集点变成带手感的店内小纸条。", bestFor: "烘焙、咖啡、生活方式零售、会员活动", tags: ["黑色线稿", "狗狗烘焙师", "纸白留白"], palette: "纸白 / 浅天蓝 / 黄油黄 / 墨黑", layout: "欢迎页 + 门店首页 + 会员集点卡",
    recipe: { principle: "让角色和刚出炉的产品先传达温度，交易动作始终清楚而轻量。", image: "一张统一的手绘角色插画可在欢迎、门店与会员卡中复用，控制风格漂移。", type: "品牌名可大胆有趣，说明、价格和操作文字保持稳定清晰。", components: "手绘主视觉、三项快捷动作、当周烘焙卡、菜单列表和集点会员卡。", motion: "欢迎页进入、底部导航切换和加购提示给即时轻反馈。", avoid: "把促销、满减、长菜单和复杂积分统计同时堆入首屏。" }
  },
  {
    id: "organique", category: "commerce", name: "Organique Food", style: "编辑式有机餐食", video: "./demo/organique-food/organique-food-demo.mp4", liveDemo: "./demo/organique-food/index.html", poster: "./demo/organique-food/mobile-preview.png", preview: "#ede8d5", reference: "暗黑展陈、香槟金排版与奶油色餐食 App 的编辑感构图", referenceImage: "./demo/organique-food/assets/chicken-fattoush-salad.png", prompt: "编辑式有机餐食 App 视觉参考：深炭黑展陈背景配香槟金与橄榄绿大字，奶油色 9:16 iPhone 屏幕里以大号衬线餐品标题和克制无衬线操作组织内容；食物摄影作为唯一生成位图，所有品牌文字、状态栏、菜单、选择、日期和确认操作均由代码呈现；不生成可读文字、logo、水印、手机界面或 UI glyph。",
    summary: "用一张真实生成的餐食摄影和编辑式排版，把选餐、安排配送和确认计划收进一条安静而明确的路径。", bestFor: "有机餐食、健康配送、营养订阅、生活方式零售", tags: ["编辑式排版", "餐食摄影", "奶油黑金"], palette: "炭黑 / 香槟金 / 奶油白 / 橄榄绿", layout: "选餐主视觉 + 配送日选择 + 确认页",
    recipe: { principle: "用一张餐食主视觉承担食欲与品质，其他动作保持低干扰且一眼可读。", image: "真实餐食图固定在浅灰工作台中，避免把文字、菜单或功能图标烘焙到摄影里。", type: "产品名采用高对比编辑式衬线，说明和操作保持清楚的无衬线节奏。", components: "9:16 iOS 机身、餐食主图、菜单、配送日选择、计划确认和短反馈。", motion: "选餐、日期切换、菜单和确认仅以即时状态转换回应。", avoid: "把营养明细、促销标语、长表单和多张商品卡同时塞进首屏。" }
  },
  {
    id: "cleanbite", category: "wellness", name: "CleanBite", style: "荧光食品扫描", video: "./demo/cleanbite-scanner/cleanbite-demo.mp4", liveDemo: "./demo/cleanbite-scanner/index.html", poster: "./demo/cleanbite-scanner/mobile-preview.png", preview: "#d4ff70", reference: "荧光青柠展板上的双手机，把会员选择和食品营养拆解放进强对比的黑白层级", referenceImage: "./demo/cleanbite-scanner/assets/cleanbite-effect-board.png", prompt: "食品扫描 App 视觉参考：荧光青柠绿色外部展板、黑色 iOS 机身、白与浅绿页面、黑色信息面板和圆形营养构成图；产品图只承担真实食品包装与苹果主体，所有价格、权益、百分比、状态栏、返回、分享、收藏、tab、按钮和图表标签均由代码呈现；不把新的 UI glyph 或可交互文字生成进图片。",
    summary: "用会员方案与营养分析双屏组织一次清楚的食品扫描体验，让亮绿负责选择，黑色负责结论。", bestFor: "食品扫描、营养分析、健康订阅、配料透明工具", tags: ["荧光青柠", "营养环图", "双机展示"], palette: "青柠绿 / 云白 / 墨黑 / 苹果绿", layout: "会员方案 + 产品主视觉 + 营养分析",
    recipe: { principle: "先让用户知道能获得什么，再用一张可读的分析结果证明价值。", image: "食品主体保持在独立本地图片槽位，营养环、百分比与操作全部由代码控制。", type: "大号价格和产品名建立扫描顺序，权益与解释文字保持紧凑可读。", components: "双 iOS 机身、套餐选择、试用开关、产品视觉、营养环图、分析 tab、收藏与分享反馈。", motion: "套餐、开关、tab、收藏和双屏切换都使用短而明确的状态变化。", avoid: "把促销、复杂营养表、彩色标签和大量健康建议同时堆在首屏。" }
  },
  {
    id: "plate-play", category: "commerce", name: "Plate Play", style: "高彩插画食谱", video: "./demo/plate-play/plate-play-demo.mp4", liveDemo: "./demo/plate-play/index.html", poster: "./demo/plate-play/mobile-preview.png", effectImage: "./demo/plate-play/assets/reference-overview.png", preview: "#f2b9d1", reference: "浅粉展板、荧光黄绿手机界面与番茄红厨师插画，像一本活泼的厨房图画书", referenceImage: "./demo/plate-play/assets/reference-overview.png", prompt: "高彩插画食谱 App 视觉参考：浅粉色展板，荧光黄绿色与浅粉色手机界面，番茄红、杏橙、淡紫和天蓝作为拼贴式强调色；用粗黑线描与扁平色块绘制一位正在搅拌面糊的厨师和厨房器具，插画无文字、无 logo、无系统状态栏、无按钮、无导航、无 UI glyph。所有标题、食谱名称、营养信息、按钮、标签、状态栏与底部导航均由代码呈现。",
    summary: "用番茄红厨师插画和荧光黄绿底色打开食谱体验，再用柔粉、杏橙和淡紫把浏览与详情串起来。", bestFor: "食谱、儿童餐食、烹饪课程、生活方式内容", tags: ["厨师插画", "高彩色块", "轻松食谱"], palette: "浅粉 / 荧光黄绿 / 番茄红 / 杏橙 / 淡紫", layout: "插画欢迎页 + 食谱列表 + 餐食详情",
    recipe: { principle: "让插画负责食欲与亲和力，让真实文字和控件继续保持清楚、可点和可修改。", image: "欢迎页只放一张无文字的粗线条厨师插画，食谱卡使用同色板的扁平餐食图形，避免风格漂移。", type: "标题粗大直接，红色斜体词形成节奏；说明和操作使用紧凑无衬线。", components: "9:16 iOS 机身、厨师主视觉、分类标签、食谱卡、营养数据、收藏和底部导航。", motion: "页面切换、分类、收藏和加入计划都用短促明确的状态反馈。", avoid: "把插画做成整页不可编辑截图，或在高彩背景上继续叠加大量渐变与装饰。" }
  },
  {
    id: "carry-bag", category: "commerce", name: "Carry Bag", style: "高亮背包电商", video: "./demo/carry-bag/carry-bag-demo.mp4", liveDemo: "./demo/carry-bag/index.html", poster: "./demo/carry-bag/mobile-preview.png", preview: "#b4becb", reference: "冰灰蓝展板上的三台背包电商手机，户外摄影、极简货架与皮革产品详情由一抹亮绿串联", referenceImage: "./demo/carry-bag/assets/reference-overview.png", prompt: "背包电商 App 视觉参考：冰灰蓝桌面背景上并列三台 9:16 黑色 iPhone；一张无文字的冰川户外背包摄影和一张无文字的暖棕皮革背包棚拍作为独立 image2 位图，荧光绿只用于明确的行动按钮。所有品牌文字、状态栏、价格、商品信息、按钮、tab、底部导航、箭头与图标均由代码呈现；不在图片中生成文字、logo、水印、手机或 UI glyph。",
    summary: "用户外主视觉、清爽货架和皮革单品详情组织一条可点击的背包购物路径，让亮绿只为下一步行动服务。", bestFor: "户外产品、箱包零售、生活方式品牌、精品电商", tags: ["户外产品", "亮绿操作", "极简货架"], palette: "冰灰蓝 / 云白 / 荧光绿 / 深墨", layout: "户外主视觉 + 商品货架 + 商品详情",
    recipe: { principle: "把产品摄影与购买动作拆开：照片负责质感，代码界面负责阅读与决策。", image: "户外和棚拍背包使用独立且无文字的生成图，背景、按钮、价格和可交互控件保持在代码层。", type: "衬线标题提供精品零售感，价格、标签和导航用紧凑无衬线保持扫描效率。", components: "9:16 iOS 机身、商品 tab、两层商品卡、产品详情、色彩选择、下单按钮与可点底部导航。", motion: "商品、色彩、tab、下单和导航切换都有即时且可见的反馈。", avoid: "把折扣贴纸、复杂筛选、长规格表和高饱和颜色同时堆到一个商品屏。" }
  },
  {
    id: "fithub", category: "wellness", name: "FitHub", style: "极简训练规划", video: "./demo/fithub/fithub-demo.mp4", liveDemo: "./demo/fithub/index.html", poster: "./demo/fithub/mobile-preview.png", preview: "#d9d9d7", reference: "白色手机、黑色细线、淡紫统计卡和醒目黄操作构成极简训练管理体验", referenceImage: "./demo/fithub/assets/reference-overview.png", prompt: "极简健身 App 视觉参考：白色 390×844 现代 iPhone 画布、黑色无衬线大标题、细线图标、淡紫与浅蓝统计卡、亮黄主按钮；训练教练与目标部位运动员使用两张独立无文字 image2 人像摄影。所有文字、状态栏、日期、卡片数字、按钮、标签、底部导航、箭头和图标均由代码呈现；不在图片中生成文字、logo、水印、手机或 UI glyph。",
    summary: "以课程发现、每日活动和目标部位三屏串起训练流程，让黑白骨架、低饱和数据色和黄色下一步保持清晰分工。", bestFor: "运动训练、健身计划、习惯打卡、个人活动记录", tags: ["极简黑白", "活动统计", "训练引导"], palette: "云白 / 墨黑 / 淡紫 / 浅蓝 / 活力黄", layout: "训练发现 + 活动统计 + 目标部位选择",
    recipe: { principle: "把一天的训练决策分成三件短事：选课程、读状态、定目标。", image: "训练人物和运动员肖像为独立无文字生成图，所有操作与数据都保留在代码层。", type: "标题使用大写无衬线和直接数字，辅助标签短且固定在稳定栅格中。", components: "19.5:9 iOS 机身、课程筛选、可点训练卡、活动指标、日期选择、目标部位标签和底部导航。", motion: "筛选、日期、目标和底部导航都用即时选中态与短反馈回应。", avoid: "过多彩色统计卡、密集运动数据、生成图内 UI 文本和无法返回的多步流程。" }
  },
  {
    id: "still-form", category: "commerce", name: "Still Form", style: "可持续服饰电商", video: "./demo/still-form/still-form-demo.mp4", liveDemo: "./demo/still-form/index.html", poster: "./demo/still-form/mobile-preview.png", preview: "#b6b5a0", reference: "灰绿展板、深棕中性色与大幅天然面料摄影，让可持续服饰体验安静而明确", referenceImage: "./demo/still-form/assets/reference-overview.png", prompt: "可持续服饰电商 App 视觉参考：灰绿色展板与白色 9:16 iPhone，天然棕色、象牙白和深巧克力色构成安静的成衣编辑感；亚麻衬衫和再生羊毛围巾使用独立无文字 image2 时尚摄影。所有文案、价格、分类、收藏、按钮、状态栏、返回和图标均由代码呈现；不在图片中生成文字、logo、水印、手机或 UI glyph。",
    summary: "以沉浸入口、系列列表和单品详情串起可持续服饰浏览，让图片质感与购买操作各自清楚。", bestFor: "服饰零售、生活方式品牌、可持续产品、编辑式电商", tags: ["天然面料", "编辑式商品", "深棕操作"], palette: "灰绿 / 象牙白 / 深巧克力 / 亚麻棕", layout: "品牌入口 + 分类商品页 + 单品详情",
    recipe: { principle: "让摄影建立材料触感，让代码界面承担价格、分类、收藏和加购决策。", image: "两张无文字服饰摄影分别用于系列主视觉、商品卡和详情图，保持统一自然光与中性色。", type: "清晰无衬线标题与紧凑价格层级，避免过度促销式信息。", components: "9:16 iOS 机身、沉浸入口、分类 tab、商品卡、收藏、色彩选择、返回和加购。", motion: "入口、分类、收藏、颜色和加购都有即时可见反馈。", avoid: "大面积折扣标识、图片中的文字 UI、复杂筛选栏和无法返回的商品详情。" }
  },
  {
    id: "news", category: "editorial", name: "Today", style: "报刊感新闻阅读", video: "./assets/cases/news-app/news-app-demo.mp4", poster: "./assets/cases/news-app/news-app-preview.gif", previewImage: "./assets/cases/news-app/library-preview-2x.png", preview: "#e1e0d7", reference: "传统报刊标题层级，结合移动端卡片式资讯浏览", referenceImage: "./assets/style-references/today-reference.png", prompt: "报刊感新闻阅读 App 视觉参考：传统报刊式标题层级、柔和纸色、清晰的头条与列表节奏，新闻照片作为事实证据；信息密度适中、易扫读；无统一大字号堆叠、无强烈渐变、无喧闹装饰。",
    summary: "衬线式大标题、柔和纸色和明确的新闻层级，让信息密集但依然像在阅读。", bestFor: "新闻、研究简报、媒体内容、专业资讯", tags: ["报刊排版", "分级阅读", "信息密度"], palette: "新闻纸白 / 墨黑 / 柔和彩色栏目", layout: "栏目网格 + 分级头条",
    recipe: { principle: "读者先扫到最重要的事实，再决定是否深入。", image: "把新闻照片作为事实的证据，统一裁切比例。", type: "大标题承担阅读节奏，分类和时间退后。", components: "突出的头条卡、稳定列表节奏、轻量工具栏。", motion: "保存、切换栏目和加载内容只给轻反馈。", avoid: "每条新闻都用同等字号和强调色。" }
  },
  {
    id: "itinerary", category: "travel", name: "Aegean", style: "海岸行程编排", video: "./demo/lisbon-itinerary/lisbon-itinerary-demo.mp4", liveDemo: "./demo/lisbon-itinerary/index.html", poster: "./demo/lisbon-itinerary/mobile-preview.png", preview: "#dfe5e2", reference: "纸本行程表的从容层级，叠加轻量的路线与天气信息", referenceImage: "./demo/lisbon-itinerary/mobile-preview.png", prompt: "海岸旅行行程 App 视觉参考：有纸张感的浅灰白底，深青与珊瑚红作为少量功能强调，路线照片有明确留白，时间线清晰安静；把信息安排成一天的节奏，不做旅游平台式的密集卡片与促销标签。",
    summary: "把路线、时间和停留点整理成一张可慢慢读的日程，而不是堆满行程卡的旅游首页。", bestFor: "旅行计划、活动排程、婚礼流程、城市漫游", tags: ["纸本行程", "时间线", "海岸色调"], palette: "雾白 / 深青 / 珊瑚红 / 苔绿", layout: "日期轨道 + 路线主视觉 + 时间线",
    recipe: { principle: "让用户先感受到一天的节奏，再处理每个具体动作。", image: "一张横向路线照片承担氛围，使用清晰的裁切和小面积深色遮罩。", type: "日期、时间与地点形成稳定的三层阅读顺序。", components: "日期分段、路线卡、竖向时间线、底部导航和添加停留点底部 sheet。", motion: "日期切换、展开停留点和底部 sheet 都用短而明确的反馈。", avoid: "地图、标签、交通信息和商家推荐同时抢占首屏。" }
  },
  {
    id: "journal", category: "travel", name: "Lumen", style: "旷野日记探索", video: "./demo/lumen-journal/lumen-journal-demo.mp4", liveDemo: "./demo/lumen-journal/index.html", poster: "./demo/lumen-journal/screenshot-app-frame.png", preview: "#d5e4e7", reference: "自然摄影的辽阔感，配合日记式短句和少量探索入口", referenceImage: "./demo/lumen-journal/screenshot-app-frame.png", prompt: "旅行日记探索 App 视觉参考：钴蓝水面与珊瑚红主体的摄影主视觉，文字像现场笔记一样简短，深色蓝色 UI chrome 克制存在；保留很强的单图情绪，不用大量旅游缩略图、评分和商业化标签。",
    summary: "用一张有呼吸感的旅行照片打开探索，剩下的内容像随手记下的小发现。", bestFor: "旅行灵感、个人日记、摄影收藏、生活方式内容", tags: ["钴蓝摄影", "场景叙事", "轻探索"], palette: "钴蓝 / 珊瑚红 / 浅雾蓝 / 墨色", layout: "场景提问 + 搜索 + 单张主视觉 + 发现列表",
    recipe: { principle: "一屏只建立一个去处的情绪，交互退到边缘。", image: "主视觉选一个明确的自然主体，给予低干扰的文字留白。", type: "问题式标题先于地点信息，辅助信息缩小并后置。", components: "个人状态区、搜索字段、筛选 chip、沉浸主视觉、保存按钮和简短发现列表。", motion: "筛选、收藏和底部 tab 的状态变化轻而可感。", avoid: "把目的地、榜单、评分、攻略和广告塞进同一个画面。" }
  },
  {
    id: "buddy", category: "travel", name: "Buddy", style: "轻盈旅行计划", video: "./demo/buddy-travel/buddy-travel-demo.mp4", liveDemo: "./demo/buddy-travel/index.html", poster: "./demo/buddy-travel/mobile-preview.png", preview: "#e4ff83", reference: "荧光黄背景中的浅杏色手机，圆形旅行标签像轻轻散落的贴纸", referenceImage: "./demo/buddy-travel/assets/reference-welcome.png", prompt: "轻盈旅行计划 App 视觉参考：荧光黄外部背景，浅杏色 9:16 手机屏幕，黑色细边 iOS 机身；四个小型彩色旅行标签围绕无文字旅行贴纸，给中央标题留白；所有文字、按钮、状态栏、底部导航与功能图标由代码呈现，不生成文字、logo、水印、UI glyph 或伪文字。",
    summary: "用散落的旅行标签和一张温和的贴纸，让用户从一个目的地开始慢慢组织下一趟旅程。", bestFor: "旅行计划、城市灵感、周末行程、轻量收藏", tags: ["贴纸标签", "荧光黄", "轻量入口"], palette: "荧光黄 / 浅杏 / 蜜桃粉 / 湖蓝", layout: "欢迎页 + 目的地清单 + 底部导航",
    recipe: { principle: "首页只传递一次出发的冲动，把具体行程留到下一屏。", image: "旅行贴纸是唯一的位图情绪点，标签和其余 UI 都要保持清晰可点。", type: "品牌、标题与说明按一条居中轴组织，文字短而松。", components: "9:16 iOS 机身、可点旅行标签、目的地列表、主操作和底部标签导航。", motion: "标签按压、进入目的地和底部标签切换都提供短暂、直接的反馈。", avoid: "在欢迎页塞进地图、筛选、评分、价格或成排的大卡片。" }
  },
  {
    id: "notebook", category: "creative", name: "Marble Note", style: "手账式创意工作台", video: "./demo/marble-note/marble-note-demo.mp4", liveDemo: "./demo/marble-note/index.html", poster: "./demo/marble-note/screenshots/marble-note-mobile.png", preview: "#f0eac6", reference: "手绘线条、彩色贴纸和真实纸张节奏，让工作台更像创作空间", referenceImage: "./demo/marble-note/screenshots/marble-note-mobile.png", prompt: "创意笔记 App 视觉参考：柔和纸色底、手绘线稿、糖果色标签和文件夹形状，信息结构依然清楚可读；让插画性细节限定在封面与少量空白区域，不用每张卡片都铺满 emoji、渐变和厚重阴影。",
    summary: "把笔记、文件夹和日程放进一套有手感的创作语言，保留清晰的任务和内容层级。", bestFor: "创意笔记、学生工具、家庭规划、轻量项目整理", tags: ["纸张手感", "手绘线稿", "彩色标签"], palette: "暖纸白 / 薄荷绿 / 天蓝 / 柔粉 / 墨黑", layout: "欢迎封面 + 文件夹分组 + 卡片式笔记工作台",
    recipe: { principle: "装饰让人愿意停留，结构让人马上能开始记录。", image: "手绘元素集中在封面或空白区域，内容卡保持平整易读。", type: "标题可以有一点手写气质，正文和表单必须稳定、清楚。", components: "文件夹 chip、项目文件夹、便签卡、简化编辑器、色彩标签和切换视图。", motion: "页面切换和保存提示带有轻微纸张般的位移，但不影响阅读。", avoid: "用 emoji 或伪图标承担搜索、返回、保存等功能操作。" }
  },
  {
    id: "signal-grid", category: "creative", name: "Signal Grid", style: "热成像网络匹配", video: "./demo/signal-grid/signal-grid-demo.mp4", liveDemo: "./demo/signal-grid/index.html", poster: "./demo/signal-grid/mobile-preview.png", preview: "#f4a078", reference: "深青与热橙渐变覆盖极简网络界面，扫描、设置和套餐组成一套完整连接流程", referenceImage: "./demo/signal-grid/assets/signal-grid-effect-board.png", prompt: "Signal Grid 网络匹配 App 视觉参考：深青、暖灰和热橙构成热成像式连续背景，三台完整黑色 iPhone 分别展示网络扫描、参数设置与套餐选择；线框球只存在于扫描页手机内部。所有真实标题、状态栏、菜单、设置行、开关、套餐 tab、价格、购买和底部导航均由代码呈现。",
    summary: "用完整三屏效果图展示扫描、设置与套餐决策，让线框网络球回到扫描页内部承担视觉焦点。", bestFor: "网络服务、设备连接、套餐配置、科技品牌、数据匹配", tags: ["热成像渐变", "三屏流程", "严格排版"], palette: "深青 / 热橙 / 暖灰 / 信号白", layout: "网络扫描 + 参数设置 + 套餐选择 + 确认页",
    recipe: { principle: "保持内容表格般清晰，再用单一线框视觉赋予连接过程以记忆点。", image: "案例档案使用完整三屏生成效果图；线框球作为独立生成资产，仅接入扫描页内部。", type: "大标题低字重且紧凑；参数、标签和价格使用更小但明确的无衬线信息层级。", components: "iOS 9:16 机身、网络扫描、设置行与开关、套餐 tab、购买确认和底部 tab。", motion: "扫描、开关、套餐和购买全部有即时状态变化，不添加装饰性长动效。", avoid: "把局部资产单独当作完整案例配图，或把图表、营销卖点和多重按钮堆入同一屏。" }
  },
  {
    id: "volt-route", category: "creative", name: "Volt Route", style: "暗色电车充电导航", video: "./demo/volt-route/volt-route-demo.mp4", liveDemo: "./demo/volt-route/index.html", poster: "./demo/volt-route/mobile-preview.png", preview: "#b5c0b2", reference: "雾灰绿展板上的三台深色手机，银灰车身、荧光绿充电状态和夜间路线形成克制的高科技感", referenceImage: "./demo/volt-route/assets/reference-overview.png", prompt: "电动车充电导航 App 视觉参考：雾灰绿桌面背景上并列三台深黑 iPhone，银灰电动车尾部摄影与无标签夜间街区地图作为两个独立 image2 位图；荧光绿只用于充电进度、路线与选中状态。所有百分比、文字、状态栏、地图路线、地点节点、底部导航和控制图标均由代码呈现；不在图片中生成文字、logo、水印、路线、pin、手机或 UI glyph。",
    summary: "将车辆状态、充电控制与最近的快充路线收进同一套深色仪表盘，让绿色状态只在需要行动的地方出现。", bestFor: "新能源出行、充电网络、车辆管理、城市导航", tags: ["暗色仪表盘", "电车摄影", "路线状态"], palette: "雾灰绿 / 炭黑 / 银灰 / 充电绿", layout: "车辆仪表盘 + 充电状态 + 路线抽屉",
    recipe: { principle: "把车辆摄影和路线纹理作为环境层，数值、选择与动作保持高对比的代码界面。", image: "车辆和地图各自独立生成且无文字，路线、绿色节点与所有 UI 在代码层叠加，保证可读可点。", type: "大号电量数字先建立状态，指标和路线说明随后以小而清楚的层级出现。", components: "9:16 iOS 机身、充电百分比、车辆状态卡、路线节点、底部导航、暂停控制和路线抽屉。", motion: "tab、暂停/继续和地点选择只提供明确、即时的状态反馈。", avoid: "不要在首屏堆放车辆参数表、营销卖点、密集地图标签或拟真的假按钮。" }
  },
  {
    id: "moodly", category: "wellness", name: "Moodly", style: "柔粉情绪签到", video: "./demo/moodly-health/moodly-demo.mp4", liveDemo: "./demo/moodly-health/index.html", poster: "./demo/moodly-health/mobile-preview.png", preview: "#f4dced", reference: "云朵、柔粉角色和干净的情绪滑杆，让每日情绪记录像一次轻量对话", referenceImage: "./demo/moodly-health/assets/moodly-mascot.png", prompt: "柔粉情绪签到 App 视觉参考：高留白白色手机、粉色立体圆脸角色、少量薄荷与蜜桃辅助色、绵软白云和细弧线；所有标题、关闭、进度、滑杆、箭头、状态栏和按钮由代码呈现，不生成文字、logo、水印、UI glyph 或伪文字。",
    summary: "一张有表情的柔粉角色图配合离散情绪滑杆，让用户在很短的时间里完成一次清楚、安静的自我记录。", bestFor: "情绪记录、心理健康、日常反思、儿童陪伴", tags: ["柔粉角色", "离散滑杆", "轻量签到"], palette: "柔粉 / 薄荷 / 蜜桃 / 云白 / 墨黑", layout: "情绪提问 + 角色视觉 + 滑杆 + 完成页",
    recipe: { principle: "每次只问一个问题，选择之后立即结束，不让记录变成一张表单。", image: "角色插画承担情绪，交互控件和文字全由代码保持清楚可访问。", type: "提问保持大而直接，情绪标签在滑杆下方回显。", components: "关闭、两段进度、角色主视觉、五档滑杆、前后操作和庆祝页。", motion: "滑块在 200ms 内落到选择项，确认后切到一张完整的祝贺屏。", avoid: "把情绪量表、长期曲线、提醒设置和社区内容同时塞进签到首屏。" }
  },
  {
    id: "reflect", category: "wellness", name: "Reflect", style: "雾野反思日记", video: "./demo/reflect-journal/reflect-demo.mp4", liveDemo: "./demo/reflect-journal/index.html", poster: "./demo/reflect-journal/mobile-preview.png", preview: "#c7dbd7", reference: "雾蓝草地、半透明层次与衬线标题，像一本可以慢慢翻阅的晨间自然日记", referenceImage: "./demo/reflect-journal/assets/morning-stillness.png", prompt: "Reflect 冥想日记 App 视觉参考：雾蓝天空、浅鼠尾草草地与柔白纸张，摄影主视觉有清晨薄雾和自然路径，标题呈现编辑式衬线气质；图片只承担环境和质感，所有文字、状态栏、心情按钮、返回、标签与底部导航均由代码呈现；不生成文字、logo、水印、UI glyph、系统状态栏、箭头、菜单、按钮或伪 UI。",
    summary: "把清晨雾野的一张照片嵌进带衬线阅读节奏的日记，让心情、短记与文章详情保持低干扰地连在一起。", bestFor: "日记、冥想、情绪记录、慢生活内容、阅读产品", tags: ["雾野摄影", "编辑衬线", "安静反思"], palette: "雾蓝 / 鼠尾草 / 柔白 / 橄榄绿", layout: "引语首页 + 心情行 + 日记卡 + 文章详情",
    recipe: { principle: "把一段安静的阅读与记录体验留在同一条单列路径里，所有操作轻量而可见。", image: "一张无文字的雾野照片在首屏、卡片和详情中复用，保持光线与情绪稳定。", type: "衬线只承担引语、文章标题和阅读节奏，控件与正文用清晰系统无衬线。", components: "iOS 9:16 机身、四项可点心情、日记入口、文章详情、可编辑新反思和底部 tab。", motion: "心情和标签以短按压反馈，页面间切换立即落位，避免干扰阅读。", avoid: "把数据图、连续打卡、社区流和多层设置同时塞进日记首页。" }
  },
  {
    id: "moe", category: "wellness", name: "Moe", style: "插画式习惯养成", video: "./demo/moe-habits/moe-habits-demo.mp4?v=sharp-3x", liveDemo: "./demo/moe-habits/index.html", poster: "./demo/moe-habits/screenshots/video-2x/01-intro.png?v=sharp-3x", previewImage: "./demo/moe-habits/screenshots/video-2x/01-intro.png?v=sharp-3x", preview: "#d5efd0", reference: "友好角色、温和提醒和单一下一步，让习惯养成没有压力", referenceImage: "./demo/moe-habits/assets/reference-overview.png", prompt: "插画式习惯养成 App 视觉参考：浅薄荷绿与暖白底，绿色角色和淡蓝水杯承担陪伴感，页面只突出一个下一步行动；日期、习惯列表和完成状态要清楚克制，所有文字、按钮、导航和图标由代码呈现；不要密集数据看板、复杂渐变、商业化奖励墙或伪手写 UI 文案。",
    summary: "用一个可爱的陪伴角色把每日习惯拆成温和而具体的一步，完成时给轻量、真诚的庆祝。", bestFor: "习惯养成、健康提醒、亲子任务、轻量自我管理", tags: ["陪伴角色", "温和激励", "单一下一步"], palette: "薄荷绿 / 暖白 / 淡蓝 / 柔黄 / 炭黑", layout: "日期轨道 + 鼓励主视觉 + 习惯列表 + 完成状态",
    recipe: { principle: "不要让用户面对一整面待办，而是让下一件小事显得足够容易开始。", image: "角色插画只承担情绪与陪伴，文本和状态绝不烘焙进图片。", type: "欢迎语和下一步行动优先，辅助说明退到第二层。", components: "日期轨道、鼓励卡、习惯列表、任务详情、完成庆祝、底部 tab 和短反馈。", motion: "打开任务与完成动作需要清晰的状态转换，庆祝保持短暂而不过量。", avoid: "任务列表、连续天数、成就和统计图同时争抢注意力。" }
  },
  {
    id: "loy", category: "wellness", name: "Loy", style: "手绘情绪仪表盘", video: "./demo/loy-wellness/loy-wellness-demo.mp4", liveDemo: "./demo/loy-wellness/index.html", poster: "./demo/loy-wellness/mobile-preview.png", previewImage: "./demo/loy-wellness/screenshots/03-welcome.png", preview: "#b9eeee", reference: "粗黑描边角色、明亮色块和轻快的健康数据节奏", referenceImage: "./demo/loy-wellness/assets/reference-overview.png", prompt: "手绘情绪与睡眠 App 视觉参考：白色手机界面搭配浅青背景，柠檬黄、橙色、蜜桃粉和亮绿构成拼贴指标卡；角色插画承担情绪，不把文字、控件或状态图标绘入图片；所有按钮、日期、播放控制和系统状态栏都用代码呈现。",
    summary: "用高能量手绘角色和四张颜色明确的指标卡，让情绪与睡眠记录像一张轻松的日常海报。", bestFor: "情绪记录、睡眠习惯、运动陪伴、亲子健康", tags: ["手绘角色", "高饱和色块", "轻量仪表盘"], palette: "薄荷青 / 柠檬黄 / 橙色 / 蜜桃粉 / 亮绿", layout: "问候头部 + 四格指标 + 日期选择 + 播放列表",
    recipe: { principle: "把数据控制在一眼读完的四格内，让角色把健康提醒变得更有人味。", image: "手绘角色只放在指标卡与播放封面，保留粗线条和高对比色。", type: "标题粗、短、直接；卡片标签退到第二层。", components: "四色指标卡、日期胶囊、情绪播放列表和轻量反馈。", motion: "页面切换和播放键只保留即时按压反馈。", avoid: "密集图表、暗色科技感、复杂奖励系统和图片里的 UI 文本。" }
  },
  {
    id: "mimo", category: "wellness", name: "Mimo", style: "透视日程卡片", video: "./demo/mimo-activities/mimo-activities-demo.mp4", liveDemo: "./demo/mimo-activities/index.html", poster: "./demo/mimo-activities/mobile-preview.png", preview: "#878ae0", reference: "紫雾背景里的日程卡片轮播，中心任务聚焦，两侧任务带透视退场", referenceImage: "./demo/mimo-activities/assets/reference-carousel.png", prompt: "健康日程 App 视觉参考：薰衣草紫到深靛蓝的柔和背景，中心白色任务卡最大，两侧任务卡有透视旋转、透明度和尺度递减；重点实现真实可滑动卡片轮播，所有文字、日期、状态栏、导航、按钮与图标由代码呈现；中心药片使用独立无文字视觉资产，不生成 UI、logo、水印或伪文字。",
    summary: "把一天的待办做成可拖动的透视卡组，始终用一张居中的任务卡明确下一步。", bestFor: "用药提醒、日程安排、康复计划、习惯陪伴", tags: ["透视轮播", "中心聚焦", "手势切换"], palette: "薰衣草紫 / 靛蓝 / 雾白", layout: "日期选择 + 透视任务卡组 + 底部导航",
    recipe: { principle: "中心卡只表达当前下一步，两侧卡负责提供时间上下文而不抢注意力。", image: "中心任务可使用一张无文字的药片或主题物件插画，其他 UI 全由代码保持清晰可点。", type: "时间和任务标题在中心卡有足够对比与留白，侧卡信息只保留必要摘要。", components: "吸附式轮播、左右卡面点击区、日期胶囊、焦点反馈和底部 tab。", motion: "拖动结束时卡片在 220ms 内吸附到最近项目，透视、透明度和尺度同步变化。", avoid: "让每一张卡都同等突出，或将侧卡做成无法点击的纯装饰。" }
  },
  {
    id: "relay-music", category: "creative", name: "RELAY", style: "编辑式音乐发现", video: "./demo/relay-music/relay-music-demo.mp4", liveDemo: "./demo/relay-music/index.html", poster: "./demo/relay-music/assets/relay-effect-board.png", preview: "#aeb4b8", reference: "冷灰展板上的三屏音乐产品，用人物摄影、钴蓝播放器与深色发现流建立清晰主次", referenceImage: "./demo/relay-music/assets/reference-overview.png", prompt: "编辑式音乐 App 视觉参考：先以参考图生成完整三屏 RELAY 效果图并完成审查，再以生成效果图作为 UI 拆分来源；冷灰展板、石墨黑内容面、钴蓝播放页、银色人物摄影与一处珊瑚色辅助块。人物、专辑和现场画面使用独立无文字 image2 位图，所有真实标题、状态栏、进度、播放控制、列表、排名、按钮、底部导航与反馈由代码呈现；不在图片中生成文字、logo、水印、手机或 UI glyph。",
    summary: "先生成并确认完整三屏效果图，再把人物、专辑和现场素材拆回一套真实可播放、可收藏、可导航的音乐界面。", bestFor: "音乐流媒体、艺人档案、现场内容、编辑式媒体", tags: ["三屏效果图", "钴蓝播放器", "摄影驱动"], palette: "冷灰 / 石墨黑 / 钴蓝 / 银白 / 珊瑚", layout: "艺人主页 + Now Playing + Discover",
    recipe: { principle: "完整效果图先确定三屏关系，再让代码承担全部可读信息与播放状态。", image: "人物、抽象专辑与现场海报均从已审查效果图的视觉系统派生，并保存为无文字独立资源。", type: "艺人名和曲名形成强标题，列表与元数据保持紧凑、稳定、可扫读。", components: "390×844 iOS 机身、艺人页、播放器、发现流、迷你播放器、现场层和底部导航。", motion: "播放、进度、收藏、切歌、艺人切换、现场层和导航都有即时状态反馈，并尊重 reduced-motion。", avoid: "直接从原参考图跳到 UI 拆分、把生成效果图当最终不可交互截图，或把可读文字和播放控件烘焙进图片。" }
  },
  {
    id: "softly-reflections", category: "wellness", name: "SOFTLY", style: "柔和反思与情绪签到", video: "./demo/softly-reflections/softly-reflections-demo.mp4", liveDemo: "./demo/softly-reflections/index.html", poster: "./demo/softly-reflections/assets/softly-effect-board.png", preview: "#e5e0fb", reference: "深靛网格展板上的三屏情绪产品，用纸卡、编辑式衬线与淡紫 3D 角色组织一次安静的自我对话", referenceImage: "./demo/softly-reflections/assets/reference-overview.png", prompt: "情绪反思 App 视觉参考：先根据参考图生成完整三屏 SOFTLY 效果图并审查，再以生成效果图作为 UI 拆分依据；深靛网格展板、珍珠白与暖象牙页面、淡紫角色、黄油黄纸卡和少量薄荷细节。角色与头像使用独立无文字 image2 位图，所有问题、按钮、状态栏、轮播箭头、标签、波形、完成环和底部导航由代码呈现；不在图片中生成文字、logo、水印、手机或 UI glyph。",
    summary: "先用完整效果图确定欢迎、反思轮播和情绪签到三屏关系，再将原创角色与真实可点击的纸卡界面重新组合。", bestFor: "情绪记录、心理健康、反思日记、学生陪伴", tags: ["三屏效果图", "纸卡轮播", "淡紫角色"], palette: "深靛 / 象牙白 / 淡紫 / 黄油黄 / 薄荷", layout: "欢迎页 + Reflection 轮播 + Mood Check-In",
    recipe: { principle: "每一屏只推进一个温和动作：进入、回答、命名感受。", image: "透明 3D 角色和 Mara 头像均从已审查效果图派生，保持无文字、无 UI 并作为独立本地资源接入。", type: "衬线问题承担情绪焦点，正文、标签与操作保持清楚的系统无衬线层级。", components: "390×844 iOS 机身、浮动纸卡、反思轮播、搜索、收藏、四项导航、情绪波形与完成状态。", motion: "轮播、导航、情绪选择和保存使用 180-220ms 状态变化，并支持 reduced-motion。", avoid: "直接从原参考图拆 UI、把角色做成 CSS 近似、在图片中保留功能文字，或把所有内容堆进圆角卡片。" }
  }
];

const githubApiUrl = "https://api.github.com/repos/zhu-guli326/image2_UI_skill";
const githubStarsFallbackUrl = "https://img.shields.io/github/stars/zhu-guli326/image2_UI_skill.json";
const gallery = document.querySelector("#demoGallery");
const searchInput = document.querySelector("#styleSearch");
const categoryNav = document.querySelector("#categoryNav");
const resultCount = document.querySelector("#resultCount");
const emptyState = document.querySelector("#emptyState");
const githubStars = document.querySelector("#githubStars");
const githubStarsNav = document.querySelector("#githubStarsNav");
const styleDialog = document.querySelector("#styleDialog");
const styleDialogContent = document.querySelector("#styleDialogContent");
const previewDialog = document.querySelector("#previewDialog");
const previewDialogTitle = document.querySelector("#previewDialogTitle");
const previewDialogImage = document.querySelector("#previewDialogImage");
const previewDialogVideo = document.querySelector("#previewDialogVideo");
const previewDialogDemo = document.querySelector("#previewDialogDemo");
const previewCursor = document.querySelector("#previewCursor");
const previewMediaFrame = document.querySelector("#previewMediaFrame");
const previewModeSwitch = document.querySelector("#previewModeSwitch");
const previewDialogReference = document.querySelector("#previewDialogReference");
const previewDialogOpenLive = document.querySelector("#previewDialogOpenLive");
const previewMediaStatus = document.querySelector("#previewMediaStatus");
const previewMediaStatusText = document.querySelector("#previewMediaStatusText");
const previewMediaRetry = document.querySelector("#previewMediaRetry");
const infoDialog = document.querySelector("#infoDialog");
const infoDialogContent = document.querySelector("#infoDialogContent");
let activeCategory = "all";
let activeTag = "";
let activePreviewGuide = null;
let previewLoadTimer = 0;
const track = (name, properties) => window.image2Analytics?.track(name, properties);

const previewModeLabels = {
  image: "效果图",
  video: "Demo 视频",
  live: "可点击 Demo"
};

function getPreviewDevice(guide, mode) {
  return getLibraryPreviewDevice(guide.id, mode);
}

function getPreviewModes(guide) {
  return ["image", guide.video && "video", guide.liveDemo && "live"].filter(Boolean);
}

function getCardPreviewDevice(guide) {
  return getPreviewDevice(guide, guide.video ? "video" : (guide.liveDemo ? "live" : "image"));
}

function getCardPoster(guide) {
  if (guide.liveDemo) return `${guide.liveDemo.replace(/index\.html$/, "screenshots/library-preview-2x.png")}?v=${libraryPreviewAssetVersion}`;
  return guide.previewImage || guide.poster;
}

function getPreviewPoster(guide) {
  return getCardPoster(guide);
}

function showPreviewImageError(image, guide) {
  image.hidden = true;
  previewMediaStatus.hidden = false;
  previewMediaStatusText.textContent = `${guide.name} 效果图不可用，请切换到可点击 Demo。`;
  previewMediaRetry.hidden = true;
  previewMediaStatus.classList.add("is-error");
}

function normalizeTag(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

function readTagFromUrl() {
  return new URL(window.location.href).searchParams.get("tag") || "";
}

function setTagFilter(tag, { push = true } = {}) {
  activeTag = tag;
  activeCategory = "all";
  categoryNav.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item.dataset.filter === "all"));
  const url = new URL(window.location.href);
  if (tag) url.searchParams.set("tag", tag);
  else url.searchParams.delete("tag");
  if (push) window.history.pushState({ tag }, "", url);
  renderDemoGallery();
  document.querySelector("#demoGallery")?.scrollIntoView({ block: "start" });
}

function getEmbeddedDemoUrl(guide) {
  const url = new URL(guide.liveDemo, window.location.href);
  url.searchParams.set("embed", "1");
  return url.href;
}

function updateEmbeddedPreviewScale() {
  if (!activePreviewGuide || previewDialogDemo.hidden) return;
  const { width, height } = getPreviewDevice(activePreviewGuide, "live");
  const scale = Math.min(previewMediaFrame.clientWidth / width, previewMediaFrame.clientHeight / height);
  previewMediaFrame.style.setProperty("--preview-embed-scale", String(scale));
}

const previewFrameObserver = new ResizeObserver(updateEmbeddedPreviewScale);
previewFrameObserver.observe(previewMediaFrame);

function buildStyleMode(guide) {
  return [
    `设计风格配置：${guide.name} / ${guide.style}`,
    `参考方向：${guide.reference}`,
    `适用场景：${guide.bestFor}`,
    "",
    "默认视觉参考（本地图片）",
    `参考图路径：${guide.referenceImage}`,
    "调用方式：生成或复刻界面时，将这张本地图片作为 image reference，优先保持它的构图、留白、色彩和信息密度。",
    `图像提示词：${guide.prompt}`,
    "",
    `核心原则：${guide.recipe.principle}`,
    `图片：${guide.recipe.image}`,
    `排版：${guide.recipe.type}`,
    `组件：${guide.recipe.components}`,
    `动效：${guide.recipe.motion}`,
    `避免：${guide.recipe.avoid}`
  ].join("\n");
}

function getFilteredGuides() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  return styleGuides.filter((guide) => {
    const searchable = [guide.name, guide.style, guide.reference, guide.summary, guide.bestFor, guide.palette, guide.layout, ...guide.tags].join(" ").toLocaleLowerCase();
    const matchesTag = !activeTag || guide.tags.some((tag) => normalizeTag(tag) === normalizeTag(activeTag));
    return (activeCategory === "all" || guide.category === activeCategory) && matchesTag && (!query || searchable.includes(query));
  });
}

function renderDemoGallery() {
  const guides = getFilteredGuides();
  gallery.innerHTML = guides.map((guide) => {
    const mediaMode = guide.video ? "video" : "image";
    const openMode = guide.defaultPreviewMode || mediaMode;
    const openLabel = previewModeLabels[openMode];
    const poster = getCardPoster(guide);
    const cardDevice = getCardPreviewDevice(guide);
    const previewActionButtons = [
      guide.video ? `<button class="style-details-button" type="button" data-preview-id="${guide.id}" data-preview-mode="video">视频</button>` : "",
      guide.liveDemo ? `<button class="style-details-button" type="button" data-preview-id="${guide.id}" data-preview-mode="live">可点击</button>` : ""
    ].join("");
    return `
    <article class="demo-card" data-case-id="${guide.id}">
      <div class="demo-card-preview" style="--preview: ${guide.preview}">
        <div class="phone-preview-media" style="--guide-phone-ratio: ${cardDevice.width} / ${cardDevice.height}"><img src="${poster}" alt="${guide.style} 手机界面缩略图" decoding="async"><span class="media-hint">效果图预览</span></div>
        <button class="preview-open-button" type="button" data-preview-id="${guide.id}" data-preview-mode="${openMode}" aria-label="打开 ${guide.style} ${openLabel}"><span>${openLabel}</span></button>
      </div>
      <div class="demo-card-body">
        <button class="demo-card-details-hitarea" type="button" data-style-details="${guide.id}" aria-label="查看 ${guide.style} 案例详情"></button>
        <div class="demo-card-meta"><span>${guide.name}</span><span>${guide.bestFor}</span></div>
        <h3>${guide.style}</h3>
        <p class="demo-card-summary">${guide.summary}</p>
        <div class="style-tags" aria-label="风格关键词">${guide.tags.map((tag) => `<a class="style-tag${normalizeTag(tag) === normalizeTag(activeTag) ? " is-active" : ""}" href="./library.html?tag=${encodeURIComponent(tag)}" data-tag="${tag}" aria-pressed="${normalizeTag(tag) === normalizeTag(activeTag)}">${tag}</a>`).join("")}</div>
        <div class="demo-card-footer"><small title="本地参考图：${guide.referenceImage}">本地参考图 · ${guide.reference}</small><div class="demo-card-actions">${previewActionButtons}<button class="style-details-button" type="button" data-style-details="${guide.id}">查看要点</button><button class="copy-style-button" type="button" data-copy-style="${guide.id}" title="复制图片与提示词配置">复制配置</button></div></div>
      </div>
    </article>
  `;
  }).join("");
  resultCount.textContent = `${guides.length} 个案例`;
  emptyState.hidden = guides.length !== 0;
  gallery.querySelectorAll(".phone-preview-media img").forEach((image) => image.addEventListener("error", () => {
    const media = image.closest(".phone-preview-media");
    media?.classList.add("is-unavailable");
    image.remove();
  }, { once: true }));
  gallery.querySelectorAll("[data-copy-style]").forEach((button) => button.addEventListener("click", () => copyStyleMode(button)));
  gallery.querySelectorAll("[data-style-details]").forEach((button) => button.addEventListener("click", () => openStyleDetails(button.dataset.styleDetails)));
  gallery.querySelectorAll("[data-preview-id]").forEach((button) => button.addEventListener("click", () => openPreview(button.dataset.previewId, button.dataset.previewMode)));
  gallery.querySelectorAll("[data-tag]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setTagFilter(link.dataset.tag);
    track("tag_filter", { tag: link.dataset.tag, resultCount: getFilteredGuides().length });
  }));
}

function setPreviewMode(mode, shouldTrack = true) {
  const guide = activePreviewGuide;
  if (!guide) return;
  const modes = getPreviewModes(guide);
  const nextMode = modes.includes(mode) ? mode : (guide.video ? "video" : "image");
  const isImage = nextMode === "image";
  const isVideo = nextMode === "video";
  const isLiveDemo = nextMode === "live";
  const { width: phoneWidth, height: phoneHeight } = getPreviewDevice(guide, nextMode);

  previewMediaFrame.style.setProperty("--preview-phone-ratio", `${phoneWidth} / ${phoneHeight}`);
  previewMediaFrame.style.setProperty("--preview-phone-ratio-value", phoneWidth / phoneHeight);
  previewMediaFrame.style.setProperty("--preview-source-width", `${phoneWidth}px`);
  previewMediaFrame.style.setProperty("--preview-source-height", `${phoneHeight}px`);
  [previewDialogVideo, previewDialogDemo].forEach((element) => {
    element.width = phoneWidth;
    element.height = phoneHeight;
  });

  previewDialogImage.hidden = !isImage;
  previewDialogVideo.hidden = !isVideo;
  previewDialogDemo.hidden = !isLiveDemo;
  previewMediaStatus.hidden = !isLiveDemo;
  previewMediaRetry.hidden = true;
  previewCursor.hidden = !isVideo;
  previewCursor.classList.toggle("is-running", isVideo && !previewDialogVideo.paused);
  previewModeSwitch.querySelectorAll("button").forEach((button) => {
    const active = button.dataset.previewView === nextMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  if (isImage) {
    previewDialogVideo.pause();
    previewDialogDemo.src = "about:blank";
    previewDialogImage.hidden = false;
    previewMediaStatus.hidden = true;
    previewMediaStatus.classList.remove("is-error");
    previewDialogImage.src = getPreviewPoster(guide);
    previewDialogImage.alt = `${guide.style} 手机效果图`;
  } else if (isVideo) {
    previewDialogDemo.src = "about:blank";
    previewDialogVideo.poster = guide.poster;
    previewDialogVideo.src = guide.video;
    previewDialogVideo.load();
    previewDialogVideo.play().catch(() => {});
  } else {
    previewDialogVideo.pause();
    window.clearTimeout(previewLoadTimer);
    previewMediaStatusText.textContent = "正在加载可点击 Demo...";
    previewMediaStatus.classList.remove("is-error");
    previewDialogDemo.title = `${guide.style} 可点击 Demo`;
    previewDialogDemo.src = getEmbeddedDemoUrl(guide);
    previewLoadTimer = window.setTimeout(() => {
      if (!activePreviewGuide || previewDialogDemo.hidden) return;
      previewMediaStatus.hidden = false;
      previewMediaStatusText.textContent = "Demo 加载超时，请重试或在新窗口打开。";
      previewMediaRetry.hidden = false;
      previewMediaStatus.classList.add("is-error");
    }, 8000);
    window.requestAnimationFrame(updateEmbeddedPreviewScale);
  }

  if (shouldTrack) track("preview_mode_change", { caseId: guide.id, mode: nextMode });
}

function openPreview(id, mode = "auto") {
  const guide = styleGuides.find((item) => item.id === id);
  if (!guide) return;
  activePreviewGuide = guide;
  const modes = getPreviewModes(guide);
  const initialMode = mode === "auto" ? (guide.defaultPreviewMode || (guide.video ? "video" : (guide.liveDemo ? "live" : "image"))) : (modes.includes(mode) ? mode : modes[0]);

  previewDialogTitle.textContent = `${guide.name} · ${guide.style}`;
  previewDialogReference.textContent = guide.reference;
  previewMediaFrame.style.setProperty("--preview-media-bg", guide.preview);
  previewDialogOpenLive.hidden = !guide.liveDemo;
  if (guide.liveDemo) previewDialogOpenLive.href = guide.liveDemo;
  previewModeSwitch.innerHTML = modes.map((item) => `<button type="button" data-preview-view="${item}" aria-pressed="false">${previewModeLabels[item]}</button>`).join("");
  previewModeSwitch.hidden = modes.length < 2;
  previewModeSwitch.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => setPreviewMode(button.dataset.previewView)));

  previewDialog.showModal();
  setPreviewMode(initialMode, false);
  track(initialMode === "live" ? "live_demo_open" : "demo_preview_open", { caseId: guide.id, caseName: guide.name, mode: initialMode });
}

const infoPanels = {
  guide: {
    eyebrow: "IMAGE2 UI / GUIDE",
    title: "使用指南",
    intro: "从真实参考开始，把风格选择、图片资产与可点击界面连成一条可复用的工作流。",
    steps: [
      ["选择案例", "在案例库中查看统一 390×844 外框的效果图或 Demo 视频，打开风格详情，确认最接近的视觉方向。"],
      ["复制配置", "复制按钮会带出本地参考图路径、图像提示词、排版和组件原则。"],
      ["拆分实现", "把文字、按钮、导航、状态与常规图标放进代码；把照片、插画、纹理和产品图作为图片资产。"],
      ["连接本地资产", "把生成或选择的图片保存到项目目录，再接回页面中对应的视觉槽位。"],
      ["验证交付", "打开本地预览，检查点击路径、图片加载、移动端布局和 reduced-motion。"]
    ],
    callout: "开始时不需要写“做得更高级”。先选一个案例，再复制配置，沟通会准确得多。"
  },
  principles: {
    eyebrow: "IMAGE2 UI / PRINCIPLES",
    title: "项目原理",
    intro: "Image2 UI 的目标不是把截图压成一张图片，而是把可编辑、可交互的界面和真实视觉资产重新组合起来。",
    steps: [
      ["代码负责界面", "真实文本、按钮、输入、导航、状态栏、筛选控件和常规图标全部由代码渲染。"],
      ["图片负责视觉", "照片、产品、人物、插画、纹理、背景和缩略图使用真实本地图片资产。"],
      ["提示词可追溯", "每套风格保留本地参考图路径和提示词，避免下次又从模糊形容词开始。"],
      ["结构先于装饰", "先命名 top app bar、card grid、filter chips、detail dialog 等区域，再确定视觉表现。"],
      ["输出必须可用", "最终交付不是静态截图，而是可以打开、点击、修改并继续迭代的页面。"]
    ],
    callout: "图片不承担可读文字、导航或功能图标。这样界面才能保持清楚、可访问并且便于修改。"
  }
};

function openInfoPanel(id) {
  const panel = infoPanels[id];
  if (!panel) return;
  infoDialogContent.innerHTML = `<p class="kicker">${panel.eyebrow}</p><h2 id="infoDialogTitle">${panel.title}</h2><p>${panel.intro}</p><ol class="info-steps">${panel.steps.map((step, index) => `<li><b>0${index + 1}</b><div><strong>${step[0]}</strong><span>${step[1]}</span></div></li>`).join("")}</ol><p class="info-callout">${panel.callout}</p>`;
  infoDialog.showModal();
  track("info_panel_open", { panel: id });
}

function openStyleDetails(id) {
  const guide = styleGuides.find((item) => item.id === id);
  if (!guide) return;
  styleDialogContent.style.setProperty("--dialog-preview", guide.preview);
  styleDialogContent.innerHTML = `
    <div class="dialog-visual"><img src="${guide.referenceImage}" alt="${guide.style} 本地视觉参考图"></div>
    <div class="dialog-copy">
      <p class="kicker">${guide.name} / STYLE PROFILE</p>
      <h2 id="styleDialogTitle">${guide.style}</h2>
      <p class="dialog-intro">${guide.summary}</p>
      <dl class="dialog-facts">
        <div><dt>画面色彩</dt><dd>${guide.palette}</dd></div>
        <div><dt>页面节奏</dt><dd>${guide.layout}</dd></div>
        <div><dt>参考方向</dt><dd>${guide.reference}</dd></div>
        <div><dt>适用场景</dt><dd>${guide.bestFor}</dd></div>
      </dl>
      <p class="dialog-principle">${guide.recipe.principle}</p>
      <div class="dialog-recipe">
        <p><strong>图片：</strong>${guide.recipe.image}</p>
        <p><strong>排版：</strong>${guide.recipe.type}</p>
        <p><strong>组件：</strong>${guide.recipe.components}</p>
      </div>
      <div class="dialog-actions"><button class="dialog-copy-button" type="button" data-copy-style="${guide.id}">复制图片与提示词配置</button><button class="dialog-demo-link" type="button" data-preview-id="${guide.id}" data-preview-mode="image">查看效果图</button>${guide.video ? `<button class="dialog-demo-link" type="button" data-preview-id="${guide.id}" data-preview-mode="video">播放 Demo 视频</button>` : ""}${guide.liveDemo ? `<button class="dialog-demo-link" type="button" data-preview-id="${guide.id}" data-preview-mode="live">打开可点击 Demo</button>` : ""}</div>
    </div>`;
  styleDialogContent.querySelector("[data-copy-style]").addEventListener("click", (event) => copyStyleMode(event.currentTarget));
  styleDialogContent.querySelectorAll("[data-preview-id]").forEach((button) => button.addEventListener("click", (event) => {
    styleDialog.close();
    openPreview(event.currentTarget.dataset.previewId, event.currentTarget.dataset.previewMode);
  }));
  styleDialog.showModal();
  track("style_detail_open", { caseId: guide.id, caseName: guide.name });
}

async function copyStyleMode(button) {
  const guide = styleGuides.find((item) => item.id === button.dataset.copyStyle);
  if (!guide) return;
  const label = button.textContent;
  try { await navigator.clipboard.writeText(buildStyleMode(guide)); button.textContent = "已复制"; track("style_copy", { caseId: guide.id, caseName: guide.name }); }
  catch { fallbackCopy(buildStyleMode(guide)); button.textContent = "已复制"; track("style_copy", { caseId: guide.id, caseName: guide.name, method: "fallback" }); }
  window.setTimeout(() => { button.textContent = label; }, 1500);
}

function fallbackCopy(text) {
  const area = document.createElement("textarea"); area.value = text; area.style.position = "fixed"; area.style.opacity = "0"; document.body.append(area); area.select();
  if (!document.execCommand("copy")) throw new Error("Clipboard copy was blocked");
  area.remove();
}

categoryNav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeCategory = button.dataset.filter;
  activeTag = "";
  const url = new URL(window.location.href);
  url.searchParams.delete("tag");
  window.history.pushState({ tag: "" }, "", url);
  categoryNav.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
  track("category_filter", { category: activeCategory });
  renderDemoGallery();
});
let searchTimer;
searchInput.addEventListener("input", () => {
  renderDemoGallery();
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    const query = searchInput.value.trim();
    if (query) track("library_search", { query, resultCount: getFilteredGuides().length });
  }, 600);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
    searchInput.value = "";
    searchInput.blur();
    renderDemoGallery();
  }
});
document.querySelectorAll("a[href*='github.com']").forEach((link) => link.addEventListener("click", () => track("github_click", { location: link.className || "stats" })));
document.querySelectorAll("[data-info-panel]").forEach((button) => button.addEventListener("click", () => openInfoPanel(button.dataset.infoPanel)));
previewDialog.addEventListener("close", () => {
  window.clearTimeout(previewLoadTimer);
  previewDialogVideo.pause();
  previewDialogVideo.currentTime = 0;
  previewDialogVideo.removeAttribute("src");
  previewDialogImage.removeAttribute("src");
  previewDialogDemo.src = "about:blank";
  previewMediaStatus.hidden = true;
  previewMediaStatusText.textContent = "";
  previewMediaRetry.hidden = true;
  previewMediaStatus.classList.remove("is-error");
  previewCursor.hidden = true;
  previewCursor.classList.remove("is-running");
  activePreviewGuide = null;
});
previewDialogVideo.addEventListener("loadedmetadata", () => {
  previewMediaFrame.style.setProperty("--cursor-duration", `${Math.max(6, previewDialogVideo.duration)}s`);
});
previewDialogVideo.addEventListener("play", () => previewCursor.classList.add("is-running"));
previewDialogVideo.addEventListener("pause", () => previewCursor.classList.remove("is-running"));
previewDialogImage.addEventListener("error", () => {
  if (activePreviewGuide) showPreviewImageError(previewDialogImage, activePreviewGuide);
});
previewDialogDemo.addEventListener("load", () => {
  window.clearTimeout(previewLoadTimer);
  if (activePreviewGuide && !previewDialogDemo.hidden) previewMediaStatus.hidden = true;
});
previewDialogDemo.addEventListener("error", () => {
  window.clearTimeout(previewLoadTimer);
  previewMediaStatus.hidden = false;
  previewMediaStatusText.textContent = "Demo 加载失败，请重试或使用下方链接在新窗口打开。";
  previewMediaRetry.hidden = false;
  previewMediaStatus.classList.add("is-error");
});
previewMediaRetry.addEventListener("click", () => {
  if (activePreviewGuide) setPreviewMode("live", false);
});

[styleDialog, previewDialog, infoDialog].forEach((dialog) => dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
}));

window.addEventListener("popstate", () => {
  activeTag = readTagFromUrl();
  activeCategory = "all";
  categoryNav.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item.dataset.filter === "all"));
  renderDemoGallery();
});

function updateGitHubStars(count) {
  if (!Number.isFinite(count)) return false;
  const stars = new Intl.NumberFormat("zh-CN").format(count);
  githubStars.textContent = stars;
  githubStarsNav.textContent = stars;
  return true;
}

async function loadGitHubStars() {
  try {
    const response = await fetch(githubApiUrl, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
    if (!updateGitHubStars(Number((await response.json()).stargazers_count))) throw new Error("Missing star count");
  } catch {
    try {
      const response = await fetch(githubStarsFallbackUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Star fallback returned ${response.status}`);
      if (!updateGitHubStars(Number((await response.json()).value))) throw new Error("Missing fallback star count");
    } catch {
      githubStars.textContent = "--";
      githubStarsNav.textContent = "--";
    }
  }
}

activeTag = readTagFromUrl();
renderDemoGallery();
loadGitHubStars();
track("library_view", { referrer: document.referrer || "direct" });
