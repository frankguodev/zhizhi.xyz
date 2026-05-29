-- =========================================================
-- AI Terms System
-- First-Version Schema for zhizhi.xyz
-- 数据库：Cloudflare D1 (SQLite)
--
-- 设计原则：
-- 1. 作为独立内容类型，不复用 articles / categories 等文章系统表，避免和文章系统混淆。
-- 2. 第一版只保留真正支撑列表页、详情页、SEO、人工审核和关联阅读的字段。
-- 3. 描述字段保持克制：short_concept / short_desc / tagline 负责首屏与列表，
--    beginner_notes_json 负责小白理解辅助信息。
-- 4. 内容主体使用文章式 Markdown 承载，方便复用现有文章生产、人工二创和渲染链路。
-- 5. 主键、时间、状态字段尽量贴近当前项目 Drizzle schema 风格。
-- 6. 后续如果词条数量和页面形态稳定，再拆 examples / references / worlds / trends 等扩展表。
-- =========================================================

PRAGMA foreign_keys = ON;

-- =========================================================
-- 1. AI 词条主表
-- =========================================================
CREATE TABLE IF NOT EXISTS ai_terms (
    -- 主键：建议由应用层生成 cuid / uuid，和现有项目 text id 风格保持一致
    id TEXT PRIMARY KEY,

    -- 语言与翻译分组
    locale TEXT NOT NULL DEFAULT 'zh'
        CHECK (locale IN ('zh', 'en')),
    translation_key TEXT NOT NULL,

    -- 词条基础信息
    -- term：主展示名，例如 MCP / Agent / Context Engineering
    term TEXT NOT NULL,
    -- term_zh：中文译名，可为空，例如 模型上下文协议
    term_zh TEXT,
    -- full_name：英文全称或完整名称，可为空，例如 Model Context Protocol
    full_name TEXT,
    -- SEO URL 标识，例如 model-context-protocol
    slug TEXT NOT NULL,

    -- 列表页与详情页首屏文案
    -- short_concept：专业、权威的一句话概念，10-60 字
    short_concept TEXT NOT NULL,
    -- short_desc：自然、社区语境的一句话理解，不超过 120 字
    short_desc TEXT NOT NULL,
    -- tagline：传播感标语，例如 AI 世界里的 USB-C
    tagline TEXT,
    -- beginner_notes_json：小白理解辅助信息，避免把主表拆成大量相似描述字段
    -- 建议结构：
    -- {
    --   "plain_explanation": "",
    --   "analogy": "",
    --   "why_it_matters": "",
    --   "common_misconception": ""
    -- }
    beginner_notes_json TEXT,

    -- 词条类型
    -- concept / protocol / framework / product / model / workflow / infra / slang / company / method
    type TEXT NOT NULL DEFAULT 'concept'
        CHECK (type IN (
            'concept',
            'protocol',
            'framework',
            'product',
            'model',
            'workflow',
            'infra',
            'slang',
            'company',
            'method'
        )),

    -- 理解难度
    -- beginner / intermediate / advanced
    difficulty TEXT NOT NULL DEFAULT 'beginner'
        CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),

    -- 发布状态与访问可见性
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    visibility TEXT NOT NULL DEFAULT 'public'
        CHECK (visibility IN ('public', 'login', 'hidden')),

    -- 热度与编辑排序
    heat_score INTEGER NOT NULL DEFAULT 0
        CHECK (heat_score >= 0 AND heat_score <= 100),
    -- 内容质量分，和热度分开；用于后台筛选、首页推荐和后续人工优化
    quality_score INTEGER NOT NULL DEFAULT 0
        CHECK (quality_score >= 0 AND quality_score <= 100),
    trending INTEGER NOT NULL DEFAULT 0
        CHECK (trending IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- 正文内容
    -- content_md：详情页完整 Markdown 正文。
    -- 建议采用类似文章的固定标题结构，例如：
    -- # 词条名
    -- ## 一句话概念
    -- ## 给小白的理解
    -- ## 它本质上是什么？
    -- ## 容易误解的地方
    -- ## 常见使用场景
    -- ## 它和哪些概念相关？
    -- ## 参考资料
    content_md TEXT NOT NULL,
    -- content_format：正文格式，第一版固定为 markdown，保留字段便于后续兼容
    content_format TEXT NOT NULL DEFAULT 'markdown'
        CHECK (content_format IN ('markdown')),
    -- content_version：正文结构版本。提示词或导入结构升级时改版本，不改数据库结构。
    content_version TEXT NOT NULL DEFAULT 'ai-term-md-v1',

    -- SEO 与分享
    -- 第一版只结构化保存 SEO 与分享图基础字段。
    -- 发布稿中的 seo.* 映射到 seo_title / seo_description / seo_keywords / canonical_url / robots。
    -- 词条封面图就是分享图；open_graph.image 与 twitter.image 应保持一致，并映射到 share_image。
    -- open_graph.image_alt 映射到 share_image_alt。
    -- open_graph / twitter 的其他字段不在第一版单独拆列，前台 metadata 默认从 SEO 与分享图字段派生；
    -- 如需保留分享层覆盖值，可放入 metadata_json。
    -- structured_data 等暂不单独拆字段，也保存在 metadata_json。
    -- metadata_json 建议存 JSON 字符串，例如：
    -- {
    --   "openGraph": {},
    --   "twitter": {},
    --   "diagram": {},
    --   "structuredData": {},
    --   "rawFrontmatter": {}
    -- }
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT,
    canonical_url TEXT,
    robots TEXT,
    share_image TEXT,
    share_image_alt TEXT,
    -- 词条图解：用于详情页解释概念，不等同于社交分享图
    diagram_image TEXT,
    diagram_image_alt TEXT,
    metadata_json TEXT,

    -- 生产与审核信息
    source_note TEXT,
    ai_assisted INTEGER NOT NULL DEFAULT 1
        CHECK (ai_assisted IN (0, 1)),
    human_reviewed INTEGER NOT NULL DEFAULT 0
        CHECK (human_reviewed IN (0, 1)),

    -- 统计与时间
    view_count INTEGER NOT NULL DEFAULT 0,
    published_at INTEGER,
    -- 最近人工或联网核查时间，用于标记内容新鲜度和后台维护
    last_verified_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_terms_locale_slug_unique
ON ai_terms(locale, slug);

CREATE INDEX IF NOT EXISTS ai_terms_locale_status_visibility_idx
ON ai_terms(locale, status, visibility);

CREATE INDEX IF NOT EXISTS ai_terms_locale_trending_idx
ON ai_terms(locale, trending, heat_score DESC);

CREATE INDEX IF NOT EXISTS ai_terms_locale_heat_idx
ON ai_terms(locale, heat_score DESC);

CREATE INDEX IF NOT EXISTS ai_terms_locale_quality_idx
ON ai_terms(locale, quality_score DESC);

CREATE INDEX IF NOT EXISTS ai_terms_locale_published_idx
ON ai_terms(locale, published_at DESC);

CREATE INDEX IF NOT EXISTS ai_terms_locale_verified_idx
ON ai_terms(locale, last_verified_at DESC);

CREATE INDEX IF NOT EXISTS ai_terms_locale_sort_idx
ON ai_terms(locale, sort_order, term);

CREATE INDEX IF NOT EXISTS ai_terms_public_published_idx
ON ai_terms(locale, status, visibility, published_at);

CREATE INDEX IF NOT EXISTS ai_terms_public_heat_idx
ON ai_terms(locale, status, visibility, heat_score);

CREATE INDEX IF NOT EXISTS ai_terms_public_quality_idx
ON ai_terms(locale, status, visibility, quality_score);

CREATE INDEX IF NOT EXISTS ai_terms_public_sort_idx
ON ai_terms(locale, status, visibility, sort_order, term);

CREATE INDEX IF NOT EXISTS ai_terms_translation_key_idx
ON ai_terms(translation_key);

-- =========================================================
-- 2. AI 词条分类表
-- 分类偏导航与筛选，例如 Agent / AI 编程 / AI Infra
-- 不使用 categories，避免和文章分类冲突。
-- =========================================================
CREATE TABLE IF NOT EXISTS ai_term_categories (
    id TEXT PRIMARY KEY,
    locale TEXT NOT NULL DEFAULT 'zh'
        CHECK (locale IN ('zh', 'en')),
    translation_key TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_term_categories_locale_slug_unique
ON ai_term_categories(locale, slug);

CREATE INDEX IF NOT EXISTS ai_term_categories_locale_sort_idx
ON ai_term_categories(locale, sort_order, name);

CREATE INDEX IF NOT EXISTS ai_term_categories_translation_key_idx
ON ai_term_categories(translation_key);

-- =========================================================
-- 3. AI 词条与分类关系表
-- 第一版允许多分类，方便一个词同时属于 Agent / AI Infra。
-- =========================================================
CREATE TABLE IF NOT EXISTS ai_term_category_relations (
    term_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (term_id, category_id),

    FOREIGN KEY (term_id)
        REFERENCES ai_terms(id)
        ON DELETE CASCADE,

    FOREIGN KEY (category_id)
        REFERENCES ai_term_categories(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ai_term_category_relations_category_idx
ON ai_term_category_relations(category_id, sort_order);

-- =========================================================
-- 4. AI 词条关联关系表
-- 用于详情页“强相关概念 / 继续理解”区域。
-- MVP 导入策略：只写入 related_term_id 已经存在的关联。
-- 发布稿中的关联词条候选如果尚未入库，先跳过，后续可在后台补建词条后再补关系。
-- =========================================================
CREATE TABLE IF NOT EXISTS ai_term_relations (
    id TEXT PRIMARY KEY,
    term_id TEXT NOT NULL,
    related_term_id TEXT NOT NULL,

    -- related / similar / opposite / upstream / downstream / ecosystem
    relation_type TEXT NOT NULL DEFAULT 'related'
        CHECK (relation_type IN (
            'related',
            'similar',
            'opposite',
            'upstream',
            'downstream',
            'ecosystem'
        )),

    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,

    FOREIGN KEY (term_id)
        REFERENCES ai_terms(id)
        ON DELETE CASCADE,

    FOREIGN KEY (related_term_id)
        REFERENCES ai_terms(id)
        ON DELETE CASCADE,

    CHECK (term_id <> related_term_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_term_relations_unique
ON ai_term_relations(term_id, related_term_id, relation_type);

CREATE INDEX IF NOT EXISTS ai_term_relations_term_idx
ON ai_term_relations(term_id, sort_order);

CREATE INDEX IF NOT EXISTS ai_term_relations_related_idx
ON ai_term_relations(related_term_id);

-- =========================================================
-- 5. AI 词条全文搜索表
-- D1 支持 FTS5。注意：中文搜索效果取决于分词能力，
-- 第一版可先用于英文词、缩写、slug、短描述和正文关键词。
-- term_id 使用 UNINDEXED 保存 ai_terms.id，方便搜索结果直接回查主表，
-- 不依赖隐藏 rowid 作为应用层关联字段。
-- =========================================================
CREATE VIRTUAL TABLE IF NOT EXISTS ai_term_search
USING fts5(
    term_id UNINDEXED,
    term,
    term_zh,
    full_name,
    short_concept,
    short_desc,
    beginner_notes_json,
    content_md
);

-- =========================================================
-- 6. AI 词条搜索同步触发器
-- 这里先同步主表，避免 SQL 触发器里做复杂聚合。
-- =========================================================
CREATE TRIGGER IF NOT EXISTS ai_terms_ai
AFTER INSERT ON ai_terms
BEGIN
    INSERT INTO ai_term_search (
        rowid,
        term_id,
        term,
        term_zh,
        full_name,
        short_concept,
        short_desc,
        beginner_notes_json,
        content_md
    )
    VALUES (
        new.rowid,
        new.id,
        new.term,
        new.term_zh,
        new.full_name,
        new.short_concept,
        new.short_desc,
        new.beginner_notes_json,
        new.content_md
    );
END;

CREATE TRIGGER IF NOT EXISTS ai_terms_ad
AFTER DELETE ON ai_terms
BEGIN
    DELETE FROM ai_term_search
    WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS ai_terms_au
AFTER UPDATE ON ai_terms
BEGIN
    UPDATE ai_term_search
    SET
        term_id = new.id,
        term = new.term,
        term_zh = new.term_zh,
        full_name = new.full_name,
        short_concept = new.short_concept,
        short_desc = new.short_desc,
        beginner_notes_json = new.beginner_notes_json,
        content_md = new.content_md
    WHERE rowid = old.rowid;
END;

-- =========================================================
