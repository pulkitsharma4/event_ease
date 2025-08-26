export const apiRoutes = {
  public: {
    events: "/api/public/events",
    home: "/api/public/home",
    rsvp: "/api/public/rsvp",
    auth: {
      signup: "/api/public/auth/signup",
      login: "/api/public/auth/login",
      logout: "/api/public/auth/logout",
    },
  },
  auth: {
    events: {
      my: "/api/auth/events/my",
      assigned: "/api/auth/events/assigned",
      base: "/api/auth/events",                    // POST create
      byId: (id: string) => `/api/auth/events/${id}`, // PATCH / DELETE
      stats: (id: string) => `/api/auth/events/${id}/stats`, // GET stats
    },
  },
};
