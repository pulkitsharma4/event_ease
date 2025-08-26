// src/config/site.ts
export const siteConfig = {
  name: "EventEase",
  logo: { text: "EventEase" },
  routes: {
    home: "/",
    events: "/events",
    login: "/login",
    register: "/signup",
  },
  footer: {
    // Assignment requires footer with your Name + GitHub + LinkedIn on every page
    ownerName: "Pulkit Sharma",
    github: "https://github.com/pulkitsharma4",
    linkedin: "https://www.linkedin.com/in/pulkitsharma4"
  },
} as const;

export type SiteConfig = typeof siteConfig;
