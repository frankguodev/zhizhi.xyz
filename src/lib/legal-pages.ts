import { defaultShareImage, siteConfig } from "@/lib/site";

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

const legalPagePaths: Record<LegalPageKey, string> = {
  privacy: "/privacy",
  terms: "/terms",
  disclaimer: "/disclaimer",
  cookies: "/cookies",
};

export function legalPageMetadata(key: LegalPageKey) {
  const content = legalPages[key];
  const canonicalPath = legalPagePaths[key];

  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: content.title,
      description: content.description,
      url: `${siteConfig.url}${canonicalPath}`,
      type: "website",
      locale: "zh_CN",
      images: [defaultShareImage],
    },
  };
}

export const legalPages: Record<LegalPageKey, LegalPageContent> = {
  privacy: {
    title: "隐私政策",
    description: "说明知之如何处理访问、联系和站点运行过程中可能涉及的信息。",
    updatedAt: "2026-06-01",
    sections: [
      {
        title: "我们收集的信息",
        paragraphs: [
          "知之目前以公开内容阅读为主，不要求普通读者注册账号。访问网站时，服务器和基础设施可能会产生必要的访问日志，例如请求时间、页面路径、IP 地址、浏览器类型和错误信息。",
          "文章阅读量和点赞功能会使用匿名设备标识 Cookie，用于减少重复计数、保存点赞状态和防止短时间内反复操作。这类标识不包含姓名、邮箱或账号资料。",
          "文章页和站点页提供匿名反馈表单。当你主动提交反馈时，我们会保存你填写的反馈内容、可选联系方式（如邮箱、X / Twitter、微信），以及提交时所在的页面地址、对应文章标题、浏览器类型（User-Agent）和一个匿名设备标识，用于阅读反馈、回复疑问和改进内容。联系方式可不填。",
          "如果你通过邮件、微信或其他外部渠道联系本站，我们会处理你主动提供的联系信息和沟通内容，用于回复、排查问题或改进内容。",
          "工具页面的图片压缩、格式转换、二维码生成等功能在你的浏览器本地完成处理，相关文件不会上传到本站服务器。",
        ],
      },
      {
        title: "信息用途",
        paragraphs: [
          "这些信息主要用于保障网站安全、排查故障、理解内容是否可访问，以及维护公开知识内容的长期稳定。",
          "匿名阅读和点赞数据用于展示内容热度、评估文章是否被读到，以及改进专题和文章结构。",
          "你主动提交的反馈内容用于理解阅读中的问题、回复你的疑问，以及改进文章、词条和功能。",
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
          "如需提交请求，请通过 hello@frankguo.com 联系。我们会在合理范围内核验并处理请求。",
        ],
      },
    ],
  },
  terms: {
    title: "使用条款",
    description: "说明访问和使用知之内容、功能与链接时适用的基本规则。",
    updatedAt: "2026-06-01",
    sections: [
      {
        title: "内容使用",
        paragraphs: [
          "知之提供的文章、专题、词条、工具和页面内容用于知识分享、学习和参考。除非页面另有说明，内容版权归原作者或本站所有。",
          "你可以为个人学习、引用和分享目的合理使用本站内容（引用时请注明来源），但不应批量复制、镜像、售卖，或以误导性方式署名。",
        ],
      },
      {
        title: "可接受使用",
        paragraphs: [
          "访问本站时，请不要尝试破坏、绕过、过量抓取内容、干扰服务运行，或以违法、侵权、欺诈方式使用本站。",
          "如果发现漏洞、错误或过时信息，欢迎通过站内匿名反馈、邮件或微信等渠道告知我们。",
        ],
      },
      {
        title: "用户提交内容",
        paragraphs: [
          "当你通过匿名反馈等方式提交内容时，请勿提交违法、侵权、辱骂、广告垃圾，或包含他人隐私与敏感信息（如密码、验证码、证件号）的内容。",
          "你应保证对所提交内容拥有合法权利，并授权本站为阅读反馈、回复和改进内容而使用。本站没有回复义务，也可自行忽略或删除不当内容。",
        ],
      },
      {
        title: "工具使用",
        paragraphs: [
          "工具页面的图片压缩、格式转换、二维码生成等功能按现状（as-is）提供，主要在你的浏览器本地完成处理。",
          "你需对自己处理的文件和生成结果负责，并确保拥有相应权利、遵守适用法律；本站不对工具的处理结果作出保证。",
        ],
      },
      {
        title: "服务变更",
        paragraphs: [
          "本站可能随时调整页面、功能，文章、词条、专题结构，外部链接或访问方式。",
          "我们会尽量保持内容稳定可读，但不保证所有页面或功能永久可用。",
        ],
      },
      {
        title: "适用范围",
        paragraphs: [
          "这些条款适用于你访问和使用知之公开页面的行为。某些第三方页面、嵌入服务或外部链接可能有自己的条款。",
        ],
      },
    ],
  },
  disclaimer: {
    title: "免责声明",
    description: "说明知之内容的参考属性、外部链接责任和专业建议边界。",
    updatedAt: "2026-06-01",
    sections: [
      {
        title: "仅供参考",
        paragraphs: [
          "知之内容（包括文章、专题、词条与工具页面）来自个人实践、公开资料整理和长期写作复盘，主要用于信息分享和经验参考。",
          "内容不构成法律、财务、医疗、投资或其他专业建议。重要决策请咨询具备资质的专业人士。",
        ],
      },
      {
        title: "准确性与时效性",
        paragraphs: [
          "我们会尽力保持内容清晰、准确和可追溯，但技术、平台、政策和产品状态可能变化。",
          "部分内容是由AI辅助完成（尤其是图解）可能存在简化或偏差，请结合权威资料核验。",
          "工具页面的处理结果按现状提供，本站不对其准确性或适用性作出保证。",
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
    updatedAt: "2026-06-01",
    sections: [
      {
        title: "默认使用方式",
        paragraphs: [
          "知之公开阅读页面默认不以广告投放或跨站追踪为目的设置 Cookie，也不接入第三方广告画像 Cookie。",
          "站点可能使用浏览器本地存储保存主题、阅读偏好等体验设置，使页面在下次访问时保持一致。",
          "工具页面的图片压缩、格式转换、二维码生成等功能在浏览器本地运行，可能使用本地存储保存少量偏好，但不会把你的文件上传到服务器。",
        ],
      },
      {
        title: "阅读量、点赞与反馈 Cookie",
        paragraphs: [
          "文章阅读量功能可能设置 `zz_view_device`，用于识别匿名设备并减少重复阅读计数。",
          "文章点赞功能可能设置 `zz_like_device`，用于保存匿名点赞状态、防止短时间内反复操作，并统计公开点赞数量。",
          "匿名反馈功能可能设置 `zz_feedback_device`，用于识别匿名设备并限制短时间内重复提交。",
          "这些 Cookie 均为 HttpOnly、SameSite=Lax，最长保留约 400 天，不用于广告投放或跨站追踪。",
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
};
