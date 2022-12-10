const _ = require('lodash');
const { routeStore } = require('@vl/mod-utils/adminRouteStore');

const routeRules = {
  room: {
    url: (room) => {
      return `/room?id=${_.get(room, 'id')}`;
    },
  },
};

_.map(routeRules, (rule, ruleName) => {
  routeStore.addRule(ruleName, rule);
});
