import { siteConfig, type Locale } from "@/lib/site";

export type LegalPageKey = "privacy" | "terms" | "disclaimer" | "cookies";

export type LegalPageContent = {
  title: string;
  description: string;
  updatedAt: string;
  sections: Array<{
    title: string;
    paragraphs: string[];
  }>;
};

export const legalPageKeys: LegalPageKey[] = ["privacy", "terms", "disclaimer", "cookies"];

const legalPagePaths: Record<Locale, Record<LegalPageKey, string>> = {
  zh: {
    privacy: "/privacy",
    terms: "/terms",
    disclaimer: "/disclaimer",
    cookies: "/cookies",
  },
  en: {
    privacy: "/en/privacy",
    terms: "/en/terms",
    disclaimer: "/en/disclaimer",
    cookies: "/en/cookies",
  },
};

export function legalPageMetadata(locale: Locale, key: LegalPageKey) {
  const content = legalPages[locale][key];
  const canonicalPath = legalPagePaths[locale][key];

  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        "zh-CN": legalPagePaths.zh[key],
        en: legalPagePaths.en[key],
        "x-default": legalPagePaths.zh[key],
      },
    },
    openGraph: {
      title: content.title,
      description: content.description,
      url: `${siteConfig.url}${canonicalPath}`,
      type: "website",
      locale: locale === "en" ? "en_US" : "zh_CN",
    },
  };
}

export const legalPages: Record<Locale, Record<LegalPageKey, LegalPageContent>> = {
  zh: {
    privacy: {
      title: "隐私政策",
      description: "说明知之如何处理访问、联系和站点运行过程中可能涉及的信息。",
      updatedAt: "2026-05-08",
      sections: [
        {
          title: "我们收集的信息",
          paragraphs: [
            "知之目前以公开内容阅读为主，不要求普通读者注册账号。访问网站时，服务器和基础设施可能会产生必要的访问日志，例如请求时间、页面路径、IP 地址、浏览器类型和错误信息。",
            "文章阅读量和点赞功能会使用匿名设备标识 Cookie，用于减少重复计数、保存点赞状态和防止短时间内反复操作。这类标识不包含姓名、邮箱或账号资料。",
            "如果你通过邮件或其他外部渠道联系本站，我们会处理你主动提供的联系信息和沟通内容，用于回复、排查问题或改进内容。",
          ],
        },
        {
          title: "信息用途",
          paragraphs: [
            "这些信息主要用于保障网站安全、排查故障、理解内容是否可访问，以及维护公开知识内容的长期稳定。",
            "匿名阅读和点赞数据用于展示内容热度、评估文章是否被读到，以及改进专题和文章结构。",
            "本站不会出售个人信息，也不会以广告画像为目的主动收集普通读者的个人数据。",
          ],
        },
        {
          title: "第三方服务与外部链接",
          paragraphs: [
            "本站可能部署在云服务和边缘计算平台上，也可能链接到第三方网站。第三方服务会按照各自政策处理数据。",
            "离开本站后的访问行为不受本政策控制，请在访问第三方页面时查看其隐私与 Cookie 政策。",
          ],
        },
        {
          title: "你的权利",
          paragraphs: [
            "在适用法律允许的范围内，你可以请求访问、更正或删除与自己相关的信息，也可以对某些处理提出限制或反对。",
            "如需提交请求，请通过 hello@zhizhi.xyz 联系。我们会在合理范围内核验并处理请求。",
          ],
        },
      ],
    },
    terms: {
      title: "使用条款",
      description: "说明访问和使用知之内容、功能与链接时适用的基本规则。",
      updatedAt: "2026-05-08",
      sections: [
        {
          title: "内容使用",
          paragraphs: [
            "知之提供的文章、专题和页面内容用于知识分享、学习和参考。除非页面另有说明，内容版权归原作者或本站所有。",
            "你可以为个人学习、引用和分享目的合理使用本站内容，但不应批量复制、镜像、售卖或误导性署名。",
          ],
        },
        {
          title: "可接受使用",
          paragraphs: [
            "访问本站时，请不要尝试破坏、绕过、抓取过量内容、干扰服务运行，或以违法、侵权、欺诈方式使用本站。",
            "如果发现漏洞、错误或过时信息，欢迎通过公开或私下渠道反馈。",
          ],
        },
        {
          title: "服务变更",
          paragraphs: [
            "本站可能随时调整页面、功能、文章结构、外部链接或访问方式。",
            "我们会尽量保持内容稳定可读，但不保证所有页面或功能永久可用。",
          ],
        },
        {
          title: "适用范围",
          paragraphs: [
            "这些条款适用于你访问和使用知之公开页面的行为。某些第三方页面、工具或服务可能有自己的条款。",
          ],
        },
      ],
    },
    disclaimer: {
      title: "免责声明",
      description: "说明知之内容的参考属性、外部链接责任和专业建议边界。",
      updatedAt: "2026-05-08",
      sections: [
        {
          title: "仅供参考",
          paragraphs: [
            "知之内容来自个人实践、公开资料整理和长期写作复盘，主要用于信息分享和经验参考。",
            "内容不构成法律、财务、医疗、投资或其他专业建议。重要决策请咨询具备资质的专业人士。",
          ],
        },
        {
          title: "准确性与时效性",
          paragraphs: [
            "我们会尽力保持内容清晰、准确和可追溯，但技术、平台、政策和产品状态可能变化。",
            "如果你基于本站内容进行实践，请结合当前环境自行核验，并承担相应判断责任。",
          ],
        },
        {
          title: "外部链接",
          paragraphs: [
            "本站可能包含第三方链接。链接仅为方便访问，不代表本站对第三方内容、服务、安全性或立场作出背书。",
          ],
        },
      ],
    },
    cookies: {
      title: "Cookie 与本地存储说明",
      description: "说明知之使用 Cookie、本地存储和必要技术的方式。",
      updatedAt: "2026-05-08",
      sections: [
        {
          title: "默认使用方式",
          paragraphs: [
            "知之公开阅读页面默认不以广告投放或跨站追踪为目的设置 Cookie，也不接入第三方广告画像 Cookie。",
            "站点可能使用浏览器本地存储保存主题、阅读偏好等体验设置，使页面在下次访问时保持一致。",
          ],
        },
        {
          title: "阅读量与点赞 Cookie",
          paragraphs: [
            "文章阅读量功能可能设置 `zz_view_device`，用于识别匿名设备并减少重复阅读计数。",
            "文章点赞功能可能设置 `zz_like_device`，用于保存匿名点赞状态、防止短时间内反复操作，并统计公开点赞数量。",
            "这两个 Cookie 为 HttpOnly、SameSite=Lax，最长保留约 400 天，不用于广告投放或跨站追踪。",
          ],
        },
        {
          title: "必要 Cookie",
          paragraphs: [
            "后台管理等受限功能可能使用必要的 `zz_session` 或 `zz_admin_session` 会话 Cookie，用于身份验证和安全访问。这类 Cookie 不用于广告画像。",
            "普通公开阅读功能当前不依赖读者登录。",
          ],
        },
        {
          title: "第三方 Cookie",
          paragraphs: [
            "当你点击外部链接或访问第三方嵌入服务时，对方可能设置自己的 Cookie 或类似技术。",
            "你可以通过浏览器设置清除 Cookie、本地存储，或限制第三方 Cookie。",
          ],
        },
      ],
    },
  },
  en: {
    privacy: {
      title: "Privacy Policy",
      description: "How ZhiZhi handles information related to visits, contact, and site operations.",
      updatedAt: "2026-05-08",
      sections: [
        {
          title: "Information We Process",
          paragraphs: [
            "ZhiZhi is currently focused on public reading and does not require regular readers to create accounts. When you visit the site, infrastructure logs may include request time, page path, IP address, browser type, and error details.",
            "Article view counts and likes may use anonymous device cookies to reduce duplicate counting, remember like state, and prevent repeated rapid actions. These identifiers do not contain names, email addresses, or account profiles.",
            "If you contact the site by email or another external channel, we process the information you choose to provide so we can reply, investigate issues, or improve the content.",
          ],
        },
        {
          title: "How We Use Information",
          paragraphs: [
            "We use this information to keep the site secure, troubleshoot problems, understand whether content is accessible, and maintain a stable public knowledge archive.",
            "Anonymous view and like data helps show content activity, understand whether articles are being read, and improve article and series structure.",
            "We do not sell personal information or intentionally collect reader data for advertising profiles.",
          ],
        },
        {
          title: "Third Parties and External Links",
          paragraphs: [
            "The site may run on cloud or edge infrastructure and may link to third-party websites. Those services process data under their own policies.",
            "Once you leave ZhiZhi, your activity is governed by the privacy and cookie practices of the destination site.",
          ],
        },
        {
          title: "Your Rights",
          paragraphs: [
            "Where applicable law allows, you may request access, correction, deletion, restriction, objection, or portability for information related to you.",
            "To submit a request, contact hello@zhizhi.xyz. We will review and respond within a reasonable scope.",
          ],
        },
      ],
    },
    terms: {
      title: "Terms of Use",
      description: "Basic rules for accessing and using ZhiZhi content, features, and links.",
      updatedAt: "2026-05-08",
      sections: [
        {
          title: "Content Use",
          paragraphs: [
            "Articles, series, and pages on ZhiZhi are provided for knowledge sharing, learning, and reference. Unless a page states otherwise, content rights remain with the author or the site.",
            "You may use content reasonably for personal learning, citation, and sharing, but you should not bulk copy, mirror, resell, or misattribute it.",
          ],
        },
        {
          title: "Acceptable Use",
          paragraphs: [
            "Do not attempt to disrupt the site, bypass protections, scrape excessive content, or use the site for unlawful, infringing, or deceptive activity.",
            "If you find a vulnerability, factual issue, or outdated detail, reports are welcome.",
          ],
        },
        {
          title: "Changes",
          paragraphs: [
            "The site may update pages, features, article structures, external links, or access methods at any time.",
            "We try to keep content stable and readable, but we do not guarantee that every page or feature will remain available forever.",
          ],
        },
        {
          title: "Scope",
          paragraphs: [
            "These terms apply to your use of public ZhiZhi pages. Third-party pages, tools, or services may have their own terms.",
          ],
        },
      ],
    },
    disclaimer: {
      title: "Disclaimer",
      description: "The reference nature of ZhiZhi content and the limits of professional advice.",
      updatedAt: "2026-05-08",
      sections: [
        {
          title: "Reference Only",
          paragraphs: [
            "ZhiZhi content is based on personal practice, public-source research, and long-term writing notes. It is provided for information sharing and reference.",
            "It is not legal, financial, medical, investment, or other professional advice. Consult a qualified professional before making important decisions.",
          ],
        },
        {
          title: "Accuracy and Timeliness",
          paragraphs: [
            "We try to keep content clear, accurate, and traceable, but technologies, platforms, policies, and product states can change.",
            "If you act on site content, verify it against your current context and use your own judgment.",
          ],
        },
        {
          title: "External Links",
          paragraphs: [
            "The site may include third-party links for convenience. A link does not mean we endorse the third-party content, service, security, or position.",
          ],
        },
      ],
    },
    cookies: {
      title: "Cookie and Local Storage Notice",
      description: "How ZhiZhi uses cookies, local storage, and necessary browser technologies.",
      updatedAt: "2026-05-08",
      sections: [
        {
          title: "Default Use",
          paragraphs: [
            "Public reading pages do not set cookies for advertising or cross-site tracking by default, and the site does not use third-party advertising profile cookies.",
            "The site may use browser local storage for theme and reading preferences so the experience remains consistent on later visits.",
          ],
        },
        {
          title: "View Count and Like Cookies",
          paragraphs: [
            "Article view counting may set `zz_view_device` to identify an anonymous device and reduce duplicate view counts.",
            "Article likes may set `zz_like_device` to remember anonymous like state, prevent repeated rapid actions, and count public likes.",
            "These cookies are HttpOnly, SameSite=Lax, kept for up to about 400 days, and are not used for advertising or cross-site tracking.",
          ],
        },
        {
          title: "Necessary Cookies",
          paragraphs: [
            "Restricted admin features may use necessary `zz_session` or `zz_admin_session` cookies for authentication and security. These cookies are not used for advertising profiles.",
            "Public reading currently does not depend on reader login.",
          ],
        },
        {
          title: "Third-Party Cookies",
          paragraphs: [
            "When you click external links or access third-party embedded services, those providers may set their own cookies or similar technologies.",
            "You can clear cookies and local storage or limit third-party cookies through your browser settings.",
          ],
        },
      ],
    },
  },
};
