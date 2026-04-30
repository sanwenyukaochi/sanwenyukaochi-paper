export const SITE = {
  website: "https://blog.sanwenyukaochi.cn/",
  author: "YiFan Song",
  profile: "",
  desc: "A minimal, responsive and SEO-friendly Astro blog theme.",
  title: "sanwenyukaochi paper",
  ogImage: "https://assets.sanwenyukaochi.cn/blog/ogImage.png",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: true,
    text: "Edit page",
    url: "https://github.com/satnaing/astro-paper/edit/main/",
  },
  dynamicOgImage: false,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Shanghai",
} as const;
