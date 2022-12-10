const _ = require('lodash');
const { routeStore } = require('@vl/mod-utils/adminRouteStore');

const routeRules = {
  room: {
    url: (room) => {
      return `/room?id=${_.get(room, 'id')}`;
    },
  },
  course: {
    url: (course) => {
      if (_.get(course, 'id')) {
        return `/course?id=${_.get(course, 'id')}`;
      }
      return '/course';
    },
  },
  advisor: {
    url: (advisor) => {
      const hash = _.get(advisor, 'tab');
      return `/advisor?id=${_.get(advisor, 'id')}${hash ? `#${hash}` : ''}`;
    },
  },
  courseDetail: {
    url: (course) => {
      const hash = _.get(course, 'tab');
      return `/course/detail?id=${_.get(course, 'id')}${hash ? `#${hash}` : ''}`;
    },
  },
  calendar: {
    url: () => {
      return '/calendar';
    },
  },

  addCourse: {
    url: () => {
      return '/course/add';
    },
  },

  wallet: {
    url: () => {
      return '/wallet';
    },
  },

  home: {
    url: () => {
      return '/';
    },
  },

  courseFilter: {
    url: () => {
      return '/education/course-filter';
    },
  },

  profile: {
    url: () => {
      return '/profile';
    },
  },

  userWallet: {
    url: () => {
      return '/me/wallet';
    },
  },
  payment: {
    url: (course) => {
      return `/course/purchase?id=${_.get(course, 'id')}`;
    },
  },

  admin: {
    advisor: {
      url: (advisor) => {
        return `/advisor/profile?id=${_.get(advisor, 'id')}`;
      },
      name: (advisor) => {
        return _.get(advisor, 'profile.display_name');
      },
    },
    course: {
      url: (course) => {
        return `/advisor/course?id=${_.get(course, 'id')}`;
      },
      name: (course) => {
        return _.get(course, 'name');
      },
    },
    room: {
      url: (room) => {
        return `/advisor/room?id=${_.get(room, 'id')}`;
      },
      name: (room) => {
        return _.get(room, 'start_at');
      },
    },
    user: {
      url: (user) => {
        return `/user/profile?id=${_.get(user, 'id')}`;
      },
      name: (advisor) => {
        return _.get(advisor, 'profile.display_name');
      },
    },

    rcms: {
      url: (user) => {
        return `/support/rcm?id=${_.get(user, 'ticket_id')}`;
      },
      name: (advisor) => {
        return _.get(advisor, 'profile.display_name');
      },
    },
  },

  messageWithAdvisor: {
    url: (advisor) => {
      return `/me/message?id=${_.get(advisor, 'id')}`;
    },
  },

  messageWithUser: {
    url: (user) => {
      return `/message?id=${_.get(user, 'id')}`;
    },
  },
};

_.map(routeRules, (rule, ruleName) => {
  routeStore.addRule(ruleName, rule);
});
