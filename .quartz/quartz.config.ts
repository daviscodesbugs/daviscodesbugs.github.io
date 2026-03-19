import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const config: QuartzConfig = {
  configuration: {
    pageTitle: "davis codes bugs",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "en-US",
    baseUrl: "daviscodesbugs.github.io",
    ignorePatterns: ["private", "templates", ".obsidian", ".trash", ".quartz", ".github", ".superpowers", "flowwriter"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Schibsted Grotesk",
        body: "Source Sans Pro",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#faf9f7",
          lightgray: "#e5e0db",
          gray: "#8a8580",
          darkgray: "#4a4540",
          dark: "#2a2a2a",
          secondary: "#c07828",
          tertiary: "#4a8a4a",
          highlight: "rgba(192, 120, 40, 0.12)",
          textHighlight: "#c0782866",
        },
        darkMode: {
          light: "#1c1c1c",
          lightgray: "#333333",
          gray: "#888888",
          darkgray: "#d4d4d4",
          dark: "#e8e8e8",
          secondary: "#f0a050",
          tertiary: "#70b070",
          highlight: "rgba(240, 160, 80, 0.12)",
          textHighlight: "#f0a05066",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
